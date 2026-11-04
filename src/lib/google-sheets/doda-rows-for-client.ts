import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";
import { DODA_RECORD_SELECT, type DodaLookupStatus, type DodaRecord } from "@/lib/doda-types";

export async function attachClientNamesFromIds(
  supabase: SupabaseClient,
  clientId: string,
): Promise<DodaDashboardRow[]> {
  const [{ data: clientRow }, { data: dodasData }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("dodas")
      .select(DODA_RECORD_SELECT)
      .eq("cliente_id", clientId)
      .or("is_resolved.eq.true,is_monitored.eq.true"),
  ]);

  const clientName =
    (clientRow as { full_name?: string } | null)?.full_name?.trim() ?? null;

  return ((dodasData ?? []) as DodaRecord[]).map((row) => ({
    ...row,
    lookup_status: row.lookup_status as DodaLookupStatus,
    check_count: row.check_count ?? 0,
    client_name: clientName,
  }));
}
