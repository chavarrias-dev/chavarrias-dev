"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Hash, Loader2 } from "lucide-react";
import type { ClientOption } from "@/components/clients/types";
import {
  DodaInputModeToggle,
  type DodaInputMode,
} from "@/components/dodas/doda-input-mode-toggle";
import {
  IntegrationNumbersInput,
  mergeIntegrationDraft,
  validateIntegrationNumberList,
} from "@/components/dodas/integration-numbers-input";
import {
  DodaQueuePanel,
  type DodaQueueItem,
} from "@/components/dodas/doda-queue-panel";
import { DodaResultsTable } from "@/components/dodas/doda-results-table";
import { ScheduledDodaList } from "@/components/dodas/scheduled-doda-list";
import type { DodaRecord } from "@/lib/doda-types";

const MAX_ITEMS = 3;

type DodaScheduleSectionProps = {
  clients: ClientOption[];
};

type UploadPhase = "idle" | "submitting" | "done" | "error";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

async function parseApiResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Respuesta inválida del servidor"
        : `Error del servidor (${response.status})`,
    );
  }
}

export function DodaScheduleSection({ clients }: DodaScheduleSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<DodaInputMode>("number");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [integrationNumbers, setIntegrationNumbers] = useState<string[]>([]);
  const [integrationError, setIntegrationError] = useState<string | null>(
    null,
  );
  const [integrationDraft, setIntegrationDraft] = useState("");
  const [scheduledResults, setScheduledResults] = useState<DodaRecord[]>([]);
  const [lookupResults, setLookupResults] = useState<DodaRecord[]>([]);
  const [queueItems, setQueueItems] = useState<DodaQueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number | null>(
    null,
  );
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isSubmitting = phase === "submitting";

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length > MAX_ITEMS) {
      setMessage(`Solo puedes subir hasta ${MAX_ITEMS} archivos a la vez.`);
      setSelectedFiles(incoming.slice(0, MAX_ITEMS));
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        incoming.slice(0, MAX_ITEMS).forEach((file) => {
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

  async function scheduleSingleNumber(
    integrationNumber: string,
    clienteId: string,
    notas: string,
  ): Promise<DodaRecord> {
    const response = await fetch("/api/doda/lookup-by-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        integration_number: integrationNumber,
        cliente_id: clienteId || null,
        notas: notas || null,
        monitor: true,
      }),
    });

    const payload = await parseApiResponse<{
      ok?: boolean;
      error?: string;
      doda?: DodaRecord;
    }>(response);

    if (!response.ok || !payload.doda) {
      throw new Error(payload.error ?? "No se pudo programar el DODA");
    }

    return payload.doda;
  }

  async function processNumbersSequentially(
    numbers: string[],
    clienteId: string,
    notas: string,
  ): Promise<number> {
    const initialQueue: DodaQueueItem[] = numbers.map((number) => ({
      number,
      status: "pending",
    }));
    setQueueItems(initialQueue);
    setScheduledResults([]);
    setLookupResults([]);

    let successCount = 0;

    for (let index = 0; index < numbers.length; index += 1) {
      const number = numbers[index]!;
      setCurrentQueueIndex(index);
      setMessage(`Programando ${index + 1} de ${numbers.length}…`);

      setQueueItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, status: "processing" } : item,
        ),
      );

      try {
        const doda = await scheduleSingleNumber(number, clienteId, notas);
        successCount += 1;
        setScheduledResults((current) => [...current, doda]);
        setLookupResults((current) => [...current, doda]);
        setQueueItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, status: "done" } : item,
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "No se pudo programar el DODA";
        setQueueItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? { ...item, status: "error", error: errorMessage }
              : item,
          ),
        );
      }
    }

    setCurrentQueueIndex(null);
    return successCount;
  }

  async function handleRemoveScheduled(dodaId: string) {
    setRemovingId(dodaId);
    try {
      const response = await fetch(`/api/doda/${dodaId}/unmonitor`, {
        method: "PATCH",
      });
      const payload = await parseApiResponse<{ ok?: boolean; error?: string }>(
        response,
      );
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo quitar el monitoreo");
      }

      setScheduledResults((current) =>
        current.map((item) =>
          item.id === dodaId ? { ...item, is_monitored: false } : item,
        ),
      );
      setLookupResults((current) =>
        current.map((item) =>
          item.id === dodaId ? { ...item, is_monitored: false } : item,
        ),
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo quitar el monitoreo",
      );
      setPhase("error");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const clienteId = String(formData.get("cliente_id") ?? "");
    const notas = String(formData.get("notas") ?? "");

    setPhase("submitting");
    setMessage(null);
    setScheduledResults([]);
    setLookupResults([]);
    setQueueItems([]);
    setCurrentQueueIndex(null);
    setIntegrationError(null);

    try {
      if (inputMode === "file") {
        if (selectedFiles.length === 0) {
          throw new Error("Selecciona al menos un archivo DODA.");
        }

        formData.delete("integration_numbers");
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        setMessage("Programando monitoreo y consultando SAT…");

        const response = await fetch("/api/doda/schedule", {
          method: "POST",
          body: formData,
        });

        const payload = await parseApiResponse<{
          ok?: boolean;
          error?: string;
          dodas?: DodaRecord[];
          failures?: Array<{ fileName: string; error: string }>;
        }>(response);

        if (!response.ok || !payload.dodas?.length) {
          throw new Error(payload.error ?? "No se pudo programar el monitoreo");
        }

        setScheduledResults(payload.dodas);
        setLookupResults(payload.dodas);
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setPhase("done");
        setMessage(
          payload.failures?.length
            ? `${payload.dodas.length} DODA(s) programados. ${payload.failures.length} archivo(s) fallaron.`
            : `${payload.dodas.length} DODA(s) en monitoreo continuo.`,
        );
        router.refresh();
        return;
      }

      const mergedNumbers = mergeIntegrationDraft(
        integrationNumbers,
        integrationDraft,
        MAX_ITEMS,
      );
      const validated = validateIntegrationNumberList(
        mergedNumbers,
        MAX_ITEMS,
      );
      if (!validated.ok) {
        setIntegrationError(validated.error);
        throw new Error(validated.error);
      }

      const successCount = await processNumbersSequentially(
        validated.numbers,
        clienteId,
        notas,
      );
      setIntegrationNumbers([]);
      setIntegrationDraft("");
      setPhase("done");
      setMessage(
        successCount > 0
          ? `${successCount} DODA(s) en monitoreo continuo.`
          : "No se pudo programar ningún DODA.",
      );
      router.refresh();
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "Error al programar DODAs",
      );
    }
  }

  const activeScheduled = scheduledResults.filter((item) => item.is_monitored);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#227DE8]/25 bg-white shadow-sm">
      <div className="border-b border-[#227DE8]/15 bg-gradient-to-br from-[#227DE8]/8 via-white to-white px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#227DE8]">
          Acción recomendada
        </p>
        <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900 sm:text-2xl">
          Programar DODA
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Monitorea uno o varios números de integración de forma continua. El
          sistema consultará el SAT cada hora y te avisará si cambia el estatus.
        </p>
        <div className="mt-4">
          <DodaInputModeToggle
            mode={inputMode}
            onChange={setInputMode}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
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

          {inputMode === "file" ? (
            <div>
              <label
                htmlFor="schedule_files"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Archivos DODA <span className="text-red-600">*</span>
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (máximo {MAX_ITEMS})
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
          ) : (
            <IntegrationNumbersInput
              value={integrationNumbers}
              onChange={setIntegrationNumbers}
              onDraftChange={setIntegrationDraft}
              disabled={isSubmitting}
              maxCount={MAX_ITEMS}
              error={integrationError}
              onErrorChange={setIntegrationError}
              required
            />
          )}

          {inputMode === "file" && selectedFiles.length > 0 ? (
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

          {inputMode === "number" && queueItems.length > 0 ? (
            <DodaQueuePanel
              items={queueItems}
              currentIndex={currentQueueIndex}
              actionLabel="Programando"
              title="Progreso de programación"
            />
          ) : null}

          {phase === "error" && message ? (
            <p className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800">
              {message}
            </p>
          ) : null}

          {phase === "done" && message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
              {message}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (inputMode === "file" && selectedFiles.length === 0) ||
              (inputMode === "number" && integrationNumbers.length === 0)
            }
            className="btn-primary-motion inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Programando…
              </>
            ) : inputMode === "file" ? (
              <>
                <CalendarClock className="size-4" aria-hidden />
                Programar monitoreo
              </>
            ) : (
              <>
                <Hash className="size-4" aria-hidden />
                Programar números
              </>
            )}
          </button>
        </div>
      </form>

      {(lookupResults.length > 0 || activeScheduled.length > 0) && (
        <div className="space-y-6 border-t border-slate-100 px-5 py-5 sm:px-6 sm:py-6">
          {lookupResults.length > 0 ? (
            <DodaResultsTable items={lookupResults} />
          ) : null}

          {activeScheduled.length > 0 ? (
            <ScheduledDodaList
              items={activeScheduled}
              onRemove={handleRemoveScheduled}
              removingId={removingId}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
