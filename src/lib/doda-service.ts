import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { processDodaLookup } from "@/lib/doda-lookup";
import { processDodaLookupByIntegrationNumber } from "@/lib/doda-sat-recheck";
import type { ProcessDodaLookupResult } from "@/lib/doda-lookup";
import type { DodaRecord } from "@/lib/doda-types";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import { phonesMatch } from "@/lib/phone-match";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

export type RunDodaLookupInput = {
  supabase: SupabaseClient;
  file: File;
  clienteId?: string | null;
  pedimentoId?: string | null;
  whatsappPhone?: string | null;
  source?: string | null;
  notas?: string | null;
  createdBy?: string | null;
  isMonitored?: boolean;
  storagePathPrefix: string;
};

export type RunDodaLookupOutput = {
  lookup: ProcessDodaLookupResult;
  doda: DodaRecord;
};

export type RunDodaLookupByNumberInput = {
  supabase: SupabaseClient;
  integrationNumber: string;
  clienteId?: string | null;
  pedimentoId?: string | null;
  whatsappPhone?: string | null;
  source?: string | null;
  notas?: string | null;
  createdBy?: string | null;
  isMonitored?: boolean;
};

function inferExtension(file: File): string {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "pdf";
  if (lowerName.endsWith(".png")) return "png";
  if (lowerName.endsWith(".webp")) return "webp";
  if (lowerName.endsWith(".gif")) return "gif";
  if (lowerName.endsWith(".bmp")) return "bmp";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function isSupportedDodaFile(file: File): boolean {
  const mime = file.type || "application/octet-stream";
  const isPdf =
    mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage =
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
  return isPdf || isImage || ACCEPTED_MIME_TYPES.has(mime);
}

export async function findClientIdByPhone(
  supabase: SupabaseClient,
  whatsappPhone: string,
): Promise<string | null> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, phone")
    .not("phone", "is", null);

  if (error || !clients) {
    return null;
  }

  const match = (
    clients as Array<{ id: string; phone: string | null }>
  ).find((client) => client.phone && phonesMatch(client.phone, whatsappPhone));

  return match?.id ?? null;
}

export function formatDodaWhatsAppReply(
  lookup: ProcessDodaLookupResult,
  clienteLinked: boolean,
): string {
  if (lookup.lookupStatus === "verificado") {
    const lines = [
      "✅ *DODA verificado en SAT*",
      "",
      lookup.numeroIntegracion
        ? `Número de integración: ${lookup.numeroIntegracion}`
        : null,
      lookup.satStatus ? `Estado: ${lookup.satStatus}` : null,
      clienteLinked ? "Cliente vinculado en el CRM." : null,
      "",
      "Consulta realizada por Chavarrias CRM.",
    ].filter(Boolean);

    return lines.join("\n");
  }

  return [
    "⚠️ *No pudimos verificar tu DODA automáticamente*",
    "",
    lookup.lookupError
      ? `Motivo: ${lookup.lookupError}`
      : "Motivo: error desconocido.",
    "",
    "Envía una imagen o PDF claro del DODA con el código QR visible, o contacta a tu agente de Chavarrias.",
  ].join("\n");
}

/**
 * Creates a dodas row, uploads the file, runs QR + SAT lookup, and saves results.
 */
