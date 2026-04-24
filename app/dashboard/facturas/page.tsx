import Link from "next/link";
import { DeleteFacturaForm } from "@/components/facturas/delete-factura-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FacturaRow = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  cliente_id: string;
  archivo_url: string | null;
  notas: string | null;
  created_at: string | null;
};

export default async function FacturasListPage() {
  const supabase = await createSupabaseServerClient();
  const { data: facturas, error } = await supabase
    .from("facturas")
    .select(
      "id, numero_factura, fecha, monto, cliente_id, archivo_url, notas, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name");

  const clientMap = new Map(
    (clientRows ?? []).map((c) => [c.id as string, c.full_name as string]),
  );

  const rows = (facturas ?? []) as FacturaRow[];

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Facturas
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Listado de facturas registradas.
          </p>
        </div>
        <Link
          href="/dashboard/facturas/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
        >
          Nueva factura
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Número</th>
                <th className="px-4 py-3 font-medium text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-medium text-slate-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-slate-700">Monto</th>
                <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
                <th className="px-4 py-3 font-medium text-slate-700"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Aún no hay facturas.{" "}
                    <Link
                      href="/dashboard/facturas/new"
                      className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                    >
                      Registrar la primera
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {f.numero_factura}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {f.fecha
                        ? new Date(f.fecha + "T12:00:00").toLocaleDateString(
                            "es-MX",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {clientMap.get(f.cliente_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {Number(f.monto).toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {f.archivo_url ? (
                        <a
                          href={f.archivo_url}
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
                      {f.created_at
                        ? new Date(f.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/facturas/${f.id}/edit`}
                          className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                        >
                          Editar
                        </Link>
                        <DeleteFacturaForm facturaId={f.id} />
                      </div>
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
