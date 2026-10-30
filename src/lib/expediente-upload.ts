import JSZip from "jszip";
import {
  ARCHIVE_FILE_ERROR,
  ARCHIVE_ZIP_MAX_BYTES,
  validateArchiveFile,
  type ArchiveKind,
} from "@/lib/archive-file";
import type { DocumentType } from "@/lib/documents-config";

/** Tipos de expediente donde el cliente puede subir fotos (se guardan en ZIP). */
export const PHOTO_OFFICE_DOCUMENT_TYPE =
  "Fotografías de Oficinas" satisfies DocumentType;

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
] as const;

export function documentAcceptsPhotoUpload(documentType: string): boolean {
  return documentType === PHOTO_OFFICE_DOCUMENT_TYPE;
}

export function isImageUploadFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return true;
  }
  const type = file.type.toLowerCase();
  return type.startsWith("image/");
}

function safeZipEntryName(name: string, index: number): string {
  const base =
    name
      .split(/[/\\]/)
      .pop()
      ?.trim()
      .replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]+/gi, "_") || `foto-${index + 1}.jpg`;
  return base.length > 0 ? base : `foto-${index + 1}.jpg`;
}

async function zipImageFiles(files: File[]): Promise<File> {
  const zip = new JSZip();
  let totalBytes = 0;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]!;
    totalBytes += file.size;
    if (totalBytes > ARCHIVE_ZIP_MAX_BYTES) {
      throw new Error(
        `Las fotos superan el límite de ${ARCHIVE_ZIP_MAX_BYTES / (1024 * 1024)} MB`,
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    zip.file(safeZipEntryName(file.name, i), bytes);
  }

  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const copy = new Uint8Array(zipBytes);
  return new File([copy], "fotografias-oficinas.zip", {
    type: "application/zip",
  });
}

export function expedienteUploadHint(documentType: string): string {
  if (documentAcceptsPhotoUpload(documentType)) {
    return "Fotos (JPG, PNG, etc.), PDF o ZIP. Puedes elegir varias fotos; se comprimen en un ZIP.";
  }
  return "PDF (25 MB) o ZIP (100 MB). Si no ves tu archivo, elige «Todos los archivos».";
}

export async function prepareExpedienteUploadFile(
  files: File[],
  documentType: string,
): Promise<
  { ok: true; file: File; kind: ArchiveKind } | { ok: false; error: string }
> {
  if (files.length === 0) {
    return { ok: false, error: "No se seleccionó ningún archivo" };
  }

  if (files.length === 1) {
    const single = files[0]!;
    const validated = validateArchiveFile(single);
    if (validated.ok) {
      return { ok: true, file: single, kind: validated.kind };
    }

    if (documentAcceptsPhotoUpload(documentType) && isImageUploadFile(single)) {
      if (single.size > ARCHIVE_ZIP_MAX_BYTES) {
        return {
          ok: false,
          error: `La foto supera el límite de ${ARCHIVE_ZIP_MAX_BYTES / (1024 * 1024)} MB`,
        };
      }
      try {
        const zipped = await zipImageFiles([single]);
        return { ok: true, file: zipped, kind: "zip" };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "No se pudo comprimir",
        };
      }
    }

    if (documentAcceptsPhotoUpload(documentType)) {
      return {
        ok: false,
        error:
          "Formato no válido. Usa fotos (JPG, PNG), un PDF o un ZIP con las imágenes.",
      };
    }

    return { ok: false, error: validated.error ?? ARCHIVE_FILE_ERROR };
  }

  if (!documentAcceptsPhotoUpload(documentType)) {
    return { ok: false, error: "Selecciona un solo archivo PDF o ZIP" };
  }

  for (const file of files) {
    if (!isImageUploadFile(file)) {
      return {
        ok: false,
        error: "En fotografías solo se permiten imágenes cuando eliges varias.",
      };
    }
  }

  try {
    const zipped = await zipImageFiles(files);
    return { ok: true, file: zipped, kind: "zip" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo comprimir",
    };
  }
}