export async function runDodaLookupAndSave(
  input: RunDodaLookupInput,
): Promise<RunDodaLookupOutput> {
  const {
    supabase,
    file,
    clienteId = null,
    pedimentoId = null,
    whatsappPhone = null,
    source = null,
    notas = null,
    createdBy = null,
    isMonitored = false,
    storagePathPrefix,
  } = input;

  if (!isSupportedDodaFile(file)) {
    throw new Error(
      "Formato no soportado. Envía una imagen (JPG, PNG) o PDF del DODA.",
    );
  }

  const { data: createdRow, error: createError } = await supabase
    .from("dodas")
    .insert({
      cliente_id: clienteId,
      pedimento_id: pedimentoId,
      whatsapp_phone: whatsappPhone,
      source,
      notas,
      lookup_status: "consultando",
      is_monitored: isMonitored,
      is_resolved: false,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (createError || !createdRow) {
    throw new Error(createError?.message ?? "No se pudo crear el registro DODA");
  }

  const dodaId = (createdRow as { id: string }).id;
  const extension = inferExtension(file);
  const storagePath = `${storagePathPrefix}/${dodaId}.${extension}`;

  const mime = file.type || "application/octet-stream";
  const { error: uploadError } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: mime || undefined,
      upsert: true,
    });

  if (uploadError) {
    await supabase.from("dodas").delete().eq("id", dodaId);
    throw new Error(`Error al subir el archivo: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);

  await supabase
    .from("dodas")
    .update({ archivo_url: publicUrlData.publicUrl })
    .eq("id", dodaId);

  const lookup = await processDodaLookup({ file });

  const { data: updatedRow, error: updateError } = await supabase
    .from("dodas")
    .update({
      qr_validator_url: lookup.validatorUrl,
      numero_integracion: lookup.numeroIntegracion,
      sat_status: lookup.satStatus,
      sat_details: lookup.satDetails ? JSON.stringify(lookup.satDetails) : null,
      lookup_status: lookup.lookupStatus,
      lookup_error: lookup.lookupError,
      looked_up_at: lookup.lookedUpAt,
      last_checked_at: lookup.lookedUpAt,
      ...(isMonitored ? { is_monitored: true, is_resolved: false } : {}),
    })
    .eq("id", dodaId)
    .select(DODA_RECORD_SELECT)
    .single();

  if (updateError || !updatedRow) {
    throw new Error(updateError?.message ?? "Error al guardar el resultado");
  }

  return {
    lookup,
    doda: updatedRow as DodaRecord,
  };
}

/**
 * Creates a dodas row from an integration number, scrapes SAT, and saves results.
 */
export async function runDodaLookupByNumberAndSave(
  input: RunDodaLookupByNumberInput,
): Promise<RunDodaLookupOutput> {
  const {
    supabase,
    integrationNumber,
    clienteId = null,
    pedimentoId = null,
    whatsappPhone = null,
    source = null,
    notas = null,
    createdBy = null,
    isMonitored = false,
  } = input;

  const trimmed = integrationNumber.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("El número de integración debe contener solo dígitos.");
  }

  const { data: createdRow, error: createError } = await supabase
    .from("dodas")
    .insert({
      cliente_id: clienteId,
      pedimento_id: pedimentoId,
      whatsapp_phone: whatsappPhone,
      source,
      notas,
      numero_integracion: trimmed,
      lookup_status: "consultando",
      is_monitored: isMonitored,
      is_resolved: false,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (createError || !createdRow) {
    throw new Error(createError?.message ?? "No se pudo crear el registro DODA");
  }

  const dodaId = (createdRow as { id: string }).id;
  const lookup = await processDodaLookupByIntegrationNumber(trimmed);

  const { data: updatedRow, error: updateError } = await supabase
    .from("dodas")
    .update({
      qr_validator_url: lookup.validatorUrl,
      numero_integracion: lookup.numeroIntegracion ?? trimmed,
      sat_status: lookup.satStatus,
      sat_details: lookup.satDetails ? JSON.stringify(lookup.satDetails) : null,
      lookup_status: lookup.lookupStatus,
      lookup_error: lookup.lookupError,
      looked_up_at: lookup.lookedUpAt,
      last_checked_at: lookup.lookedUpAt,
      ...(isMonitored ? { is_monitored: true, is_resolved: false } : {}),
    })
    .eq("id", dodaId)
    .select(DODA_RECORD_SELECT)
    .single();

  if (updateError || !updatedRow) {
    throw new Error(updateError?.message ?? "Error al guardar el resultado");
  }

  return {
    lookup,
    doda: updatedRow as DodaRecord,
  };
}
