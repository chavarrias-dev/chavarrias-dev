import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DOCUMENT_TYPES,
  type DocumentStatus,
} from "@/lib/documents-config";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateString(value: string): Date {
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return startOfDay(new Date(`${d}T12:00:00`));
  }
  return startOfDay(new Date(value));
}

export type DocumentStatusInput = {
  archivoUrl?: string | null;
  fechaVencimiento?: string | null;
  sinVencimiento?: boolean | null;
  validoManualmente?: boolean | null;
};

export function calculateDocumentStatus(
  archivoUrl: string | null | undefined,
  options: Omit<DocumentStatusInput, "archivoUrl"> = {},
  referenceDate: Date = new Date(),
): DocumentStatus {
  const {
    fechaVencimiento,
    sinVencimiento = false,
    validoManualmente = true,
  } = options;

  if (!archivoUrl?.trim()) {
    return "pendiente";
  }

  if (validoManualmente === false) {
    return "vencido";
  }

  if (sinVencimiento === true) {
    return "vigente";
  }

  if (fechaVencimiento?.trim()) {
    const today = startOfDay(referenceDate);
    const expiry = parseDateString(fechaVencimiento);
    const threshold = new Date(today);
    threshold.setDate(threshold.getDate() + 60);

    if (expiry < today) {
      return "vencido";
    }
    if (expiry <= threshold) {
      return "por_vencer";
    }
    return "vigente";
  }

  if (validoManualmente === true) {
    return "vigente";
  }

  return "pendiente";
}

export function calculateDocumentStatusFromRow(
  row: DocumentStatusInput,
  referenceDate: Date = new Date(),
): DocumentStatus {
  return calculateDocumentStatus(row.archivoUrl, row, referenceDate);
}

export function daysUntilExpiration(
  fechaVencimiento: string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!fechaVencimiento?.trim()) {
    return null;
  }

  const today = startOfDay(referenceDate);
  const expiry = parseDateString(fechaVencimiento);
  const diffMs = expiry.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

type DocumentRow = {
  id: string;
  archivo_url: string | null;
  fecha_vencimiento: string | null;
  sin_vencimiento: boolean | null;
  valido_manualmente: boolean | null;
  status: string | null;
};

let inFlightRecalculate: Promise<void> | null = null;
let lastRecalculateTime = 0;
const RECALCULATE_COOLDOWN_MS = 10000;

export async function recalculateDocumentStatuses(
  supabase: SupabaseClient,
): Promise<void> {
  const now = Date.now();
  if (now - lastRecalculateTime < RECALCULATE_COOLDOWN_MS) {
    return;
  }
  if (inFlightRecalculate) {
    return inFlightRecalculate;
  }

  inFlightRecalculate = (async () => {
    try {
      const { data, error } = await supabase
        .from("client_documents")
        .select(
          "id, archivo_url, fecha_vencimiento, sin_vencimiento, valido_manualmente, status",
        );

      if (error || !data) {
        return;
      }

      const today = new Date();
      const updates = (data as DocumentRow[])
        .map((row) => {
          const nextStatus = calculateDocumentStatusFromRow(
            {
              archivoUrl: row.archivo_url,
              fechaVencimiento: row.fecha_vencimiento,
              sinVencimiento: row.sin_vencimiento ?? false,
              validoManualmente: row.valido_manualmente ?? true,
            },
            today,
          );
          if (row.status === nextStatus) {
            return null;
          }
          return { id: row.id, status: nextStatus };
        })
        .filter(Boolean) as { id: string; status: DocumentStatus }[];

      if (updates.length > 0) {
        await Promise.all(
          updates.map(({ id, status }) =>
            supabase.from("client_documents").update({ status }).eq("id", id),
          ),
        );
      }
      lastRecalculateTime = Date.now();
    } finally {
      inFlightRecalculate = null;
    }
  })();

  return inFlightRecalculate;
}

export type DocumentAlert = {
  id: string;
  clientId: string;
  clientName: string;
  documentType: string;
  fechaVencimiento: string;
  status: "por_vencer" | "vencido";
  daysRemaining: number;
};

