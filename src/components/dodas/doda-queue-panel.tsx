"use client";

import { Loader2 } from "lucide-react";
import { DodaTableSection } from "@/components/dodas/doda-table-section";
import {
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
} from "@/components/dodas/doda-display-utils";

export type DodaQueueItemStatus = "pending" | "processing" | "done" | "error";

export type DodaQueueItem = {
  number: string;
  status: DodaQueueItemStatus;
  error?: string;
};

type DodaQueuePanelProps = {
  items: DodaQueueItem[];
  currentIndex: number | null;
  actionLabel?: string;
  title?: string;
};

function queueStatusBadge(item: DodaQueueItem) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";

  switch (item.status) {
    case "processing":
      return (
        <span
          className={`${base} border border-[#227DE8]/25 bg-[#227DE8]/8 text-[#227DE8]`}
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          En proceso
        </span>
      );
    case "done":
      return (
        <span
          className={`${base} border border-emerald-200 bg-emerald-50 text-emerald-800`}
        >
          Completado
        </span>
      );
    case "error":
      return (
        <span
          className={`${base} border border-red-200 bg-red-50 text-red-800`}
          title={item.error}
        >
          Error
        </span>
      );
    default:
      return (
        <span
          className={`${base} border border-slate-200 bg-slate-50 text-slate-600`}
        >
          En cola
        </span>
      );
  }
}

export function DodaQueuePanel({
  items,
  currentIndex,
  actionLabel = "Consultando",
  title = "Progreso de consulta",
}: DodaQueuePanelProps) {
  if (items.length === 0) {
    return null;
  }

  const total = items.length;
  const completed = items.filter(
    (item) => item.status === "done" || item.status === "error",
  ).length;
  const activeIndex =
    currentIndex ??
    items.findIndex((item) => item.status === "processing");
  const isProcessing = items.some((item) => item.status === "processing");

  const progressText =
    activeIndex >= 0 && completed < total
      ? `${actionLabel} ${activeIndex + 1} de ${total}…`
      : completed >= total
        ? `Completado (${total} de ${total})`
        : `${actionLabel} 0 de ${total}…`;

  const progressIndicator = (
    <span className="inline-flex items-center gap-1.5" role="status">
      {isProcessing ? (
        <Loader2 className="size-3.5 animate-spin text-[#227DE8]" aria-hidden />
      ) : null}
      {progressText}
    </span>
  );

  return (
    <DodaTableSection title={title} progress={progressIndicator}>
      <table className={DODA_TABLE_CLASS}>
        <thead>
          <tr className={DODA_TABLE_HEAD_ROW_CLASS}>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Número de integración</th>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Estado</th>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.number}-${index}`} className={DODA_TABLE_BODY_ROW_CLASS}>
              <td
                className={`${DODA_TABLE_BODY_CELL_CLASS} font-medium text-slate-900`}
              >
                {item.number}
              </td>
              <td className={DODA_TABLE_BODY_CELL_CLASS}>
                <div className="space-y-1">
                  {queueStatusBadge(item)}
                  {item.status === "error" && item.error ? (
                    <p className="text-xs text-red-700">{item.error}</p>
                  ) : null}
                </div>
              </td>
              <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-400`}>
                —
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DodaTableSection>
  );
}
