"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  CRM_ATTACHMENT_HELP_HINT,
  validatePedimentoArchiveFile,
} from "@/lib/pedimento-archive";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadCrmAttachmentFromBrowser } from "@/lib/upload-archive-client";

const inputClass =
  "block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20";

type ArchiveFileInputProps = {
  id: string;
  folder: "facturas" | "pedimentos";
  onPdfSelected?: (file: File | null) => void;
  onFileSelected?: (file: File | null) => void;
};

export function ArchiveFileInput({
  id,
  folder,
  onPdfSelected,
  onFileSelected,
}: ArchiveFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const onSubmit = (event: Event) => {
      if (uploadingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setError("Espera a que termine la subida del archivo.");
      } else if (errorRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, []);

  async function onChange(file: File | undefined) {
    setError(null);
    setPublicUrl("");
    setFileName("");
    setUploadProgress(0);
    onPdfSelected?.(null);
    onFileSelected?.(null);
    if (!file) return;

    const validated = validatePedimentoArchiveFile(file);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    onFileSelected?.(file);
    if (validated.kind === "pdf") onPdfSelected?.(file);

    setFileName(file.name);
    setUploading(true);
    setUploadProgress(0);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sesión no válida. Vuelve a iniciar sesión.");
        setFileName("");
        return;
      }

      const objectPath = `${folder}/${user.id}/${crypto.randomUUID()}.${validated.kind}`;
      const result = await uploadCrmAttachmentFromBrowser(
        file,
        objectPath,
        setUploadProgress,
      );
      if (!result.ok) {
        setError(result.error);
        setFileName("");
        setUploadProgress(0);
        return;
      }
      setPublicUrl(result.url);
      setUploadProgress(100);
    } finally {
      setUploading(false);
    }
  }

  const showProgress = uploading || Boolean(publicUrl);
  const progressValue = uploading ? uploadProgress : 100;

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className={inputClass}
        onChange={(event) => {
          void onChange(event.target.files?.[0]);
        }}
      />
      <input type="hidden" name="archivo_public_url" value={publicUrl} />
      {showProgress ? (
        <div className="mt-2" aria-live="polite">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
            aria-label={
              uploading ? "Subiendo archivo" : "Archivo subido correctamente"
            }
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                uploading ? "bg-[#227DE8]" : "bg-emerald-500"
              }`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div
            className={`mt-2 flex items-center gap-2 text-xs ${
              uploading ? "text-slate-600" : "text-emerald-800"
            }`}
          >
            {uploading ? (
              <Loader2
                className="size-4 shrink-0 animate-spin text-[#227DE8]"
                aria-hidden
              />
            ) : (
              <CheckCircle2
                className="animate-check-pop size-4 shrink-0 text-emerald-600"
                aria-hidden
              />
            )}
            <p className="min-w-0 leading-snug">
              {uploading ? (
                <>
                  Subiendo <span className="font-medium">{fileName}</span>…{" "}
                  {uploadProgress}%
                </>
              ) : (
                <>
                  <span className="font-semibold">Cargado completamente:</span>{" "}
                  <span className="font-medium">{fileName}</span>
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : !showProgress ? (
        <p className="mt-1.5 text-xs text-slate-500">{CRM_ATTACHMENT_HELP_HINT}</p>
      ) : null}
    </div>
  );
}
