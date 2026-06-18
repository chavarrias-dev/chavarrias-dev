import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DodaRecord } from "@/lib/doda-types";

type DodaStatusChangeInput = {
  dodaId: string;
  numeroIntegracion: string | null;
  previousStatus: string | null;
  newStatus: string;
};

function buildDodaStatusChangeMessage(input: DodaStatusChangeInput): string {
  const label = input.numeroIntegracion ?? input.dodaId.slice(0, 8);
  const previous = input.previousStatus?.trim() || "sin estatus";
  return `El DODA ${label} cambió de estatus: ${previous} → ${input.newStatus}`;
}

export async function notifyStaffDodaStatusChange(
  supabase: SupabaseClient,
  input: DodaStatusChangeInput,
): Promise<void> {
  const { data: staffRows, error: staffError } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "empleado"]);

  if (staffError || !staffRows?.length) {
    console.error("[notifications] failed to load staff profiles", staffError);
    return;
  }

  const message = buildDodaStatusChangeMessage(input);
  const rows = (staffRows as Array<{ id: string }>).map((profile) => ({
    user_id: profile.id,
    type: "doda_status_changed",
    related_id: input.dodaId,
    message,
    is_read: false,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("[notifications] failed to insert DODA notifications", error);
  }
}

export type MonitoredDodaRow = Pick<
  DodaRecord,
  | "id"
  | "numero_integracion"
  | "qr_validator_url"
  | "sat_status"
  | "sat_details"
  | "lookup_status"
  | "lookup_error"
  | "last_checked_at"
>;
