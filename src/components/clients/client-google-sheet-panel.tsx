import { ExternalLink, Sheet } from "lucide-react";
import {
  createClientGoogleSheet,
  linkClientGoogleSheet,
} from "../../../app/dashboard/clients/actions";

type ClientGoogleSheetPanelProps = {
  clientId: string;
  spreadsheetUrl: string | null;
  spreadsheetCreatedAt: string | null;
  provisioningConfigured: boolean;
  statusMessage?: { kind: "ok" | "error"; text: string };
};

export function ClientGoogleSheetPanel({
  clientId,
  spreadsheetUrl,
  spreadsheetCreatedAt,
  provisioningConfigured,
  statusMessage,
}: ClientGoogleSheetPanelProps) {
  const createdLabel =
    spreadsheetCreatedAt &&
    new Date(spreadsheetCreatedAt).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            <Sheet className="size-5 text-[#227DE8]" aria-hidden />
            Hoja de trabajo (Google Sheets)
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Hoja compartida del equipo (edición) y del cliente (solo lectura).
            Los DODAs confirmados del mes se pueden enviar desde la sección DODA.
          </p>
        </div>
        {spreadsheetUrl ? (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4]"
          >
            Abrir hoja
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>

      {statusMessage ? (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            statusMessage.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {statusMessage.text}
        </p>
      ) : null}

      {spreadsheetUrl ? (
        <div className="mt-4 space-y-1 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-700">Enlace:</span>{" "}
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[#227DE8] underline-offset-2 hover:underline"
            >
              {spreadsheetUrl}
            </a>
          </p>
          {createdLabel ? (
            <p className="text-xs text-slate-500">Vinculada: {createdLabel}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {!provisioningConfigured ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              La creación automática no está configurada en el servidor. Puedes
              pegar abajo el enlace de una hoja que ya exista en Google Drive.
            </p>
          ) : (
            <form action={createClientGoogleSheet} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="client_id" value={clientId} />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1a6ed4]"
              >
                Crear hoja desde plantilla
              </button>
              <span className="text-xs text-slate-500">
                Copia la plantilla y da acceso de edición al equipo.
              </span>
            </form>
          )}

          <form action={linkClientGoogleSheet} className="space-y-2">
            <input type="hidden" name="client_id" value={clientId} />
            <label
              htmlFor="spreadsheet_url"
              className="block text-sm font-medium text-slate-700"
            >
              O vincular hoja existente
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="spreadsheet_url"
                name="spreadsheet_url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] hover:bg-[#227DE8]/5"
              >
                Vincular
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
