import { formatAppReleaseLabel } from "@/lib/app-release";

export function AppReleaseBadge() {
  const label = formatAppReleaseLabel();
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-slate-500"
      title="Versión de la aplicación (sube con cada despliegue)"
    >
      {label}
    </span>
  );
}
