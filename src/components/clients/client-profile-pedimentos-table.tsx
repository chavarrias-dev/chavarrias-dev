import Link from "next/link";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import { DeletePedimentoForm } from "@/components/pedimentos/delete-pedimento-form";
import { formatShortDate } from "@/lib/format-short-date";
import { formatPedimentoNumber } from "@/lib/pedimento-number";

export type ClientProfilePedimentoRow = {
  id: string;
  numero_pedimento: string;
  fecha: string;
  fecha_cierre: string | null;
  aduana: string;
  archivo_url: string | null;
};

type ClientProfilePedimentosTableProps = {
  clientId: string;
  pedimentos: ClientProfilePedimentoRow[];
  isStaff: boolean;
  embedded?: boolean;
};

const sectionShell =
  "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm";

export function ClientProfilePedimentosTable({
  clientId,
  pedimentos,
  isStaff,
  embedded = false,
}: ClientProfilePedimentosTableProps) {
  return (
    <section className={embedded ? undefined : "mb-10"}>
      {!embedded ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium tracking-tight text-slate-900">
            Pedimentos
          </h2>
          {isStaff ? (
            <Link
              href={`/dashboard/pedimentos/new?cliente_id=${encodeURIComponent(clientId)}`}
              className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
            >
              + Nuevo pedimento
            </Link>
          ) : null}
        </div>
      ) : isStaff ? (
        <div className="mb-4 flex justify-end">
          <Link
            href={`/dashboard/pedimentos/new?cliente_id=${encodeURIComponent(clientId)}`}
            className="text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
          >
            + Nuevo pedimento
          </Link>
        </div>
      ) : null}

      <div className={sectionShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-700">Número</th>
                <th className="px-4 py-3 font-medium text-slate-700">Apertura</th>
                <th className="px-4 py-3 font-medium text-slate-700">Cierre</th>
                <th className="px-4 py-3 font-medium text-slate-700">Aduana</th>
                <th className="px-4 py-3 font-medium text-slate-700">Archivo</th>
                {isStaff ? (
                  <th className="px-4 py-3 font-medium text-slate-700"> </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pedimentos.length === 0 ? (
                <tr>
                  <td
                    colSpan={isStaff ? 6 : 5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Este cliente aún no tiene pedimentos registrados.
                  </td>
                </tr>
              ) : (
                pedimentos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 table-row-interactive last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-medium tracking-wide text-slate-900">
                      {formatPedimentoNumber(p.numero_pedimento)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatShortDate(p.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatShortDate(p.fecha_cierre)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.aduana}</td>
                    <td className="px-4 py-3">
                      {p.archivo_url ? (
                        <ArchiveFileLink href={p.archivo_url} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {isStaff ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/pedimentos/${p.id}/edit`}
                            className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                          >
                            Editar
                          </Link>
                          <DeletePedimentoForm pedimentoId={p.id} />
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
