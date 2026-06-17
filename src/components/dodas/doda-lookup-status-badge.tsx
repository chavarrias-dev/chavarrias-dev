import type { DodaLookupStatus } from "@/lib/doda-types";
import { DODA_LOOKUP_STATUS_LABELS } from "@/lib/doda-types";

type DodaLookupStatusBadgeProps = {
  status: DodaLookupStatus;
};

const STATUS_STYLES: Record<DodaLookupStatus, string> = {
  pendiente: "border-slate-200 bg-slate-50 text-slate-700",
  consultando: "border-sky-200 bg-sky-50 text-sky-800",
  verificado: "border-emerald-200 bg-emerald-50 text-emerald-800",
  revision_manual: "border-amber-200 bg-amber-50 text-amber-900",
};

export function DodaLookupStatusBadge({ status }: DodaLookupStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {DODA_LOOKUP_STATUS_LABELS[status]}
    </span>
  );
}
