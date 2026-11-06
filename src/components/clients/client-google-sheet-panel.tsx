"use client";

import { useState } from "react";
import { ExternalLink, Eye, Sheet } from "lucide-react";
import { GoogleSheetPreviewModal } from "@/components/clients/google-sheet-preview-modal";
import { spreadsheetIdFromStoredUrl } from "@/lib/google-sheets/spreadsheet-url";
import {
  linkClientSpreadsheet,
  unlinkClientSpreadsheet,
} from "../../../app/dashboard/clients/actions";

type ClientGoogleSheetPanelProps = {
  clientId: string;
  spreadsheetUrl: string | null;
  spreadsheetCreatedAt: string | null;
  googleApiEnabled: boolean;
  statusMessage?: { kind: "ok" | "error"; text: string };
  embedded?: boolean;
};

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function LinkSpreadsheetForm({
  clientId,
  defaultUrl = "",
  submitLabel = "Vincular",
}: {
  clientId: string;
  defaultUrl?: string;
  submitLabel?: string;
}) {
  return (
    <form action={linkClientSpreadsheet} className="space-y-2">
      <input type="hidden" name="client_id" value={clientId} />
      <label
        htmlFor={`spreadsheet_url_${clientId}`}
        className="block text-sm font-medium text-slate-700"
      >
        Enlace de Google Sheets
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`spreadsheet_url_${clientId}`}
          name="spreadsheet_url"
          type="text"
          required
          defaultValue={defaultUrl}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className={inputClass}
          autoComplete="off"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] sm:min-h-10 sm:w-auto"
        >
          {submitLabel}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Crea la hoja en tu Drive y compártela con el correo del cliente como
        Lector. Luego pega aquí el enlace.
      </p>
    </form>
  );
}

export function ClientGoogleSheetPanel({
  clientId,
  spreadsheetUrl,
  spreadsheetCreatedAt,
  googleApiEnabled,
  statusMessage,
  embedded = false,
}: ClientGoogleSheetPanelProps) {
  const [changingLink, setChangingLink] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const sheetId = spreadsheetIdFromStoredUrl(spreadsheetUrl);

  const createdLabel =
    spreadsheetCreatedAt &&
    new Date(spreadsheetCreatedAt).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const linked = Boolean(spreadsheetUrl);

  return (
    <section
      className={`font-poppins overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6 md:p-8 ${embedded ? "" : "mb-10"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-medium text-slate-900 sm:text-lg">
            <Sheet className="size-5 text-[#227DE8]" aria-hidden />
            Estado de cuenta (Google Sheets)
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Un archivo permanente por cliente. Chavarrias lo edita en Google;
            el cliente solo lo consulta.
            {googleApiEnabled
              ? " Desde DODA puedes agregar movimientos del mes si la API de Google está activa."
              : null}
          </p>
        </div>
        {linked && !changingLink ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
            {sheetId ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#227DE8]/30 bg-[#227DE8]/5 px-4 text-sm font-medium text-[#227DE8] transition hover:bg-[#227DE8]/10 sm:min-h-10 sm:w-auto"
              >
                <Eye className="size-4" aria-hidden />
                Vista previa
              </button>
            ) : null}
            <a
              href={spreadsheetUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] sm:min-h-10 sm:w-auto"
            >
              Abrir hoja
              <ExternalLink className="size-4 shrink-0" aria-hidden />
            </a>
          </div>
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

      {linked && !changingLink ? (
        <div className="mt-4 space-y-4">
          <p className="break-all text-sm text-slate-600">
            <span className="font-medium text-slate-700">Enlace:</span>{" "}
            <a
              href={spreadsheetUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#227DE8] underline-offset-2 hover:underline"
            >
              {spreadsheetUrl}
            </a>
          </p>
          {createdLabel ? (
            <p className="text-xs text-slate-500">Vinculado: {createdLabel}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => setChangingLink(true)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#227DE8] bg-white px-3 text-sm font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5 sm:min-h-9 sm:w-auto"
            >
              Cambiar enlace
            </button>
            <form action={unlinkClientSpreadsheet} className="w-full sm:w-auto">
              <input type="hidden" name="client_id" value={clientId} />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:min-h-9"
              >
                Desvincular
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {changingLink ? (
            <button
              type="button"
              onClick={() => setChangingLink(false)}
              className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Cancelar
            </button>
          ) : null}
          <LinkSpreadsheetForm
            clientId={clientId}
            defaultUrl={changingLink ? spreadsheetUrl ?? "" : ""}
            submitLabel={changingLink ? "Guardar enlace" : "Vincular"}
          />
        </div>
      )}
      {sheetId && spreadsheetUrl ? (
        <GoogleSheetPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          spreadsheetId={sheetId}
          openUrl={spreadsheetUrl}
          title="Estado de cuenta"
        />
      ) : null}
    </section>
  );
}
