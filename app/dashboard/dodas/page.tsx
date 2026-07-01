import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ClientOption } from "@/components/clients/types";
import { DodaHighlightOnQuery } from "@/components/dodas/doda-highlight-on-query";
import { DodaPageLayout } from "@/components/dodas/doda-page-layout";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";
import { DODA_RECORD_SELECT, type DodaLookupStatus, type DodaRecord } from "@/lib/doda-types";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const [{ data: clientsData }, { data: dodasData }] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase
      .from("dodas")
      .select(DODA_RECORD_SELECT)
      .or("is_monitored.eq.true,is_resolved.eq.true")
      .order("last_checked_at", { ascending: true, nullsFirst: false })
      .limit(500),
  ]);

  const clients = (clientsData ?? []) as ClientOption[];
  const clientsById = new Map(clients.map((client) => [client.id, client.full_name]));
  const dodas: DodaDashboardRow[] = ((dodasData ?? []) as DodaRecord[]).map(
    (row) => ({
      ...row,
      lookup_status: row.lookup_status as DodaLookupStatus,
      check_count: row.check_count ?? 0,
      client_name: row.cliente_id
        ? (clientsById.get(row.cliente_id) ?? null)
        : null,
    }),
  );

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <Suspense fallback={null}>
        <DodaHighlightOnQuery dodaIds={dodas.map((doda) => doda.id)} />
      </Suspense>

      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          DODA
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Programa monitoreo continuo o realiza una consulta puntual en el
          validador QR del SAT.
        </p>
      </div>

      <DodaPageLayout clients={clients} dodas={dodas} />
    </main>
  );
}
