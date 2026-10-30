"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import {
  documentAcceptsPhotoUpload,
  expedienteUploadHint,
  prepareExpedienteUploadFile,
} from "@/lib/expediente-upload";
import { documentStoragePath, type DocumentType } from "@/lib/documents-config";
import { uploadArchiveFromBrowser } from "@/lib/upload-archive-client";
import { quickUploadClientDocument } from "../../../app/dashboard/clients/[id]/documents/actions";

type ExpedientePdfUploadProps = {
  clientId: string;
  documentId: string | null;
  documentType: DocumentType;
  initialArchivoUrl: string | null;
  fechaVencimiento: string | null;
  sinVencimiento: boolean;
  validoManualmente: boolean;
};

export function ExpedientePdfUpload({
  clientId,
  documentType,
  initialArchivoUrl,
}: ExpedientePdfUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivoUrl, setArchivoUrl] = useState(initialArchivoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (archivoUrl) {
    return <ArchiveFileLink href={archivoUrl} />;
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    event.target.value = "";

    if (!fileList?.length) {
      return;
    }

    const files = [...fileList];
    const prepared = await prepareExpedienteUploadFile(files, documentType);
    if (!prepared.ok) {
      setError(prepared.error);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const path = documentStoragePath(clientId, documentType, prepared.kind);
      const uploaded = await uploadArchiveFromBrowser(prepared.file, path);
      if (!uploaded.ok) {
        setError(uploaded.error);
        return;
      }

      const formData = new FormData();
      formData.append("clientId", clientId);
      formData.append("documentType", documentType);
      formData.append("archivo_public_url", uploaded.url);

      const result = await quickUploadClientDocument(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setArchivoUrl(uploaded.url);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const allowsMultiple = documentAcceptsPhotoUpload(documentType);

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={allowsMultiple}
        accept={
          allowsMultiple
            ? "image/*,.pdf,.zip,application/zip,application/pdf"
            : undefined
        }
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-2.5 text-xs font-medium text-[#227DE8] transition-all duration-200 hover:bg-[#227DE8]/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Subiendo…" : "Subir archivo"}
      </button>
      {!error ? (
        <span className="text-[10px] leading-snug text-slate-500">
          {expedienteUploadHint(documentType)}
        </span>
      ) : null}
      {error ? (
        <span className="text-[11px] text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
