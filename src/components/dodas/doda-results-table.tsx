"use client";

import { DodaTableSection } from "@/components/dodas/doda-table-section";
import {
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
  formatDodaDateTime,
} from "@/components/dodas/doda-display-utils";
import { DodaMonitoringBadge } from "@/components/dodas/doda-monitoring-badge";
import { DodaSatVerificationBadge } from "@/components/dodas/doda-sat-verification-badge";
import type { DodaRecord } from "@/lib/doda-types";

type DodaResultsTableProps = {
  items: DodaRecord[];
  title?: string;
  description?: string;
};

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
      <table className={`${DODA_TABLE_CLASS} min-w-[1440px]`}>
        <thead>
          <tr className={DODA_TABLE_HEAD_ROW_CLASS}>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Número de integración</th>
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
    </DodaTableSection>
  );
}
