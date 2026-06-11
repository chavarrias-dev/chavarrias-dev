"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateDocumentStatusFromRow,
} from "@/lib/document-status";
import {
  documentStoragePath,
  type DocumentType,
} from "@/lib/documents-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

type ExpedientePdfUploadProps = {
  clientId: string;
  documentId: string;
  documentType: DocumentType;
  initialArchivoUrl: string | null;
  isConfigured: boolean;
  fechaVencimiento: string | null;
  sinVencimiento: boolean;
  validoManualmente: boolean;
};

export function ExpedientePdfUpload({
  clientId,
  documentId,
  documentType,
  initialArchivoUrl,
  isConfigured,
  fechaVencimiento,
  sinVencimiento,
  validoManualmente,
}: ExpedientePdfUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivoUrl, setArchivoUrl] = useState(initialArchivoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isConfigured) {
    return <span className="text-slate-400">—</span>;
  }

  if (archivoUrl) {
    return (
      <a
        href={archivoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
      >
        Ver documento
      </a>
    );
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesión no válida");
        return;
      }

      const path = documentStoragePath(clientId, documentType);
      const { error: uploadError } = await supabase.storage
        .from(CRM_DOCUMENTS_BUCKET)
        .upload(path, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        setError(`Error al subir: ${uploadError.message}`);
        return;
      }

      const { data: publicData } = supabase.storage
        .from(CRM_DOCUMENTS_BUCKET)
        .getPublicUrl(path);

      const nextArchivoUrl = publicData.publicUrl;
      const status = calculateDocumentStatusFromRow({
        archivoUrl: nextArchivoUrl,
        fechaVencimiento,
        sinVencimiento,
        validoManualmente,
      });

      const { error: updateError } = await supabase
        .from("client_documents")
        .update({
          archivo_url: nextArchivoUrl,
          fecha_subida: new Date().toISOString(),
          subido_por: user.id,
          status,
        })
        .eq("id", documentId)
        .eq("client_id", clientId);

      if (updateError) {
        setError(`Error al guardar: ${updateError.message}`);
        return;
      }

      setArchivoUrl(nextArchivoUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-2.5 text-xs font-medium text-[#227DE8] transition-all duration-200 hover:bg-[#227DE8]/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Subiendo…" : "Subir PDF"}
      </button>
      {error ? (
        <span className="text-[11px] text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
