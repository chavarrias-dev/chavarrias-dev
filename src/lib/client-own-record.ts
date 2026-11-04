import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRole } from "@/lib/supabase/profile-role";

/** Client portal user linked by matching `clients.email` to auth email. */
export async function resolveOwnClientId(
  supabase: SupabaseClient,
  email: string | null | undefined,
): Promise<string | null> {
  const normalized = email?.trim();
  if (!normalized) {
    return null;
  }

  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? null;
}

export async function assertClientRecordAccess(
  supabase: SupabaseClient,
  role: ProfileRole | null,
  userEmail: string | null | undefined,
  clientId: string,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  if (role === "admin" || role === "empleado") {
    return { allowed: true };
  }

  if (role !== "cliente") {
    return { allowed: false, reason: "No autorizado" };
  }

  const ownClientId = await resolveOwnClientId(supabase, userEmail);
  if (!ownClientId || ownClientId !== clientId) {
    return {
      allowed: false,
      reason: "Solo puedes consultar tu propio estado de cuenta",
    };
  }

  return { allowed: true };
}
