/** Fixed display timezone for the DODA module (UTC-6), independent of viewer/server locale. */
export const DODA_DISPLAY_TIMEZONE = "America/Matamoros";

/** Fixed offset matching DODA_DISPLAY_TIMEZONE, for anchoring date-only filter bounds. */
export const DODA_UTC_OFFSET = "-06:00";

/**
 * DODA timestamp columns (`looked_up_at`, `last_checked_at`, `created_at`) are
 * Postgres `timestamp without time zone`, so Supabase returns them zone-less
 * (e.g. "2026-08-25 22:06:48.943"). Without an explicit "Z"/offset, `new
 * Date(...)` parses that string as *local* wall-clock time instead of UTC,
 * silently shifting it by the runtime's UTC offset. These columns are written
 * in UTC, so normalize to an explicit UTC string before parsing.
 */
export function normalizeDodaTimestamp(value: string): string {
  if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return value;
  }
  const isoLike = value.includes("T") ? value : value.replace(" ", "T");
  return `${isoLike}Z`;
}

export function formatDodaDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(normalizeDodaTimestamp(value)).toLocaleString("es-MX", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDodaTime(value: string | null): string {
  if (!value) return "—";
  return new Date(normalizeDodaTimestamp(value)).toLocaleTimeString("es-MX", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD calendar-day key in the DODA display timezone, for day-grouping. */
export function getDodaDayKey(value: string): string {
  const date = new Date(normalizeDodaTimestamp(value));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function capitalize(text: string): string {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

/**
 * "Lunes 25 de agosto 2026" for a day-group header. Takes a calendar-day key
 * (e.g. from getDodaDayKey) rather than a timestamp — it's parsed at UTC noon
 * so weekday/month names can't shift to an adjacent day when formatted.
 */
export function formatDodaDayHeader(dayKey: string): string {
  const noonUtc = new Date(`${dayKey}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(noonUtc);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${capitalize(get("weekday"))} ${get("day")} de ${get("month")} ${get("year")}`;
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

type DodaWithTimestamps = {
  looked_up_at: string | null;
  last_checked_at: string | null;
  created_at: string | null;
};

/** Best-available "confirmed at" timestamp — there's no dedicated column. */
export function getDodaConfirmationDate(doda: DodaWithTimestamps): string | null {
  return doda.looked_up_at ?? doda.last_checked_at ?? doda.created_at;
}
