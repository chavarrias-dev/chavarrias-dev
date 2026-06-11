import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { ExpedientePdfUpload } from "@/components/documents/expediente-pdf-upload";
import {
  DOCUMENT_TYPES,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents-config";
import {
  calculateDocumentStatusFromRow,
  recalculateDocumentStatuses,
} from "@/lib/document-status";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientDocumentRow = {
  id: string;
  document_type: string;
  archivo_url: string | null;
  fecha_vencimiento: string | null;
  sin_vencimiento: boolean | null;
  valido_manualmente: boolean | null;
};

type ExpedienteDocument = {
  documentType: DocumentType;
  documentId: string | null;
  status: DocumentStatus;
  archivoUrl: string | null;
  sinVencimiento: boolean;
  fechaVencimiento: string | null;
  validoManualmente: boolean;
  isConfigured: boolean;
};

function isDocumentConfigured(doc: ClientDocumentRow | undefined): boolean {
  if (!doc) {
    return false;
  }
  return doc.sin_vencimiento === true || Boolean(doc.fecha_vencimiento?.trim());
}

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatVencimiento(doc: ExpedienteDocument): string {
  if (!doc.isConfigured) {
    return "—";
  }
  if (doc.sinVencimiento) {
    return "Indefinido";
  }
  if (doc.fechaVencimiento?.trim()) {
    return formatShortDate(doc.fechaVencimiento);
  }
  return "—";
}

export default async function ExpedientePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "cliente") {
    redirect("/dashboard");
  }

  const email = user.email?.trim();
  if (!email) {
    redirect("/dashboard");
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("email", email)
    .maybeSingle();

  const client = clientRow as { id: string; full_name: string } | null;
  if (!client) {
    redirect("/dashboard");
  }

  await recalculateDocumentStatuses(supabase);

  const { data: documentsData } = await supabase
    .from("client_documents")
    .select(
      "id, document_type, archivo_url, fecha_vencimiento, sin_vencimiento, valido_manualmente",
    )
    .eq("client_id", client.id);

  const documentsByType = new Map(
    ((documentsData ?? []) as ClientDocumentRow[]).map((doc) => [
      doc.document_type,
      doc,
    ]),
  );

  const documents: ExpedienteDocument[] = DOCUMENT_TYPES.map((documentType) => {
    const doc = documentsByType.get(documentType);
    const status: DocumentStatus = doc?.archivo_url
      ? calculateDocumentStatusFromRow({
          archivoUrl: doc.archivo_url,
          fechaVencimiento: doc.fecha_vencimiento,
          sinVencimiento: doc.sin_vencimiento ?? false,
          validoManualmente: doc.valido_manualmente ?? true,
        })
      : "pendiente";

    return {
      documentType,
      documentId: doc?.id ?? null,
      status,
      archivoUrl: doc?.archivo_url ?? null,
      sinVencimiento: doc?.sin_vencimiento ?? false,
      fechaVencimiento: doc?.fecha_vencimiento ?? null,
      validoManualmente: doc?.valido_manualmente ?? true,
      isConfigured: isDocumentConfigured(doc),
    };
  });

  const vigentesCount = documents.filter((d) => d.status === "vigente").length;
  const pendientesCount = documents.filter((d) => d.status === "pendiente").length;
  const porVencerCount = documents.filter((d) => d.status === "por_vencer").length;
  const vencidosCount = documents.filter((d) => d.status === "vencido").length;
  const expedienteCompleto = vigentesCount === DOCUMENT_TYPES.length;

  const sectionShell =
    "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm";

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          ← Volver al inicio
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Mi Expediente
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Estado de tus documentos requeridos
        </p>
      </div>

      {expedienteCompleto ? (
        <div
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800"
          role="status"
        >
          ✓ Expediente completo
        </div>
      ) : (
        <div
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900"
          role="status"
        >
          Tienes documentos pendientes, contacta a tu agente
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-emerald-800">
            {vigentesCount}
          </p>
          <p className="text-xs font-medium text-emerald-700">
            documento{vigentesCount === 1 ? "" : "s"} vigente
            {vigentesCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-slate-700">
            {pendientesCount}
          </p>
          <p className="text-xs font-medium text-slate-600">
            documento{pendientesCount === 1 ? "" : "s"} pendiente
            {pendientesCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-amber-900">
            {porVencerCount}
          </p>
          <p className="text-xs font-medium text-amber-800">por vencer</p>
        </div>
        <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-red-800">
            {vencidosCount}
          </p>
          <p className="text-xs font-medium text-red-700">
            vencido{vencidosCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className={sectionShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">
                  Documento
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">
                  Estado
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">
                  Vencimiento
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.documentType}
                  className="table-row-interactive border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {doc.documentType}
                  </td>
                  <td className="px-4 py-3">
                    <DocumentStatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatVencimiento(doc)}
                  </td>
                  <td className="px-4 py-3">
                    {doc.documentId ? (
                      <ExpedientePdfUpload
                        clientId={client.id}
                        documentId={doc.documentId}
                        documentType={doc.documentType}
                        initialArchivoUrl={doc.archivoUrl}
                        isConfigured={doc.isConfigured}
                        fechaVencimiento={doc.fechaVencimiento}
                        sinVencimiento={doc.sinVencimiento}
                        validoManualmente={doc.validoManualmente}
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
