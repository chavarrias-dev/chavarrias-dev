"use client";

import Link from "next/link";
import { DocumentExpirationFields } from "@/components/documents/document-expiration-fields";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import { DocumentFileInput } from "@/components/files/document-file-input";
import type { DocumentType, ValidityPeriod } from "@/lib/documents-config";
import { updateClientDocument } from "../../../app/dashboard/clients/[id]/documents/actions";

type EditDocumentFormProps = {
  clientId: string;
  clientName: string;
  documentId: string;
  documentType: DocumentType;
  archivoUrl: string | null;
  fechaSubida: string | null;
  fechaVencimiento: string | null;
  sinVencimiento: boolean;
  validoManualmente: boolean;
  notas: string | null;
  errorMessage?: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function inferDefaultValidoPor(
  sinVencimiento: boolean,
  fechaVencimiento: string | null,
): ValidityPeriod {
  if (sinVencimiento) {
    return "indefinido";
  }
  if (fechaVencimiento?.trim()) {
    return "fecha_especifica";
  }
  return "indefinido";
}

export function EditDocumentForm({
  clientId,
  clientName,
  documentId,
  documentType,
  archivoUrl,
  fechaSubida,
  fechaVencimiento,
  sinVencimiento,
  validoManualmente,
  notas,
  errorMessage,
}: EditDocumentFormProps) {

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          ← Volver al perfil
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-medium tracking-tight text-slate-900">
          Editar documento
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Cliente:{" "}
          <span className="font-medium text-slate-700">{clientName}</span>
        </p>

        {errorMessage ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <form action={updateClientDocument} className="mt-6 space-y-5">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="document_id" value={documentId} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tipo de documento
            </label>
            <input
              type="text"
              value={documentType}
              readOnly
              className={`${fieldClass} bg-slate-50 text-slate-600`}
            />
          </div>

          {archivoUrl ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">
                Archivo actual
              </p>
              <ArchiveFileLink
                href={archivoUrl}
                current
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#227DE8] hover:underline"
              />
            </div>
          ) : null}

          <div>
            <label
              htmlFor="archivo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Reemplazar archivo (PDF o ZIP){" "}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <DocumentFileInput
              id="archivo"
              clientId={clientId}
              documentType={documentType}
            />
          </div>

          <DocumentExpirationFields
            defaultValidoPor={inferDefaultValidoPor(
              sinVencimiento,
              fechaVencimiento,
            )}
            defaultFechaVencimiento={fechaVencimiento}
            defaultValidoManualmente={validoManualmente}
            fechaSubida={fechaSubida}
          />

          <div>
            <label
              htmlFor="notas"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Notas
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              defaultValue={notas ?? ""}
              className={fieldClass}
              placeholder="Observaciones opcionales…"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
            >
              Guardar cambios
            </button>
            <Link
              href={`/dashboard/clients/${clientId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
