import type { DocumentStatus } from "@/lib/documents-config";

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-slate-100 text-slate-700 ring-slate-200/80",
  },
  vigente: {
    label: "Vigente",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-200/70",
  },
  por_vencer: {
    label: "Por vencer",
    className: "bg-amber-100 text-amber-900 ring-amber-200/70",
  },
  vencido: {
    label: "Vencido",
    className: "bg-red-100 text-red-800 ring-red-200/70",
  },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
