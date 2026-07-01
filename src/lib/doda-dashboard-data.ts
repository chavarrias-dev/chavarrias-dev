import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";
import { DODA_RECORD_SELECT, type DodaLookupStatus, type DodaRecord } from "@/lib/doda-types";

export async function fetchDodaDashboardRows(
  supabase: SupabaseClient,
): Promise<DodaDashboardRow[]> {
  const [{ data: clientsData }, { data: dodasData }] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase
      .from("dodas")
      .select(DODA_RECORD_SELECT)
      .or("is_monitored.eq.true,is_resolved.eq.true")
      .order("last_checked_at", { ascending: true, nullsFirst: false })
      .limit(500),
  ]);

  const clientsById = new Map(
    (clientsData ?? []).map((client) => [client.id, client.full_name as string]),
  );

  return ((dodasData ?? []) as DodaRecord[]).map((row) => ({
    ...row,
    lookup_status: row.lookup_status as DodaLookupStatus,
    check_count: row.check_count ?? 0,
    client_name: row.cliente_id
      ? (clientsById.get(row.cliente_id) ?? null)
      : null,
  }));
}
