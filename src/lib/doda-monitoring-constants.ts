/** SAT status that ends automated monitoring (liberado). */
export const DODA_RESOLVED_SAT_STATUS = "DESADUANAMIENTO LIBRE";

/** SAT status that ends monitoring after notifying (reconocimiento). */
export const DODA_RECONOCIMIENTO_SAT_STATUS = "RECONOCIMIENTO ADUANERO";

export const MAX_DODAS_PER_CRON_RUN = 5;

export const MONITORING_STOPPED_REASON = {
  liberadoSat: "liberado_sat",
  reconocimientoSat: "reconocimiento_sat",
  canceladoManual: "cancelado_manual",
} as const;

export type MonitoringStoppedReason =
  (typeof MONITORING_STOPPED_REASON)[keyof typeof MONITORING_STOPPED_REASON];

/** Client auto-check + cron alignment (~every 20s). */
export const DODA_CRON_INTERVAL_MS = 20 * 1000;

/** Lowercase + strip accents for SAT status matching. */
export function foldSatStatusText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isDodaResolvedSatStatus(status: string | null | undefined): boolean {
  if (!status?.trim()) {
    return false;
  }
  return foldSatStatusText(status).includes(
    foldSatStatusText(DODA_RESOLVED_SAT_STATUS),
  );
}

export function isDodaReconocimientoSatStatus(
  status: string | null | undefined,
): boolean {
  if (!status?.trim()) {
    return false;
  }
  return foldSatStatusText(status).includes(
    foldSatStatusText(DODA_RECONOCIMIENTO_SAT_STATUS),
  );
}

/** True when SAT status should leave the monitoring queue. */
export function isDodaTerminalSatStatus(
  status: string | null | undefined,
): boolean {
  return (
    isDodaResolvedSatStatus(status) || isDodaReconocimientoSatStatus(status)
  );
}

/** Maps free-form SAT text to a canonical status when recognized. */
export function canonicalizeDodaSatStatus(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) {
    return null;
  }
  const folded = foldSatStatusText(raw);
  if (folded.includes(foldSatStatusText(DODA_RESOLVED_SAT_STATUS))) {
    return DODA_RESOLVED_SAT_STATUS;
  }
  if (folded.includes(foldSatStatusText(DODA_RECONOCIMIENTO_SAT_STATUS))) {
    return DODA_RECONOCIMIENTO_SAT_STATUS;
  }
  const starred = raw.match(/\*\*\*(.+?)\*\*\*/);
  if (starred?.[1]?.trim()) {
    const inner = starred[1].trim();
    const innerFolded = foldSatStatusText(inner);
    if (innerFolded.includes(foldSatStatusText(DODA_RESOLVED_SAT_STATUS))) {
      return DODA_RESOLVED_SAT_STATUS;
    }
    if (
      innerFolded.includes(foldSatStatusText(DODA_RECONOCIMIENTO_SAT_STATUS))
    ) {
      return DODA_RECONOCIMIENTO_SAT_STATUS;
    }
    return inner;
  }
  return raw.trim();
}

export function satStatusesEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ca = canonicalizeDodaSatStatus(a);
  const cb = canonicalizeDodaSatStatus(b);
  if (!ca && !cb) {
    return true;
  }
  if (!ca || !cb) {
    return false;
  }
  return foldSatStatusText(ca) === foldSatStatusText(cb);
}
