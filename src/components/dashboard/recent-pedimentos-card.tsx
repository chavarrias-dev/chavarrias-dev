import Link from "next/link";

export type RecentPedimentoRow = {
  id: string;
  numeroPedimento: string;
  clientName: string | null;
  aduana: string;
  fecha: string;
};

type RecentPedimentosCardProps = {
  pedimentos: RecentPedimentoRow[];
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

export function RecentPedimentosCard({
  pedimentos,
}: RecentPedimentosCardProps) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-medium tracking-tight text-slate-900">
          Pedimentos recientes
        </h2>
        <Link
          href="/dashboard/pedimentos"
          className="shrink-0 text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {pedimentos.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No hay pedimentos aún
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {pedimentos.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-1 px-5 py-3 transition-colors duration-200 hover:bg-slate-50/90 sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="font-medium text-slate-900 sm:col-span-3">
                {p.numeroPedimento}
              </div>
              <div className="text-sm text-slate-600 sm:col-span-4">
                {p.clientName ?? "—"}
              </div>
              <div className="text-sm text-slate-700 sm:col-span-3">{p.aduana}</div>
              <div className="text-sm text-slate-500 sm:col-span-2">
                {formatFecha(p.fecha)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
