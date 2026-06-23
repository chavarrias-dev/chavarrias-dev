"use client";

import type { DodaRecord } from "@/lib/doda-types";
import { DodaLookupStatusBadge } from "@/components/dodas/doda-lookup-status-badge";

type DodaResultCardProps = {
  doda: DodaRecord;
  compact?: boolean;
};

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

export function DodaResultCard({ doda, compact = false }: DodaResultCardProps) {
  const isSuccess = doda.lookup_status === "verificado";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {doda.numero_integracion ?? doda.id.slice(0, 8)}
          </p>
          <p className="text-xs text-slate-600">
            {doda.sat_status ?? doda.lookup_error ?? "Consulta completada"}
          </p>
        </div>
        <DodaLookupStatusBadge status={doda.lookup_status} />
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-amber-200 bg-amber-50/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-slate-900">
            {isSuccess ? "Estado verificado en SAT" : "Requiere revisión manual"}
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            {doda.sat_status ??
              doda.lookup_error ??
              "No se pudo obtener el estado automáticamente."}
          </p>
        </div>
        <DodaLookupStatusBadge status={doda.lookup_status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Número de integración
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {doda.numero_integracion ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Consultado el
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {formatDateTime(doda.looked_up_at)}
          </dd>
        </div>
        {doda.qr_validator_url ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              URL del validador
            </dt>
            <dd className="mt-1 break-all text-sm text-[#227DE8]">
              <a
                href={doda.qr_validator_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {doda.qr_validator_url}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

export function DodaResultCardSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
      <span className="inline-block size-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
      {label}
    </div>
  );
}
