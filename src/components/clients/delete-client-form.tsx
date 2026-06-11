"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { deleteClient } from "../../../app/dashboard/clients/actions";

type DeleteClientFormProps = {
  clientId: string;
};

export function DeleteClientForm({ clientId }: DeleteClientFormProps) {
  const [open, setOpen] = useState(false);

  const modal = (
    <ModalShell
      open={open}
      onClose={() => setOpen(false)}
      overlayClassName="bg-black/40"
      panelClassName="font-poppins max-h-[min(90vh,28rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl"
    >
      <h3
        id="delete-client-title"
        className="text-lg font-medium tracking-tight text-slate-900"
      >
        ¿Eliminar cliente?
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Al eliminar este cliente se borrarán todas sus facturas, pedimentos y
        archivos asociados. Esta acción no se puede deshacer.
      </p>

      <form action={deleteClient} className="mt-6">
        <input type="hidden" name="client_id" value={clientId} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-destructive-motion inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
          >
            Eliminar
          </button>
        </div>
      </form>
    </ModalShell>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-destructive-motion rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50"
      >
        Eliminar
      </button>

      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
