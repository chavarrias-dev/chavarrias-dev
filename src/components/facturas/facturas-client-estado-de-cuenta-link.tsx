import Link from "next/link";
import { ExternalLink, Sheet } from "lucide-react";
import { spreadsheetViewUrlFromStoredUrl } from "@/lib/google-sheets/spreadsheet-url";

type FacturasClientEstadoDeCuentaLinkProps = {
  clientId: string | null;
  clientName: string | null;
  spreadsheetUrl: string | null;
  isStaff: boolean;
};

export function FacturasClientEstadoDeCuentaLink({
  clientId,
  clientName,
  spreadsheetUrl,
  isStaff,
}: FacturasClientEstadoDeCuentaLinkProps) {
  const sheetHref =
    spreadsheetUrl && !isStaff
      ? (spreadsheetViewUrlFromStoredUrl(spreadsheetUrl) ?? spreadsheetUrl)
      : spreadsheetUrl;

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
      {sheetHref && clientName ? (
        <a
          href={sheetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#227DE8]/30 bg-[#227DE8]/5 px-4 text-sm font-medium text-[#227DE8] shadow-sm transition hover:bg-[#227DE8]/10 sm:w-auto"
        >
          <Sheet className="size-4 shrink-0" aria-hidden />
          {isStaff
            ? `Estado de cuenta — ${clientName}`
            : "Ver mi estado de cuenta"}
          <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </a>
      ) : clientId && isStaff ? (
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100 sm:w-auto"
        >
          <Sheet className="size-4 shrink-0" aria-hidden />
          Crear estado de cuenta del cliente
        </Link>
      ) : (
        <span className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-400 sm:w-auto">
          <Sheet className="size-4 shrink-0" aria-hidden />
          Estado de cuenta
        </span>
      )}

      {!clientId ? (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          {isStaff
            ? "Selecciona un cliente en el filtro para abrir su archivo."
            : "Tu estado de cuenta aparecerá aquí cuando esté listo."}
        </p>
      ) : spreadsheetUrl ? (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          Mismo archivo permanente del cliente (solo lectura para el cliente).
        </p>
      ) : isStaff ? (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          Este cliente aún no tiene hoja de estado de cuenta.
        </p>
      ) : (
        <p className="text-center text-xs text-slate-500 sm:text-right">
          Aún no hay estado de cuenta vinculado a tu perfil.
        </p>
      )}
    </div>
  );
}
