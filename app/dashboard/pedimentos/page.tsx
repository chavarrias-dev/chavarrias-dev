import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PedimentoRow = {
  id: string;
  numero_pedimento: string;
  fecha: string;
  aduana: string;
  cliente_id: string | null;
  archivo_url: string | null;
  notas: string | null;
  created_at: string | null;
};

export default async function PedimentosListPage() {
  const supabase = await createSupabaseServerClient();
  const { data: pedimentos, error } = await supabase
    .from("pedimentos")
    .select(
      "id, numero_pedimento, fecha, aduana, cliente_id, archivo_url, notas, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name");

  const clientMap = new Map(
    (clientRows ?? []).map((c) => [c.id as string, c.full_name as string]),
  );

  const rows = (pedimentos ?? []) as PedimentoRow[];

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Pedimentos
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Listado de pedimentos registrados.
          </p>
        </div>
        <Link
          href="/dashboard/pedimentos/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
        >
          Nuevo pedimento
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Número</th>
                <th className="px-4 py-3 font-medium text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-medium text-slate-700">Aduana</th>
                <th className="px-4 py-3 font-medium text-slate-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Aún no hay pedimentos.{" "}
                    <Link
                      href="/dashboard/pedimentos/new"
                      className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                    >
                      Registrar el primero
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.numero_pedimento}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.fecha
                        ? new Date(p.fecha + "T12:00:00").toLocaleDateString(
                            "es-MX",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.aduana}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.cliente_id
                        ? (clientMap.get(p.cliente_id) ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.archivo_url ? (
                        <a
                          href={p.archivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
