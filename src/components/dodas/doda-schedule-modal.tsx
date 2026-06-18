"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, X } from "lucide-react";
import type { ClientOption } from "@/components/clients/types";
import { ModalShell } from "@/components/ui/modal-shell";
import type { DodaRecord } from "@/lib/doda-types";
import { DodaLookupStatusBadge } from "@/components/dodas/doda-lookup-status-badge";

const MAX_FILES = 3;

type DodaScheduleModalProps = {
  open: boolean;
  onClose: () => void;
  clients: ClientOption[];
};

type UploadPhase = "idle" | "submitting" | "done" | "error";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function DodaScheduleModal({
  open,
  onClose,
  clients,
}: DodaScheduleModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<DodaRecord[]>([]);

  const isSubmitting = phase === "submitting";

  const monitoredCount = useMemo(
    () => results.filter((row) => row.is_monitored).length,
    [results],
  );

  function resetState() {
    setPhase("idle");
    setMessage(null);
    setSelectedFiles([]);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }
    resetState();
    onClose();
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length > MAX_FILES) {
      setMessage(`Solo puedes subir hasta ${MAX_FILES} archivos a la vez.`);
      setSelectedFiles(incoming.slice(0, MAX_FILES));
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        incoming.slice(0, MAX_FILES).forEach((file) => {
          dataTransfer.items.add(file);
        });
        fileInputRef.current.files = dataTransfer.files;
      }
      return;
    }

    setMessage(null);
    setSelectedFiles(incoming);
  }

  function removeFile(index: number) {
    const next = selectedFiles.filter((_, fileIndex) => fileIndex !== index);
    setSelectedFiles(next);
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      next.forEach((file) => dataTransfer.items.add(file));
      fileInputRef.current.files = dataTransfer.files;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setMessage("Selecciona al menos un archivo DODA.");
      setPhase("error");
      return;
    }

    setPhase("submitting");
    setMessage("Programando monitoreo y consultando SAT…");
    setResults([]);

    const form = event.currentTarget;
    const formData = new FormData(form);
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/doda/schedule", {
        method: "POST",
        body: formData,
      });

      const rawBody = await response.text();
      let payload: {
        ok?: boolean;
        error?: string;
        dodas?: DodaRecord[];
        failures?: Array<{ fileName: string; error: string }>;
      };

      try {
        payload = JSON.parse(rawBody) as typeof payload;
      } catch {
        throw new Error(
          response.ok
            ? "Respuesta inválida del servidor"
            : `Error del servidor (${response.status})`,
        );
      }

      if (!response.ok || !payload.dodas?.length) {
        throw new Error(payload.error ?? "No se pudo programar el monitoreo");
      }

      setResults(payload.dodas);
      setPhase("done");
      setMessage(
        payload.failures?.length
          ? `${payload.dodas.length} DODA(s) programados. ${payload.failures.length} archivo(s) fallaron.`
          : `${payload.dodas.length} DODA(s) en monitoreo continuo.`,
      );
      router.refresh();
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "Error al programar DODAs",
      );
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      align="bottom-sheet"
      overlayClassName="bg-slate-900/40 backdrop-blur-[1px]"
      panelClassName="font-poppins flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Programar DODA
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sube hasta 3 DODAs para monitoreo continuo. El sistema consultará el
            SAT cada hora y te avisará si cambia el estatus.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="schedule_cliente_id"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Cliente
              </label>
              <select
                id="schedule_cliente_id"
                name="cliente_id"
                className={fieldClass}
                defaultValue=""
                disabled={isSubmitting}
              >
                <option value="">Sin asociar</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="schedule_notas"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Notas
              </label>
              <input
                id="schedule_notas"
                name="notas"
                type="text"
                className={fieldClass}
                placeholder="Opcional"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="schedule_files"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Archivos DODA <span className="text-red-600">*</span>
              <span className="ml-2 text-xs font-normal text-slate-500">
                (máximo {MAX_FILES})
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="schedule_files"
              type="file"
              multiple
              accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp"
              disabled={isSubmitting}
              onChange={handleFilesChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20"
            />
          </div>

          {selectedFiles.length > 0 ? (
            <ul className="space-y-2">
              {selectedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="truncate pr-3">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={isSubmitting}
                    className="shrink-0 text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {isSubmitting ? (
            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {message}
            </div>
          ) : null}

          {phase === "error" && message ? (
            <p className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800">
              {message}
            </p>
          ) : null}

          {phase === "done" && results.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-sm font-medium text-emerald-900">
                {monitoredCount} DODA(s) en monitoreo activo
              </p>
              <ul className="mt-3 space-y-2">
                {results.map((doda) => (
                  <li
                    key={doda.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {doda.numero_integracion ?? doda.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-600">
                        {doda.sat_status ?? doda.lookup_error ?? "Consulta inicial"}
                      </p>
                    </div>
                    <DodaLookupStatusBadge status={doda.lookup_status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || selectedFiles.length === 0}
            className="btn-primary-motion inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Programando…
              </>
            ) : (
              <>
                <CalendarClock className="size-4" aria-hidden />
                Programar monitoreo
              </>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