export async function fetchDocumentAlerts(
  supabase: SupabaseClient,
  options?: { clientId?: string },
): Promise<DocumentAlert[]> {
  await recalculateDocumentStatuses(supabase);

  let query = supabase
    .from("client_documents")
    .select(
      "id, client_id, document_type, fecha_vencimiento, status, clients(full_name)",
    )
    .in("status", ["por_vencer", "vencido"])
    .not("fecha_vencimiento", "is", null)
    .order("fecha_vencimiento", { ascending: true });

  if (options?.clientId) {
    query = query.eq("client_id", options.clientId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  const today = new Date();
  return (data as Array<{
    id: string;
    client_id: string;
    document_type: string;
    fecha_vencimiento: string;
    status: string;
    clients: { full_name: string } | { full_name: string }[] | null;
  }>).map((row) => {
    const clientRaw = row.clients;
    const clientName = Array.isArray(clientRaw)
      ? (clientRaw[0]?.full_name ?? "Cliente")
      : (clientRaw?.full_name ?? "Cliente");

    return {
      id: row.id,
      clientId: row.client_id,
      clientName,
      documentType: row.document_type,
      fechaVencimiento: row.fecha_vencimiento,
      status: row.status as "por_vencer" | "vencido",
      daysRemaining: daysUntilExpiration(row.fecha_vencimiento, today) ?? 0,
    };
  });
}

export type ClientDocumentTypeStatus = {
  documentType: string;
  status: DocumentStatus;
};

export type ClientDocumentIssueSummary = {
  clientId: string;
  clientName: string;
  pendientesCount: number;
  vencidosCount: number;
  documents: ClientDocumentTypeStatus[];
};

type ClientDocumentDbRow = {
  client_id: string;
  document_type: string;
  archivo_url: string | null;
  fecha_vencimiento: string | null;
  sin_vencimiento: boolean | null;
  valido_manualmente: boolean | null;
};

export async function fetchClientsWithDocumentIssues(
  supabase: SupabaseClient,
): Promise<{
  totalClientsWithIssues: number;
  clients: ClientDocumentIssueSummary[];
}> {
  await recalculateDocumentStatuses(supabase);

  const [{ data: clientRows, error: clientsError }, { data: docRows, error: docsError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name")
        .order("full_name", { ascending: true }),
      supabase
        .from("client_documents")
        .select(
          "client_id, document_type, archivo_url, fecha_vencimiento, sin_vencimiento, valido_manualmente",
        ),
    ]);

  if (clientsError || docsError || !clientRows) {
    return { totalClientsWithIssues: 0, clients: [] };
  }

  const docsByClient = new Map<string, Map<string, ClientDocumentDbRow>>();

  for (const row of (docRows ?? []) as ClientDocumentDbRow[]) {
    if (!docsByClient.has(row.client_id)) {
      docsByClient.set(row.client_id, new Map());
    }
    docsByClient.get(row.client_id)!.set(row.document_type, row);
  }

  const clientsWithIssues: ClientDocumentIssueSummary[] = [];

  for (const client of clientRows as Array<{
    id: string;
    full_name: string;
  }>) {
    const docMap = docsByClient.get(client.id) ?? new Map();

    const documents: ClientDocumentTypeStatus[] = DOCUMENT_TYPES.map(
      (documentType) => {
        const row = docMap.get(documentType);
        const status: DocumentStatus = row?.archivo_url
          ? calculateDocumentStatusFromRow({
              archivoUrl: row.archivo_url,
              fechaVencimiento: row.fecha_vencimiento,
              sinVencimiento: row.sin_vencimiento ?? false,
              validoManualmente: row.valido_manualmente ?? true,
            })
          : "pendiente";

        return { documentType, status };
      },
    );

    const pendientesCount = documents.filter(
      (d) => d.status === "pendiente",
    ).length;
    const vencidosCount = documents.filter((d) => d.status === "vencido").length;

    if (pendientesCount > 0 || vencidosCount > 0) {
      clientsWithIssues.push({
        clientId: client.id,
        clientName: client.full_name,
        pendientesCount,
        vencidosCount,
        documents,
      });
    }
  }

  clientsWithIssues.sort((a, b) => {
    const scoreA = a.pendientesCount + a.vencidosCount;
    const scoreB = b.pendientesCount + b.vencidosCount;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.clientName.localeCompare(b.clientName, "es");
  });

  return {
    totalClientsWithIssues: clientsWithIssues.length,
    clients: clientsWithIssues,
  };
}

export async function fetchPendingDocumentTypesForClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<string[]> {
  await recalculateDocumentStatuses(supabase);

  const { data: docRows, error } = await supabase
    .from("client_documents")
    .select(
      "document_type, archivo_url, fecha_vencimiento, sin_vencimiento, valido_manualmente",
    )
    .eq("client_id", clientId);

  if (error) {
    return [];
  }

  const docsByType = new Map(
    ((docRows ?? []) as ClientDocumentDbRow[]).map((row) => [
      row.document_type,
      row,
    ]),
  );

  return DOCUMENT_TYPES.filter((documentType) => {
    const row = docsByType.get(documentType);
    const status: DocumentStatus = row?.archivo_url
      ? calculateDocumentStatusFromRow({
          archivoUrl: row.archivo_url,
          fechaVencimiento: row.fecha_vencimiento,
          sinVencimiento: row.sin_vencimiento ?? false,
          validoManualmente: row.valido_manualmente ?? true,
        })
      : "pendiente";

    return status === "pendiente";
  });
}
