import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingDocumentsCard } from "@/components/dashboard/pending-documents-card";
import {
  ClientOnboardingTour,
  ClientTutorialButton,
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

  const [profileResult, clientSelfResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, full_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
    user.email
      ? supabase
          .from("clients")
          .select("id")
          .eq("email", user.email.trim())
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profile = profileResult.data;
  const welcomeName = profile?.full_name?.trim() || user.email || "Usuario";
  const userRole = profile?.role ?? "user";
  const resolvedRole = profile?.role ?? null;
  const isStaff =
    resolvedRole === "admin" || resolvedRole === "empleado";

  const clienteOwnProfileId =
    resolvedRole === "cliente"
      ? ((clientSelfResult.data as { id: string } | null)?.id ?? null)
      : null;

  let recentClients: {
    id: string;
    fullName: string;
    email: string;
    companyName: string | null;
  }[] = [];

  let recentFacturas: {
    id: string;
    numeroFactura: string;
    clientName: string;
    monto: string;
    fecha: string;
  }[] = [];

  let recentPedimentos: {
    id: string;
    numeroPedimento: string;
    clientName: string | null;
    aduana: string;
    fecha: string;
  }[] = [];

  let adminInboxMessages: InboxMessagePreview[] = [];
  let adminUnreadMessageCount = 0;
  let documentIssues = {
    totalClientsWithIssues: 0,
    clients: [] as Awaited<
      ReturnType<typeof fetchClientsWithDocumentIssues>
    >["clients"],
  };
  let clientePendingDocuments: string[] = [];
  let documentAlerts: Awaited<ReturnType<typeof fetchDocumentAlerts>> = [];

  if (isStaff) {
    const clientsPromise = db
      .select({
        id: clients.id,
        fullName: clients.fullName,
        email: clients.email,
        companyName: clients.companyName,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(4)
      .catch(() => []);

    const facturasPromise = db
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
      .limit(4)
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          numeroFactura: r.numeroFactura,
          clientName: r.clientName,
          monto: String(r.monto),
          fecha: r.fecha,
        }))
      )
      .catch(() => []);

    const pedimentosPromise = db
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
      .limit(4)
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          numeroPedimento: r.numeroPedimento,
          clientName: r.clientName,
          aduana: r.aduana,
          fecha: r.fecha,
        }))
      )
      .catch(() => []);

    const alertsPromise = fetchDocumentAlerts(supabase).catch(() => []);

    const adminMessagesPromise =
      resolvedRole === "admin"
        ? (async () => {
            const [{ count: unreadCount }, { data: inboxRows }] =
              await Promise.all([
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
                ((senderProfiles ?? []) as MessageProfile[]).map((p) => [
                  p.id,
                  p,
                ]),
              );
            }

            const messages = (
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

            return {
              unreadCount: unreadCount ?? 0,
              messages,
            };
          })().catch(() => ({ unreadCount: 0, messages: [] }))
        : Promise.resolve({ unreadCount: 0, messages: [] });

    const documentIssuesPromise =
      resolvedRole === "admin"
        ? fetchClientsWithDocumentIssues(supabase).catch(() => ({
            totalClientsWithIssues: 0,
            clients: [],
          }))
        : Promise.resolve({ totalClientsWithIssues: 0, clients: [] });

    const [
      clientsRes,
      facturasRes,
      pedimentosRes,
      alertsRes,
      adminMessagesRes,
      documentIssuesRes,
    ] = await Promise.all([
      clientsPromise,
      facturasPromise,
      pedimentosPromise,
      alertsPromise,
      adminMessagesPromise,
      documentIssuesPromise,
    ]);

    recentClients = clientsRes;
    recentFacturas = facturasRes;
    recentPedimentos = pedimentosRes;
    documentAlerts = alertsRes;
    adminUnreadMessageCount = adminMessagesRes.unreadCount;
    adminInboxMessages = adminMessagesRes.messages;
    documentIssues = documentIssuesRes;
  } else {
    const facturasPromise = clienteOwnProfileId
      ? db
          .select({
            id: facturas.id,
            numeroFactura: facturas.numeroFactura,
            fecha: facturas.fecha,
            monto: facturas.monto,
            clientName: clients.fullName,
          })
          .from(facturas)
          .innerJoin(clients, eq(facturas.clienteId, clients.id))
          .where(eq(facturas.clienteId, clienteOwnProfileId))
          .orderBy(desc(facturas.createdAt))
          .limit(4)
          .then((rows) =>
            rows.map((r) => ({
              id: r.id,
              numeroFactura: r.numeroFactura,
              clientName: r.clientName,
              monto: String(r.monto),
              fecha: r.fecha,
            }))
          )
          .catch(() => [])
      : Promise.resolve([]);

    const pedimentosPromise = clienteOwnProfileId
      ? db
          .select({
            id: pedimentos.id,
            numeroPedimento: pedimentos.numeroPedimento,
            fecha: pedimentos.fecha,
            aduana: pedimentos.aduana,
            clientName: clients.fullName,
          })
          .from(pedimentos)
          .innerJoin(clients, eq(pedimentos.clienteId, clients.id))
          .where(eq(pedimentos.clienteId, clienteOwnProfileId))
          .orderBy(desc(pedimentos.createdAt))
          .limit(4)
          .then((rows) =>
            rows.map((r) => ({
              id: r.id,
              numeroPedimento: r.numeroPedimento,
              clientName: r.clientName,
              aduana: r.aduana,
              fecha: r.fecha,
            }))
          )
          .catch(() => [])
      : Promise.resolve([]);

    const alertsPromise =
      resolvedRole === "cliente" && clienteOwnProfileId
        ? fetchDocumentAlerts(supabase, { clientId: clienteOwnProfileId }).catch(
            () => [],
          )
        : Promise.resolve([]);

    const pendingDocsPromise =
      resolvedRole === "cliente" && clienteOwnProfileId
        ? fetchPendingDocumentTypesForClient(
            supabase,
            clienteOwnProfileId,
          ).catch(() => [])
        : Promise.resolve([]);

    const [facturasRes, pedimentosRes, alertsRes, pendingDocsRes] =
      await Promise.all([
        facturasPromise,
        pedimentosPromise,
        alertsPromise,
        pendingDocsPromise,
      ]);

    recentFacturas = facturasRes;
    recentPedimentos = pedimentosRes;
    documentAlerts = alertsRes;
    clientePendingDocuments = pendingDocsRes;
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
      {resolvedRole === "cliente" ? (
        <ClientOnboardingTour userId={user.id} />
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
            {resolvedRole === "cliente" ? (
              <ClientTutorialButton userId={user.id} />
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
          <div className="card-hover-lift animate-card-in card-stagger-3 flex h-full min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium tracking-tight text-slate-900">
              Almacenamiento
            </h3>
            <div className="min-h-[150px] flex-1">
              <StorageChart />
            </div>
          </div>
        </section>
      ) : null}

      {resolvedRole === "cliente" ? (
        <section
          data-tour="dashboard-client-home"
          aria-label="Resumen del dashboard"
          className="space-y-8"
        >
          {clienteOwnProfileId ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
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
            </div>
          ) : null}
          <DocumentExpiringCard alerts={documentAlerts} />
          <RecentFacturasCard facturas={recentFacturas} />
          <RecentPedimentosCard pedimentos={recentPedimentos} />
        </section>
      ) : (
        <>
          <DocumentExpiringCard alerts={documentAlerts} />
          {isStaff ? (
            <RecentClientsCard clients={recentClients} />
          ) : null}
          <RecentFacturasCard facturas={recentFacturas} />
          <RecentPedimentosCard pedimentos={recentPedimentos} />
        </>
      )}
    </main>
  );
}
