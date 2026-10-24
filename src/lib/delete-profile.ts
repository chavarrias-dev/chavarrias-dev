import type { SupabaseClient } from "@supabase/supabase-js";
import { purgeProfileReferences } from "@/lib/purge-profile-references";

/** Borra referencias, fila en `profiles` y usuario en Auth. */
export async function deleteProfileCompletely(
  admin: SupabaseClient,
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const purged = await purgeProfileReferences(admin, profileId);
  if (!purged.ok) {
    return purged;
  }

  const { error: profileDelErr } = await admin
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (profileDelErr) {
    return { ok: false, error: profileDelErr.message };
  }

  const { error: authDelErr } = await admin.auth.admin.deleteUser(profileId);
  if (authDelErr) {
    return { ok: false, error: authDelErr.message };
  }

  return { ok: true };
}
