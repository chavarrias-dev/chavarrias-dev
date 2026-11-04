import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClientsListTable,
  type ClientsListRow,
} from "@/components/clients/clients-list-table";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DASHBOARD_PAGE_MAIN_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboard-layout";

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

  if (role !== "admin" && role !== "empleado") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const actionError = sp.error ? decodeURIComponent(sp.error) : undefined;

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, full_name, email, phone, company_name, tipo_razon_social, puesto, rfc, notes, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = (clients ?? []) as ClientsListRow[];

  return (
    <main className={DASHBOARD_PAGE_MAIN_CLASS}>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Clientes</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Listado de clientes registrados en el CRM.
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/dashboard/users/new"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow sm:w-auto"
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

      <ClientsListTable rows={rows} isStaff={isStaff} isAdmin={isAdmin} />
    </main>
  );
}
