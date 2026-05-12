import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRole = "admin" | "empleado" | "cliente";

/**
 * Loads the user's role from `profiles`. Returns null if missing or on error.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: ProfileRole | null }>();

  if (error || data?.role == null) {
    return null;
  }
  return data.role;
}
