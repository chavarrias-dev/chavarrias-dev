type DodaMonitoringBadgeProps = {
  isMonitored: boolean;
  isResolved?: boolean;
};

const BADGE_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

export function DodaMonitoringBadge({
  isMonitored,
  isResolved = false,
}: DodaMonitoringBadgeProps) {
  if (!isMonitored || isResolved) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <span
      className={`${BADGE_CLASS} border border-sky-200 bg-sky-50 text-sky-800`}
    >
      Activo
    </span>
  );
}
