import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingDocumentsCard } from "@/components/dashboard/pending-documents-card";
import {
  OnboardingTour,
  TutorialButton,
} from "@/components/dashboard/onboarding-tour";
import { RecentClientsCard } from "@/components/dashboard/recent-clients-card";
import { RecentFacturasCard } from "@/components/dashboard/recent-facturas-card";
import { RecentInboxCard } from "@/components/dashboard/recent-inbox-card";
import { RecentPedimentosCard } from "@/components/dashboard/recent-pedimentos-card";
import { StorageChart } from "@/components/dashboard/storage-chart";
import { DocumentExpiringCard } from "@/components/dashboard/document-expiring-card";
import { PendingDocsAlert } from "@/components/dashboard/pending-docs-alert";
import { RoleBadge } from "@/components/dashboard/role-badge";
import {
  fetchClientsWithDocumentIssues,
  fetchDocumentAlerts,
  fetchPendingDocumentTypesForClient,
} from "@/lib/document-status";
import {
  displayName,
  type InboxMessagePreview,
  type MessageProfile,
} from "@/lib/messages";
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
  const resolvedRole = profile?.role ?? null;
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

  let adminInboxMessages: InboxMessagePreview[] = [];
  let adminUnreadMessageCount = 0;
  let documentIssues = {
    totalClientsWithIssues: 0,
    clients: [] as Awaited<
      ReturnType<typeof fetchClientsWithDocumentIssues>
    >["clients"],
  };

  if (resolvedRole === "admin") {
    const [{ count: unreadCount }, { data: inboxRows }] = await Promise.all([
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false),
      supabase
        .from("messages")
        .select("id, sender_id, content, read, created_at")
        .eq("receiver_id", user.id)
        .order("read", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    adminUnreadMessageCount = unreadCount ?? 0;

    const senderIds = [
      ...new Set(
        ((inboxRows ?? []) as { sender_id: string }[]).map(
          (row) => row.sender_id,
        ),
      ),
    ];

    let sendersById = new Map<string, MessageProfile>();
    if (senderIds.length > 0) {
      const { data: senderProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", senderIds);

      sendersById = new Map(
        ((senderProfiles ?? []) as MessageProfile[]).map((profile) => [
          profile.id,
          profile,
        ]),
      );
    }

    adminInboxMessages = (
      (inboxRows ?? []) as {
        id: string;
        sender_id: string;
        content: string;
        read: boolean;
        created_at: string;
      }[]
    ).map((row) => {
      const sender = sendersById.get(row.sender_id);
      return {
        id: row.id,
        senderId: row.sender_id,
        senderName: sender ? displayName(sender) : "Usuario",
        content: row.content,
        read: row.read,
        createdAt: row.created_at,
      };
    });

    try {
      documentIssues = await fetchClientsWithDocumentIssues(supabase);
    } catch {
      documentIssues = { totalClientsWithIssues: 0, clients: [] };
    }
  }

  let clientePendingDocuments: string[] = [];
  let documentAlerts: Awaited<ReturnType<typeof fetchDocumentAlerts>> = [];
  try {
    if (isStaff) {
      documentAlerts = await fetchDocumentAlerts(supabase);
    } else if (resolvedRole === "cliente" && clienteOwnProfileId) {
      documentAlerts = await fetchDocumentAlerts(supabase, {
        clientId: clienteOwnProfileId,
      });
      clientePendingDocuments = await fetchPendingDocumentTypesForClient(
        supabase,
        clienteOwnProfileId,
      );
    }
  } catch {
    documentAlerts = [];
    clientePendingDocuments = [];
  }

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      {resolvedRole === "cliente" ? (
        <PendingDocsAlert
          userId={user.id}
          role={resolvedRole}
          clientId={clienteOwnProfileId}
          pendingDocuments={clientePendingDocuments}
        />
      ) : null}

      {resolvedRole === "admin" ? (
        <OnboardingTour userId={user.id} />
      ) : null}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.65rem]">
              Hola, {welcomeName}
            </h1>
            <RoleBadge role={userRole} />
            {resolvedRole === "admin" ? (
              <TutorialButton userId={user.id} />
            ) : null}
          </div>
          <p className="text-sm text-slate-500">
            Bienvenido al CRM Chavarrias. Aquí tienes un resumen de actividad.
          </p>
        </div>
        {isStaff ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/users/new"
              className="btn-primary-motion inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
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

      {resolvedRole === "admin" ? (
        <section
          data-tour="dashboard-stats"
          className="mb-8 grid grid-cols-1 gap-3 font-poppins md:grid-cols-3 md:items-stretch"
          aria-label="Estadísticas de administración"
        >
          <PendingDocumentsCard
            totalClientsWithIssues={documentIssues.totalClientsWithIssues}
            clients={documentIssues.clients}
          />
          <RecentInboxCard
            messages={adminInboxMessages}
            unreadCount={adminUnreadMessageCount}
          />
          <div className="card-hover-lift animate-card-in card-stagger-3 flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium tracking-tight text-slate-900">
              Almacenamiento
            </h3>
            <div className="min-h-0 flex-1">
              <StorageChart />
            </div>
          </div>
        </section>
      ) : null}

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
              className="btn-primary-motion inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
            >
              Mi perfil de cliente
            </Link>
          </div>
        </section>
      ) : null}

      <DocumentExpiringCard alerts={documentAlerts} />

      {isStaff ? (
        <RecentClientsCard clients={recentClients} />
      ) : null}
      <RecentFacturasCard facturas={recentFacturas} />
      <RecentPedimentosCard pedimentos={recentPedimentos} />
    </main>
  );
}
