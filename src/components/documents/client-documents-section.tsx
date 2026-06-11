"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import {
  ConfigureDocumentModal,
  type ConfigureModalDocument,
} from "@/components/documents/configure-document-modal";
import type { DocumentStatus, DocumentType } from "@/lib/documents-config";
import {
  quickUploadClientDocument,
} from "../../../app/dashboard/clients/[id]/documents/actions";

export type ClientDocumentRowData = {
  id?: string;
  documentType: DocumentType;
  archivoUrl: string | null;
  fechaVencimiento: string | null;
  fechaSubida: string | null;
  sinVencimiento: boolean;
  validoManualmente: boolean;
  status: DocumentStatus;
  notas: string | null;
};

type ClientDocumentsSectionProps = {
  clientId: string;
  isStaff: boolean;
  documents: ClientDocumentRowData[];
};

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

export function ClientDocumentsSection({
  clientId,
  isStaff,
  documents,
}: ClientDocumentsSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [configureDocument, setConfigureDocument] =
    useState<ConfigureModalDocument | null>(null);
  const [pendingUploadType, setPendingUploadType] =
    useState<DocumentType | null>(null);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startUploadTransition] = useTransition();

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setErrorMessage(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  const openConfigureModal = (row: ClientDocumentRowData) => {
    setConfigureDocument({
      documentType: row.documentType,
      archivoUrl: row.archivoUrl,
      fechaVencimiento: row.fechaVencimiento,
      fechaSubida: row.fechaSubida,
      sinVencimiento: row.sinVencimiento,
      validoManualmente: row.validoManualmente,
      notas: row.notas,
    });
    setConfigureOpen(true);
  };

  const handleSubirClick = (documentType: DocumentType) => {
    setPendingUploadType(documentType);
    fileInputRef.current?.click();
  };

  const handleQuickFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    const documentType = pendingUploadType;
    event.target.value = "";

    if (!file || !documentType) {
      return;
    }

    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("documentType", documentType);
    formData.append("archivo", file);

    setUploadingType(documentType);
    setErrorMessage(null);

    startUploadTransition(async () => {
      const result = await quickUploadClientDocument(formData);
      setUploadingType(null);
      setPendingUploadType(null);

      if (result.ok) {
        setSuccessMessage(
          `PDF de "${documentType}" subido correctamente.`,
        );
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const sectionShell =
    "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm";

  return (
    <section className="mb-10 font-poppins">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium tracking-tight text-slate-900">
          Documentos
        </h2>
      </div>

      {successMessage ? (
        <div
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className={sectionShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
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
                <th className="px-4 py-3 font-medium text-slate-700">
                  Subida
                </th>
                <th className="px-4 py-3 font-medium text-slate-700">PDF</th>
                {isStaff ? (
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Acciones
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {documents.map((row) => {
                const isUploading = uploadingType === row.documentType;

                return (
                  <tr
                    key={row.documentType}
                    className="border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.documentType}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.sinVencimiento
                        ? "Indefinido"
                        : formatShortDate(row.fechaVencimiento)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatShortDate(row.fechaSubida)}
                    </td>
                    <td className="px-4 py-3">
                      {row.archivoUrl ? (
                        <a
                          href={row.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {isStaff ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSubirClick(row.documentType)}
                            disabled={isUploading}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-2.5 text-xs font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUploading ? "Subiendo…" : "Subir"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfigureModal(row)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Settings className="size-3.5 shrink-0" aria-hidden />
                            Configurar
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isStaff ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleQuickFileChange}
          />
          <ConfigureDocumentModal
            clientId={clientId}
            open={configureOpen}
            document={configureDocument}
            onClose={() => {
              setConfigureOpen(false);
              setConfigureDocument(null);
            }}
            onSuccess={setSuccessMessage}
          />
        </>
      ) : null}
    </section>
  );
}
