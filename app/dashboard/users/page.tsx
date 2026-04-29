import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleBadge } from "@/components/dashboard/role-badge";
import type { ProfileRole } from "@/lib/supabase/middleware";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteUserButton } from "./delete-user-button";

type ProfileRow = {
  id: string;
  email: string;
  role: ProfileRole | null;
  full_name: string | null;
  created_at: string | null;
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UsersListPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const admin = createSupabaseAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, role, full_name, created_at")
    .order("created_at", { ascending: false });

  const rows = (profiles ?? []) as ProfileRow[];

  const sp = await searchParams;
  const listError = sp.error ? decodeURIComponent(sp.error) : undefined;

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Usuarios
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Cuentas del CRM vinculadas a Supabase Auth.
          </p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
        >
          Nuevo usuario
        </Link>
      </div>

      {listError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {listError}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">
                  Nombre
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">
                  Correo
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">Rol</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
                <th className="px-4 py-3 font-medium text-slate-700"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Aún no hay usuarios registrados en{" "}
                    <span className="font-medium text-slate-700">profiles</span>
                    .
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.full_name?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={p.role} />
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
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/users/${p.id}/edit`}
                          className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                        >
                          Editar
                        </Link>
                        <DeleteUserButton userId={p.id} />
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
