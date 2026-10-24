import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendDodaResolvedExternalNotifications } from "@/lib/doda-external-notifications";
import { isDodaResolvedSatStatus } from "@/lib/doda-monitoring-constants";
import { processDodaSatRecheck } from "@/lib/doda-sat-recheck";
import {
  DODA_RECORD_SELECT,
  type DodaLookupStatus,
  type DodaRecord,
} from "@/lib/doda-types";
import { notifyStaffDodaMonitoringComplete } from "@/lib/notifications";
import { sendPushNotification } from "@/lib/web-push";

export type PerformDodaRecheckOutcome =
  | {
      ok: true;
      doda: DodaRecord;
      previousStatus: string | null;
      resolved: boolean;
      lookupStatus: DodaLookupStatus;
      lookupError: string | null;
    }
  | { ok: false; status: number; error: string };

/** Re-scrape SAT validator — sin sharp/pdfjs (bundle liviano en Vercel). */
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
          console.error("[doda-recheck] push notification failed", dodaId, pushError);
        }
      }

      const integrationNumber =
        recheck.numeroIntegracion ?? doda.numero_integracion ?? dodaId.slice(0, 8);
      try {
        const external = await sendDodaResolvedExternalNotifications(supabase, {
          dodaId,
          clienteId: doda.cliente_id,
          createdBy: doda.created_by,
          integrationNumber,
          previousStatus,
          newStatus: recheck.satStatus!,
          changedAt: checkedAt,
        });

        await supabase
          .from("dodas")
          .update({
            notification_sent_at: external.notification_sent_at,
            notification_error: external.notification_error,
          })
          .eq("id", dodaId);
      } catch (externalError) {
        console.error("[doda-recheck] external notifications failed", dodaId, externalError);
      }
    }

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
    console.error("[doda-recheck] performDodaRecheck threw", { dodaId, error });
    return { ok: false, status: 500, error: message };
  }
}
