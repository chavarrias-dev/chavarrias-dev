import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { logout } from "./actions";

type Profile = {
  id: string;
  email: string;
  role: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const displayName = profile?.full_name ?? user.email ?? "Usuario";
  const userRole = profile?.role ?? "user";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="text-2xl font-bold tracking-wide text-[#227DE8]">CHAVARRIAS</p>
        <LogoutButton action={logout} />
      </div>

      <section className="mx-auto w-full max-w-5xl px-6 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">Sesion autenticada con Supabase Auth.</p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nombre
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{displayName}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Correo
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {profile?.email ?? user.email}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Rol
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{userRole}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Usuario ID
              </dt>
              <dd className="mt-1 break-all text-sm text-slate-900">{user.id}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
