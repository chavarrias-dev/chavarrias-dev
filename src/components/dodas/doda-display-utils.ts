export function formatDodaDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DODA_TABLE_CLASS =
  "w-full min-w-[720px] text-left text-sm";

export const DODA_TABLE_HEAD_ROW_CLASS =
  "border-b border-slate-200 bg-slate-50/80";

export const DODA_TABLE_HEAD_CELL_CLASS =
  "px-4 py-3 font-medium text-slate-700";

export const DODA_TABLE_BODY_ROW_CLASS =
  "border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60";

export const DODA_TABLE_BODY_CELL_CLASS = "px-4 py-3";
