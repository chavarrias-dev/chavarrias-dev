import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { processDodaSatRecheck } from "@/lib/doda-lookup";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import {
  notifyStaffDodaStatusChange,
  type MonitoredDodaRow,
} from "@/lib/notifications";

const MAX_DODAS_PER_RUN = 5;
const DELAY_BETWEEN_CHECKS_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusesEqual(a: string | null, b: string | null): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export type CheckMonitoredDodasResult = {
  checked: number;
  changed: number;
  skipped: number;
  errors: number;
};

/**
 * Re-checks monitored DODAs sequentially to stay within serverless limits.
 */
export async function checkMonitoredDodas(
  supabase: SupabaseClient,
): Promise<CheckMonitoredDodasResult> {
  const { data: rows, error } = await supabase
    .from("dodas")
    .select(
      "id, numero_integracion, qr_validator_url, sat_status, sat_details, lookup_status, lookup_error, last_checked_at",
    )
    .eq("is_monitored", true)
    .eq("is_resolved", false)
    .not("qr_validator_url", "is", null)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_DODAS_PER_RUN);

  if (error) {
    throw new Error(error.message);
  }

  const dodas = (rows ?? []) as MonitoredDodaRow[];
  const result: CheckMonitoredDodasResult = {
    checked: 0,
    changed: 0,
    skipped: 0,
    errors: 0,
  };

  for (let index = 0; index < dodas.length; index += 1) {
    const doda = dodas[index]!;
    const validatorUrl = doda.qr_validator_url;
    if (!validatorUrl) {
      result.skipped += 1;
      continue;
    }

    if (index > 0) {
      await sleep(DELAY_BETWEEN_CHECKS_MS);
    }

    try {
      const previousStatus = doda.sat_status;
      const recheck = await processDodaSatRecheck(validatorUrl);
      const checkedAt = recheck.lookedUpAt;

      if (
        recheck.lookupStatus === "verificado" &&
        recheck.satStatus &&
        !statusesEqual(previousStatus, recheck.satStatus)
      ) {
        const { error: updateError } = await supabase
          .from("dodas")
          .update({
            sat_status: recheck.satStatus,
            sat_details: recheck.satDetails
              ? JSON.stringify(recheck.satDetails)
              : null,
            numero_integracion:
              recheck.numeroIntegracion ?? doda.numero_integracion,
            lookup_status: "verificado",
            lookup_error: null,
            looked_up_at: checkedAt,
            last_checked_at: checkedAt,
            is_resolved: true,
          })
          .eq("id", doda.id);

        if (updateError) {
          result.errors += 1;
          console.error("[doda-cron] update failed", doda.id, updateError);
          continue;
        }

        await notifyStaffDodaStatusChange(supabase, {
          dodaId: doda.id,
          numeroIntegracion:
            recheck.numeroIntegracion ?? doda.numero_integracion,
          previousStatus,
          newStatus: recheck.satStatus,
        });

        result.changed += 1;
        result.checked += 1;
        continue;
      }

      const { error: touchError } = await supabase
        .from("dodas")
        .update({
          last_checked_at: checkedAt,
          ...(recheck.lookupStatus === "verificado" && recheck.satStatus
            ? {
                sat_status: recheck.satStatus,
                sat_details: recheck.satDetails
                  ? JSON.stringify(recheck.satDetails)
                  : null,
                numero_integracion:
                  recheck.numeroIntegracion ?? doda.numero_integracion,
                lookup_status: "verificado",
                lookup_error: null,
                looked_up_at: checkedAt,
              }
            : {
                lookup_error: recheck.lookupError,
              }),
        })
        .eq("id", doda.id);

      if (touchError) {
        result.errors += 1;
        console.error("[doda-cron] touch failed", doda.id, touchError);
        continue;
      }

      result.checked += 1;
    } catch (cronError) {
      result.errors += 1;
      console.error("[doda-cron] check failed", doda.id, cronError);
    }
  }

  return result;
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
