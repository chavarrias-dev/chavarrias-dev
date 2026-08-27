import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { processDodaSatRecheck } from "@/lib/doda-sat-recheck";
import {
  isDodaResolvedSatStatus,
  MAX_DODAS_PER_CRON_RUN,
} from "@/lib/doda-monitoring-constants";
import { DODA_RECORD_SELECT, type DodaLookupStatus } from "@/lib/doda-types";
import {
  notifyStaffDodaMonitoringComplete,
  notifyStaffDodaStatusChange,
  type MonitoredDodaRow,
} from "@/lib/notifications";
import { sendDodaResolvedExternalNotifications } from "@/lib/doda-external-notifications";
import { sendPushNotification } from "@/lib/web-push";

const DELAY_BETWEEN_CHECKS_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusesEqual(a: string | null, b: string | null): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export type DodaCronItemResult = {
  id: string;
  numero_integracion: string | null;
  previous_status: string | null;
  new_status: string | null;
  lookup_status: DodaLookupStatus;
  check_count: number;
  completed: boolean;
  error?: string;
};

export type ProcessMonitoredDodasBatchResult = {
  processed: number;
  results: DodaCronItemResult[];
};

export type CheckMonitoredDodasResult = {
  checked: number;
  changed: number;
  skipped: number;
  errors: number;
};

/**
 * Fetches active monitored DODAs (is_monitored = active monitoring flag),
 * oldest last_checked_at first, excluding those already at DESADUANAMIENTO LIBRE.
 */
async function fetchMonitoredDodaBatch(
  supabase: SupabaseClient,
): Promise<MonitoredDodaRow[]> {
  const { data: rows, error } = await supabase
    .from("dodas")
    .select(
      "id, cliente_id, created_by, numero_integracion, qr_validator_url, sat_status, sat_details, lookup_status, lookup_error, last_checked_at, check_count",
    )
    .eq("is_monitored", true)
    .eq("is_resolved", false)
    .not("qr_validator_url", "is", null)
    .or("sat_status.is.null,sat_status.neq.DESADUANAMIENTO LIBRE")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_DODAS_PER_CRON_RUN);

  if (error) {
    throw new Error(error.message);
  }

  return (rows ?? []) as MonitoredDodaRow[];
}

/**
 * Re-checks up to 5 monitored DODAs sequentially (Vercel free tier ~10s limit).
 */
