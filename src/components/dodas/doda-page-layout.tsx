"use client";

import type { ClientOption } from "@/components/clients/types";
import {
  DodaDashboardProvider,
  useDodaDashboard,
} from "@/components/dodas/doda-dashboard-context";
import { DodaConfirmedTable } from "@/components/dodas/doda-confirmed-table";
import { DodaLatestResultsSection } from "@/components/dodas/doda-latest-results-section";
import {
  DodaMonitoringErrorsTable,
  DodaMonitoringTable,
} from "@/components/dodas/doda-monitoring-dashboard";
import { DodaResultsTable } from "@/components/dodas/doda-results-table";
import { DodaToolsSection } from "@/components/dodas/doda-tools-section";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";

type DodaPageLayoutProps = {
  clients: ClientOption[];
  dodas: DodaDashboardRow[];
};

function DodaPageLayoutContent({ clients }: { clients: ClientOption[] }) {
  const { dodas, queryResults } = useDodaDashboard();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <DodaToolsSection clients={clients} />
        </div>

        <div className="space-y-6">
          <DodaMonitoringTable dodas={dodas} />
          <DodaLatestResultsSection dodas={dodas} />
        </div>
      </div>

      <div className="space-y-6">
        {queryResults.length > 0 ? (
          <DodaResultsTable items={queryResults} />
        ) : null}

        <DodaConfirmedTable dodas={dodas} />

        <DodaMonitoringErrorsTable dodas={dodas} />
      </div>
    </div>
  );
}

export function DodaPageLayout({ clients, dodas }: DodaPageLayoutProps) {
  return (
    <DodaDashboardProvider initialDodas={dodas}>
      <DodaPageLayoutContent clients={clients} />
    </DodaDashboardProvider>
  );
}
