"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { DocumentExpirationFields } from "@/components/documents/document-expiration-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import type { DocumentType, ValidityPeriod } from "@/lib/documents-config";
import { uploadClientDocument } from "../../../app/dashboard/clients/[id]/documents/actions";

const fieldClass =
  "form-field w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export type UploadModalDocument = {
  documentType: DocumentType;
  fechaVencimiento?: string | null;
  fechaSubida?: string | null;
  sinVencimiento?: boolean;
  validoManualmente?: boolean;
  notas?: string | null;
  isUpdate?: boolean;
};

type UploadDocumentModalProps = {
  clientId: string;
  open: boolean;
  document: UploadModalDocument | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function inferDefaultValidoPor(
  sinVencimiento?: boolean,
  fechaVencimiento?: string | null,
): ValidityPeriod {
  if (sinVencimiento) {
    return "indefinido";
  }
  if (fechaVencimiento?.trim()) {
    return "fecha_especifica";
  }
  return "indefinido";
}

export function UploadDocumentModal({
  clientId,
  open,
  document,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setErrorMessage(null);
      formRef.current?.reset();
    }
  }, [open, document?.documentType]);

  if (!document) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await uploadClientDocument(formData);
      if (result.ok) {
        onSuccess(
          document.isUpdate
            ? `Documento "${document.documentType}" actualizado correctamente.`
            : `Documento "${document.documentType}" guardado correctamente.`,
        );
        onClose();
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      align="bottom-sheet"
      overlayClassName="bg-slate-900/40 backdrop-blur-[1px]"
      panelClassName="font-poppins flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
    >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="upload-document-title"
              className="text-lg font-medium tracking-tight text-slate-900"
            >
              {document.documentType}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {document.isUpdate
                ? "Actualiza el archivo PDF y la vigencia."
                : "Sube el archivo PDF y define la vigencia."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="documentType" value={document.documentType} />

            {errorMessage ? (
              <p
                className="animate-error-in rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <div>
              <label
                htmlFor="modal-archivo"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Archivo PDF <span className="text-red-600">*</span>
              </label>
              <input
                id="modal-archivo"
                name="archivo"
                type="file"
                accept="application/pdf,.pdf"
                required
                className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#227DE8]/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#227DE8]`}
                onChange={(e) =>
                  setSelectedFile(e.target.files?.[0] ?? null)
                }
              />
              {selectedFile ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Seleccionado: {selectedFile.name}
                </p>
              ) : null}
            </div>

            <DocumentExpirationFields
              key={document.documentType}
              compact
              defaultValidoPor={inferDefaultValidoPor(
                document.sinVencimiento,
                document.fechaVencimiento,
              )}
              defaultFechaVencimiento={document.fechaVencimiento}
              defaultValidoManualmente={document.validoManualmente ?? true}
              fechaSubida={document.fechaSubida}
            />

            <div>
              <label
                htmlFor="modal-notas"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Notas{" "}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                id="modal-notas"
                name="notas"
                rows={3}
                defaultValue={document.notas ?? ""}
                className={fieldClass}
                placeholder="Observaciones opcionales…"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary-motion inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
    </ModalShell>
  );
}
