"use client";

import { ExternalLink } from "lucide-react";
import { spreadsheetPreviewEmbedUrl } from "@/lib/google-sheets/spreadsheet-url";

type GoogleSheetPreviewProps = {
  spreadsheetId: string;
  openUrl: string;
  title?: string;
  /** Client portal: preview + links stay read-only (no edit URL). */
  readOnly?: boolean;
};

export function GoogleSheetPreview({
  spreadsheetId,
  openUrl,
  title = "Vista previa del estado de cuenta",
  readOnly = false,
}: GoogleSheetPreviewProps) {
  const embedUrl = spreadsheetPreviewEmbedUrl(spreadsheetId);

  return (
    <div className="font-poppins space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#227DE8] hover:underline"
        >
          {readOnly ? "Abrir en modo lectura" : "Abrir en Google Sheets"}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
        <iframe
          title={title}
          src={embedUrl}
          className="h-[min(70vh,520px)] w-full bg-white"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        {readOnly
          ? "Solo consulta: no puedes modificar el archivo desde el CRM. Si la vista no carga, abre el enlace en modo lectura con la cuenta que Chavarrias haya autorizado."
          : "La vista previa depende de Google: si no carga, inicia sesión con una cuenta que tenga acceso o abre la hoja en una pestaña nueva. El cliente debe tener permiso de lector en Drive."}
      </p>
    </div>
  );
}
