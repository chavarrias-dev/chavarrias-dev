import { isDodaResolvedSatStatus } from "@/lib/doda-monitoring-constants";

type DodaSatStatusBadgeProps = {
  status: string | null;
};

const BADGE_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

export function DodaSatStatusBadge({ status }: DodaSatStatusBadgeProps) {
  if (isDodaResolvedSatStatus(status)) {
    return (
      <span
        className={`${BADGE_CLASS} border border-green-200 bg-green-50 text-green-800`}
      >
        Desaduanamiento libre 🟢
      </span>
    );
  }

  return (
    <span
      className={`${BADGE_CLASS} border border-slate-200 bg-slate-50 text-slate-700`}
    >
      {status ?? "Resuelto"}
    </span>
  );
}
