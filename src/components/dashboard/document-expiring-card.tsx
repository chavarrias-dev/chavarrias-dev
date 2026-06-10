import Link from "next/link";
import type { DocumentAlert } from "@/lib/document-status";

type DocumentExpiringCardProps = {
  alerts: DocumentAlert[];
};

function formatShortDate(value: string): string {
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return `Vencido hace ${abs} día${abs === 1 ? "" : "s"}`;
  }
  if (days === 0) {
    return "Vence hoy";
  }
  return `${days} día${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`;
}

export function DocumentExpiringCard({ alerts }: DocumentExpiringCardProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white shadow-sm">
      <div className="border-b border-amber-200/60 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71a1.125 1.125 0 0 0 1.971-1.037l-1.372-2.378a1.125 1.125 0 0 0-.966-.629H6.832a1.125 1.125 0 0 0-.966.629L4.494 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-medium tracking-tight text-slate-900">
              Documentos por vencer
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {alerts.length} documento{alerts.length === 1 ? "" : "s"} requiere
              {alerts.length === 1 ? "" : "n"} atención (vencidos o por vencer en 2 meses).
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-amber-100 bg-amber-50/50">
              <th className="px-5 py-3 font-medium text-slate-700 sm:px-6">
                Cliente
              </th>
              <th className="px-4 py-3 font-medium text-slate-700">
                Documento
              </th>
              <th className="px-4 py-3 font-medium text-slate-700">
                Vencimiento
              </th>
              <th className="px-4 py-3 font-medium text-slate-700">
                Días
              </th>
              <th className="px-4 py-3 font-medium text-slate-700"> </th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr
                key={alert.id}
                className="border-b border-amber-50 last:border-0 hover:bg-amber-50/40"
              >
                <td className="px-5 py-3 font-medium text-slate-900 sm:px-6">
                  {alert.clientName}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {alert.documentType}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatShortDate(alert.fechaVencimiento)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      alert.daysRemaining < 0
                        ? "font-medium text-red-700"
                        : alert.daysRemaining <= 30
                          ? "font-medium text-amber-800"
                          : "text-slate-700"
                    }
                  >
                    {daysLabel(alert.daysRemaining)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/clients/${alert.clientId}`}
                    className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                  >
                    Ver cliente
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
