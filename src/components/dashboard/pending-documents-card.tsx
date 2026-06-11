"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import type {
  ClientDocumentIssueSummary,
  ClientDocumentTypeStatus,
} from "@/lib/document-status";
import type { DocumentStatus } from "@/lib/documents-config";

type PendingDocumentsCardProps = {
  totalClientsWithIssues: number;
  clients: ClientDocumentIssueSummary[];
};

const STATUS_DOT: Record<DocumentStatus, string> = {
  vigente: "bg-emerald-500",
  por_vencer: "bg-amber-500",
  vencido: "bg-red-500",
  pendiente: "bg-slate-400",
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  pendiente: "Pendiente",
};

function DocumentStatusRow({ item }: { item: ClientDocumentTypeStatus }) {
  return (
    <li className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
      <span
        className={`size-2 shrink-0 rounded-full ${STATUS_DOT[item.status]}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">{item.documentType}</p>
        <p className="text-xs text-slate-500">{STATUS_LABEL[item.status]}</p>
      </div>
    </li>
  );
}

export function PendingDocumentsCard({
  totalClientsWithIssues,
  clients,
}: PendingDocumentsCardProps) {
  const [selectedClient, setSelectedClient] =
    useState<ClientDocumentIssueSummary | null>(null);
  const allGood = totalClientsWithIssues === 0;

  return (
    <>
      <div className="card-hover-lift animate-card-in card-stagger-1 flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 font-poppins shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium tracking-tight text-slate-900">
            Documentos pendientes
          </h3>
          <svg
            className="h-7 w-7 shrink-0 text-[#227DE8]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        </div>

        {allGood ? (
          <div className="mt-3 flex flex-1 flex-col justify-center">
            <p className="text-sm font-medium text-emerald-600">✓ Todo al día</p>
            <p className="mt-1 text-xs text-slate-500">
              Todos los clientes tienen sus 13 documentos al día.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-3xl font-semibold tabular-nums leading-tight tracking-tight text-slate-900">
              {totalClientsWithIssues}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {totalClientsWithIssues === 1
                ? "cliente con documentos pendientes o vencidos"
                : "clientes con documentos pendientes o vencidos"}
            </p>
            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
              {clients.map((client) => (
                <li key={client.clientId}>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="w-full rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="block text-sm font-medium text-slate-800 hover:text-[#227DE8]">
                      {client.clientName}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {client.pendientesCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200/70">
                          {client.pendientesCount} pendiente
                          {client.pendientesCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {client.vencidosCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-inset ring-red-200/70">
                          {client.vencidosCount} vencido
                          {client.vencidosCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <Link
          href="/dashboard/clients"
          className="mt-auto pt-3 text-xs font-medium text-[#227DE8] underline-offset-2 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      <ModalShell
        open={selectedClient !== null}
        onClose={() => setSelectedClient(null)}
        panelClassName="font-poppins flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        {selectedClient ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h2
                id="pending-docs-modal-title"
                className="text-lg font-medium tracking-tight text-slate-900"
              >
                Documentos de {selectedClient.clientName}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-5 py-2">
              {selectedClient.documents.map((doc) => (
                <DocumentStatusRow key={doc.documentType} item={doc} />
              ))}
            </ul>

            <div className="border-t border-slate-100 px-5 py-4">
              <Link
                href={`/dashboard/clients/${selectedClient.clientId}`}
                className="inline-flex text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
                onClick={() => setSelectedClient(null)}
              >
                Ver perfil completo
              </Link>
            </div>
          </>
        ) : null}
      </ModalShell>
    </>
  );
}
