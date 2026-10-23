import { storageObjectPathFromPublicUrl } from "@/lib/supabase-storage";

/** Shared pedimento attachment rules (client mirrors in pedimento-archive-client.ts). */
export const PEDIMENTO_ARCHIVE_EXTENSIONS = [".pdf", ".zip", ".rar"] as const;

export const PEDIMENTO_ARCHIVE_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
] as const;

export const PEDIMENTO_ARCHIVE_FILE_ERROR =
  "Solo se permiten archivos PDF, ZIP o RAR";

export const PEDIMENTO_ARCHIVE_PDF_MAX_BYTES = 25 * 1024 * 1024;
export const PEDIMENTO_ARCHIVE_COMPRESSED_MAX_BYTES = 100 * 1024 * 1024;

export const PEDIMENTO_ARCHIVE_UPLOAD_HINT =
  "PDF (25 MB), ZIP o RAR (100 MB). Si no ves tu archivo, elige «Todos los archivos» en el explorador.";

export type PedimentoArchiveKind = "pdf" | "zip" | "rar";

export const PEDIMENTO_ARCHIVE_KINDS: readonly PedimentoArchiveKind[] = [
  "pdf",
  "zip",
  "rar",
];

const PEDIMENTO_MIME_SET = new Set<string>(PEDIMENTO_ARCHIVE_MIME_TYPES);

export function pedimentoArchiveKindFromFilename(
  filename: string,
): PedimentoArchiveKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".rar")) return "rar";
  return null;
}

export function pedimentoArchiveKindFromFile(
  file: Pick<File, "name" | "type">,
): PedimentoArchiveKind | null {
  const byName = pedimentoArchiveKindFromFilename(file.name);
  if (byName) return byName;

  const type = file.type.toLowerCase().trim();
  if (!type) return null;

  if (type === "application/pdf") return "pdf";
  if (type.includes("zip") || type === "application/x-zip-compressed") {
    return "zip";
  }
  if (
    type === "application/vnd.rar" ||
    type === "application/x-rar-compressed" ||
    type === "application/x-rar"
  ) {
    return "rar";
  }
  return null;
}

/** Windows often reports `.rar` / `.zip` as octet-stream; trust extension when listed. */
const PEDIMENTO_EXTENSION_TRUSTED_MIME_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
]);

export function pedimentoArchiveMimeAllowed(
  file: Pick<File, "name" | "type">,
  kind: PedimentoArchiveKind,
): boolean {
  const byExtension = pedimentoArchiveKindFromFilename(file.name);
  if (byExtension === kind) {
    const type = file.type.toLowerCase().trim();
    if (!type || PEDIMENTO_EXTENSION_TRUSTED_MIME_TYPES.has(type)) {
      return true;
    }
  }

  const type = file.type.toLowerCase().trim();
  if (!type) {
    return byExtension === kind;
  }
  if (!PEDIMENTO_MIME_SET.has(type)) return false;
  const inferred = pedimentoArchiveKindFromFile(file);
  return inferred === kind;
}

export function maxPedimentoArchiveBytesForKind(
  kind: PedimentoArchiveKind,
): number {
  return kind === "pdf"
    ? PEDIMENTO_ARCHIVE_PDF_MAX_BYTES
    : PEDIMENTO_ARCHIVE_COMPRESSED_MAX_BYTES;
}

export function pedimentoArchiveMaxSizeLabel(kind: PedimentoArchiveKind): string {
  const mb = maxPedimentoArchiveBytesForKind(kind) / (1024 * 1024);
  return `${mb} MB`;
}

export function validatePedimentoArchiveFile(
  file: Pick<File, "name" | "type" | "size">,
): { ok: true; kind: PedimentoArchiveKind } | { ok: false; error: string } {
  const kind = pedimentoArchiveKindFromFile(file);
  if (!kind) {
    return { ok: false, error: PEDIMENTO_ARCHIVE_FILE_ERROR };
  }
  if (!pedimentoArchiveMimeAllowed(file, kind)) {
    return { ok: false, error: PEDIMENTO_ARCHIVE_FILE_ERROR };
  }
  const max = maxPedimentoArchiveBytesForKind(kind);
  if (file.size > max) {
    const label = kind.toUpperCase();
    return {
      ok: false,
      error: `El ${label} supera el límite de ${pedimentoArchiveMaxSizeLabel(kind)}`,
    };
  }
  return { ok: true, kind };
}

export function contentTypeForPedimentoArchive(
  kind: PedimentoArchiveKind,
): string {
  switch (kind) {
    case "pdf":
      return "application/pdf";
    case "zip":
      return "application/zip";
    case "rar":
      return "application/vnd.rar";
  }
}

export function recordPedimentoArchivePath(
  userId: string,
  pedimentoId: string,
  kind: PedimentoArchiveKind,
): string {
  return `pedimentos/${userId}/${pedimentoId}.${kind}`;
}

