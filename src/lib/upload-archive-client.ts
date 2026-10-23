"use client";

import {
  contentTypeForArchive,
  validateArchiveFile,
} from "@/lib/archive-file";
import {
  contentTypeForPedimentoArchive,
  validatePedimentoArchiveFile,
  verifyPedimentoArchiveFileMagic,
} from "@/lib/pedimento-archive";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

export type UploadProgressCallback = (percent: number) => void;

function storageObjectUploadUrl(objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const encoded = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/${CRM_DOCUMENTS_BUCKET}/${encoded}`;
}

async function uploadFileWithProgress(
  file: File,
  objectPath: string,
  contentType: string,
  onProgress?: UploadProgressCallback,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sesión no válida. Vuelve a iniciar sesión.");
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url = storageObjectUploadUrl(objectPath);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      } else if (event.loaded > 0) {
        onProgress(Math.min(95, Math.round(event.loaded / 50000)));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = `Error al subir el archivo (HTTP ${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string };
        if (body.message) message = `Error al subir el archivo: ${body.message}`;
      } catch {
        /* ignore */
      }
      reject(new Error(message));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Error de red al subir el archivo"));
    });

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}

export async function uploadArchiveFromBrowser(
  file: File,
  objectPath: string,
  onProgress?: UploadProgressCallback,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validated = validateArchiveFile(file);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const { kind } = validated;

  try {
    onProgress?.(0);
    await uploadFileWithProgress(
      file,
      objectPath,
      contentTypeForArchive(kind),
      onProgress,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al subir el archivo";
    return { ok: false, error: message };
  }

  const supabase = createSupabaseBrowserClient();
  const { data } = supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(objectPath);

  return { ok: true, url: data.publicUrl };
}

export async function uploadCrmAttachmentFromBrowser(
  file: File,
  objectPath: string,
  onProgress?: UploadProgressCallback,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validated = validatePedimentoArchiveFile(file);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const magic = await verifyPedimentoArchiveFileMagic(file, validated.kind);
  if (!magic.ok) {
    return { ok: false, error: magic.error };
  }

  try {
    onProgress?.(0);
    await uploadFileWithProgress(
      file,
      objectPath,
      contentTypeForPedimentoArchive(validated.kind),
      onProgress,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al subir el archivo";
    return { ok: false, error: message };
  }

  const supabase = createSupabaseBrowserClient();
  const { data } = supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(objectPath);

  return { ok: true, url: data.publicUrl };
}

/** @deprecated use uploadCrmAttachmentFromBrowser */
export const uploadPedimentoArchiveFromBrowser = uploadCrmAttachmentFromBrowser;
