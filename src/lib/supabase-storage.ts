/**
 * Supabase Storage bucket for PDFs (facturas / pedimentos).
 * Create this bucket in the Supabase dashboard and add policies so
 * authenticated users can upload and read objects as needed.
 */
export const CRM_DOCUMENTS_BUCKET = "crm-documents";

/**
 * Extracts the object path inside the bucket from a public asset URL.
 */
export function storageObjectPathFromPublicUrl(publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  const needle = `/object/public/${CRM_DOCUMENTS_BUCKET}/`;
  const idx = trimmed.indexOf(needle);
  if (idx === -1) return null;
  let path = trimmed.slice(idx + needle.length);
  const q = path.indexOf("?");
  if (q !== -1) path = path.slice(0, q);
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
