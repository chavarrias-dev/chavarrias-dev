import Link from "next/link";

export type RecentClientRow = {
  id: string;
  fullName: string;
  email: string;
  companyName: string | null;
};

type RecentClientsCardProps = {
  clients: RecentClientRow[];
};

export function RecentClientsCard({ clients }: RecentClientsCardProps) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-medium tracking-tight text-slate-900">
          Clientes recientes
        </h2>
        <Link
          href="/dashboard/clients"
          className="shrink-0 text-sm font-medium text-[#227DE8] underline-offset-2 transition-all duration-200 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No hay clientes aún
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {clients.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-1 gap-1 px-5 py-3 transition-colors duration-200 hover:bg-slate-50/90 sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="font-medium text-slate-900 sm:col-span-4">
                {c.fullName}
              </div>
              <div className="text-sm text-slate-600 sm:col-span-4">
                {c.companyName ?? "—"}
              </div>
              <div className="truncate text-sm text-slate-600 sm:col-span-4">
                {c.email}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
