"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DodaResultDetailModal } from "@/components/dodas/doda-result-detail-modal";
import { DodaSatStatusBadge } from "@/components/dodas/doda-sat-status-badge";
import {
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
  DODA_UTC_OFFSET,
  formatDodaDateTime,
  getDodaConfirmationDate,
  normalizeDodaTimestamp,
} from "@/components/dodas/doda-display-utils";
import {
  UNASSIGNED_CLIENT_LABEL,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type DodaHistoryTableProps = {
  dodas: DodaDashboardRow[];
};

function toComparableTime(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(normalizeDodaTimestamp(value)).getTime();
  return Number.isNaN(time) ? null : time;
}

export function DodaHistoryTable({ dodas }: DodaHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDoda, setSelectedDoda] = useState<DodaDashboardRow | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const doda of dodas) {
      names.add(doda.client_name?.trim() || UNASSIGNED_CLIENT_LABEL);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [dodas]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTime = dateFrom
      ? new Date(`${dateFrom}T00:00:00${DODA_UTC_OFFSET}`).getTime()
      : null;
    const toTime = dateTo
      ? new Date(`${dateTo}T23:59:59${DODA_UTC_OFFSET}`).getTime()
      : null;

    return dodas.filter((doda) => {
      if (term && !doda.numero_integracion?.toLowerCase().includes(term)) {
        return false;
      }

      const clientLabel = doda.client_name?.trim() || UNASSIGNED_CLIENT_LABEL;
      if (clientFilter && clientLabel !== clientFilter) {
        return false;
      }

      if (fromTime !== null || toTime !== null) {
        const confirmationTime = toComparableTime(getDodaConfirmationDate(doda));
        if (confirmationTime === null) return false;
        if (fromTime !== null && confirmationTime < fromTime) return false;
        if (toTime !== null && confirmationTime > toTime) return false;
      }

      return true;
    });
  }, [dodas, search, clientFilter, dateFrom, dateTo]);

  function openDetail(doda: DodaDashboardRow) {
    setSelectedDoda(doda);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/dodas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a DODA
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por número de integración"
          className={`${fieldClass} sm:col-span-2`}
        />
        <select
          value={clientFilter}
          onChange={(event) => setClientFilter(event.target.value)}
          className={fieldClass}
        >
          <option value="">Todos los clientes</option>
          {clientOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className={fieldClass}
            aria-label="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className={fieldClass}
            aria-label="Hasta"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">
            No se encontraron resultados con los filtros aplicados.
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
                {filtered.map((doda) => (
                  <tr key={doda.id} className={DODA_TABLE_BODY_ROW_CLASS}>
                    <td
                      className={`${DODA_TABLE_BODY_CELL_CLASS} font-medium text-slate-900`}
                    >
                      {doda.numero_integracion ?? "—"}
                    </td>
                    <td className={DODA_TABLE_BODY_CELL_CLASS}>
                      <DodaSatStatusBadge status={doda.sat_status} />
                    </td>
                    <td
                      className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}
                    >
                      {doda.pedimento ?? "—"}
                    </td>
                    <td
                      className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}
                    >
                      {doda.tipo_pedimento ?? "—"}
                    </td>
                    <td
                      className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}
                    >
                      {formatDodaDateTime(getDodaConfirmationDate(doda))}
                    </td>
                    <td
                      className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}
                    >
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
      </section>

      <DodaResultDetailModal
        doda={selectedDoda}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
