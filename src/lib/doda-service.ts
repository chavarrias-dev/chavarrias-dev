import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { processDodaLookup } from "@/lib/doda-lookup";
import {
  processDodaLookupByIntegrationNumber,
  processDodaSatRecheck,
} from "@/lib/doda-sat-recheck";
import type { ProcessDodaLookupResult } from "@/lib/doda-lookup";
import type { DodaLookupStatus, DodaRecord } from "@/lib/doda-types";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import { parseSatDetails } from "@/lib/doda-sat-details";
import {
  DODA_RESOLVED_SAT_STATUS,
  isDodaResolvedSatStatus,
} from "@/lib/doda-monitoring-constants";
import { notifyStaffDodaMonitoringComplete } from "@/lib/notifications";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";
import { sendPushNotification } from "@/lib/web-push";

export { findClientIdByPhone } from "@/lib/phone-match";

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
      tipo_pedimento: lookup.pedimentoInfo?.tipoPedimento ?? null,
      pedimento: lookup.pedimentoInfo?.pedimento ?? null,
      remesas_presentadas: lookup.pedimentoInfo?.remesasPresentadas ?? null,
      clave_pedimento: lookup.pedimentoInfo?.clavePedimento ?? null,
      datos_vehiculo: lookup.pedimentoInfo?.datosVehiculo ?? null,
      cantidad_mercancia: lookup.pedimentoInfo?.cantidadMercancia ?? null,
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

export type PerformDodaRecheckOutcome =
  | {
      ok: true;
      doda: DodaRecord;
      previousStatus: string | null;
      resolved: boolean;
      /**
       * "verificado" when SAT answered and we parsed a status; "revision_manual"
       * when the scrape failed (SAT down, timeout, invalid number, unexpected
       * markup). The DB row is still updated (last_checked_at, check_count) in
       * both cases, so callers must inspect this to distinguish "no change" from
       * "the check itself failed".
       */
      lookupStatus: DodaLookupStatus;
      lookupError: string | null;
    }
  | { ok: false; status: number; error: string };

/**
 * Re-scrapes the SAT validator for one dodas row and persists the result.
 * Shared by the "Reintentar" (errors table) and "Revisar ahora" (monitoring
 * table) actions — both trigger the exact same recheck, just from different
 * UI entry points.
 */
export async function performDodaRecheck(
  supabase: SupabaseClient,
  dodaId: string,
): Promise<PerformDodaRecheckOutcome> {
  const { data: doda, error: fetchError } = await supabase
    .from("dodas")
    .select(DODA_RECORD_SELECT)
    .eq("id", dodaId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, status: 500, error: fetchError.message };
  }

  if (!doda) {
    return { ok: false, status: 404, error: "DODA no encontrado" };
  }

  if (!doda.qr_validator_url) {
    return {
      ok: false,
      status: 400,
      error: "Este DODA no tiene URL del validador SAT.",
    };
  }

  try {
    const previousStatus = doda.sat_status;
    const recheck = await processDodaSatRecheck(doda.qr_validator_url);
    const checkedAt = recheck.lookedUpAt;
    const nextCheckCount = (doda.check_count ?? 0) + 1;
    const resolved =
      recheck.lookupStatus === "verificado" &&
      isDodaResolvedSatStatus(recheck.satStatus);

    const { data: updated, error: updateError } = await supabase
      .from("dodas")
      .update({
        last_checked_at: checkedAt,
        looked_up_at: checkedAt,
        check_count: nextCheckCount,
        ...(recheck.lookupStatus === "verificado" && recheck.satStatus
          ? {
              sat_status: recheck.satStatus,
              sat_details: recheck.satDetails
                ? JSON.stringify(recheck.satDetails)
                : null,
              tipo_pedimento: recheck.pedimentoInfo?.tipoPedimento ?? null,
              pedimento: recheck.pedimentoInfo?.pedimento ?? null,
              remesas_presentadas:
                recheck.pedimentoInfo?.remesasPresentadas ?? null,
              clave_pedimento: recheck.pedimentoInfo?.clavePedimento ?? null,
              datos_vehiculo: recheck.pedimentoInfo?.datosVehiculo ?? null,
              cantidad_mercancia:
                recheck.pedimentoInfo?.cantidadMercancia ?? null,
              numero_integracion:
                recheck.numeroIntegracion ?? doda.numero_integracion,
              lookup_status: "verificado",
              lookup_error: null,
            }
          : {
              lookup_status: "revision_manual",
              lookup_error: recheck.lookupError,
            }),
        ...(resolved
          ? {
              is_monitored: false,
              is_resolved: true,
            }
          : {}),
      })
      .eq("id", dodaId)
      .select(DODA_RECORD_SELECT)
      .single();

    if (updateError || !updated) {
      return {
        ok: false,
        status: 500,
        error: updateError?.message ?? "No se pudo actualizar el DODA",
      };
    }

    if (resolved && recheck.satStatus) {
      await notifyStaffDodaMonitoringComplete(supabase, {
        dodaId,
        numeroIntegracion: recheck.numeroIntegracion ?? doda.numero_integracion,
        satStatus: recheck.satStatus,
      });

      if (doda.created_by) {
        const integrationNumber =
          recheck.numeroIntegracion ?? doda.numero_integracion ?? dodaId.slice(0, 8);
        try {
          await sendPushNotification(
            doda.created_by,
            "🟢 DODA Liberado",
            `El número ${integrationNumber} ha sido desaduanado`,
            "/dashboard/dodas",
            "notif_doda_alert",
          );
        } catch (pushError) {
          console.error("[doda-service] push notification failed", dodaId, pushError);
        }
      }
    }

    console.log("[doda-service] recheck persisted", {
      dodaId,
      lookupStatus: recheck.lookupStatus,
      satStatus: recheck.satStatus,
      resolved,
      checkCount: nextCheckCount,
      lookupError: recheck.lookupError,
    });

    return {
      ok: true,
      doda: updated as DodaRecord,
      previousStatus,
      resolved,
      lookupStatus: recheck.lookupStatus,
      lookupError: recheck.lookupError,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al consultar SAT";
    console.error("[doda-service] performDodaRecheck threw", { dodaId, error });
    return { ok: false, status: 500, error: message };
  }
}

