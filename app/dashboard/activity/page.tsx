import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivityRow = {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_name: string;
  created_at: string | null;
};

export default async function ActivityLogPage() {
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

  const { data: rows, error } = await supabase
    .from("activity_logs")
    .select(
      "id, user_email, action, entity_type, entity_name, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const logs = (rows ?? []) as ActivityRow[];

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Actividad
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Últimos 50 registros del sistema.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
        >
          Volver al inicio
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar el historial: {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-medium text-slate-700">
                  Usuario
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">
                  Acción
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">Tipo</th>
                <th className="px-4 py-3 font-medium text-slate-700">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    Aún no hay registros de actividad.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-800">
                      {log.user_email}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{log.action}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-[#227DE8]/10 px-2 py-0.5 text-xs font-medium text-[#227DE8]">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 font-medium text-slate-900">
                      {log.entity_name}
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
