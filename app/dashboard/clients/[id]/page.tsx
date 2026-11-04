import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ClientEstadoDeCuentaLink } from "@/components/clients/client-estado-de-cuenta-link";
import { ClientGoogleSheetPanel } from "@/components/clients/client-google-sheet-panel";
import { ClientProfileFacturasTable } from "@/components/clients/client-profile-facturas-table";
import { ClientProfilePedimentosTable } from "@/components/clients/client-profile-pedimentos-table";
import {
  ClientProfileTabs,
  type ClientProfileTabId,
} from "@/components/clients/client-profile-tabs";
import {
  ClientDocumentsSection,
  type ClientDocumentRowData,
} from "@/components/documents/client-documents-section";
import { isGoogleSheetsProvisioningConfigured } from "@/lib/google-sheets/config";
import {
  DOCUMENT_TYPES,
  type DocumentStatus,
} from "@/lib/documents-config";
import {
  calculateDocumentStatusFromRow,
  recalculateDocumentStatuses,
} from "@/lib/document-status";
import {
  assertClientRecordAccess,
  resolveOwnClientId,
} from "@/lib/client-own-record";
import { fetchClientByIdWithSpreadsheetFallback } from "@/lib/client-google-spreadsheet-db";
import { formatShortDate } from "@/lib/format-short-date";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  tipo_razon_social: string | null;
  puesto: string | null;
  rfc: string | null;
  constancia_url: string | null;
  google_spreadsheet_url: string | null;
  google_spreadsheet_created_at: string | null;
  created_at: string | null;
};

type FacturaRow = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  archivo_url: string | null;
};

type PedimentoRow = {
  id: string;
  numero_pedimento: string;
  fecha: string;
  fecha_cierre: string | null;
  aduana: string;
  archivo_url: string | null;
};

type ClientDocumentRow = {
  id: string;
  document_type: string;
  archivo_url: string | null;
  fecha_vencimiento: string | null;
  fecha_subida: string | null;
  sin_vencimiento: boolean | null;
  valido_manualmente: boolean | null;
  notas: string | null;
  status: DocumentStatus;
};

function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    google_sheet_ok?: string;
    google_sheet_error?: string;
  }>;
};

