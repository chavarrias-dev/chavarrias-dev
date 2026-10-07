import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ClientOption } from "@/components/clients/types";
import { DodaHighlightOnQuery } from "@/components/dodas/doda-highlight-on-query";
import { DodaPageLayout } from "@/components/dodas/doda-page-layout";
import { fetchDodaDashboardRows } from "@/lib/doda-dashboard-data";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DASHBOARD_PAGE_MAIN_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboard-layout";

export default async function DodasPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    redirect("/dashboard");
  }

  const [{ data: clientsData }, dodas] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    fetchDodaDashboardRows(supabase),
  ]);

  const clients = (clientsData ?? []) as ClientOption[];
  const isAdmin = role === "admin";

  return (
    <main className={DASHBOARD_PAGE_MAIN_CLASS}>
      <Suspense fallback={null}>
        <DodaHighlightOnQuery dodaIds={dodas.map((doda) => doda.id)} />
      </Suspense>

      <div className="mb-6 sm:mb-8">
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>DODA</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Programa monitoreo continuo o realiza una consulta puntual en el
          validador QR del SAT.
        </p>
      </div>

      <DodaPageLayout clients={clients} dodas={dodas} isAdmin={isAdmin} />
    </main>
  );
}
