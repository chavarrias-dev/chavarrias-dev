/** SAT status that ends automated monitoring. */
export const DODA_RESOLVED_SAT_STATUS = "DESADUANAMIENTO LIBRE";

export const MAX_DODAS_PER_CRON_RUN = 5;

/** Aligned with docs for external cron hitting /api/doda/cron or /api/cron/check-dodas (~every 3 min). */
export const DODA_CRON_INTERVAL_MS = 3 * 60 * 1000;

export function isDodaResolvedSatStatus(status: string | null | undefined): boolean {
  return status?.trim().toUpperCase() === DODA_RESOLVED_SAT_STATUS.toUpperCase();
}
