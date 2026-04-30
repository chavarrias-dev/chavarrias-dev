import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteFacturaForm } from "@/components/facturas/delete-factura-form";
import { DeletePedimentoForm } from "@/components/pedimentos/delete-pedimento-form";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  rfc: string | null;
  notes: string | null;
  created_at: string | null;
};

type FacturaRow = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  archivo_url: string | null;
};

type PedimentoRow = {
  id: string;
  numero_pedimento: string;
  fecha: string;
  aduana: string;
  archivo_url: string | null;
};

function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  const isStaff = role === "admin" || role === "empleado";

  if (role === "cliente") {
    const email = user.email?.trim();
    if (!email) {
      redirect("/dashboard");
    }
    const { data: ownRow } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const ownClientId = (ownRow as { id: string } | null)?.id;
    if (!ownClientId) {
      redirect("/dashboard");
    }
    if (id !== ownClientId) {
      redirect(`/dashboard/clients/${ownClientId}`);
    }
  } else if (!isStaff) {
    redirect("/dashboard");
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select(
      "id, full_name, email, phone, company_name, rfc, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (clientErr || !clientRow) {
    notFound();
  }

  const client = clientRow as ClientRecord;

  const [{ data: facturasData }, { data: pedimentosData }] =
    await Promise.all([
      supabase
        .from("facturas")
        .select("id, numero_factura, fecha, monto, archivo_url")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pedimentos")
        .select("id, numero_pedimento, fecha, aduana, archivo_url")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const facturas = (facturasData ?? []) as FacturaRow[];
  const pedimentos = (pedimentosData ?? []) as PedimentoRow[];

  const initials = initialsFromName(client.full_name);

  const actionsColSpan = isStaff ? 5 : 4;

  const btnPrimary =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow";
  const btnOutline =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5";

  const sectionShell =
    "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm";

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-6">
        <Link
          href={isStaff ? "/dashboard/clients" : "/dashboard"}
          className="text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          {isStaff ? "← Volver a clientes" : "← Volver al inicio"}
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Perfil del cliente
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Datos de contacto y documentos asociados.
          </p>
        </div>
        {isStaff ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/clients/${id}/edit`} className={btnOutline}>
              Editar cliente
            </Link>
            <Link
              href={`/dashboard/facturas/new?cliente_id=${encodeURIComponent(id)}`}
              className={btnPrimary}
            >
              Nueva factura
            </Link>
            <Link
              href={`/dashboard/pedimentos/new?cliente_id=${encodeURIComponent(id)}`}
              className={btnOutline}
            >
              Nuevo pedimento
            </Link>
          </div>
        ) : null}
      </div>

      <section
        className={`${sectionShell} mb-10 p-6 sm:p-8`}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#227DE8]/15 text-xl font-semibold tracking-tight text-[#227DE8] shadow-inner ring-2 ring-[#227DE8]/10"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <h2 className="text-lg font-medium text-slate-900">
                {client.full_name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{client.email}</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Teléfono
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Empresa
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.company_name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  RFC
                </dt>
                <dd className="mt-1 font-mono text-sm text-slate-800">
                  {client.rfc ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Alta en CRM
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {formatShortDate(client.created_at)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Notas
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {client.notes?.trim() ? client.notes : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Facturas
          </h2>
          {isStaff ? (
            <Link
              href={`/dashboard/facturas/new?cliente_id=${encodeURIComponent(id)}`}
              className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
            >
              + Nueva factura
            </Link>
          ) : null}
        </div>
        <div className={sectionShell}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Número
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Fecha
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Monto
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
                  {isStaff ? (
                    <th className="px-4 py-3 font-medium text-slate-700"> </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={actionsColSpan}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Este cliente aún no tiene facturas registradas.
                    </td>
                  </tr>
                ) : (
                  facturas.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {f.numero_factura}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatShortDate(f.fecha)}
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
                      {isStaff ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/facturas/${f.id}/edit`}
                              className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                            >
                              Editar
                            </Link>
                            <DeleteFacturaForm facturaId={f.id} />
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
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Pedimentos
          </h2>
          {isStaff ? (
            <Link
              href={`/dashboard/pedimentos/new?cliente_id=${encodeURIComponent(id)}`}
              className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
            >
              + Nuevo pedimento
            </Link>
          ) : null}
        </div>
        <div className={sectionShell}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Número
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Fecha
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Aduana
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
                  {isStaff ? (
                    <th className="px-4 py-3 font-medium text-slate-700"> </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pedimentos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={actionsColSpan}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Este cliente aún no tiene pedimentos registrados.
                    </td>
                  </tr>
                ) : (
                  pedimentos.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.numero_pedimento}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatShortDate(p.fecha)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.aduana}</td>
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
                      {isStaff ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/pedimentos/${p.id}/edit`}
                              className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
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
      </section>
    </main>
  );
}
