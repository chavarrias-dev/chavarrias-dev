"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { DodaResultDetailModal } from "@/components/dodas/doda-result-detail-modal";
import { DodaSatStatusBadge } from "@/components/dodas/doda-sat-status-badge";
import {
  DODA_DISPLAY_TIMEZONE,
  DODA_TABLE_BODY_CELL_CLASS,
  DODA_TABLE_BODY_ROW_CLASS,
  DODA_TABLE_CLASS,
  DODA_TABLE_HEAD_CELL_CLASS,
  DODA_TABLE_HEAD_ROW_CLASS,
  DODA_UTC_OFFSET,
  formatDodaDateTime,
  formatDodaDayHeader,
  formatDodaTime,
  getDodaConfirmationDate,
  getDodaDayKey,
  normalizeDodaTimestamp,
} from "@/components/dodas/doda-display-utils";
import {
  categorizeDodasForDashboard,
  UNASSIGNED_CLIENT_LABEL,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

const COLUMN_COUNT = 12;

type DodaConfirmedTableProps = {
  dodas: DodaDashboardRow[];
};

type DayGroup = {
  dayKey: string;
  header: string;
  items: DodaDashboardRow[];
};

function buildDayGroups(items: DodaDashboardRow[]): DayGroup[] {
  const map = new Map<string, DodaDashboardRow[]>();

  for (const doda of items) {
    const confirmedAt = getDodaConfirmationDate(doda);
    if (!confirmedAt) continue;
    const dayKey = getDodaDayKey(confirmedAt);
    const existing = map.get(dayKey) ?? [];
    existing.push(doda);
    map.set(dayKey, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, dayItems]) => ({
      dayKey,
      header: formatDodaDayHeader(dayKey),
      items: dayItems.sort((a, b) => {
        const dateA = getDodaConfirmationDate(a) ?? "";
        const dateB = getDodaConfirmationDate(b) ?? "";
        return dateB.localeCompare(dateA);
      }),
    }));
}

function DayGroupRows({
  group,
  collapsed,
  onToggle,
  onViewDetail,
}: {
  group: DayGroup;
  collapsed: boolean;
  onToggle: () => void;
  onViewDetail: (doda: DodaDashboardRow) => void;
}) {
  const count = group.items.length;

  return (
    <>
      <tr
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="cursor-pointer border-b border-slate-200 bg-slate-50/90 transition-colors duration-200 hover:bg-slate-100"
      >
        <td colSpan={COLUMN_COUNT} className="px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <ChevronDown
              className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
              aria-hidden
            />
            {group.header}
            <span className="text-xs font-normal text-slate-500">
              ({count} DODA{count === 1 ? "" : "s"})
            </span>
          </span>
        </td>
      </tr>
      {!collapsed
        ? group.items.map((doda) => (
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
                —
              </td>
              <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                {doda.client_name ?? UNASSIGNED_CLIENT_LABEL}
              </td>
              <td className={`${DODA_TABLE_BODY_CELL_CLASS} text-slate-600`}>
                {formatDodaTime(getDodaConfirmationDate(doda))}
              </td>
              <td className={DODA_TABLE_BODY_CELL_CLASS}>
                <button
                  type="button"
                  onClick={() => onViewDetail(doda)}
                  className="text-xs font-medium text-[#227DE8] underline-offset-2 transition hover:text-[#1a6ed4] hover:underline"
                >
                  Ver más
                </button>
              </td>
            </tr>
          ))
        : null}
    </>
  );
}

export function DodaConfirmedTable({ dodas }: DodaConfirmedTableProps) {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDoda, setSelectedDoda] = useState<DodaDashboardRow | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(
    () => new Set(),
  );

  const confirmedAll = useMemo(
    () => categorizeDodasForDashboard(dodas).confirmed,
    [dodas],
  );

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const doda of confirmedAll) {
      names.add(doda.client_name?.trim() || UNASSIGNED_CLIENT_LABEL);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [confirmedAll]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTime = dateFrom
      ? new Date(`${dateFrom}T00:00:00${DODA_UTC_OFFSET}`).getTime()
      : null;
    const toTime = dateTo
      ? new Date(`${dateTo}T23:59:59${DODA_UTC_OFFSET}`).getTime()
      : null;

    return confirmedAll.filter((doda) => {
      if (term && !doda.numero_integracion?.toLowerCase().includes(term)) {
        return false;
      }

      const clientLabel = doda.client_name?.trim() || UNASSIGNED_CLIENT_LABEL;
      if (clientFilter && clientLabel !== clientFilter) {
        return false;
      }

      if (fromTime !== null || toTime !== null) {
        const confirmedAt = getDodaConfirmationDate(doda);
        const time = confirmedAt
          ? new Date(normalizeDodaTimestamp(confirmedAt)).getTime()
          : NaN;
        if (Number.isNaN(time)) return false;
        if (fromTime !== null && time < fromTime) return false;
        if (toTime !== null && time > toTime) return false;
      }

      return true;
    });
  }, [confirmedAll, search, clientFilter, dateFrom, dateTo]);

  const dayGroups = useMemo(() => buildDayGroups(filtered), [filtered]);

  function openDetail(doda: DodaDashboardRow) {
    setSelectedDoda(doda);
    setModalOpen(true);
  }

  function toggleDay(dayKey: string) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  }

  async function handleExport() {
    if (confirmedAll.length === 0 || exporting) return;
    setExporting(true);

    try {
      const XLSX = await import("xlsx");
      const rows = confirmedAll.map((doda) => ({
        Número: doda.numero_integracion ?? "",
        Estado: doda.sat_status ?? "Desaduanamiento libre",
        Pedimento: doda.pedimento ?? "",
        "Tipo Pedimento": doda.tipo_pedimento ?? "",
        Remesas: doda.remesas_presentadas ?? "",
        Clave: doda.clave_pedimento ?? "",
        Vehículo: doda.datos_vehiculo ?? "",
        Cantidad: doda.cantidad_mercancia ?? "",
        "Remesa Consolidado": "",
        Cliente: doda.client_name ?? UNASSIGNED_CLIENT_LABEL,
        "Fecha confirmación": formatDodaDateTime(getDodaConfirmationDate(doda)),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DODAs");

      const todayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: DODA_DISPLAY_TIMEZONE,
      }).format(new Date());
      XLSX.writeFile(workbook, `dodas-desaduanados-${todayKey}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-medium tracking-tight text-slate-900">
            Desaduanamiento confirmado
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            DODAs que ya alcanzaron desaduanamiento libre en el SAT.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || confirmedAll.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3.5 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-4 sm:px-6">
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

      {dayGroups.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">
          {confirmedAll.length === 0
            ? "Aún no hay DODAs con desaduanamiento confirmado."
            : "No se encontraron resultados con los filtros aplicados."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`${DODA_TABLE_CLASS} min-w-[1400px]`}>
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
                  Remesas presentadas
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Clave de pedimento
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Datos del vehículo
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Cantidad de mercancía
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Remesa de consolidado
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>Cliente</th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS}>
                  Hora confirmación
                </th>
                <th className={DODA_TABLE_HEAD_CELL_CLASS} />
              </tr>
            </thead>
            <tbody>
              {dayGroups.map((group) => (
                <DayGroupRows
                  key={group.dayKey}
                  group={group}
                  collapsed={collapsedDays.has(group.dayKey)}
                  onToggle={() => toggleDay(group.dayKey)}
                  onViewDetail={openDetail}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DodaResultDetailModal
        doda={selectedDoda}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
