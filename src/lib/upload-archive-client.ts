"use client";

import {
  contentTypeForArchive,
  validateArchiveFile,
} from "@/lib/archive-file";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

export async function uploadArchiveFromBrowser(
  file: File,
  objectPath: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validated = validateArchiveFile(file);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const { kind } = validated;

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const { error } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(objectPath, file, {
      contentType: contentTypeForArchive(kind),
      upsert: true,
    });

  if (error) {
    return { ok: false, error: `Error al subir el archivo: ${error.message}` };
  }

  const { data } = supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(objectPath);

  return { ok: true, url: data.publicUrl };
}
