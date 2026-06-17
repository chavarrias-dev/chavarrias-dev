"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import type { ClientOption } from "@/components/clients/types";
import type { DodaRecord } from "@/lib/doda-types";
import { DodaLookupStatusBadge } from "@/components/dodas/doda-lookup-status-badge";

type DodaLookupUploaderProps = {
  clients: ClientOption[];
};

type UploadPhase = "idle" | "checking" | "done" | "error";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DodaLookupUploader({ clients }: DodaLookupUploaderProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DodaRecord | null>(null);
  const [debugRawQrPayload, setDebugRawQrPayload] = useState<string | null>(
    null,
  );

  const isChecking = phase === "checking";

  const resultSummary = useMemo(() => {
    if (!result) {
      return null;
    }

    if (result.lookup_status === "verificado") {
      return {
        tone: "success" as const,
        title: "Estado verificado en SAT",
        body: result.sat_status ?? "Consulta completada",
      };
    }

    return {
      tone: "warning" as const,
      title: "Requiere revisión manual",
      body:
        result.lookup_error ??
        "No se pudo obtener el estado automáticamente.",
    };
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhase("checking");
    setMessage("Consultando estado en SAT…");
    setResult(null);
    setDebugRawQrPayload(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/doda/lookup", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        doda?: DodaRecord;
        debugRawQrPayload?: string | null;
      };

      if (!response.ok || !payload.doda) {
        throw new Error(payload.error ?? "No se pudo procesar el DODA");
      }

      setResult(payload.doda);
      setDebugRawQrPayload(payload.debugRawQrPayload ?? null);
      setPhase("done");
      setMessage(null);
      form.reset();
      router.refresh();
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "Error al consultar el DODA",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Consultar DODA
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sube la imagen o PDF del DODA con QR. El sistema leerá el código,
            consultará el validador público del SAT y guardará el resultado.
          </p>
        </div>

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

          {isChecking ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Consultando estado en SAT…
            </div>
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
            <button
              type="submit"
              disabled={isChecking}
              className="btn-primary-motion inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChecking ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Consultando…
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" aria-hidden />
                  Consultar DODA
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {result && resultSummary ? (
        <section
          className={`rounded-2xl border p-5 shadow-sm ${
            resultSummary.tone === "success"
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-amber-200 bg-amber-50/70"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-slate-900">
                {resultSummary.title}
              </h3>
              <p className="mt-1 text-sm text-slate-700">{resultSummary.body}</p>
            </div>
            <DodaLookupStatusBadge status={result.lookup_status} />
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Número de integración
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {result.numero_integracion ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Consultado el
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTime(result.looked_up_at)}
              </dd>
            </div>
            {result.qr_validator_url ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  URL del validador
                </dt>
                <dd className="mt-1 break-all text-sm text-[#227DE8]">
                  <a
                    href={result.qr_validator_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {result.qr_validator_url}
                  </a>
                </dd>
              </div>
            ) : null}
            {debugRawQrPayload ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  QR decodificado (debug)
                </dt>
                <dd className="mt-1 break-all rounded-lg border border-slate-200 bg-white/80 px-3 py-2 font-mono text-xs text-slate-800">
                  {debugRawQrPayload}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
