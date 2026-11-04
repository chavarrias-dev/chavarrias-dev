import { DODA_DISPLAY_TIMEZONE } from "@/components/dodas/doda-display-utils";

function capitalize(text: string): string {
  return text.length ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** YYYY-MM in America/Matamoros for the given instant. */
export function getMonthKeyInDodaTimezone(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

/** Tab title for estado de cuenta, e.g. "Noviembre 2026". */
export function getEstadoDeCuentaMonthTabTitle(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    month: "long",
    year: "numeric",
  }).formatToParts(date);

  const month = capitalize(
    parts.find((part) => part.type === "month")?.value ?? "",
  );
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${month} ${year}`.trim();
}

export function escapeSheetTabForRange(tabTitle: string): string {
  return `'${tabTitle.replace(/'/g, "''")}'`;
}
