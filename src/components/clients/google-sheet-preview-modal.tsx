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
      align="bottom-sheet"
      panelClassName="font-poppins flex max-h-[min(94dvh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[min(92vh,880px)] sm:rounded-2xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:gap-3 sm:px-5">
        <h2 className="min-w-0 flex-1 pr-1 text-sm font-medium leading-snug tracking-tight text-slate-900 sm:pr-2 sm:text-lg">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:size-9"
          aria-label="Cerrar vista previa"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
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
