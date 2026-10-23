"use client";

import { useEffect, useRef, useState } from "react";
import {
  ARCHIVE_UPLOAD_HINT,
  validateArchiveFile,
} from "@/lib/archive-file";
import {
  PEDIMENTO_ARCHIVE_UPLOAD_HINT,
  validatePedimentoArchiveFile,
} from "@/lib/pedimento-archive";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  uploadArchiveFromBrowser,
  uploadPedimentoArchiveFromBrowser,
} from "@/lib/upload-archive-client";

const inputClass =
  "block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20";

type ArchiveFileInputProps = {
  id: string;
  folder: "facturas" | "pedimentos";
  onPdfSelected?: (file: File | null) => void;
};

export function ArchiveFileInput({
  id,
  folder,
  onPdfSelected,
}: ArchiveFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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
    onPdfSelected?.(null);
    if (!file) return;

    const isPedimento = folder === "pedimentos";
    const validated = isPedimento
      ? validatePedimentoArchiveFile(file)
      : validateArchiveFile(file);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    if (validated.kind === "pdf") onPdfSelected?.(file);

    setUploading(true);
    setFileName(file.name);
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
      const result = isPedimento
        ? await uploadPedimentoArchiveFromBrowser(file, objectPath)
        : await uploadArchiveFromBrowser(file, objectPath);
      if (!result.ok) {
        setError(result.error);
        setFileName("");
        return;
      }
      setPublicUrl(result.url);
    } finally {
      setUploading(false);
    }
  }

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
      {uploading ? (
        <p className="mt-1.5 text-xs text-slate-500">Subiendo archivo…</p>
      ) : null}
      {publicUrl ? (
        <p className="mt-1.5 text-xs text-emerald-700">
          Listo para guardar: {fileName}
        </p>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">
          {folder === "pedimentos"
            ? PEDIMENTO_ARCHIVE_UPLOAD_HINT
            : ARCHIVE_UPLOAD_HINT}
        </p>
      )}
    </div>
  );
}
