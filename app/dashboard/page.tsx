import Link from "next/link";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { RecentClientsCard } from "@/components/dashboard/recent-clients-card";
import { RoleBadge } from "@/components/dashboard/role-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { clients } from "@/db/schema";

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

  const welcomeName = profile?.full_name?.trim() || user.email || "Usuario";
  const userRole = profile?.role ?? "user";

  let recentClients: {
    id: string;
    fullName: string;
    email: string;
    companyName: string | null;
  }[] = [];
  try {
    recentClients = await db
      .select({
        id: clients.id,
        fullName: clients.fullName,
        email: clients.email,
        companyName: clients.companyName,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(4);
  } catch {
    recentClients = [];
  }

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.65rem]">
              Hola, {welcomeName}
            </h1>
            <RoleBadge role={userRole} />
          </div>
          <p className="text-sm text-slate-500">
            Bienvenido al CRM Chavarrias. Aquí tienes un resumen de actividad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/clients/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
          >
            Agregar Cliente
          </Link>
          <Link
            href="/dashboard/facturas/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5"
          >
            Nueva factura
          </Link>
          <Link
            href="/dashboard/pedimentos/new"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5"
          >
            Nuevo pedimento
          </Link>
        </div>
      </div>

      <RecentClientsCard clients={recentClients} />
    </main>
  );
}
