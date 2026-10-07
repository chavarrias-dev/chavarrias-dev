"use client";

import { DodaTableSection } from "@/components/dodas/doda-table-section";
import {
  DodaDesktopTable,
  DodaMobileActions,
  DodaMobileCard,
  DodaMobileCardTitle,
  DodaMobileKv,
  DodaMobileStack,
} from "@/components/dodas/doda-mobile-ui";
import {
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
  formatDodaDateTime,
} from "@/components/dodas/doda-display-utils";
import { DASHBOARD_TABLE_SCROLL_CLASS } from "@/lib/dashboard-layout";
import { DodaMonitoringBadge } from "@/components/dodas/doda-monitoring-badge";
import { DodaSatVerificationBadge } from "@/components/dodas/doda-sat-verification-badge";
import type { DodaRecord } from "@/lib/doda-types";

type DodaResultsTableProps = {
  items: DodaRecord[];
  title?: string;
  description?: string;
};

function DodaQueryMobileCard({ doda }: { doda: DodaRecord }) {
  return (
    <DodaMobileCard accentClass="border-l-4 border-[#227DE8]/50 bg-white">
      <div className="flex items-start justify-between gap-2">
        <DodaMobileCardTitle>
          {doda.numero_integracion ?? "—"}
        </DodaMobileCardTitle>
        <DodaSatVerificationBadge status={doda.lookup_status} />
      </div>

      <div className="mt-2 space-y-0.5">
        <DodaMobileKv label="Estatus">
          {doda.sat_status ?? doda.lookup_error ?? "—"}
        </DodaMobileKv>
        <DodaMobileKv label="Pedimento">{doda.pedimento ?? "—"}</DodaMobileKv>
        <DodaMobileKv label="Tipo">{doda.tipo_pedimento ?? "—"}</DodaMobileKv>
        <DodaMobileKv label="Remesas">
          {doda.remesas_presentadas ?? "—"}
        </DodaMobileKv>
        <DodaMobileKv label="Clave">
          {doda.clave_pedimento ?? "—"}
        </DodaMobileKv>
        <DodaMobileKv label="Vehículo">
          <span className="break-words">{doda.datos_vehiculo ?? "—"}</span>
        </DodaMobileKv>
        <DodaMobileKv label="Cantidad">
          {doda.cantidad_mercancia ?? "—"}
        </DodaMobileKv>
        <DodaMobileKv label="Consultado">
          {formatDodaDateTime(doda.looked_up_at ?? doda.created_at)}
        </DodaMobileKv>
        <DodaMobileKv label="Monitoreo">
          <DodaMonitoringBadge
            isMonitored={doda.is_monitored}
            isResolved={doda.is_resolved}
          />
        </DodaMobileKv>
      </div>

      {doda.qr_validator_url ? (
        <DodaMobileActions>
          <a
            href={doda.qr_validator_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-lg border border-[#227DE8]/40 py-1.5 text-xs font-medium text-[#227DE8]"
          >
            Abrir validador SAT
          </a>
        </DodaMobileActions>
      ) : null}
    </DodaMobileCard>
  );
}

export function DodaResultsTable({
  items,
  title = "Resultados de la consulta",
  description,
}: DodaResultsTableProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <DodaTableSection title={title} description={description}>
      <DodaDesktopTable>
        <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
          <table className={`${DODA_TABLE_CLASS} min-w-[1440px]`}>
            <thead>
              <tr className={DODA_TABLE_HEAD_ROW_CLASS}>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Número de integración
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Estado SAT</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Estatus</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Tipo de pedimento</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Pedimento</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Remesas presentadas</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Clave de pedimento</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Datos del vehículo</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Cantidad de mercancía</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Consultado el</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Monitoreo</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>URL validador</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doda) => (
                <tr key={doda.id} className={DODA_TABLE_BODY_ROW_CLASS}>
                  <td
                    className={`${DODA_TABLE_BODY_CELL_CLASS} font-medium text-slate-900`}
                  >
                    {doda.numero_integracion ?? "—"}
                  </td>
                  <td className={DODA_TABLE_BODY_CELL_CLASS}>
                    <DodaSatVerificationBadge status={doda.lookup_status} />
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-700`}>
                    {doda.sat_status ?? doda.lookup_error ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.tipo_pedimento ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.pedimento ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.remesas_presentadas ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.clave_pedimento ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.datos_vehiculo ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.cantidad_mercancia ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {formatDodaDateTime(doda.looked_up_at ?? doda.created_at)}
                  </td>
                  <td className={DODA_TABLE_BODY_CELL_CLASS}>
                    <DodaMonitoringBadge
                      isMonitored={doda.is_monitored}
                      isResolved={doda.is_resolved}
                    />
                  </td>
                  <td className={DODA_TABLE_BODY_CELL_CLASS}>
                    {doda.qr_validator_url ? (
                      <a
                        href={doda.qr_validator_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                      >
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DodaDesktopTable>

      <DodaMobileStack>
        {items.map((doda) => (
          <DodaQueryMobileCard key={doda.id} doda={doda} />
        ))}
      </DodaMobileStack>
    </DodaTableSection>
  );
}
