import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SettingsTabsClient } from "@/components/settings/settings-tabs-client";
import type { SettingsUserRow } from "@/components/settings/settings-users-section";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string; error?: string }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
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

  const role = await getUserRole(supabase, user.id);
  const isAdmin = profile?.role === "admin";
  const isStaff = role === "admin" || role === "empleado";

  const sp = await searchParams;
  const usersListError = sp.error ? decodeURIComponent(sp.error) : undefined;

  let usersRows: SettingsUserRow[] = [];
  let usersLoadError: string | undefined;

  if (isStaff) {
    const admin = createSupabaseAdminClient();
    const { data: profiles, error: usersError } = await admin
      .from("profiles")
      .select("id, email, role, full_name, created_at")
      .order("created_at", { ascending: false });

    usersRows = (profiles ?? []) as SettingsUserRow[];
    if (usersError) {
      usersLoadError = usersError.message;
    }
  }

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
          isStaff={isStaff}
          initialFullName={profile?.full_name ?? ""}
          initialEmail={profile?.email ?? user.email ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
          initialNotifDodaAlert={profile?.notif_doda_alert ?? true}
          initialNotifDocsAlert={profile?.notif_docs_alert ?? true}
          initialNotifMessagesAlert={profile?.notif_messages_alert ?? true}
          usersRows={usersRows}
          usersCanDelete={isAdmin}
          usersListError={usersListError}
          usersLoadError={usersLoadError}
        />
      </Suspense>
    </main>
  );
}
