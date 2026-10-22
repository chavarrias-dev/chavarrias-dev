"use client";

import {
  ARCHIVE_FILE_ERROR,
  ARCHIVE_MAX_BYTES,
  archiveKindFromFile,
  contentTypeForArchive,
} from "@/lib/archive-file";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

export async function uploadArchiveFromBrowser(
  file: File,
  objectPath: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const kind = archiveKindFromFile(file);
  if (!kind) {
    return { ok: false, error: ARCHIVE_FILE_ERROR };
  }
  if (file.size > ARCHIVE_MAX_BYTES) {
    return { ok: false, error: "El archivo supera el límite de 25 MB" };
  }

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const body = new Blob([await file.arrayBuffer()], {
    type: contentTypeForArchive(kind),
  });
  const { error } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(objectPath, body, {
      contentType: body.type,
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
