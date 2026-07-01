import { isDodaResolvedSatStatus } from "@/lib/doda-monitoring-constants";
import type { DodaRecord } from "@/lib/doda-types";

export type DodaDashboardRow = DodaRecord & {
  client_name: string | null;
};

export type DodaDashboardBuckets = {
  monitoring: DodaDashboardRow[];
  confirmed: DodaDashboardRow[];
  errors: DodaDashboardRow[];
};

export const UNASSIGNED_CLIENT_LABEL = "Sin asociar";

export function isDodaMonitoringError(doda: DodaDashboardRow): boolean {
  return (
    doda.is_monitored &&
    !doda.is_resolved &&
    doda.lookup_status === "revision_manual" &&
    Boolean(doda.lookup_error?.trim())
  );
}

export function isDodaConfirmed(doda: DodaDashboardRow): boolean {
  return doda.is_resolved || isDodaResolvedSatStatus(doda.sat_status);
}

export function isDodaActiveMonitoring(doda: DodaDashboardRow): boolean {
  if (isDodaMonitoringError(doda)) {
    return false;
  }
  if (isDodaConfirmed(doda)) {
    return false;
  }
  return doda.is_monitored && !doda.is_resolved;
}

export function categorizeDodasForDashboard(
  dodas: DodaDashboardRow[],
): DodaDashboardBuckets {
  const monitoring: DodaDashboardRow[] = [];
  const confirmed: DodaDashboardRow[] = [];
  const errors: DodaDashboardRow[] = [];

  for (const doda of dodas) {
    if (isDodaMonitoringError(doda)) {
      errors.push(doda);
    } else if (isDodaConfirmed(doda)) {
      confirmed.push(doda);
    } else if (isDodaActiveMonitoring(doda)) {
      monitoring.push(doda);
    }
  }

  return { monitoring, confirmed, errors };
}

export function getClientGroupLabel(doda: DodaDashboardRow): string {
  return doda.client_name?.trim() || UNASSIGNED_CLIENT_LABEL;
}

export type ClientDodaGroup = {
  clientLabel: string;
  items: DodaDashboardRow[];
};

function compareClientLabels(a: string, b: string): number {
  if (a === UNASSIGNED_CLIENT_LABEL) {
    return 1;
  }
  if (b === UNASSIGNED_CLIENT_LABEL) {
    return -1;
  }
  return a.localeCompare(b, "es");
}

export function groupDodasByClient(
  dodas: DodaDashboardRow[],
): ClientDodaGroup[] {
  const map = new Map<string, DodaDashboardRow[]>();

  for (const doda of dodas) {
    const label = getClientGroupLabel(doda);
    const existing = map.get(label) ?? [];
    existing.push(doda);
    map.set(label, existing);
  }

  return Array.from(map.entries())
    .sort(([labelA], [labelB]) => compareClientLabels(labelA, labelB))
    .map(([clientLabel, items]) => ({
      clientLabel,
      items: items.sort((a, b) => {
        const dateA = a.last_checked_at ?? a.looked_up_at ?? a.created_at ?? "";
        const dateB = b.last_checked_at ?? b.looked_up_at ?? b.created_at ?? "";
        return dateB.localeCompare(dateA);
      }),
    }));
}
