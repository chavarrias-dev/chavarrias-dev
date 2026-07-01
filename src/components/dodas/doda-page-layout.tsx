"use client";

import type { ClientOption } from "@/components/clients/types";
import { DodaMonitoringErrorsTable, DodaMonitoringStatusTables } from "@/components/dodas/doda-monitoring-dashboard";
import { DodaToolsSection } from "@/components/dodas/doda-tools-section";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";

type DodaPageLayoutProps = {
  clients: ClientOption[];
  dodas: DodaDashboardRow[];
};

export function DodaPageLayout({ clients, dodas }: DodaPageLayoutProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <DodaToolsSection clients={clients} />
        </div>

        <DodaMonitoringStatusTables dodas={dodas} />
      </div>

      <DodaMonitoringErrorsTable dodas={dodas} />
    </>
  );
}
