"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  buildFacturaExcelDataRows,
  facturaExcelExportFileName,
  type FacturaExcelClientMeta,
  type FacturaExcelRow,
} from "@/lib/factura-excel-export";

type FacturasClientExportButtonProps = {
  client: FacturaExcelClientMeta | null;
  facturas: FacturaExcelRow[];
};

export function FacturasClientExportButton({
  client,
  facturas,
}: FacturasClientExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const canExport = Boolean(client && facturas.length > 0);

  async function handleExport() {
    if (!client || facturas.length === 0 || exporting) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = buildFacturaExcelDataRows(client, facturas);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");
      XLSX.writeFile(workbook, facturaExcelExportFileName(client.fullName));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={!canExport || exporting}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
      >
        {exporting ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4 shrink-0" aria-hidden />
        )}
        Exportar Excel del cliente
      </button>
      {!client ? (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          Selecciona un cliente en el filtro y pulsa Buscar.
        </p>
      ) : facturas.length === 0 ? (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          No hay facturas para exportar con estos filtros.
        </p>
      ) : (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          {facturas.length} factura{facturas.length === 1 ? "" : "s"} de{" "}
          {client.fullName}
        </p>
      )}
    </div>
  );
}
