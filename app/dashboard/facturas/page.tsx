import Link from "next/link";
import { Pencil } from "lucide-react";
import { MxDateInput } from "@/components/forms/mx-date-input";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import { DeleteFacturaForm } from "@/components/facturas/delete-factura-form";
import { FacturasClientExportButton } from "@/components/facturas/facturas-client-export-button";
import { normalizeFormDateToIso } from "@/lib/mx-date";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DASHBOARD_PAGE_MAIN_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
  DASHBOARD_TABLE_SCROLL_CLASS,
} from "@/lib/dashboard-layout";

type FacturaRow = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  cliente_id: string;
  archivo_url: string | null;
  notas: string | null;
  correos_adicionales: string | null;
  created_at: string | null;
};

type ClientOption = {
  id: string;
  full_name: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function facturaMonthKey(fecha: string | null | undefined): string {
  if (!fecha) return "sin-fecha";
  const d = fecha.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.slice(0, 7) : "sin-fecha";
}

function formatFacturaMonthHeading(monthKey: string): string {
  if (monthKey === "sin-fecha") return "Sin fecha";
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  const label = new Date(year, month - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupFacturasByMonth(
  rows: FacturaRow[],
): { monthKey: string; items: FacturaRow[] }[] {
  const map = new Map<string, FacturaRow[]>();
  for (const row of rows) {
    const key = facturaMonthKey(row.fecha);
    const list = map.get(key);
    if (list) {
      list.push(row);
    } else {
      map.set(key, [row]);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "sin-fecha") return 1;
      if (b === "sin-fecha") return -1;
      return a.localeCompare(b);
    })
    .map(([monthKey, items]) => ({ monthKey, items }));
}

function FacturaArchivoLink({ href }: { href: string }) {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  const isZip = path.toLowerCase().endsWith(".zip");
  if (!isZip && !path.toLowerCase().endsWith(".pdf")) {
    return <ArchiveFileLink href={href} />;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 font-medium text-[#227DE8] underline-offset-2 hover:underline"
    >
      <span aria-hidden>{isZip ? "🗜️" : "📄"}</span>
      {isZip ? "Ver ZIP" : "Ver PDF"}
    </a>
  );
}

type PageProps = {
  searchParams: Promise<{
    numero?: string;
    cliente_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    ok?: string;
    aviso?: string;
  }>;
};

export default async function FacturasListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const numeroFilter = sp.numero?.trim() ?? "";
  const clienteFilter = sp.cliente_id?.trim() ?? "";
  const fechaDesde = normalizeFormDateToIso(sp.fecha_desde) ?? "";
  const fechaHasta = normalizeFormDateToIso(sp.fecha_hasta) ?? "";
  const savedNotice = sp.ok?.trim() ?? "";
  const emailNotice = sp.aviso?.trim() ?? "";

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
    .from("facturas")
    .select(
      "id, numero_factura, fecha, monto, cliente_id, archivo_url, notas, correos_adicionales, created_at",
    );

  if (numeroFilter) {
    query = query.ilike("numero_factura", `%${numeroFilter}%`);
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

  let facturas: FacturaRow[] | null = null;
  let error: { message: string } | null = null;

  if (!isStaff && !clienteIdForCliente) {
    facturas = [];
  } else {
    const result = await query
      .order("fecha", { ascending: true })
      .order("numero_factura", { ascending: true });
    facturas = result.data as FacturaRow[] | null;
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

  let exportClientMeta: {
    fullName: string;
    companyName: string | null;
    email: string | null;
    rfc: string | null;
  } | null = null;

  if (clienteFilterScoped) {
    const { data: clientDetail } = await supabase
      .from("clients")
      .select("full_name, company_name, email, rfc")
      .eq("id", clienteFilterScoped)
      .maybeSingle();
    if (clientDetail) {
      const c = clientDetail as {
        full_name: string;
        company_name: string | null;
        email: string | null;
        rfc: string | null;
      };
      exportClientMeta = {
        fullName: c.full_name,
        companyName: c.company_name,
        email: c.email,
        rfc: c.rfc,
      };
    }
  }

  const rows = (facturas ?? []) as FacturaRow[];
  const rowGroups = groupFacturasByMonth(rows);
  const colSpan = isStaff ? 7 : 6;

  return (
    <main className={`${DASHBOARD_PAGE_MAIN_CLASS} !pt-0`}>
      <div
        className="factura-testing-banner font-poppins sticky top-0 z-20 -mx-4 mb-5 sm:-mx-6 lg:-mx-10"
        role="status"
      >
        ⚠️ Módulo en modo de pruebas — El envío de emails puede no funcionar
        correctamente
      </div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Facturas</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Listado de facturas registradas.
          </p>
        </div>
        {isStaff ? (
          <Link
            href="/dashboard/facturas/new"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow sm:w-auto"
          >
            Nueva factura
          </Link>
        ) : null}
      </div>

      {savedNotice ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {savedNotice}
        </p>
      ) : null}
      {emailNotice ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {emailNotice}
        </p>
      ) : null}

      <section className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-sm font-medium text-slate-700">Filtros</h2>
        <form method="GET" action="/dashboard/facturas" className="space-y-4">
          <div
            className={`grid grid-cols-1 gap-4 ${isStaff ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"}`}
          >
            <div>
              <label
                htmlFor="numero"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Número de factura
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
              <MxDateInput
                id="fecha_desde"
                name="fecha_desde"
                defaultValue={fechaDesde}
                className={fieldClass}
                showHint={false}
              />
            </div>
            <div>
              <label
                htmlFor="fecha_hasta"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Fecha hasta
              </label>
              <MxDateInput
                id="fecha_hasta"
                name="fecha_hasta"
                defaultValue={fechaHasta}
                className={fieldClass}
                showHint={false}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow sm:w-auto"
              >
                Buscar
              </button>
              <Link
                href="/dashboard/facturas"
                className="inline-flex h-10 items-center justify-center text-center text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
              >
                Limpiar
              </Link>
            </div>
            {isStaff || clienteIdForCliente ? (
              <FacturasClientExportButton
                client={exportClientMeta}
                facturas={rows.map((f) => ({
                  numero_factura: f.numero_factura,
                  fecha: f.fecha,
                  monto: f.monto,
                  created_at: f.created_at,
                  archivo_url: f.archivo_url,
                  notas: f.notas,
                  correos_adicionales: f.correos_adicionales,
                }))}
              />
            ) : null}
          </div>
        </form>
      </section>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {error.message}
        </p>
      ) : null}

      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
          <table className="w-full min-w-[720px] text-left text-sm sm:min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Número</th>
                <th className="px-4 py-3 font-medium text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-medium text-slate-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-slate-700">Monto</th>
                <th className="px-4 py-3 font-medium text-slate-700">Archivo</th>
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
                          href="/dashboard/facturas"
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
                            Aún no hay facturas.{" "}
                            {isStaff ? (
                              <Link
                                href="/dashboard/facturas/new"
                                className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                              >
                                Registrar la primera
                              </Link>
                            ) : null}
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                rowGroups.flatMap(({ monthKey, items }) => [
                  <tr
                    key={`month-${monthKey}`}
                    className="border-b border-slate-200 bg-slate-50/90"
                  >
                    <td
                      colSpan={colSpan}
                      className="px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-600"
                    >
                      {formatFacturaMonthHeading(monthKey)}
                    </td>
                  </tr>,
                  ...items.map((f) => (
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
                          <FacturaArchivoLink href={f.archivo_url} />
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
                      {isStaff ? (
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                            <Link
                              href={`/dashboard/facturas/${f.id}/edit`}
                              aria-label="Editar"
                              className="inline-flex size-8 items-center justify-center rounded-md border border-[#227DE8]/30 text-[#227DE8] transition-colors duration-200 hover:bg-[#227DE8]/5 sm:size-auto sm:border-0 sm:bg-transparent sm:font-medium sm:underline-offset-2 sm:hover:underline"
                            >
                              <Pencil className="size-3.5 sm:hidden" aria-hidden />
                              <span className="hidden sm:inline">Editar</span>
                            </Link>
                            <DeleteFacturaForm facturaId={f.id} compact />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )),
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
