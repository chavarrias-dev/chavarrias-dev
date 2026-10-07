import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SettingsTabsClient } from "@/components/settings/settings-tabs-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DASHBOARD_PAGE_MAIN_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboard-layout";

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
    <main className={DASHBOARD_PAGE_MAIN_CLASS}>
      <div className="mb-6 sm:mb-8">
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Configuración</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Administra tu cuenta, seguridad y notificaciones.
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-slate-500">Cargando configuración…</p>
        }
      >
        <SettingsTabsClient
          isAdmin={isAdmin}
          initialFullName={profile?.full_name ?? ""}
          initialEmail={profile?.email ?? user.email ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          initialNotifDodaAlert={profile?.notif_doda_alert ?? true}
          initialNotifDocsAlert={profile?.notif_docs_alert ?? true}
          initialNotifMessagesAlert={profile?.notif_messages_alert ?? true}
        />
      </Suspense>
    </main>
  );
}