export default async function ClientProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  const isStaff = role === "admin" || role === "empleado";

  const access = await assertClientRecordAccess(
    supabase,
    role,
    user.email,
    id,
  );
  if (!access.allowed) {
    if (role === "cliente") {
      const ownClientId = await resolveOwnClientId(supabase, user.email);
      if (ownClientId) {
        redirect(`/dashboard/clients/${ownClientId}`);
      }
    }
    redirect("/dashboard");
  }

  const { data: clientRow, error: clientLoadError } =
    await fetchClientByIdWithSpreadsheetFallback<ClientRecord>(
      supabase,
      id,
      "id, full_name, email, phone, company_name, tipo_razon_social, puesto, rfc, constancia_url, google_spreadsheet_url, google_spreadsheet_created_at, created_at",
      "id, full_name, email, phone, company_name, tipo_razon_social, puesto, rfc, constancia_url, created_at",
    );

  if (clientLoadError) {
    throw new Error(clientLoadError);
  }
  if (!clientRow) {
    notFound();
  }

  const client = clientRow as ClientRecord;

  await recalculateDocumentStatuses(supabase);

  const [{ data: facturasData }, { data: pedimentosData }, { data: documentsData }] =
    await Promise.all([
      supabase
        .from("facturas")
        .select("id, numero_factura, fecha, monto, archivo_url")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pedimentos")
        .select("id, numero_pedimento, fecha, fecha_cierre, aduana, archivo_url")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_documents")
        .select(
          "id, document_type, archivo_url, fecha_vencimiento, fecha_subida, sin_vencimiento, valido_manualmente, notas, status",
        )
        .eq("client_id", id),
    ]);

  const facturas = (facturasData ?? []) as FacturaRow[];
  const pedimentos = (pedimentosData ?? []) as PedimentoRow[];
  const documentsByType = new Map(
    ((documentsData ?? []) as ClientDocumentRow[]).map((doc) => [
      doc.document_type,
      doc,
    ]),
  );

  const clientDocuments: ClientDocumentRowData[] = DOCUMENT_TYPES.map(
    (documentType) => {
      const doc = documentsByType.get(documentType);
      return {
        id: doc?.id,
        documentType,
        archivoUrl: doc?.archivo_url ?? null,
        fechaVencimiento: doc?.fecha_vencimiento ?? null,
        fechaSubida: doc?.fecha_subida ?? null,
        sinVencimiento: doc?.sin_vencimiento ?? false,
        validoManualmente: doc?.valido_manualmente ?? true,
        notas: doc?.notas ?? null,
        status: doc
          ? calculateDocumentStatusFromRow({
              archivoUrl: doc.archivo_url,
              fechaVencimiento: doc.fecha_vencimiento,
              sinVencimiento: doc.sin_vencimiento ?? false,
              validoManualmente: doc.valido_manualmente ?? true,
            })
          : "pendiente",
      };
    },
  );

  const initials = initialsFromName(client.full_name);

  const btnPrimary =
    "btn-primary-motion inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow";
  const btnOutline =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5";

  const sectionShell =
    "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm";

  const sheetStatusMessage = sp.google_sheet_ok
    ? ({ kind: "ok" as const, text: sp.google_sheet_ok })
    : sp.google_sheet_error
      ? ({ kind: "error" as const, text: sp.google_sheet_error })
      : undefined;

  let initialProfileTab: ClientProfileTabId = "documentos";
  if (
    sp.tab === "documentos" ||
    sp.tab === "facturas" ||
    sp.tab === "pedimentos" ||
    sp.tab === "estado-cuenta"
  ) {
    initialProfileTab = sp.tab;
  } else if (sp.google_sheet_ok || sp.google_sheet_error) {
    initialProfileTab = "estado-cuenta";
  }

  const tabCounts = {
    documentos: clientDocuments.filter((row) => row.archivoUrl).length,
    facturas: facturas.length,
    pedimentos: pedimentos.length,
    hasEstadoCuenta: Boolean(client.google_spreadsheet_url),
  };

  return (
    <main className="font-poppins w-full min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-6">
        <Link
          href={isStaff ? "/dashboard/clients" : "/dashboard"}
          className="text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          {isStaff ? "← Volver a clientes" : "← Volver al inicio"}
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            {isStaff ? "Perfil del cliente" : "Mi perfil"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {isStaff
              ? "Datos de contacto, documentos, facturas y pedimentos."
              : "Consulta tus datos y gestiona tu expediente documental."}
          </p>
        </div>
        {isStaff ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/clients/${id}/edit`} className={btnOutline}>
              Editar cliente
            </Link>
            <Link
              href={`/dashboard/facturas/new?cliente_id=${encodeURIComponent(id)}`}
              className={btnPrimary}
            >
              Nueva factura
            </Link>
            <Link
              href={`/dashboard/pedimentos/new?cliente_id=${encodeURIComponent(id)}`}
              className={btnOutline}
            >
              Nuevo pedimento
            </Link>
          </div>
        ) : null}
      </div>

      <section className={`${sectionShell} mb-8 p-6 sm:p-8`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#227DE8]/15 text-xl font-semibold tracking-tight text-[#227DE8] shadow-inner ring-2 ring-[#227DE8]/10"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <h2 className="text-lg font-medium text-slate-900">
                {client.full_name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{client.email}</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Teléfono
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Empresa
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.company_name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tipo de razón social
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.tipo_razon_social ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Puesto
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.puesto ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  RFC
                </dt>
                <dd className="mt-1 font-mono text-sm text-slate-800">
                  {client.rfc ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Alta en CRM
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {formatShortDate(client.created_at)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Constancia fiscal
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {client.constancia_url ? (
                    <a
                      href={client.constancia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#227DE8] px-3 py-1.5 text-xs font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-3.5 shrink-0 opacity-90"
                        aria-hidden
                      >
                        <path d="M6 22a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h8l7 7v17a3 3 0 0 1-3 3H6Zm-1-19v16a1 1 0 0 0 1 1h11v-7h-6V4H6a1 1 0 0 0-1 1Zm13 .586V9h4.586L18 3.586ZM9 17h6v-2H9v2Zm0-4h6v-2H9v2Z" />
                      </svg>
                      Ver Constancia
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}>
        <ClientProfileTabs
          clientId={id}
          initialTab={initialProfileTab}
          counts={tabCounts}
          panels={{
            documentos: (
              <ClientDocumentsSection
                clientId={id}
                isStaff={isStaff}
                documents={clientDocuments}
                allowClientUpload={!isStaff}
                sectionTitle={isStaff ? "Documentos" : "Mi expediente"}
                prominent={!isStaff}
                embedded
                hideSectionTitle={isStaff}
              />
            ),
            facturas: (
              <ClientProfileFacturasTable
                clientId={id}
                facturas={facturas}
                isStaff={isStaff}
                embedded
              />
            ),
            pedimentos: (
              <ClientProfilePedimentosTable
                clientId={id}
                pedimentos={pedimentos}
                isStaff={isStaff}
                embedded
              />
            ),
            estadoCuenta: isStaff ? (
              <ClientGoogleSheetPanel
                clientId={id}
                spreadsheetUrl={client.google_spreadsheet_url}
                spreadsheetCreatedAt={client.google_spreadsheet_created_at}
                googleApiEnabled={isGoogleSheetsProvisioningConfigured()}
                statusMessage={sheetStatusMessage}
                embedded
              />
            ) : (
              <ClientEstadoDeCuentaLink
                spreadsheetUrl={client.google_spreadsheet_url}
                previewTitle={`Estado de cuenta — ${client.full_name}`}
                embedded
              />
            ),
          }}
        />
      </Suspense>
    </main>
  );
}
