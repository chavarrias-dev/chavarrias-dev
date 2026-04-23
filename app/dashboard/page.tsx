import Image from "next/image";
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
    <div className="font-poppins min-h-screen w-full bg-[#FFFFFF]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <Image
            src="/chavarrias_logo.svg"
            alt="Chavarrias"
            width={1715}
            height={395}
            className="h-8 w-auto max-w-[180px] object-contain object-left sm:h-9 sm:max-w-[220px]"
            priority
          />
          <LogoutButton action={logout} />
        </div>
      </header>

      <main className="w-full flex-1 px-6 py-8 lg:px-10">
        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sesion autenticada con Supabase Auth.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Nombre
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900">
              {displayName}
            </dd>
          </div>
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Correo
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900">
              {profile?.email ?? user.email}
            </dd>
          </div>
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Rol
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900">
              {userRole}
            </dd>
          </div>
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Usuario ID
            </dt>
            <dd className="mt-1.5 break-all text-sm text-slate-800">{user.id}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
