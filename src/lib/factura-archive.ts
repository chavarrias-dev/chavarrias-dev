import { FACTURA_MAX_ARCHIVE_FILES } from "@/lib/factura-archive-constants";
import {
  pedimentoArchiveKindFromFilename,
  PEDIMENTO_ARCHIVE_EXTENSIONS,
  validatePedimentoArchiveFile,
  verifyPedimentoArchiveFileMagic,
  verifyPedimentoPublicArchiveMagic,
} from "@/lib/pedimento-archive";
import {
  CRM_DOCUMENTS_BUCKET,
  storageObjectPathFromPublicUrl,
} from "@/lib/supabase-storage";
import type { SupabaseClient } from "@supabase/supabase-js";

export { FACTURA_MAX_ARCHIVE_FILES } from "@/lib/factura-archive-constants";

export type FacturaArchiveEntry = {
  name: string;
  bytes: Uint8Array;
};

function uniqueEntryName(name: string, used: Set<string>): string {
  const base =
    name
      .split(/[/\\]/)
      .pop()
      ?.trim()
      .replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]+/gi, "_")
      .slice(0, 180) || "archivo";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = base.lastIndexOf(".");
    if (dot > 0) {
      candidate = `${base.slice(0, dot)} (${n})${base.slice(dot)}`;
    } else {
      candidate = `${base} (${n})`;
    }
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function acceptedFacturaPreuploadedUrls(
  formData: FormData,
  prefix: string,
): { ok: true; urls: string[] } | { ok: false; error: string } {
  const rawList = formData.getAll("archivo_public_url");
  const urls: string[] = [];
  for (const raw of rawList) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const objectPath = storageObjectPathFromPublicUrl(trimmed);
    const validExt = PEDIMENTO_ARCHIVE_EXTENSIONS.some((ext) =>
      objectPath?.toLowerCase().endsWith(ext),
    );
    if (!objectPath || !objectPath.startsWith(prefix) || !validExt) {
      return { ok: false, error: "Uno de los archivos subidos no es válido" };
    }
    urls.push(trimmed);
  }
  if (urls.length > FACTURA_MAX_ARCHIVE_FILES) {
    return {
      ok: false,
      error: `Máximo ${FACTURA_MAX_ARCHIVE_FILES} archivos por factura`,
    };
  }
  return { ok: true, urls };
}

async function readArchiveEntryFromFile(
  file: File,
): Promise<
  { ok: true; entry: FacturaArchiveEntry } | { ok: false; error: string }
> {
  const validated = validatePedimentoArchiveFile(file);
  if (!validated.ok) return validated;
  const magic = await verifyPedimentoArchiveFileMagic(file, validated.kind);
  if (!magic.ok) return magic;
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { ok: true, entry: { name: file.name, bytes } };
}

async function readArchiveEntryFromPublicUrl(
  supabase: SupabaseClient,
  publicUrl: string,
): Promise<
  { ok: true; entry: FacturaArchiveEntry; path: string } | { ok: false; error: string }
> {
  const remoteMagic = await verifyPedimentoPublicArchiveMagic(publicUrl);
  if (!remoteMagic.ok) return remoteMagic;

  const path = storageObjectPathFromPublicUrl(publicUrl);
  if (!path) {
    return { ok: false, error: "URL de archivo inválida" };
  }

  const { data, error } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .download(path);
  if (error || !data) {
    return { ok: false, error: "No se pudo leer un archivo subido" };
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const segment = path.split("/").pop() ?? "archivo";
  const kind = pedimentoArchiveKindFromFilename(segment);
  const name =
    kind && segment.endsWith(`.${kind}`)
      ? segment
      : `${segment}.${remoteMagic.kind}`;

  return { ok: true, entry: { name, bytes }, path };
}

export async function collectFacturaArchiveEntries(input: {
  supabase: SupabaseClient;
  formData: FormData;
  storagePrefix: string;
}): Promise<
  | {
      ok: true;
      entries: FacturaArchiveEntry[];
      stagingPaths: string[];
    }
  | { ok: false; error: string }
> {
  const uploaded = acceptedFacturaPreuploadedUrls(
    input.formData,
    input.storagePrefix,
  );
  if (!uploaded.ok) return uploaded;

  const directFiles = input.formData
    .getAll("archivo")
    .filter(
      (item): item is File => item instanceof File && item.size > 0,
    );

  const totalCount = uploaded.urls.length + directFiles.length;
  if (totalCount > FACTURA_MAX_ARCHIVE_FILES) {
    return {
      ok: false,
      error: `Máximo ${FACTURA_MAX_ARCHIVE_FILES} archivos por factura`,
    };
  }

  const usedNames = new Set<string>();
  const entries: FacturaArchiveEntry[] = [];
  const stagingPaths: string[] = [];

  for (const url of uploaded.urls) {
    const result = await readArchiveEntryFromPublicUrl(input.supabase, url);
    if (!result.ok) return result;
    stagingPaths.push(result.path);
    entries.push({
      name: uniqueEntryName(result.entry.name, usedNames),
      bytes: result.entry.bytes,
    });
  }

  for (const file of directFiles) {
    const result = await readArchiveEntryFromFile(file);
    if (!result.ok) return result;
    entries.push({
      name: uniqueEntryName(result.entry.name, usedNames),
      bytes: result.entry.bytes,
    });
  }

  return { ok: true, entries, stagingPaths };
}

export function firstPdfEntry(
  entries: FacturaArchiveEntry[],
): FacturaArchiveEntry | null {
  for (const entry of entries) {
    if (entry.name.toLowerCase().endsWith(".pdf")) {
      return entry;
    }
  }
  return null;
}
