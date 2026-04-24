import Link from "next/link";

export type RecentFacturaRow = {
  id: string;
  numeroFactura: string;
  clientName: string;
  monto: string;
  fecha: string;
};

type RecentFacturasCardProps = {
  facturas: RecentFacturaRow[];
};

function formatFecha(fecha: string): string {
  if (!fecha) return "—";
  const d = fecha.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return fecha;
  return new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonto(monto: string): string {
  const n = Number.parseFloat(monto);
  if (!Number.isFinite(n)) return monto;
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export function RecentFacturasCard({ facturas }: RecentFacturasCardProps) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-medium tracking-tight text-slate-900">
          Facturas recientes
        </h2>
        <Link
          href="/dashboard/facturas"
          className="shrink-0 text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {facturas.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No hay facturas aún
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {facturas.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-1 gap-1 px-5 py-3 transition-colors duration-200 hover:bg-slate-50/90 sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="font-medium text-slate-900 sm:col-span-3">
                {f.numeroFactura}
              </div>
              <div className="text-sm text-slate-600 sm:col-span-4">
                {f.clientName}
              </div>
              <div className="text-sm font-medium text-slate-800 sm:col-span-3">
                {formatMonto(f.monto)}
              </div>
              <div className="text-sm text-slate-500 sm:col-span-2">
                {formatFecha(f.fecha)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
