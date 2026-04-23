import { redirect } from "next/navigation";
import { RoleBadge } from "@/components/dashboard/role-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  email: string;
  role: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export default async function ProfilePage() {
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
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Mi perfil
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Datos de tu cuenta en el CRM.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Nombre
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-900">
            {displayName}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Correo
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-900">
            {profile?.email ?? user.email}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <dt className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Rol
          </dt>
          <dd className="mt-1.5">
            <RoleBadge role={userRole} />
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Usuario ID
          </dt>
          <dd className="mt-1.5 break-all text-sm text-slate-800">{user.id}</dd>
        </div>
      </dl>
    </main>
  );
}