export async function processMonitoredDodasBatch(
  supabase: SupabaseClient,
): Promise<ProcessMonitoredDodasBatchResult> {
  const dodas = await fetchMonitoredDodaBatch(supabase);
  const results: DodaCronItemResult[] = [];

  for (let index = 0; index < dodas.length; index += 1) {
    const doda = dodas[index]!;
    const validatorUrl = doda.qr_validator_url;
    const previousStatus = doda.sat_status;
    const nextCheckCount = (doda.check_count ?? 0) + 1;

    if (!validatorUrl) {
      results.push({
        id: doda.id,
        numero_integracion: doda.numero_integracion,
        previous_status: previousStatus,
        new_status: previousStatus,
        lookup_status: doda.lookup_status,
        check_count: doda.check_count ?? 0,
        completed: false,
        error: "Sin URL del validador SAT",
      });
      continue;
    }

    if (index > 0) {
      await sleep(DELAY_BETWEEN_CHECKS_MS);
    }

    try {
      const recheck = await processDodaSatRecheck(validatorUrl);
      const checkedAt = recheck.lookedUpAt;
      const newStatus = recheck.satStatus;
      const resolved =
        recheck.lookupStatus === "verificado" &&
        isDodaResolvedSatStatus(newStatus);

      const baseUpdate = {
        last_checked_at: checkedAt,
        looked_up_at: checkedAt,
        check_count: nextCheckCount,
        ...(recheck.lookupStatus === "verificado" && newStatus
          ? {
              sat_status: newStatus,
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
              lookup_status: "verificado" as const,
              lookup_error: null,
            }
          : {
              lookup_error: recheck.lookupError,
            }),
        ...(resolved
          ? {
              is_monitored: false,
              is_resolved: true,
            }
          : {}),
      };

      const { error: updateError } = await supabase
        .from("dodas")
        .update(baseUpdate)
        .eq("id", doda.id);

      if (updateError) {
        results.push({
          id: doda.id,
          numero_integracion: doda.numero_integracion,
          previous_status: previousStatus,
          new_status: newStatus,
          lookup_status: recheck.lookupStatus,
          check_count: doda.check_count ?? 0,
          completed: false,
          error: updateError.message,
        });
        console.error("[doda-cron] update failed", doda.id, updateError);
        continue;
      }

      if (resolved) {
        await notifyStaffDodaMonitoringComplete(supabase, {
          dodaId: doda.id,
          numeroIntegracion:
            recheck.numeroIntegracion ?? doda.numero_integracion,
          satStatus: newStatus!,
        });

        const integrationNumber =
          recheck.numeroIntegracion ?? doda.numero_integracion ?? doda.id.slice(0, 8);

        if (doda.created_by) {
          try {
            await sendPushNotification(
              doda.created_by,
              "🟢 DODA Liberado",
              `El número ${integrationNumber} ha sido desaduanado`,
              "/dashboard/dodas",
              "notif_doda_alert",
            );
          } catch (pushError) {
            console.error("[doda-cron] push notification failed", doda.id, pushError);
          }
        }

        let notificationSentAt: string | null = null;
        let notificationError: string | null = null;

        try {
          const external = await sendDodaResolvedExternalNotifications(
            supabase,
            {
              dodaId: doda.id,
              clienteId: doda.cliente_id,
              createdBy: doda.created_by,
              integrationNumber,
              previousStatus,
              newStatus: newStatus!,
              changedAt: checkedAt,
            },
          );
          notificationSentAt = external.notification_sent_at;
          notificationError = external.notification_error;
        } catch (externalError) {
          notificationError =
            externalError instanceof Error
              ? externalError.message
              : "Error al enviar notificaciones externas";
          console.error(
            "[doda-cron] external notifications failed",
            doda.id,
            externalError,
          );
        }

        const { error: notificationTrackError } = await supabase
          .from("dodas")
          .update({
            notification_sent_at: notificationSentAt,
            notification_error: notificationError,
          })
          .eq("id", doda.id);

        if (notificationTrackError) {
          console.error(
            "[doda-cron] failed to persist notification tracking",
            doda.id,
            notificationTrackError,
          );
        }
      } else if (
        recheck.lookupStatus === "verificado" &&
        newStatus &&
        !statusesEqual(previousStatus, newStatus)
      ) {
        await notifyStaffDodaStatusChange(supabase, {
          dodaId: doda.id,
          numeroIntegracion:
            recheck.numeroIntegracion ?? doda.numero_integracion,
          previousStatus,
          newStatus,
        });
      }

      results.push({
        id: doda.id,
        numero_integracion: recheck.numeroIntegracion ?? doda.numero_integracion,
        previous_status: previousStatus,
        new_status: newStatus,
        lookup_status: recheck.lookupStatus,
        check_count: nextCheckCount,
        completed: resolved,
        ...(recheck.lookupError ? { error: recheck.lookupError } : {}),
      });
    } catch (cronError) {
      const message =
        cronError instanceof Error ? cronError.message : "Error en consulta SAT";
      console.error("[doda-cron] check failed", doda.id, cronError);

      await supabase
        .from("dodas")
        .update({
          last_checked_at: new Date().toISOString(),
          check_count: nextCheckCount,
          lookup_error: message,
        })
        .eq("id", doda.id);

      results.push({
        id: doda.id,
        numero_integracion: doda.numero_integracion,
        previous_status: previousStatus,
        new_status: previousStatus,
        lookup_status: doda.lookup_status,
        check_count: nextCheckCount,
        completed: false,
        error: message,
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}

/** @deprecated Use processMonitoredDodasBatch — kept for legacy cron route. */
export async function checkMonitoredDodas(
  supabase: SupabaseClient,
): Promise<CheckMonitoredDodasResult> {
  const batch = await processMonitoredDodasBatch(supabase);

  return {
    checked: batch.results.filter((item) => !item.error).length,
    changed: batch.results.filter(
      (item) =>
        item.completed ||
        (!!item.new_status &&
          !statusesEqual(item.previous_status, item.new_status)),
    ).length,
    skipped: batch.results.filter((item) => item.error === "Sin URL del validador SAT")
      .length,
    errors: batch.results.filter(
      (item) => item.error && item.error !== "Sin URL del validador SAT",
    ).length,
  };
}

export async function fetchMonitoredDodaById(
  supabase: SupabaseClient,
  dodaId: string,
) {
  const { data, error } = await supabase
    .from("dodas")
    .select(DODA_RECORD_SELECT)
    .eq("id", dodaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