/**
 * Looks up an existing DODA already confirmed as "DESADUANAMIENTO LIBRE" for
 * this integration number, if one exists — used to avoid creating duplicates.
 */
async function findResolvedDodaByIntegrationNumber(
  supabase: SupabaseClient,
  integrationNumber: string,
): Promise<DodaRecord | null> {
  const { data, error } = await supabase
    .from("dodas")
    .select(DODA_RECORD_SELECT)
    .eq("numero_integracion", integrationNumber)
    .eq("sat_status", DODA_RESOLVED_SAT_STATUS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as DodaRecord;
}

/** Reconstructs a ProcessDodaLookupResult from an already-resolved dodas row. */
function lookupResultFromResolvedDoda(doda: DodaRecord): ProcessDodaLookupResult {
  return {
    lookupStatus: "verificado",
    validatorUrl: doda.qr_validator_url,
    numeroIntegracion: doda.numero_integracion,
    satStatus: doda.sat_status,
    satDetails: parseSatDetails(doda.sat_details),
    pedimentoInfo: {
      tipoPedimento: doda.tipo_pedimento,
      pedimento: doda.pedimento,
      remesasPresentadas: doda.remesas_presentadas,
      clavePedimento: doda.clave_pedimento,
      datosVehiculo: doda.datos_vehiculo,
      cantidadMercancia: doda.cantidad_mercancia,
    },
    lookupError: null,
    lookedUpAt: doda.looked_up_at ?? doda.created_at ?? new Date().toISOString(),
    debugRawQrPayload: null,
  };
}

/**
 * Creates a dodas row from an integration number, scrapes SAT, and saves results.
 * If this number was already confirmed as "DESADUANAMIENTO LIBRE", returns the
 * existing record instead of creating a duplicate or re-scraping the SAT.
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

  const existingResolved = await findResolvedDodaByIntegrationNumber(
    supabase,
    trimmed,
  );
  if (existingResolved) {
    return {
      lookup: lookupResultFromResolvedDoda(existingResolved),
      doda: existingResolved,
    };
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
      tipo_pedimento: lookup.pedimentoInfo?.tipoPedimento ?? null,
      pedimento: lookup.pedimentoInfo?.pedimento ?? null,
      remesas_presentadas: lookup.pedimentoInfo?.remesasPresentadas ?? null,
      clave_pedimento: lookup.pedimentoInfo?.clavePedimento ?? null,
      datos_vehiculo: lookup.pedimentoInfo?.datosVehiculo ?? null,
      cantidad_mercancia: lookup.pedimentoInfo?.cantidadMercancia ?? null,
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
