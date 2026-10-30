"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import {
  FACTURA_ARCHIVE_FILES_HINT,
  FACTURA_MAX_ARCHIVE_FILES,
} from "@/lib/factura-archive-constants";
import {
  validatePedimentoArchiveFile,
  verifyPedimentoArchiveFileMagic,
} from "@/lib/pedimento-archive";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadCrmAttachmentFromBrowser } from "@/lib/upload-archive-client";

const inputClass =
  "block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20";

type UploadedItem = {
  id: string;
  fileName: string;
  publicUrl: string;
  kind: "pdf" | "zip" | "rar";
  sourceFile: File;
  uploading: boolean;
  progress: number;
  error: string | null;
};

type FacturaArchiveFilesInputProps = {
  id: string;
  onPdfSelected?: (file: File | null) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FacturaArchiveFilesInput({
  id,
  onPdfSelected,
}: FacturaArchiveFilesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const uploadingRef = useRef(false);

  const uploadingCount = items.filter((item) => item.uploading).length;
  uploadingRef.current = uploadingCount > 0;

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const onSubmit = (event: Event) => {
      if (uploadingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setFormError("Espera a que terminen de subirse todos los archivos.");
      } else if (formError) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [formError]);

  useEffect(() => {
    const firstPdf = items.find(
      (item) =>
        item.kind === "pdf" &&
        !item.uploading &&
        item.publicUrl &&
        !item.error,
    );
    onPdfSelected?.(firstPdf?.sourceFile ?? null);
  }, [items, onPdfSelected]);

  async function uploadOne(file: File) {
    const validated = validatePedimentoArchiveFile(file);
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }
    const magic = await verifyPedimentoArchiveFileMagic(file, validated.kind);
    if (!magic.ok) {
      setFormError(magic.error);
      return;
    }

    const itemId = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id: itemId,
        fileName: file.name,
        publicUrl: "",
        kind: validated.kind,
        sourceFile: file,
        uploading: true,
        progress: 0,
        error: null,
      },
    ]);
    setFormError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        setFormError("Sesión no válida. Vuelve a iniciar sesión.");
        return;
      }

      const objectPath = `facturas/${user.id}/${crypto.randomUUID()}.${validated.kind}`;
      const result = await uploadCrmAttachmentFromBrowser(
        file,
        objectPath,
        (percent) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, progress: percent } : item,
            ),
          );
        },
      );

      if (!result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, uploading: false, error: result.error }
              : item,
          ),
        );
        setFormError(result.error);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                uploading: false,
                progress: 100,
                publicUrl: result.url,
                error: null,
              }
            : item,
        ),
      );
    } catch {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setFormError("No se pudo subir el archivo.");
    }
  }

  async function onFilesPicked(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = [...fileList];
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    const slotsLeft = FACTURA_MAX_ARCHIVE_FILES - items.length;
    if (slotsLeft <= 0) {
      setFormError(`Máximo ${FACTURA_MAX_ARCHIVE_FILES} archivos.`);
      return;
    }

    const batch = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      setFormError(
        `Solo se agregaron ${slotsLeft} archivo(s). Máximo ${FACTURA_MAX_ARCHIVE_FILES}.`,
      );
    } else {
      setFormError(null);
    }

    for (const file of batch) {
      await uploadOne(file);
    }
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setFormError(null);
  }

  const readyItems = items.filter(
    (item) => !item.uploading && item.publicUrl && !item.error,
  );

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        className={inputClass}
        onChange={(event) => {
          void onFilesPicked(event.target.files);
        }}
      />
      {readyItems.map((item) => (
        <input
          key={item.id}
          type="hidden"
          name="archivo_public_url"
          value={item.publicUrl}
        />
      ))}
      <p className="mt-1.5 text-xs text-slate-500">
        {FACTURA_ARCHIVE_FILES_HINT}{" "}
        <span className="font-medium text-slate-600">
          ({readyItems.length}/{FACTURA_MAX_ARCHIVE_FILES})
        </span>
      </p>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item.fileName}
                  </p>
                  {item.uploading ? (
                    <p className="mt-0.5 text-xs text-slate-600">
                      Subiendo… {item.progress}%
                    </p>
                  ) : item.error ? (
                    <p className="mt-0.5 text-xs text-red-700">{item.error}</p>
                  ) : (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-800">
                      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                      Listo para guardar
                    </p>
                  )}
                </div>
                {!item.uploading ? (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
                    aria-label={`Quitar ${item.fileName}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : (
                  <Loader2
                    className="size-4 shrink-0 animate-spin text-[#227DE8]"
                    aria-hidden
                  />
                )}
              </div>
              {item.uploading ? (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress}
                >
                  <div
                    className="h-full rounded-full bg-[#227DE8] transition-[width] duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {formError ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}

export { formatFileSize as formatFacturaFileSize };
