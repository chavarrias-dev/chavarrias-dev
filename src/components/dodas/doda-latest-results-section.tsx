"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { DodaResultDetailModal } from "@/components/dodas/doda-result-detail-modal";
import { DodaSatStatusBadge } from "@/components/dodas/doda-sat-status-badge";
import {
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
  formatDodaDateTime,
  getDodaConfirmationDate,
} from "@/components/dodas/doda-display-utils";
import {
  UNASSIGNED_CLIENT_LABEL,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";

const LATEST_RESULTS_LIMIT = 5;

type DodaLatestResultsSectionProps = {
  dodas: DodaDashboardRow[];
};

export function DodaLatestResultsSection({
  dodas,
}: DodaLatestResultsSectionProps) {
  const [selectedDoda, setSelectedDoda] = useState<DodaDashboardRow | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const latestResolved = useMemo(() => {
    return dodas
      .filter((doda) => doda.is_resolved)
      .sort((a, b) => {
        const dateA = getDodaConfirmationDate(a) ?? "";
        const dateB = getDodaConfirmationDate(b) ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, LATEST_RESULTS_LIMIT);
  }, [dodas]);

  function openDetail(doda: DodaDashboardRow) {
    setSelectedDoda(doda);
    setModalOpen(true);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-slate-400" aria-hidden />
          <h2 className="text-base font-medium tracking-tight text-slate-900">
            Últimos resultados
          </h2>
        </div>
      </div>

      {latestResolved.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">
          Aún no hay resultados confirmados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className={DODA_TABLE_CLASS}>
            <thead>
              <tr className={DODA_TABLE_HEAD_ROW_CLASS}>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Número de integración
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Estado SAT</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Pedimento</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Tipo de pedimento
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Fecha confirmación
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Cliente</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS} />
              </tr>
            </thead>
            <tbody>
              {latestResolved.map((doda) => (
                <tr key={doda.id} className={DODA_TABLE_BODY_ROW_CLASS}>
                  <td
                    className={`${DODA_TABLE_BODY_CELL_CLASS} font-medium text-slate-900`}
                  >
                    {doda.numero_integracion ?? "—"}
                  </td>
                  <td className={DODA_TABLE_BODY_CELL_CLASS}>
                    <DodaSatStatusBadge status={doda.sat_status} />
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.pedimento ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.tipo_pedimento ?? "—"}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {formatDodaDateTime(getDodaConfirmationDate(doda))}
                  </td>
                  <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                    {doda.client_name ?? UNASSIGNED_CLIENT_LABEL}
                  </td>
                  <td className={DODA_TABLE_BODY_CELL_CLASS}>
                    <button
                      type="button"
                      onClick={() => openDetail(doda)}
                      className="text-xs font-medium text-[#227DE8] underline-offset-2 transition hover:text-[#1a6ed4] hover:underline"
                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
        <Link
          href="/dashboard/doda/history"
          className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
        >
          Ver todos los resultados
        </Link>
      </div>

      <DodaResultDetailModal
        doda={selectedDoda}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
