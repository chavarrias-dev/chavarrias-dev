import type { SupabaseClient } from "@supabase/supabase-js";

/** Elimina o desvincula filas que referencian `profiles.id` antes de borrar el perfil. */
export async function purgeProfileReferences(
  admin: SupabaseClient,
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const steps: Array<{ label: string; run: () => PromiseLike<{ error: { message: string } | null }> }> = [
    {
      label: "notifications",
      run: async () =>
        admin.from("notifications").delete().eq("user_id", profileId),
    },
    {
      label: "push_subscriptions",
      run: async () =>
        admin.from("push_subscriptions").delete().eq("user_id", profileId),
    },
    {
      label: "messages (sender)",
      run: async () =>
        admin.from("messages").delete().eq("sender_id", profileId),
    },
    {
      label: "messages (receiver)",
      run: async () =>
        admin.from("messages").delete().eq("receiver_id", profileId),
    },
    {
      label: "activity_logs",
      run: async () =>
        admin.from("activity_logs").delete().eq("user_id", profileId),
    },
    {
      label: "client_documents.subido_por",
      run: async () =>
        admin
          .from("client_documents")
          .update({ subido_por: null })
          .eq("subido_por", profileId),
    },
    {
      label: "dodas.created_by",
      run: async () =>
        admin.from("dodas").update({ created_by: null }).eq("created_by", profileId),
    },
    {
      label: "doda_notification_config.created_by",
      run: async () =>
        admin
          .from("doda_notification_config")
          .update({ created_by: null })
          .eq("created_by", profileId),
    },
  ];

  for (const step of steps) {
    const { error } = await step.run();
    if (error) {
      return {
        ok: false,
        error: `No se pudo limpiar ${step.label}: ${error.message}`,
      };
    }
  }

  const { count, error: countErr } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId);

  if (countErr) {
    return { ok: false, error: countErr.message };
  }
  if (count && count > 0) {
    const { error: retryErr } = await admin
      .from("notifications")
      .delete()
      .eq("user_id", profileId);
    if (retryErr) {
      return {
        ok: false,
        error: `No se pudieron eliminar las notificaciones: ${retryErr.message}`,
      };
    }
  }

  return { ok: true };
}
