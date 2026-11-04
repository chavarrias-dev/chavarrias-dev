"use client";

import { X } from "lucide-react";
import { GoogleSheetPreview } from "@/components/clients/google-sheet-preview";
import { ModalShell } from "@/components/ui/modal-shell";

type GoogleSheetPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  spreadsheetId: string;
  openUrl: string;
  title: string;
  readOnly?: boolean;
};

export function GoogleSheetPreviewModal({
  open,
  onClose,
  spreadsheetId,
  openUrl,
  title,
  readOnly = false,
}: GoogleSheetPreviewModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="font-poppins flex max-h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="min-w-0 pr-2 text-base font-medium tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Cerrar vista previa"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <GoogleSheetPreview
          spreadsheetId={spreadsheetId}
          openUrl={openUrl}
          title="Contenido"
          readOnly={readOnly}
        />
      </div>
    </ModalShell>
  );
}