export function otherPedimentoArchivePaths(
  userId: string,
  pedimentoId: string,
  keep: PedimentoArchiveKind,
): string[] {
  return PEDIMENTO_ARCHIVE_KINDS.filter((k) => k !== keep).map((k) =>
    recordPedimentoArchivePath(userId, pedimentoId, k),
  );
}

export function acceptedPedimentoPreuploadedUrl(
  formData: FormData,
  prefix: string,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const raw = formData.get("archivo_public_url");
  if (typeof raw !== "string") return { ok: true, url: null };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };

  const objectPath = storageObjectPathFromPublicUrl(trimmed);
  const validExt = PEDIMENTO_ARCHIVE_EXTENSIONS.some((ext) =>
    objectPath?.toLowerCase().endsWith(ext),
  );
  if (!objectPath || !objectPath.startsWith(prefix) || !validExt) {
    return { ok: false, error: "El archivo subido no es válido" };
  }
  return { ok: true, url: trimmed };
}

/** Magic bytes: PDF %PDF, ZIP PK, RAR Rar! (4 and 5). */
export function verifyPedimentoArchiveMagicBytes(
  bytes: Uint8Array,
  kind: PedimentoArchiveKind,
): { ok: true } | { ok: false; error: string } {
  if (bytes.length < 4) {
    return { ok: false, error: "El archivo está vacío o corrupto" };
  }

  const head = bytes.subarray(0, Math.min(bytes.length, 8));

  if (kind === "pdf") {
    const pdfSig = String.fromCharCode(...head.subarray(0, 4));
    if (pdfSig !== "%PDF") {
      return { ok: false, error: "El archivo no es un PDF válido" };
    }
    return { ok: true };
  }

  if (kind === "zip") {
    if (head[0] !== 0x50 || head[1] !== 0x4b) {
      return { ok: false, error: "El archivo no es un ZIP válido" };
    }
    return { ok: true };
  }

  const rarSig = String.fromCharCode(...head.subarray(0, 4));
  const rar4 =
    head.length >= 7 &&
    rarSig === "Rar!" &&
    head[4] === 0x1a &&
    head[5] === 0x07 &&
    head[6] === 0x00;
  const rar5 =
    head.length >= 8 &&
    rarSig === "Rar!" &&
    head[4] === 0x1a &&
    head[5] === 0x07 &&
    head[6] === 0x01 &&
    head[7] === 0x00;

  if (!rar4 && !rar5) {
    return { ok: false, error: "El archivo no es un RAR válido" };
  }
  return { ok: true };
}

export async function readPedimentoArchiveMagicPrefix(
  file: Blob,
  byteCount = 8,
): Promise<Uint8Array> {
  const slice = file.slice(0, byteCount);
  return new Uint8Array(await slice.arrayBuffer());
}

export async function verifyPedimentoArchiveFileMagic(
  file: File,
  kind: PedimentoArchiveKind,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prefix = await readPedimentoArchiveMagicPrefix(file);
  return verifyPedimentoArchiveMagicBytes(prefix, kind);
}

/** Bytes needed for PDF / ZIP / RAR5 signatures. */
const PEDIMENTO_MAGIC_HEADER_BYTES = 16;

/**
 * Reads only the object header via HTTP Range. If the CDN ignores Range (200 + full body),
 * consumes one stream chunk and cancels — never buffers the whole file.
 */
export async function fetchPedimentoArchiveMagicPrefixFromUrl(
  publicUrl: string,
): Promise<Uint8Array> {
  const lastByte = PEDIMENTO_MAGIC_HEADER_BYTES - 1;
  const res = await fetch(publicUrl, {
    headers: { Range: `bytes=0-${lastByte}` },
    cache: "no-store",
  });

  if (res.status === 206) {
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf).subarray(0, PEDIMENTO_MAGIC_HEADER_BYTES);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Empty response body");
  }

  try {
    const { value } = await reader.read();
    if (!value?.length) {
      return new Uint8Array();
    }
    return value.subarray(0, PEDIMENTO_MAGIC_HEADER_BYTES);
  } finally {
    await reader.cancel();
  }
}

export async function verifyPedimentoPublicArchiveMagic(
  publicUrl: string,
): Promise<{ ok: true; kind: PedimentoArchiveKind } | { ok: false; error: string }> {
  const kind = pedimentoArchiveKindFromFilename(publicUrl);
  if (!kind) {
    return { ok: false, error: PEDIMENTO_ARCHIVE_FILE_ERROR };
  }
  try {
    const prefix = await fetchPedimentoArchiveMagicPrefixFromUrl(publicUrl);
    const magic = verifyPedimentoArchiveMagicBytes(prefix, kind);
    if (!magic.ok) return magic;
    return { ok: true, kind };
  } catch {
    return { ok: false, error: "No se pudo verificar el archivo subido" };
  }
}

export function pedimentoArchiveDownloadNameFromUrl(
  href: string,
): string | undefined {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  const segment = path.split("/").pop();
  if (!segment) return undefined;
  const kind = pedimentoArchiveKindFromFilename(segment);
  if (kind === "zip" || kind === "rar") return segment;
  return undefined;
}
