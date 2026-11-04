import Link from "next/link";
import { RoleBadge } from "@/components/dashboard/role-badge";
import type { ProfileRole } from "@/lib/supabase/profile-role";
import { DeleteUserButton } from "../../../app/dashboard/users/delete-user-button";
import { DASHBOARD_TABLE_SCROLL_CLASS } from "@/lib/dashboard-layout";

export type SettingsUserRow = {
  id: string;
  email: string;
  role: ProfileRole | null;
  full_name: string | null;
  created_at: string | null;
};

type SettingsUsersSectionProps = {
  rows: SettingsUserRow[];
  canDeleteUsers: boolean;
  listError?: string;
  loadError?: string;
};

export function SettingsUsersSection({
  rows,
  canDeleteUsers,
  listError,
  loadError,
}: SettingsUsersSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-900">Usuarios del CRM</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cuentas vinculadas a Supabase Auth. Aquí puedes crear usuarios y
            cambiar roles (cliente, empleado, admin).
          </p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] sm:w-auto"
        >
          Nuevo usuario
        </Link>
      </div>

      {listError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {listError}
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar la lista: {loadError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Nombre</th>
                <th className="px-4 py-3 font-medium text-slate-700">Correo</th>
                <th className="px-4 py-3 font-medium text-slate-700">Rol</th>
                <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
                <th className="px-4 py-3 font-medium text-slate-700" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Aún no hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
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
                          className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                        >
                          Editar rol y datos
                        </Link>
                        {canDeleteUsers ? (
                          <DeleteUserButton userId={p.id} />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
