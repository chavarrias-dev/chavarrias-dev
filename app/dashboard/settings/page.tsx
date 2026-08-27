import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SettingsProfileRow = {
  full_name: string | null;
  email: string;
  role: string | null;
  avatar_url: string | null;
  notif_doda_alert: boolean;
  notif_docs_alert: boolean;
  notif_messages_alert: boolean;
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, email, role, avatar_url, notif_doda_alert, notif_docs_alert, notif_messages_alert",
    )
    .eq("id", user.id)
    .maybeSingle<SettingsProfileRow>();

  const isAdmin = profile?.role === "admin";

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Configuración
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Administra tu cuenta, seguridad y notificaciones.
        </p>
      </div>

      <SettingsTabs
        isAdmin={isAdmin}
        initialFullName={profile?.full_name ?? ""}
        initialEmail={profile?.email ?? user.email ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
        initialNotifDodaAlert={profile?.notif_doda_alert ?? true}
        initialNotifDocsAlert={profile?.notif_docs_alert ?? true}
        initialNotifMessagesAlert={profile?.notif_messages_alert ?? true}
      />
    </main>
  );
}
