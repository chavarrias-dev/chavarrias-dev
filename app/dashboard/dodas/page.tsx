import Link from "next/link";
import { redirect } from "next/navigation";
import type { ClientOption } from "@/components/clients/types";
import { DodaLookupUploader } from "@/components/dodas/doda-lookup-uploader";
import { DodaLookupStatusBadge } from "@/components/dodas/doda-lookup-status-badge";
import { parseSatDetails } from "@/lib/decode-doda-qr";
import type { DodaLookupStatus, DodaRecord } from "@/lib/doda-types";
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
      .select(
        "id, cliente_id, pedimento_id, numero_integracion, archivo_url, qr_validator_url, sat_status, sat_details, lookup_status, lookup_error, looked_up_at, whatsapp_phone, source, notas, created_at",
      )
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
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          DODA
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Consulta automática del estado en el validador QR del SAT.
        </p>
      </div>

      <DodaLookupUploader clients={clients} />

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
            <table className="w-full min-w-[920px] text-left text-sm">
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

                  return (
                    <tr
                      key={doda.id}
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
