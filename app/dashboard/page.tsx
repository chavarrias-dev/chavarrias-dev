import Link from "next/link";
import { redirect } from "next/navigation";
import { RecentClientsCard } from "@/components/dashboard/recent-clients-card";
import { RecentFacturasCard } from "@/components/dashboard/recent-facturas-card";
import { RecentPedimentosCard } from "@/components/dashboard/recent-pedimentos-card";
import { RoleBadge } from "@/components/dashboard/role-badge";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { clients, facturas, pedimentos } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

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
  const resolvedRole = await getUserRole(supabase, user.id);
  const isStaff =
    resolvedRole === "admin" || resolvedRole === "empleado";

  let clienteOwnProfileId: string | null = null;
  if (resolvedRole === "cliente" && user.email) {
    const { data: clientSelf } = await supabase
      .from("clients")
      .select("id")
      .eq("email", user.email.trim())
      .maybeSingle();
    clienteOwnProfileId =
      (clientSelf as { id: string } | null)?.id ?? null;
  }

  let recentClients: {
    id: string;
    fullName: string;
    email: string;
    companyName: string | null;
  }[] = [];
  if (isStaff) {
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
  }

  let recentFacturas: {
    id: string;
    numeroFactura: string;
    clientName: string;
    monto: string;
    fecha: string;
  }[] = [];
  try {
    if (isStaff) {
      const rows = await db
        .select({
          id: facturas.id,
          numeroFactura: facturas.numeroFactura,
          fecha: facturas.fecha,
          monto: facturas.monto,
          clientName: clients.fullName,
        })
        .from(facturas)
        .innerJoin(clients, eq(facturas.clienteId, clients.id))
        .orderBy(desc(facturas.createdAt))
        .limit(4);

      recentFacturas = rows.map((r) => ({
        id: r.id,
        numeroFactura: r.numeroFactura,
        clientName: r.clientName,
        monto: String(r.monto),
        fecha: r.fecha,
      }));
    } else if (user.email) {
      const clientMatch = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.email, user.email.trim()))
        .limit(1);

      const cid = clientMatch[0]?.id;
      if (cid) {
        const rows = await db
          .select({
            id: facturas.id,
            numeroFactura: facturas.numeroFactura,
            fecha: facturas.fecha,
            monto: facturas.monto,
            clientName: clients.fullName,
          })
          .from(facturas)
          .innerJoin(clients, eq(facturas.clienteId, clients.id))
          .where(eq(facturas.clienteId, cid))
          .orderBy(desc(facturas.createdAt))
          .limit(4);

        recentFacturas = rows.map((r) => ({
          id: r.id,
          numeroFactura: r.numeroFactura,
          clientName: r.clientName,
          monto: String(r.monto),
          fecha: r.fecha,
        }));
      }
    }
  } catch {
    recentFacturas = [];
  }

  let recentPedimentos: {
    id: string;
    numeroPedimento: string;
    clientName: string | null;
    aduana: string;
    fecha: string;
  }[] = [];
  try {
    if (isStaff) {
      const rows = await db
        .select({
          id: pedimentos.id,
          numeroPedimento: pedimentos.numeroPedimento,
          fecha: pedimentos.fecha,
          aduana: pedimentos.aduana,
          clientName: clients.fullName,
        })
        .from(pedimentos)
        .leftJoin(clients, eq(pedimentos.clienteId, clients.id))
        .orderBy(desc(pedimentos.createdAt))
        .limit(4);

      recentPedimentos = rows.map((r) => ({
        id: r.id,
        numeroPedimento: r.numeroPedimento,
        clientName: r.clientName,
        aduana: r.aduana,
        fecha: r.fecha,
      }));
    } else if (user.email) {
      const clientMatch = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.email, user.email.trim()))
        .limit(1);

      const cid = clientMatch[0]?.id;
      if (cid) {
        const rows = await db
          .select({
            id: pedimentos.id,
            numeroPedimento: pedimentos.numeroPedimento,
            fecha: pedimentos.fecha,
            aduana: pedimentos.aduana,
            clientName: clients.fullName,
          })
          .from(pedimentos)
          .innerJoin(clients, eq(pedimentos.clienteId, clients.id))
          .where(eq(pedimentos.clienteId, cid))
          .orderBy(desc(pedimentos.createdAt))
          .limit(4);

        recentPedimentos = rows.map((r) => ({
          id: r.id,
          numeroPedimento: r.numeroPedimento,
          clientName: r.clientName,
          aduana: r.aduana,
          fecha: r.fecha,
        }));
      }
    }
  } catch {
    recentPedimentos = [];
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
        {isStaff ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/users/new"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
            >
              Nuevo usuario
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
        ) : null}
      </div>

      {resolvedRole === "cliente" && clienteOwnProfileId ? (
        <section className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium tracking-tight text-slate-900">
                Mis documentos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Revisa tus facturas y pedimentos en un solo lugar.
              </p>
            </div>
            <Link
              href={`/dashboard/clients/${clienteOwnProfileId}`}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
            >
              Mi perfil de cliente
            </Link>
          </div>
        </section>
      ) : null}

      {isStaff ? (
        <RecentClientsCard clients={recentClients} />
      ) : null}
      <RecentFacturasCard facturas={recentFacturas} />
      <RecentPedimentosCard pedimentos={recentPedimentos} />
    </main>
  );
}
