"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { formatDodaDateTime } from "@/components/dodas/doda-display-utils";
import { formatTimeAgo } from "@/lib/messages";
import {
  categorizeDodasForDashboard,
  groupDodasByClient,
  type ClientDodaGroup,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";

type DodaMonitoringDashboardProps = {
  dodas: DodaDashboardRow[];
};

const BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
/** Realtime (see DodaDashboardProvider) handles instant updates; this is just a safety net. */
const MONITORING_REFRESH_FALLBACK_MS = 2 * 60 * 1000;

function MonitoringBadge() {
  return (
    <span
      className={`${BADGE_BASE} border border-orange-200 bg-orange-50 text-orange-800`}
    >
      En consulta 🟠
    </span>
  );
}

function ConfirmedBadge() {
  return (
    <span
      className={`${BADGE_BASE} border border-green-200 bg-green-50 text-green-800`}
    >
      Desaduanamiento libre 🟢
    </span>
  );
}

function ErrorBadge() {
  return (
    <span
      className={`${BADGE_BASE} border border-red-200 bg-red-50 text-red-800`}
    >
      Error en consulta 🔴
    </span>
  );
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Live "next check" countdown, ticking from last_checked_at + 5 minutes. */
function MonitoringCountdown({
  lastCheckedAt,
}: {
  lastCheckedAt: string | null;
}) {
  const [label, setLabel] = useState("Próxima revisión en 5:00 min");

  useEffect(() => {
    let baseTime = lastCheckedAt ? new Date(lastCheckedAt).getTime() : Date.now();

    function tick() {
      const remainingMs = FIVE_MINUTES_MS - (Date.now() - baseTime);
      if (remainingMs <= 0) {
        setLabel("Revisando…");
        baseTime = Date.now();
        return;
      }
      setLabel(`Próxima revisión en ${formatCountdown(remainingMs)} min`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastCheckedAt]);

  return <span className="block text-[11px] text-orange-700">{label}</span>;
}

type GroupedTableProps = {
  title: string;
  description: string;
  groups: ClientDodaGroup[];
  emptyMessage: string;
  variant: "monitoring" | "confirmed" | "error";
  onRetry?: (dodaId: string) => Promise<void>;
  retryingId?: string | null;
};

function rowClassForVariant(variant: GroupedTableProps["variant"]): string {
  switch (variant) {
    case "monitoring":
      return "border-l-4 border-orange-400 bg-orange-50/30 hover:bg-orange-50/60";
    case "confirmed":
      return "border-l-4 border-green-400 bg-green-50/30 hover:bg-green-50/60";
    case "error":
      return "border-l-4 border-red-400 bg-red-50/30 hover:bg-red-50/60";
  }
}

function ClientGroupSection({
  group,
  variant,
  collapsed,
  onToggle,
  onRetry,
  retryingId,
}: {
  group: ClientDodaGroup;
  variant: GroupedTableProps["variant"];
  collapsed: boolean;
  onToggle: () => void;
  onRetry?: (dodaId: string) => Promise<void>;
  retryingId?: string | null;
}) {
  const rowClass = rowClassForVariant(variant);

  return (
    <>
      <tr className="border-b border-slate-200 bg-slate-50/90">
        <td colSpan={4} className="px-4 py-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-medium text-slate-800">
              {group.clientLabel}
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({group.items.length})
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-slate-400 transition-transform ${
                collapsed ? "" : "rotate-180"
              }`}
              aria-hidden
            />
          </button>
        </td>
      </tr>

      {!collapsed
        ? group.items.map((doda) => (
            <tr
              key={doda.id}
              id={`doda-row-${doda.id}`}
              className={`border-b border-slate-100 last:border-0 transition-colors ${rowClass}`}
            >
              <td className="px-4 py-3 font-medium text-slate-900">
                {doda.numero_integracion ?? "—"}
              </td>

              {variant === "monitoring" ? (
                <>
                  <td className="px-4 py-3 text-slate-600">
                    Última revisión:{" "}
                    {doda.last_checked_at
                      ? formatTimeAgo(doda.last_checked_at)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Revisión #{doda.check_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <MonitoringBadge />
                    <MonitoringCountdown
                      lastCheckedAt={doda.last_checked_at ?? doda.looked_up_at}
                    />
                  </td>
                </>
              ) : null}

              {variant === "confirmed" ? (
                <>
                  <td className="px-4 py-3 text-green-700">
                    {formatDodaDateTime(
                      doda.looked_up_at ?? doda.last_checked_at ?? doda.created_at,
                    )}
                  </td>
                  <td className="px-4 py-3 text-green-700">
                    {group.clientLabel}
                  </td>
                  <td className="px-4 py-3">
                    <ConfirmedBadge />
                  </td>
                </>
              ) : null}

              {variant === "error" ? (
                <>
                  <td className="px-4 py-3 text-sm text-red-800">
                    {doda.lookup_error ?? "Error desconocido"}
                  </td>
                  <td className="px-4 py-3">
                    <ErrorBadge />
                  </td>
                  <td className="px-4 py-3">
                    {onRetry ? (
                      <button
                        type="button"
                        onClick={() => onRetry(doda.id)}
                        disabled={retryingId === doda.id}
                        className="text-xs font-medium text-[#227DE8] underline-offset-2 transition hover:text-[#1a6ed4] hover:underline disabled:opacity-50"
                      >
                        {retryingId === doda.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                            Reintentando…
                          </span>
                        ) : (
                          "Reintentar"
                        )}
                      </button>
                    ) : null}
                  </td>
                </>
              ) : null}
            </tr>
          ))
        : null}
    </>
  );
}

function GroupedDodaTable({
  title,
  description,
  groups,
  emptyMessage,
  variant,
  onRetry,
  retryingId,
}: GroupedTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  function toggleGroup(label: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  const headColumns =
    variant === "monitoring"
      ? ["Número de integración", "Última consulta", "Veces revisado", "Estado"]
      : variant === "confirmed"
        ? [
            "Número de integración",
            "Fecha confirmación",
            "Cliente",
            "Estado",
          ]
        : ["Número de integración", "Error", "Estado", "Acciones"];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 className="text-base font-medium tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {headColumns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 font-medium text-slate-700"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <ClientGroupSection
                  key={group.clientLabel}
                  group={group}
                  variant={variant}
                  collapsed={collapsedGroups.has(group.clientLabel)}
                  onToggle={() => toggleGroup(group.clientLabel)}
                  onRetry={onRetry}
                  retryingId={retryingId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function useDashboardGroups(dodas: DodaDashboardRow[]) {
  const buckets = useMemo(() => categorizeDodasForDashboard(dodas), [dodas]);
  const monitoringGroups = useMemo(
    () => groupDodasByClient(buckets.monitoring),
    [buckets.monitoring],
  );
  const confirmedGroups = useMemo(
    () => groupDodasByClient(buckets.confirmed),
    [buckets.confirmed],
  );
  const errorGroups = useMemo(
    () => groupDodasByClient(buckets.errors),
    [buckets.errors],
  );

  return { monitoringGroups, confirmedGroups, errorGroups };
}

/** "En monitoreo" table. Auto-refreshes so resolved/failed DODAs move to their table. */
export function DodaMonitoringTable({ dodas }: DodaMonitoringDashboardProps) {
  const router = useRouter();
  const { monitoringGroups } = useDashboardGroups(dodas);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, MONITORING_REFRESH_FALLBACK_MS);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <GroupedDodaTable
      title="En monitoreo"
      description="DODAs en cola de revisión automática, pendientes de desaduanamiento libre."
      groups={monitoringGroups}
      emptyMessage="No hay DODAs en monitoreo activo."
      variant="monitoring"
    />
  );
}

/** "Desaduanamiento confirmado" table. */
export function DodaConfirmedTable({ dodas }: DodaMonitoringDashboardProps) {
  const { confirmedGroups } = useDashboardGroups(dodas);

  return (
    <GroupedDodaTable
      title="Desaduanamiento confirmado"
      description="DODAs que ya alcanzaron desaduanamiento libre en el SAT."
      groups={confirmedGroups}
      emptyMessage="Aún no hay DODAs con desaduanamiento confirmado."
      variant="confirmed"
    />
  );
}

/** "Errores" table. */
export function DodaMonitoringErrorsTable({
  dodas,
}: DodaMonitoringDashboardProps) {
  const router = useRouter();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const { errorGroups } = useDashboardGroups(dodas);

  async function handleRetry(dodaId: string) {
    setRetryingId(dodaId);
    setRetryError(null);

    try {
      const response = await fetch(`/api/doda/${dodaId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo reintentar la consulta");
      }

      router.refresh();
    } catch (error) {
      setRetryError(
        error instanceof Error ? error.message : "No se pudo reintentar la consulta",
      );
    } finally {
      setRetryingId(null);
    }
  }

  if (errorGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {retryError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {retryError}
        </p>
      ) : null}
      <GroupedDodaTable
        title="Errores"
        description="Consultas fallidas que requieren reintento manual."
        groups={errorGroups}
        emptyMessage=""
        variant="error"
        onRetry={handleRetry}
        retryingId={retryingId}
      />
    </div>
  );
}
