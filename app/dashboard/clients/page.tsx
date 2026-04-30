import Link from "next/link";
import { DeleteClientForm } from "@/components/clients/delete-client-form";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  rfc: string | null;
  notes: string | null;
  created_at: string | null;
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ClientsListPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserRole(supabase, user.id) : null;
  const isAdmin = role === "admin";
  const isStaff = role === "admin" || role === "empleado";

  const sp = await searchParams;
  const actionError = sp.error ? decodeURIComponent(sp.error) : undefined;

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, full_name, email, phone, company_name, rfc, notes, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = (clients ?? []) as ClientRow[];

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Clientes
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Listado de clientes registrados en el CRM.
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/dashboard/users/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
          >
            Agregar usuario
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {error.message}
        </p>
      ) : null}

      {actionError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Nombre</th>
                <th className="px-4 py-3 font-medium text-slate-700">Correo</th>
                <th className="px-4 py-3 font-medium text-slate-700">Teléfono</th>
                <th className="px-4 py-3 font-medium text-slate-700">Empresa</th>
                <th className="px-4 py-3 font-medium text-slate-700">RFC</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
                {isStaff ? (
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Acciones
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={isStaff ? 7 : 6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Aún no hay clientes.{" "}
                    {isAdmin ? (
                      <Link
                        href="/dashboard/users/new"
                        className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                      >
                        Crear usuario cliente
                      </Link>
                    ) : (
                      "Contacta a un administrador para registrar clientes."
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {c.rfc ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString("es-MX", {
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
                            href={`/dashboard/clients/${c.id}`}
                            className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                          >
                            Ver perfil
                          </Link>
                          <Link
                            href={`/dashboard/clients/${c.id}/edit`}
                            className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                          >
                            Editar
                          </Link>
                          <DeleteClientForm clientId={c.id} />
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
