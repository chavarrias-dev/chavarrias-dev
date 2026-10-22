"use client";

import { useEffect, useRef, useState } from "react";
import {
  ARCHIVE_FILE_ACCEPT,
  validateArchiveFile,
} from "@/lib/archive-file";
import { documentStoragePath } from "@/lib/documents-config";
import { uploadArchiveFromBrowser } from "@/lib/upload-archive-client";

const inputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#227DE8]/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#227DE8]";

type DocumentFileInputProps = {
  id: string;
  clientId: string;
  documentType: string;
  required?: boolean;
};

export function DocumentFileInput({
  id,
  clientId,
  documentType,
  required = false,
}: DocumentFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const urlRef = useRef("");

  useEffect(() => {
    uploadingRef.current = uploading;
    errorRef.current = error;
    urlRef.current = publicUrl;
  }, [uploading, error, publicUrl]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const onSubmit = (event: Event) => {
      if (uploadingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setError("Espera a que termine la subida del archivo.");
        return;
      }
      if (errorRef.current || (required && !urlRef.current)) {
        event.preventDefault();
        event.stopPropagation();
        if (required && !urlRef.current && !errorRef.current) {
          setError("Debes seleccionar un archivo PDF o ZIP");
        }
      }
    };

    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [required]);

  async function onChange(file: File | undefined) {
    setError(null);
    setPublicUrl("");
    setFileName("");
    if (!file) return;

    const validated = validateArchiveFile(file);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setUploading(true);
    setFileName(file.name);
    try {
      const result = await uploadArchiveFromBrowser(
        file,
        documentStoragePath(clientId, documentType, validated.kind),
      );
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
        accept={ARCHIVE_FILE_ACCEPT}
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
      ) : null}
    </div>
  );
}
