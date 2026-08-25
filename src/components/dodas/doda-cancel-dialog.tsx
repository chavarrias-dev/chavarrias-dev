"use client";

import { Loader2 } from "lucide-react";

type DodaCancelDialogProps = {
  numeroIntegracion: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DodaCancelDialog({
  numeroIntegracion,
  isSubmitting,
  onConfirm,
  onCancel,
}: DodaCancelDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doda-cancel-dialog-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
        <h3
          id="doda-cancel-dialog-title"
          className="text-base font-medium text-slate-900"
        >
          ¿Cancelar monitoreo de este número?
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Número de integración{" "}
          <span className="font-medium text-slate-900">{numeroIntegracion}</span>.
          Dejará de consultarse en el SAT automáticamente.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Cancelando…
              </>
            ) : (
              "Cancelar monitoreo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
