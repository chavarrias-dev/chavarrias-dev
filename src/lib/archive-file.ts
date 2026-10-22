export const ARCHIVE_FILE_ACCEPT =
  "application/pdf,.pdf,application/zip,.zip,application/x-zip-compressed";

export const ARCHIVE_FILE_ERROR = "Solo se permiten archivos PDF o ZIP";

/** ZIPs are larger than a single PDF. Server actions use the same ceiling. */
export const ARCHIVE_MAX_BYTES = 25 * 1024 * 1024;

export type ArchiveKind = "pdf" | "zip";

export function archiveKindFromFile(file: File): ArchiveKind | null {
  const type = file.type.toLowerCase();
  if (type === "application/pdf") return "pdf";
  if (type === "application/zip" || type === "application/x-zip-compressed") {
    return "zip";
  }

  if (type === "" || type === "application/octet-stream") {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".zip")) return "zip";
  }

  return null;
}

export function contentTypeForArchive(kind: ArchiveKind): string {
  return kind === "zip" ? "application/zip" : "application/pdf";
}

export function isZipUrl(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0] ?? url;
  return path.toLowerCase().endsWith(".zip");
}

export function recordArchivePath(
  folder: "facturas" | "pedimentos",
  userId: string,
  id: string,
  kind: ArchiveKind,
): string {
  return `${folder}/${userId}/${id}.${kind}`;
}
