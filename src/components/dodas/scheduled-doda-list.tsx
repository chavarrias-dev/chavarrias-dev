"use client";

import { DodaTableSection } from "@/components/dodas/doda-table-section";
import {
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
} from "@/components/dodas/doda-display-utils";
import { formatNextHourlyCheckTime } from "@/components/dodas/integration-numbers-input";
import type { DodaRecord } from "@/lib/doda-types";

type ScheduledDodaListProps = {
  items: DodaRecord[];
  onRemove?: (dodaId: string) => void;
  removingId?: string | null;
  title?: string;
  description?: string;
};

export function ScheduledDodaList({
  items,
  onRemove,
  removingId = null,
  title = "Monitoreo continuo activo",
  description = "Revisión automática cada hora en el validador del SAT.",
}: ScheduledDodaListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <DodaTableSection title={title} description={description}>
      <table className={DODA_TABLE_CLASS}>
        <thead>
          <tr className={DODA_TABLE_HEAD_ROW_CLASS}>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Número de integración</th>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Próxima revisión</th>
            <th className={DODA_TABLE_HEAD_CELL_CLASS}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((doda) => (
            <tr key={doda.id} className={DODA_TABLE_BODY_ROW_CLASS}>
              <td
                className={`${DODA_TABLE_BODY_CELL_CLASS} font-medium text-slate-900`}
              >
                {doda.numero_integracion ?? doda.id.slice(0, 8)}
              </td>
              <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                {formatNextHourlyCheckTime()}
              </td>
              <td className={DODA_TABLE_BODY_CELL_CLASS}>
                {onRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(doda.id)}
                    disabled={removingId === doda.id}
                    className="text-xs font-medium text-[#227DE8] underline-offset-2 transition hover:text-[#1a6ed4] hover:underline disabled:opacity-50"
                  >
                    {removingId === doda.id ? "Deteniendo…" : "Detener"}
                  </button>
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
