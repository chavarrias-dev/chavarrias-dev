import Link from "next/link";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import { DeleteFacturaForm } from "@/components/facturas/delete-factura-form";
import { formatShortDate } from "@/lib/format-short-date";

export type ClientProfileFacturaRow = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  archivo_url: string | null;
};

type ClientProfileFacturasTableProps = {
  clientId: string;
  facturas: ClientProfileFacturaRow[];
  isStaff: boolean;
  embedded?: boolean;
};

const sectionShell =
  "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm";

export function ClientProfileFacturasTable({
  clientId,
  facturas,
  isStaff,
  embedded = false,
}: ClientProfileFacturasTableProps) {
  const actionsColSpan = isStaff ? 5 : 4;

  return (
    <section className={embedded ? undefined : "mb-10"}>
      {!embedded ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Facturas
          </h2>
          {isStaff ? (
            <Link
              href={`/dashboard/facturas/new?cliente_id=${encodeURIComponent(clientId)}`}
              className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
            >
              + Nueva factura
            </Link>
          ) : null}
        </div>
      ) : isStaff ? (
        <div className="mb-4 flex justify-end">
          <Link
            href={`/dashboard/facturas/new?cliente_id=${encodeURIComponent(clientId)}`}
            className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
          >
            + Nueva factura
          </Link>
        </div>
      ) : null}

      <div className={sectionShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Número</th>
                <th className="px-4 py-3 font-medium text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-medium text-slate-700">Monto</th>
                <th className="px-4 py-3 font-medium text-slate-700">Archivo</th>
                {isStaff ? (
                  <th className="px-4 py-3 font-medium text-slate-700"> </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td
                    colSpan={actionsColSpan}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Este cliente aún no tiene facturas registradas.
                  </td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-slate-100 table-row-interactive last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {f.numero_factura}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatShortDate(f.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {Number(f.monto).toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {f.archivo_url ? (
                        <ArchiveFileLink href={f.archivo_url} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {isStaff ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/facturas/${f.id}/edit`}
                            className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                          >
                            Editar
                          </Link>
                          <DeleteFacturaForm facturaId={f.id} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
