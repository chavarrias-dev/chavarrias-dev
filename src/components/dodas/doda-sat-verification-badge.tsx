import type { DodaLookupStatus } from "@/lib/doda-types";

type DodaSatVerificationBadgeProps = {
  status: DodaLookupStatus;
};

const BADGE_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

function badgeForStatus(status: DodaLookupStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "verificado":
      return {
        label: "Verificado",
        className: `${BADGE_CLASS} border border-emerald-200 bg-emerald-50 text-emerald-800`,
      };
    case "revision_manual":
      return {
        label: "No verificado",
        className: `${BADGE_CLASS} border border-red-200 bg-red-50 text-red-800`,
      };
    default:
      return {
        label: "Pendiente",
        className: `${BADGE_CLASS} border border-slate-200 bg-slate-50 text-slate-700`,
      };
  }
}

export function DodaSatVerificationBadge({
  status,
}: DodaSatVerificationBadgeProps) {
  const badge = badgeForStatus(status);
  return <span className={badge.className}>{badge.label}</span>;
}
