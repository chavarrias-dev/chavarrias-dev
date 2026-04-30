import Link from "next/link";
import { DeletePedimentoForm } from "@/components/pedimentos/delete-pedimento-form";
import { getUserRole } from "@/lib/supabase/middleware";
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

type ClientOption = {
  id: string;
  full_name: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type PageProps = {
  searchParams: Promise<{
    numero?: string;
    cliente_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }>;
};

export default async function PedimentosListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const numeroFilter = sp.numero?.trim() ?? "";
  const clienteFilter = sp.cliente_id?.trim() ?? "";
  const fechaDesde = sp.fecha_desde?.trim() ?? "";
  const fechaHasta = sp.fecha_hasta?.trim() ?? "";

  const hasFilters = Boolean(
    numeroFilter || clienteFilter || fechaDesde || fechaHasta,
  );

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserRole(supabase, user.id) : null;
  const isStaff = role === "admin" || role === "empleado";

  let clienteIdForCliente: string | null = null;
  if (!isStaff && user?.email) {
    const { data: match } = await supabase
      .from("clients")
      .select("id")
      .eq("email", user.email.trim())
      .maybeSingle();
    clienteIdForCliente = (match as { id: string } | null)?.id ?? null;
  }

  const clienteFilterScoped = isStaff
    ? clienteFilter
    : clienteIdForCliente;

  let query = supabase
    .from("pedimentos")
    .select(
      "id, numero_pedimento, fecha, aduana, cliente_id, archivo_url, notas, created_at",
    );

  if (numeroFilter) {
    query = query.ilike("numero_pedimento", `%${numeroFilter}%`);
  }
  if (clienteFilterScoped) {
    query = query.eq("cliente_id", clienteFilterScoped);
  }
  if (fechaDesde) {
    query = query.gte("fecha", fechaDesde);
  }
  if (fechaHasta) {
    query = query.lte("fecha", fechaHasta);
  }

  let pedimentos: PedimentoRow[] | null = null;
  let error: { message: string } | null = null;

  if (!isStaff && !clienteIdForCliente) {
    pedimentos = [];
  } else {
    const result = await query.order("created_at", {
      ascending: false,
    });
    pedimentos = result.data as PedimentoRow[] | null;
    error = result.error;
  }

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  let clientsList = (clientRows ?? []) as ClientOption[];
  if (!isStaff && clienteIdForCliente) {
    clientsList = clientsList.filter((c) => c.id === clienteIdForCliente);
  }

  const clientMap = new Map(
    clientsList.map((c) => [c.id, c.full_name]),
  );

  const rows = (pedimentos ?? []) as PedimentoRow[];

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Pedimentos
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Listado de pedimentos registrados.
          </p>
        </div>
        {isStaff ? (
          <Link
            href="/dashboard/pedimentos/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
          >
            Nuevo pedimento
          </Link>
        ) : null}
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-slate-700">Filtros</h2>
        <form method="GET" action="/dashboard/pedimentos" className="space-y-4">
          <div
            className={`grid grid-cols-1 gap-4 ${isStaff ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}
          >
            <div>
              <label
                htmlFor="numero"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Número de pedimento
              </label>
              <input
                id="numero"
                name="numero"
                type="text"
                defaultValue={numeroFilter}
                placeholder="Buscar…"
                className={fieldClass}
              />
            </div>
            <div className={!isStaff ? "hidden" : undefined}>
              <label
                htmlFor="cliente_id"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Cliente
              </label>
              <select
                id="cliente_id"
                name="cliente_id"
                defaultValue={clienteFilter}
                className={fieldClass}
              >
                <option value="">Todos los clientes</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="fecha_desde"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fecha desde
              </label>
              <input
                id="fecha_desde"
                name="fecha_desde"
                type="date"
                defaultValue={fechaDesde}
                className={fieldClass}
              />
            </div>
            <div>
              <label
                htmlFor="fecha_hasta"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fecha hasta
              </label>
              <input
                id="fecha_hasta"
                name="fecha_hasta"
                type="date"
                defaultValue={fechaHasta}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
            >
              Buscar
            </button>
            <Link
              href="/dashboard/pedimentos"
              className="inline-flex h-10 items-center justify-center text-center text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline sm:justify-end"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </section>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Número</th>
                <th className="px-4 py-3 font-medium text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-medium text-slate-700">Aduana</th>
                <th className="px-4 py-3 font-medium text-slate-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
                {isStaff ? (
                  <th className="px-4 py-3 font-medium text-slate-700"> </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={isStaff ? 7 : 6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    {hasFilters ? (
                      <>
                        No hay resultados con estos filtros.{" "}
                        <Link
                          href="/dashboard/pedimentos"
                          className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                        >
                          Limpiar filtros
                        </Link>
                      </>
                    ) : (
                      <>
                        {!isStaff && !clienteIdForCliente ? (
                          "Tu cuenta no está vinculada a un cliente en el sistema."
                        ) : (
                          <>
                            Aún no hay pedimentos.{" "}
                            {isStaff ? (
                              <Link
                                href="/dashboard/pedimentos/new"
                                className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                              >
                                Registrar el primero
                              </Link>
                            ) : null}
                          </>
                        )}
                      </>
                    )}
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
                    <td className="px-4 py-3 text-slate-700">
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
                    {isStaff ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/pedimentos/${p.id}/edit`}
                            className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                          >
                            Editar
                          </Link>
                          <DeletePedimentoForm pedimentoId={p.id} />
                        </div>
                      </td>
                    ) : null}
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
