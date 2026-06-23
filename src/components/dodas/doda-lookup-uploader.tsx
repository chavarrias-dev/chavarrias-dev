"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Loader2, UploadCloud } from "lucide-react";
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
import type { DodaRecord } from "@/lib/doda-types";

type DodaLookupUploaderProps = {
  clients: ClientOption[];
  variant?: "primary" | "secondary";
};

type UploadPhase = "idle" | "checking" | "done" | "error";

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

export function DodaLookupUploader({
  clients,
  variant = "primary",
}: DodaLookupUploaderProps) {
  const router = useRouter();
  const isSecondary = variant === "secondary";
  const [inputMode, setInputMode] = useState<DodaInputMode>("number");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<DodaRecord | null>(null);
  const [numberResults, setNumberResults] = useState<DodaRecord[]>([]);
  const [integrationNumbers, setIntegrationNumbers] = useState<string[]>([]);
  const [integrationError, setIntegrationError] = useState<string | null>(
    null,
  );
  const [integrationDraft, setIntegrationDraft] = useState("");
  const [queueItems, setQueueItems] = useState<DodaQueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number | null>(
    null,
  );
  const [debugRawQrPayload, setDebugRawQrPayload] = useState<string | null>(
    null,
  );

  const isChecking = phase === "checking";

  async function lookupSingleNumber(
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
        monitor: false,
      }),
    });

    const payload = await parseApiResponse<{
      ok?: boolean;
      error?: string;
      doda?: DodaRecord;
    }>(response);

    if (!response.ok || !payload.doda) {
      throw new Error(payload.error ?? "No se pudo procesar el DODA");
    }

    return payload.doda;
  }

  async function processNumbersSequentially(
    numbers: string[],
    clienteId: string,
    notas: string,
  ) {
    const initialQueue: DodaQueueItem[] = numbers.map((number) => ({
      number,
      status: "pending",
    }));
    setQueueItems(initialQueue);
    setNumberResults([]);

    for (let index = 0; index < numbers.length; index += 1) {
      const number = numbers[index]!;
      setCurrentQueueIndex(index);
      setMessage(`Consultando ${index + 1} de ${numbers.length}…`);

      setQueueItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, status: "processing" } : item,
        ),
      );

      try {
        const doda = await lookupSingleNumber(number, clienteId, notas);
        setNumberResults((current) => [...current, doda]);
        setQueueItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, status: "done" } : item,
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al consultar el DODA";
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
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhase("checking");
    setMessage(null);
    setFileResult(null);
    setNumberResults([]);
    setDebugRawQrPayload(null);
    setQueueItems([]);
    setCurrentQueueIndex(null);
    setIntegrationError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const clienteId = String(formData.get("cliente_id") ?? "");
    const notas = String(formData.get("notas") ?? "");

    try {
      if (inputMode === "file") {
        setMessage("Consultando estado en SAT…");
        const response = await fetch("/api/doda/lookup", {
          method: "POST",
          body: formData,
        });

        const payload = await parseApiResponse<{
          ok?: boolean;
          error?: string;
          doda?: DodaRecord;
          debugRawQrPayload?: string | null;
        }>(response);

        if (!response.ok || !payload.doda) {
          throw new Error(payload.error ?? "No se pudo procesar el DODA");
        }

        setFileResult(payload.doda);
        setDebugRawQrPayload(payload.debugRawQrPayload ?? null);
        setPhase("done");
        form.reset();
        router.refresh();
        return;
      }

      const mergedNumbers = mergeIntegrationDraft(
        integrationNumbers,
        integrationDraft,
      );
      const validated = validateIntegrationNumberList(mergedNumbers);
      if (!validated.ok) {
        setIntegrationError(validated.error);
        throw new Error(validated.error);
      }

      await processNumbersSequentially(validated.numbers, clienteId, notas);
      setPhase("done");
      setIntegrationNumbers([]);
      router.refresh();
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "Error al consultar el DODA",
      );
    }
  }

  const submitClass = isSecondary
    ? "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    : "btn-primary-motion inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-6">
      <section className={isSecondary ? "pt-4" : "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"}>
        {!isSecondary ? (
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium tracking-tight text-slate-900">
                Consultar DODA
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sube un archivo con QR o ingresa números de integración para una
                consulta puntual.
              </p>
            </div>
            <DodaInputModeToggle
              mode={inputMode}
              onChange={setInputMode}
              disabled={isChecking}
            />
          </div>
        ) : (
          <div className="mb-4">
            <DodaInputModeToggle
              mode={inputMode}
              onChange={setInputMode}
              disabled={isChecking}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cliente_id"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Cliente
              </label>
              <select
                id="cliente_id"
                name="cliente_id"
                className={fieldClass}
                defaultValue=""
                disabled={isChecking}
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
                htmlFor="notas"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Notas
              </label>
              <input
                id="notas"
                name="notas"
                type="text"
                className={fieldClass}
                placeholder="Opcional"
                disabled={isChecking}
              />
            </div>
          </div>

          {inputMode === "file" ? (
            <div>
              <label
                htmlFor="doda_file"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Archivo del DODA <span className="text-red-600">*</span>
              </label>
              <input
                id="doda_file"
                name="file"
                type="file"
                required
                accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp"
                disabled={isChecking}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20"
              />
            </div>
          ) : (
            <IntegrationNumbersInput
              value={integrationNumbers}
              onChange={setIntegrationNumbers}
              onDraftChange={setIntegrationDraft}
              disabled={isChecking}
              error={integrationError}
              onErrorChange={setIntegrationError}
              required
            />
          )}

          {isChecking && inputMode === "file" ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {message ?? "Consultando estado en SAT…"}
            </div>
          ) : null}

          {inputMode === "number" && queueItems.length > 0 ? (
            <DodaQueuePanel
              items={queueItems}
              currentIndex={currentQueueIndex}
              actionLabel="Consultando"
            />
          ) : null}

          {phase === "error" && message ? (
            <p
              className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
              role="alert"
            >
              {message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button type="submit" disabled={isChecking} className={submitClass}>
              {isChecking ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Consultando…
                </>
              ) : inputMode === "file" ? (
                <>
                  <UploadCloud className="size-4" aria-hidden />
                  Consultar archivo
                </>
              ) : (
                <>
                  <Hash className="size-4" aria-hidden />
                  Consultar números
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {inputMode === "number" && numberResults.length > 0 ? (
        <DodaResultsTable items={numberResults} />
      ) : null}

      {inputMode === "file" && fileResult ? (
        <div className="space-y-4">
          <DodaResultsTable items={[fileResult]} />
          {debugRawQrPayload ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                QR decodificado (debug)
              </p>
              <p className="mt-2 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                {debugRawQrPayload}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
