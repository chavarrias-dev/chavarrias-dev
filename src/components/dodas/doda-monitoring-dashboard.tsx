"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Pencil, RotateCw, Trash2, X } from "lucide-react";
import { DodaCancelDialog } from "@/components/dodas/doda-cancel-dialog";
import { DodaNotifyDestinationDialog } from "@/components/dodas/doda-notify-destination-dialog";
import type { WhatsappGroupOption } from "@/components/dodas/doda-notify-destination-dialog";
import { normalizeDodaTimestamp } from "@/components/dodas/doda-display-utils";
import { useDodaDashboard } from "@/components/dodas/doda-dashboard-context";
import { DodaToast, type DodaToastTone } from "@/components/dodas/doda-toast";
import { formatTimeAgo } from "@/lib/messages";
import type { DodaRecord } from "@/lib/doda-types";
import { formatWhatsAppPhoneForDisplay } from "@/lib/whatsapp-phone-input";
import {
  DodaDesktopTable,
  DodaMobileActions,
  DodaMobileCard,
  DodaMobileCardTitle,
  DodaMobileGroup,
  DodaMobileKv,
  DodaMobileStack,
} from "@/components/dodas/doda-mobile-ui";
import {
  categorizeDodasForDashboard,
  groupDodasByClient,
  type ClientDodaGroup,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";
import { DODA_CRON_INTERVAL_MS } from "@/lib/doda-monitoring-constants";
import { DASHBOARD_TABLE_SCROLL_CLASS } from "@/lib/dashboard-layout";

type DodaMonitoringDashboardProps = {
  dodas: DodaDashboardRow[];
  whatsappGroups: WhatsappGroupOption[];
  isAdmin?: boolean;
};

const BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

function dodaNotifyCellDisplay(
  doda: DodaDashboardRow,
  groupNameByStoredId: Map<string, string>,
): {
  label: string;
  title?: string;
} {
  if (
    doda.notify_type === "individual" &&
    doda.notify_whatsapp_number?.trim()
  ) {
    return {
      label: "📱",
      title: formatWhatsAppPhoneForDisplay(doda.notify_whatsapp_number.trim()),
    };
  }
  if (doda.notify_type === "group" && doda.notify_whatsapp_group_id?.trim()) {
    const stored = doda.notify_whatsapp_group_id.trim();
    const catalogName = groupNameByStoredId.get(stored);
    return {
      label: "👥",
      title: catalogName ?? stored,
    };
  }
  return { label: "—" };
}
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

function ErrorBadge() {
  return (
    <span
      className={`${BADGE_BASE} border border-red-200 bg-red-50 text-red-800`}
    >
      Error en consulta 🔴
    </span>
  );
}

/** Parse stored `timestamp without time zone` as UTC via normalizeDodaTimestamp. */
function parseDodaInstant(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const ms = new Date(normalizeDodaTimestamp(value)).getTime();
  if (!Number.isFinite(ms)) {
    return null;
  }
  return new Date(ms);
}

function formatTimeUntilNextReview(ms: number): string {
  if (ms <= 0) {
    return "pendiente";
  }
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/** Cuenta atrás hasta la próxima ventana de revisión automática (cron ~cada 3 min). */
function MonitoringNextReviewLine({
  lastCheckedAt,
}: {
  lastCheckedAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const last = parseDodaInstant(lastCheckedAt);
  if (!last) {
    return (
      <span className="block text-[11px] leading-snug text-orange-700">
        Próxima revisión automática en breve
      </span>
    );
  }

  const nextAt = last.getTime() + DODA_CRON_INTERVAL_MS;
  const remaining = nextAt - now;

  return (
    <span className="block text-[11px] leading-snug text-orange-700">
      Próxima revisión en {formatTimeUntilNextReview(remaining)}
    </span>
  );
}

type GroupedTableProps = {
  title: string;
  description: string;
  groups: ClientDodaGroup[];
  emptyMessage: string;
  variant: "monitoring" | "error";
  groupNameByStoredId: Map<string, string>;
  onRetry?: (dodaId: string) => Promise<void>;
  retryingId?: string | null;
  onCancelRequest?: (doda: DodaDashboardRow) => void;
  cancellingId?: string | null;
  onCheckNowRequest?: (doda: DodaDashboardRow) => void;
  checkingId?: string | null;
  onEditNotify?: (doda: DodaDashboardRow) => void;
  onPermanentDeleteRequest?: (doda: DodaDashboardRow) => void;
  permanentDeletingId?: string | null;
  disableRowActions?: boolean;
  headerAction?: React.ReactNode;
};

function rowClassForVariant(variant: GroupedTableProps["variant"]): string {
  switch (variant) {
    case "monitoring":
      return "border-l-4 border-orange-400 bg-orange-50/30 hover:bg-orange-50/60";
    case "error":
      return "border-l-4 border-red-400 bg-red-50/30 hover:bg-red-50/60";
  }
}

function ClientGroupMobileSection({
  group,
  variant,
  collapsed,
  onToggle,
  onRetry,
  retryingId,
  onCancelRequest,
  cancellingId,
  onCheckNowRequest,
  checkingId,
  onEditNotify,
  onPermanentDeleteRequest,
  permanentDeletingId,
  groupNameByStoredId,
  disableRowActions,
}: {
  group: ClientDodaGroup;
  variant: GroupedTableProps["variant"];
  collapsed: boolean;
  onToggle: () => void;
  onRetry?: (dodaId: string) => Promise<void>;
  retryingId?: string | null;
  onCancelRequest?: (doda: DodaDashboardRow) => void;
  cancellingId?: string | null;
  onCheckNowRequest?: (doda: DodaDashboardRow) => void;
  checkingId?: string | null;
  onEditNotify?: (doda: DodaDashboardRow) => void;
  onPermanentDeleteRequest?: (doda: DodaDashboardRow) => void;
  permanentDeletingId?: string | null;
  groupNameByStoredId: Map<string, string>;
  disableRowActions?: boolean;
}) {
  const accent =
    variant === "monitoring"
      ? "border-l-orange-400 bg-orange-50/20"
      : "border-l-red-400 bg-red-50/20";

  return (
    <DodaMobileGroup
      label={group.clientLabel}
      count={group.items.length}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {group.items.map((doda) => {
        const notify =
          variant === "monitoring"
            ? dodaNotifyCellDisplay(doda, groupNameByStoredId)
            : { label: "—", title: undefined };
        return (
          <DodaMobileCard
            key={doda.id}
            id={`doda-row-${doda.id}`}
            accentClass={accent}
          >
            <DodaMobileCardTitle>
              {doda.numero_integracion ?? "—"}
            </DodaMobileCardTitle>

            {variant === "monitoring" ? (
              <>
                <div className="mt-2 space-y-0.5">
                  <DodaMobileKv label="Última rev.">
                    {doda.last_checked_at
                      ? formatTimeAgo(normalizeDodaTimestamp(doda.last_checked_at))
                      : "—"}
                  </DodaMobileKv>
                  <DodaMobileKv label="Revisiones">
                    #{doda.check_count ?? 0}
                  </DodaMobileKv>
                  <DodaMobileKv label="Vehículo">
                    <span className="break-words">{doda.datos_vehiculo ?? "—"}</span>
                  </DodaMobileKv>
                  <DodaMobileKv label="Notif.">
                    <span title={notify.title}>{notify.label}</span>
                    {notify.title ? (
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {notify.title}
                      </span>
                    ) : null}
                    {onEditNotify ? (
                      <button
                        type="button"
                        onClick={() => onEditNotify(doda)}
                        disabled={
                          cancellingId === doda.id ||
                          checkingId === doda.id ||
                          disableRowActions
                        }
                        className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-[#227DE8] hover:underline disabled:opacity-50"
                      >
                        <Pencil className="size-3" aria-hidden />
                        Editar destino
                      </button>
                    ) : null}
                  </DodaMobileKv>
                </div>
                <div className="mt-2">
                  <MonitoringBadge />
                  <MonitoringNextReviewLine
                    lastCheckedAt={doda.last_checked_at ?? null}
                  />
                </div>
                <DodaMobileActions>
                  {onCheckNowRequest ? (
                    <button
                      type="button"
                      onClick={() => onCheckNowRequest(doda)}
                      disabled={
                        cancellingId === doda.id ||
                        checkingId === doda.id ||
                        disableRowActions
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#227DE8]/40 px-2 py-1.5 text-xs font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {checkingId === doda.id ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <RotateCw className="size-3" aria-hidden />
                      )}
                      {checkingId === doda.id ? "Revisando…" : "Revisar"}
                    </button>
                  ) : null}
                  {onPermanentDeleteRequest ? (
                    <button
                      type="button"
                      onClick={() => onPermanentDeleteRequest(doda)}
                      disabled={
                        permanentDeletingId === doda.id ||
                        checkingId === doda.id ||
                        cancellingId === doda.id
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Eliminar registro del CRM"
                    >
                      {permanentDeletingId === doda.id ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-3" aria-hidden />
                      )}
                      Eliminar
                    </button>
                  ) : null}
                  {onCancelRequest ? (
                    <button
                      type="button"
                      onClick={() => onCancelRequest(doda)}
                      disabled={
                        cancellingId === doda.id || checkingId === doda.id
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancellingId === doda.id ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <X className="size-3" aria-hidden />
                      )}
                      Cancelar
                    </button>
                  ) : null}
                </DodaMobileActions>
              </>
            ) : null}

            {variant === "error" ? (
              <>
                <div className="mt-2">
                  <DodaMobileKv label="Error">
                    <span className="break-words text-red-800">
                      {doda.lookup_error ?? "Error desconocido"}
                    </span>
                  </DodaMobileKv>
                </div>
                <div className="mt-2">
                  <ErrorBadge />
                </div>
                {onRetry ? (
                  <DodaMobileActions>
                    <button
                      type="button"
                      onClick={() => onRetry(doda.id)}
                      disabled={retryingId === doda.id}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#227DE8]/40 py-1.5 text-xs font-medium text-[#227DE8] disabled:opacity-50"
                    >
                      {retryingId === doda.id ? (
                        <>
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                          Reintentando…
                        </>
                      ) : (
                        "Reintentar consulta"
                      )}
                    </button>
                  </DodaMobileActions>
                ) : null}
              </>
            ) : null}
          </DodaMobileCard>
        );
      })}
    </DodaMobileGroup>
  );
}

function ClientGroupSection({
  group,
  variant,
  columnCount,
  collapsed,
  onToggle,
  onRetry,
  retryingId,
  onCancelRequest,
  cancellingId,
  onCheckNowRequest,
  checkingId,
  onEditNotify,
  onPermanentDeleteRequest,
  permanentDeletingId,
  groupNameByStoredId,
  disableRowActions,
}: {
  group: ClientDodaGroup;
  variant: GroupedTableProps["variant"];
  columnCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onRetry?: (dodaId: string) => Promise<void>;
  retryingId?: string | null;
  onCancelRequest?: (doda: DodaDashboardRow) => void;
  cancellingId?: string | null;
  onCheckNowRequest?: (doda: DodaDashboardRow) => void;
  checkingId?: string | null;
  onEditNotify?: (doda: DodaDashboardRow) => void;
  onPermanentDeleteRequest?: (doda: DodaDashboardRow) => void;
  permanentDeletingId?: string | null;
  groupNameByStoredId: Map<string, string>;
  disableRowActions?: boolean;
}) {
  const rowClass = rowClassForVariant(variant);

  return (
    <>
      <tr className="border-b border-slate-200 bg-slate-50/90">
        <td colSpan={columnCount} className="px-4 py-2.5">
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
                      ? formatTimeAgo(normalizeDodaTimestamp(doda.last_checked_at))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Revisión #{doda.check_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span
                      className="block max-w-[160px] truncate"
                      title={doda.datos_vehiculo ?? undefined}
                    >
                      {doda.datos_vehiculo ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {(() => {
                      const notify = dodaNotifyCellDisplay(
                        doda,
                        groupNameByStoredId,
                      );
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="text-base leading-none"
                            title={notify.title}
                            aria-label={
                              notify.title ?? "Sin notificación WhatsApp"
                            }
                          >
                            {notify.label}
                          </span>
                          {onEditNotify ? (
                            <button
                              type="button"
                              onClick={() => onEditNotify(doda)}
                              disabled={
                                cancellingId === doda.id ||
                                checkingId === doda.id ||
                                disableRowActions
                              }
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#227DE8] hover:underline disabled:opacity-50"
                            >
                              <Pencil className="size-3" aria-hidden />
                              Editar
                            </button>
                          ) : null}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <MonitoringBadge />
                    <MonitoringNextReviewLine
                      lastCheckedAt={doda.last_checked_at ?? null}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {onCheckNowRequest ? (
                        <button
                          type="button"
                          onClick={() => onCheckNowRequest(doda)}
                          disabled={
                            cancellingId === doda.id ||
                            checkingId === doda.id ||
                            disableRowActions
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#227DE8]/40 px-2.5 py-1 text-xs font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {checkingId === doda.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <RotateCw className="size-3" aria-hidden />
                          )}
                          {checkingId === doda.id ? "Revisando…" : "Revisar ahora"}
                        </button>
                      ) : null}
                      {onPermanentDeleteRequest ? (
                        <button
                          type="button"
                          onClick={() => onPermanentDeleteRequest(doda)}
                          disabled={
                            permanentDeletingId === doda.id ||
                            cancellingId === doda.id ||
                            checkingId === doda.id ||
                            disableRowActions
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Eliminar registro del CRM (irreversible)"
                        >
                          {permanentDeletingId === doda.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-3" aria-hidden />
                          )}
                          Eliminar
                        </button>
                      ) : null}
                      {onCancelRequest ? (
                        <button
                          type="button"
                          onClick={() => onCancelRequest(doda)}
                          disabled={
                            cancellingId === doda.id || checkingId === doda.id
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingId === doda.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <X className="size-3" aria-hidden />
                          )}
                          Cancelar
                        </button>
                      ) : null}
                    </div>
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
  groupNameByStoredId,
  onRetry,
  retryingId,
  onCancelRequest,
  cancellingId,
  onCheckNowRequest,
  checkingId,
  onEditNotify,
  onPermanentDeleteRequest,
  permanentDeletingId,
  disableRowActions,
  headerAction,
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
      ? [
          "Número de integración",
          "Última consulta",
          "Veces revisado",
          "Vehículo",
          "Notif.",
          "Estado",
          "Acciones",
        ]
      : ["Número de integración", "Error", "Estado", "Acciones"];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-sm font-medium tracking-tight text-slate-900 sm:text-base">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
            {description}
          </p>
        </div>
        {headerAction ? (
          <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            {headerAction}
          </div>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500 sm:px-6 sm:py-8">
          {emptyMessage}
        </p>
      ) : (
        <>
          <DodaDesktopTable>
            <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
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
                      columnCount={headColumns.length}
                      collapsed={collapsedGroups.has(group.clientLabel)}
                      onToggle={() => toggleGroup(group.clientLabel)}
                      onRetry={onRetry}
                      retryingId={retryingId}
                      onCancelRequest={onCancelRequest}
                      cancellingId={cancellingId}
                      onCheckNowRequest={onCheckNowRequest}
                      checkingId={checkingId}
                      onEditNotify={onEditNotify}
                      onPermanentDeleteRequest={onPermanentDeleteRequest}
                      permanentDeletingId={permanentDeletingId}
                      groupNameByStoredId={groupNameByStoredId}
                      disableRowActions={disableRowActions}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </DodaDesktopTable>

          <DodaMobileStack>
            {groups.map((group) => (
              <ClientGroupMobileSection
                key={group.clientLabel}
                group={group}
                variant={variant}
                collapsed={collapsedGroups.has(group.clientLabel)}
                onToggle={() => toggleGroup(group.clientLabel)}
                onRetry={onRetry}
                retryingId={retryingId}
                onCancelRequest={onCancelRequest}
                cancellingId={cancellingId}
                onCheckNowRequest={onCheckNowRequest}
                checkingId={checkingId}
                onEditNotify={onEditNotify}
                onPermanentDeleteRequest={onPermanentDeleteRequest}
                permanentDeletingId={permanentDeletingId}
                groupNameByStoredId={groupNameByStoredId}
                disableRowActions={disableRowActions}
              />
            ))}
          </DodaMobileStack>
        </>
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
  const errorGroups = useMemo(
    () => groupDodasByClient(buckets.errors),
    [buckets.errors],
  );

  return { monitoringGroups, errorGroups };
}

const TOAST_DURATION_MS = 3000;

/**
 * Scrape failures are stored with an internal " Debug: /tmp/….html | /tmp/….png"
 * suffix (see formatSatScrapeFailureReason). Strip it before showing the reason
 * to a user.
 */
function cleanDodaErrorMessage(
  message: string | null | undefined,
): string | null {
  if (!message) {
    return null;
  }
  const cleaned = message.split(/\s*Debug:/)[0]?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : message;
}

/** "En monitoreo" table. Auto-refreshes so resolved/failed DODAs move to their table. */
export function DodaMonitoringTable({
  dodas,
  whatsappGroups,
  isAdmin = false,
}: DodaMonitoringDashboardProps) {
  const router = useRouter();
  const { removeDoda, updateDoda } = useDodaDashboard();
  const { monitoringGroups } = useDashboardGroups(dodas);
  const groupNameByStoredId = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of whatsappGroups) {
      map.set(g.group_id, g.name);
    }
    return map;
  }, [whatsappGroups]);
  const [notifyEditTarget, setNotifyEditTarget] =
    useState<DodaDashboardRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DodaDashboardRow | null>(
    null,
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkAllProgress, setCheckAllProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [toast, setToast] = useState<{
    key: number;
    tone: DodaToastTone;
    message: string;
  } | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, MONITORING_REFRESH_FALLBACK_MS);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  function showToast(tone: DodaToastTone, message: string) {
    setToast({ key: Date.now(), tone, message });
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) {
      return;
    }

    const dodaId = cancelTarget.id;
    setCancellingId(dodaId);
    setCancelError(null);

    try {
      const response = await fetch(`/api/doda/${dodaId}/cancel`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo cancelar el monitoreo");
      }

      removeDoda(dodaId);
      setCancelTarget(null);
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "No se pudo cancelar el monitoreo",
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function handleCheckNow(doda: DodaDashboardRow) {
    setCheckingId(doda.id);

    try {
      const response = await fetch(`/api/doda/${doda.id}/check-now`, {
        method: "POST",
      });

      let payload: {
        ok?: boolean;
        error?: string;
        doda?: DodaRecord;
        resolved?: boolean;
        check_failed?: boolean;
        lookup_error?: string | null;
      } = {};
      try {
        payload = await response.json();
      } catch {
        throw new Error(
          `El servidor respondió con un error (${response.status}). Intenta de nuevo.`,
        );
      }

      if (!response.ok || !payload.ok || !payload.doda) {
        throw new Error(payload.error ?? "No se pudo consultar el DODA");
      }

      updateDoda(doda.id, payload.doda);

      if (payload.resolved) {
        showToast("success", "¡Desaduanado!");
      } else if (payload.check_failed) {
        showToast(
          "error",
          cleanDodaErrorMessage(payload.lookup_error) ??
            "El SAT no respondió correctamente. El DODA pasó a revisión manual.",
        );
      } else {
        showToast("neutral", "Sin cambios, continúa en monitoreo");
      }
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Error al consultar",
      );
    } finally {
      setCheckingId(null);
    }
  }

  async function handleCheckAll() {
    const activeDodas = monitoringGroups.flatMap((group) => group.items);
    if (activeDodas.length === 0 || checkingAll) {
      return;
    }

    setCheckingAll(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (let index = 0; index < activeDodas.length; index += 1) {
        const doda = activeDodas[index];
        setCheckAllProgress({ current: index + 1, total: activeDodas.length });
        setCheckingId(doda.id);

        try {
          const response = await fetch(`/api/doda/${doda.id}/check-now`, {
            method: "POST",
          });
          const payload = (await response.json()) as {
            ok?: boolean;
            error?: string;
            doda?: DodaRecord;
            check_failed?: boolean;
          };

          if (response.ok && payload.ok && payload.doda) {
            updateDoda(doda.id, payload.doda);
            if (payload.check_failed) {
              failedCount += 1;
            } else {
              successCount += 1;
            }
          } else {
            failedCount += 1;
          }
        } catch {
          // Continue checking the remaining DODAs even if one fails.
          failedCount += 1;
        }
      }

      showToast(
        failedCount > 0 ? "neutral" : "success",
        failedCount > 0
          ? `Se revisaron ${successCount} DODAs, ${failedCount} con error`
          : `Se revisaron ${successCount} DODAs`,
      );
    } finally {
      setCheckingId(null);
      setCheckAllProgress(null);
      setCheckingAll(false);
    }
  }

  async function handlePermanentDelete(doda: DodaDashboardRow) {
    const label = doda.numero_integracion ?? doda.id.slice(0, 8);
    if (
      !window.confirm(
        `¿Eliminar permanentemente el DODA ${label}? Esto borra el registro del CRM (no solo cancela el monitoreo).`,
      )
    ) {
      return;
    }
    setPermanentDeletingId(doda.id);
    try {
      const response = await fetch(`/api/doda/${doda.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar el registro");
      }
      removeDoda(doda.id);
      showToast("success", "DODA eliminado del CRM");
      router.refresh();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "No se pudo eliminar",
      );
    } finally {
      setPermanentDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {cancelError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {cancelError}
        </p>
      ) : null}
      <GroupedDodaTable
        title="En monitoreo"
        description="DODAs en cola de revisión automática, pendientes de desaduanamiento libre."
        groups={monitoringGroups}
        emptyMessage="No hay DODAs en monitoreo activo."
        variant="monitoring"
        groupNameByStoredId={groupNameByStoredId}
        onCancelRequest={setCancelTarget}
        cancellingId={cancellingId}
        onCheckNowRequest={handleCheckNow}
        checkingId={checkingId}
        onEditNotify={setNotifyEditTarget}
        onPermanentDeleteRequest={
          isAdmin ? handlePermanentDelete : undefined
        }
        permanentDeletingId={permanentDeletingId}
        disableRowActions={checkingAll}
        headerAction={
          monitoringGroups.length > 0 ? (
            <button
              type="button"
              onClick={handleCheckAll}
              disabled={checkingAll}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#227DE8] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingAll ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RotateCw className="size-3.5" aria-hidden />
              )}
              {checkingAll
                ? checkAllProgress
                  ? `Revisando ${checkAllProgress.current} de ${checkAllProgress.total}…`
                  : "Revisando…"
                : "Revisar todos"}
            </button>
          ) : null
        }
      />
      {toast ? (
        <DodaToast key={toast.key} tone={toast.tone} message={toast.message} />
      ) : null}
      {notifyEditTarget ? (
        <DodaNotifyDestinationDialog
          open
          onClose={() => setNotifyEditTarget(null)}
          doda={notifyEditTarget}
          groups={whatsappGroups}
          onSaved={(updated) => {
            updateDoda(updated.id, updated);
            setNotifyEditTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {cancelTarget ? (
        <DodaCancelDialog
          numeroIntegracion={
            cancelTarget.numero_integracion ?? cancelTarget.id.slice(0, 8)
          }
          isSubmitting={cancellingId === cancelTarget.id}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
}

/** "Errores" table. */
export function DodaMonitoringErrorsTable({
  dodas,
  whatsappGroups,
}: DodaMonitoringDashboardProps) {
  const router = useRouter();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const { errorGroups } = useDashboardGroups(dodas);
  const groupNameByStoredId = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of whatsappGroups) {
      map.set(g.group_id, g.name);
    }
    return map;
  }, [whatsappGroups]);

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
        groupNameByStoredId={groupNameByStoredId}
        onRetry={handleRetry}
        retryingId={retryingId}
      />
    </div>
  );
}
