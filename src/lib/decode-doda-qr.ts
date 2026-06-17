import "server-only";

import { createCanvas } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import {
  extractIntegrationNumberFromUrl,
  isSatDodaValidatorUrl,
} from "@/lib/doda-sat-details";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

export class DodaQrDecodeError extends Error {
  rawQrPayload?: string;

  constructor(message: string, rawQrPayload?: string) {
    super(message);
    this.name = "DodaQrDecodeError";
    this.rawQrPayload = rawQrPayload;
  }
}

function normalizeQrPayload(payload: string): string {
  return payload.trim().replace(/\s+/g, "");
}

type QrPayload = {
  raw: string;
  normalized: string;
};

type QrScanResult = {
  validatorUrl: string | null;
  rawQrPayload: string | null;
};

function decodeQrFromRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): QrPayload | null {
  const result = jsQR(data, width, height, {
    inversionAttempts: "attemptBoth",
  });
  if (!result?.data) {
    return null;
  }

  const raw = result.data;
  const normalized = normalizeQrPayload(raw);

  // Temporary debug: expose payload before URL validation runs.
  console.log("[DODA QR decode] raw payload (pre-validation):", raw);

  return { raw, normalized };
}

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<QrScanResult> {
  const base = sharp(buffer, { failOn: "none" }).rotate().ensureAlpha();
  const metadata = await base.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) {
    return { validatorUrl: null, rawQrPayload: null };
  }

  let firstRawPayload: string | null = null;

  const scales = [1, 1.5, 2, 3];
  for (const scale of scales) {
    const targetWidth = Math.max(1, Math.round(width * scale));
    const { data, info } = await base
      .clone()
      .resize(targetWidth, null, { withoutEnlargement: false })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const decoded = decodeQrFromRgba(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
    );
    if (!decoded) {
      continue;
    }

    if (!firstRawPayload) {
      firstRawPayload = decoded.raw;
    }

    if (isSatDodaValidatorUrl(decoded.normalized)) {
      return { validatorUrl: decoded.normalized, rawQrPayload: decoded.raw };
    }
  }

  return { validatorUrl: null, rawQrPayload: firstRawPayload };
}

async function renderPdfPageToRgba(
  page: Awaited<ReturnType<PDFDocumentProxy["getPage"]>>,
  scale: number,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    data: new Uint8ClampedArray(imageData.data),
    width: canvas.width,
    height: canvas.height,
  };
}

async function decodeQrFromPdfBuffer(buffer: Buffer): Promise<QrScanResult> {
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  let firstRawPayload: string | null = null;

  const scales = [2, 3, 4];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    for (const scale of scales) {
      const { data, width, height } = await renderPdfPageToRgba(page, scale);
      const decoded = decodeQrFromRgba(data, width, height);
      if (!decoded) {
        continue;
      }

      if (!firstRawPayload) {
        firstRawPayload = decoded.raw;
      }

      if (isSatDodaValidatorUrl(decoded.normalized)) {
        return { validatorUrl: decoded.normalized, rawQrPayload: decoded.raw };
      }
    }
  }

  return { validatorUrl: null, rawQrPayload: firstRawPayload };
}

/**
 * Decodes the SAT validator URL embedded in a DODA image or PDF QR code.
 */
export async function decodeDodaQrFromFile(
  file: File,
): Promise<{
  validatorUrl: string;
  numeroIntegracion: string | null;
  rawQrPayload: string | null;
}> {
  if (file.size === 0) {
    throw new DodaQrDecodeError("El archivo está vacío");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new DodaQrDecodeError("El archivo es demasiado grande (máximo 15 MB)");
  }

  const mime = file.type || "application/octet-stream";
  const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage =
    IMAGE_MIME_TYPES.has(mime) ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);

  if (!isPdf && !isImage) {
    throw new DodaQrDecodeError(
      "Formato no soportado. Sube una imagen (JPG, PNG, WEBP) o un PDF del DODA.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const scan = isPdf
    ? await decodeQrFromPdfBuffer(buffer)
    : await decodeQrFromImageBuffer(buffer);

  if (!scan.validatorUrl) {
    if (scan.rawQrPayload) {
      throw new DodaQrDecodeError(
        "No se encontró un código QR del SAT válido en el archivo.",
        scan.rawQrPayload,
      );
    }

    throw new DodaQrDecodeError(
      "No se encontró un código QR del SAT válido en el archivo.",
    );
  }

  return {
    validatorUrl: scan.validatorUrl,
    numeroIntegracion: extractIntegrationNumberFromUrl(scan.validatorUrl),
    rawQrPayload: scan.rawQrPayload,
  };
}
