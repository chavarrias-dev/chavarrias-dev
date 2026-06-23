/** SAT status that ends automated monitoring. */
export const DODA_RESOLVED_SAT_STATUS = "DESADUANAMIENTO LIBRE";

export const MAX_DODAS_PER_CRON_RUN = 5;

export function isDodaResolvedSatStatus(status: string | null | undefined): boolean {
  return status?.trim().toUpperCase() === DODA_RESOLVED_SAT_STATUS.toUpperCase();
}
