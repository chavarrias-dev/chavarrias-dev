import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";
import { DODA_RECORD_SELECT, type DodaLookupStatus, type DodaRecord } from "@/lib/doda-types";

const ACTIVE_MONITORING_LIMIT = 2000;
const RESOLVED_HISTORY_LIMIT = 500;

function attachClientNames(
  dodasData: DodaRecord[] | null,
  clientsData: { id: string; full_name: string }[] | null,
): DodaDashboardRow[] {
  const clientsById = new Map(
    (clientsData ?? []).map((client) => [client.id, client.full_name]),
  );

  return (dodasData ?? []).map((row) => ({
    ...row,
    lookup_status: row.lookup_status as DodaLookupStatus,
    check_count: row.check_count ?? 0,
    client_name: row.cliente_id
      ? (clientsById.get(row.cliente_id) ?? null)
      : null,
  }));
}

function mergeDodaRowsWithoutDuplicates(
  primary: DodaRecord[],
  secondary: DodaRecord[],
): DodaRecord[] {
  const seen = new Set(primary.map((row) => row.id));
  const merged = [...primary];
  for (const row of secondary) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}

export async function fetchDodaDashboardRows(
  supabase: SupabaseClient,
): Promise<DodaDashboardRow[]> {
  const [
    { data: clientsData },
    { data: monitoredData, error: monitoredError },
    { data: resolvedData, error: resolvedError },
  ] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase
      .from("dodas")
      .select(DODA_RECORD_SELECT)
      .eq("is_monitored", true)
      .eq("is_resolved", false)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(ACTIVE_MONITORING_LIMIT),
    supabase
      .from("dodas")
      .select(DODA_RECORD_SELECT)
      .eq("is_resolved", true)
      .order("last_checked_at", { ascending: false, nullsFirst: false })
      .limit(RESOLVED_HISTORY_LIMIT),
  ]);

  if (monitoredError) {
    throw new Error(monitoredError.message);
  }
  if (resolvedError) {
    throw new Error(resolvedError.message);
  }

  const merged = mergeDodaRowsWithoutDuplicates(
    (monitoredData ?? []) as DodaRecord[],
    (resolvedData ?? []) as DodaRecord[],
  );

  return attachClientNames(merged, clientsData);
}

/** All resolved DODAs, newest first — backs the "Últimos resultados" history page. */
export async function fetchResolvedDodaHistory(
  supabase: SupabaseClient,
): Promise<DodaDashboardRow[]> {
  const [{ data: clientsData }, { data: dodasData }] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase
      .from("dodas")
      .select(DODA_RECORD_SELECT)
      .eq("is_resolved", true)
      .order("looked_up_at", { ascending: false, nullsFirst: false })
      .limit(200),
  ]);

  return attachClientNames(dodasData as DodaRecord[] | null, clientsData);
}
