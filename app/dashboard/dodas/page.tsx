import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ClientOption } from "@/components/clients/types";
import { DodaHighlightOnQuery } from "@/components/dodas/doda-highlight-on-query";
import { DodaLookupStatusBadge } from "@/components/dodas/doda-lookup-status-badge";
import { DodaToolsSection } from "@/components/dodas/doda-tools-section";
import { parseSatDetails } from "@/lib/doda-sat-details";
import { DODA_RECORD_SELECT, type DodaLookupStatus, type DodaRecord } from "@/lib/doda-types";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DodaListRow = DodaRecord & {
  client_name: string | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monitoringLabel(doda: DodaListRow): string | null {
  if (!doda.is_monitored) {
    return null;
  }
  if (doda.is_resolved) {
    return "Monitoreo completado";
  }
  return "Monitoreo activo";
}

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
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const clients = (clientsData ?? []) as ClientOption[];
  const clientsById = new Map(clients.map((client) => [client.id, client.full_name]));
  const dodas: DodaListRow[] = ((dodasData ?? []) as DodaRecord[]).map(
    (row) => ({
      ...row,
      lookup_status: row.lookup_status as DodaLookupStatus,
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
          Consulta puntual o monitoreo continuo del estado en el validador QR del SAT.
        </p>
      </div>

      <DodaToolsSection clients={clients} />

      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Consultas recientes
          </h2>
        </div>

        {dodas.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">
            Aún no hay consultas DODA registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Integración
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Estado SAT
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Consulta
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Monitoreo
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Fecha
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Archivo
                  </th>
                </tr>
              </thead>
              <tbody>
                {dodas.map((doda) => {
                  const details = parseSatDetails(doda.sat_details);
                  const pedimentoInfo =
                    details["Pedimento"] ??
                    details["Información de Pedimento(s)"] ??
                    null;
                  const monitoring = monitoringLabel(doda);

                  return (
                    <tr
                      key={doda.id}
                      id={`doda-row-${doda.id}`}
                      className="table-row-interactive border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {doda.numero_integracion ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">
                            {doda.sat_status ?? "—"}
                          </p>
                          {doda.lookup_status === "revision_manual" &&
                          doda.lookup_error ? (
                            <p className="text-xs text-amber-800">
                              {doda.lookup_error}
                            </p>
                          ) : null}
                          {pedimentoInfo ? (
                            <p className="text-xs text-slate-500">
                              Pedimento: {pedimentoInfo}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DodaLookupStatusBadge status={doda.lookup_status} />
                      </td>
                      <td className="px-4 py-3">
                        {monitoring ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              doda.is_resolved
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-sky-200 bg-sky-50 text-sky-800"
                            }`}
                          >
                            {monitoring}
                          </span>
                        ) : (
                          "—"
                        )}
                        {doda.last_checked_at ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Última revisión: {formatDateTime(doda.last_checked_at)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="space-y-1">
                          <p>{doda.client_name ?? "—"}</p>
                          {doda.source === "whatsapp" && doda.whatsapp_phone ? (
                            <p className="text-xs text-slate-500">
                              WhatsApp: {doda.whatsapp_phone}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(doda.looked_up_at ?? doda.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {doda.archivo_url ? (
                          <Link
                            href={doda.archivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                          >
                            Ver archivo
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
