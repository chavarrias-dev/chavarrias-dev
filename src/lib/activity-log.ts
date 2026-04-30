import type { SupabaseClient } from "@supabase/supabase-js";

export type LogActivityInput = {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
};

/**
 * Records an audit row in `activity_logs`. Failures are ignored so mutations still succeed.
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput,
): Promise<void> {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: input.userId,
    user_email: input.userEmail,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_name: input.entityName,
  });

  if (error && process.env.NODE_ENV === "development") {
    console.error("[activity_logs]", error.message);
  }
}
