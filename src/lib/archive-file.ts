import { storageObjectPathFromPublicUrl } from "@/lib/supabase-storage";

export const ARCHIVE_FILE_ACCEPT =
  "application/pdf,.pdf,application/zip,.zip,application/x-zip-compressed";

export const ARCHIVE_FILE_ERROR = "Solo se permiten archivos PDF o ZIP";

/** ZIPs are larger than a single PDF. Server actions use the same ceiling. */
export const ARCHIVE_MAX_BYTES = 25 * 1024 * 1024;

export type ArchiveKind = "pdf" | "zip";

export function archiveKindFromFile(file: File): ArchiveKind | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith(".zip") || type.includes("zip")) return "zip";
  if (name.endsWith(".pdf") || type === "application/pdf") return "pdf";
  return null;
}

export function contentTypeForArchive(kind: ArchiveKind): string {
  return kind === "zip" ? "application/zip" : "application/pdf";
}

export function isZipUrl(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0] ?? url;
  return path.toLowerCase().endsWith(".zip");
}

export function readPreuploadedArchiveUrl(formData: FormData): string | null {
  const raw = formData.get("archivo_public_url");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function acceptedPreuploadedUrl(
  formData: FormData,
  prefix: string,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const url = readPreuploadedArchiveUrl(formData);
  if (!url) return { ok: true, url: null };
  const objectPath = storageObjectPathFromPublicUrl(url);
  if (
    !objectPath ||
    !objectPath.startsWith(prefix) ||
    (!objectPath.endsWith(".pdf") && !objectPath.endsWith(".zip"))
  ) {
    return { ok: false, error: "El archivo subido no es válido" };
  }
  return { ok: true, url };
}

export function recordArchivePath(
  folder: "facturas" | "pedimentos",
  userId: string,
  id: string,
  kind: ArchiveKind,
): string {
  return `${folder}/${userId}/${id}.${kind}`;
}
