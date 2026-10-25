"use client";

import { Trash2 } from "lucide-react";
import { deleteFactura } from "../../../app/dashboard/facturas/actions";

type DeleteFacturaFormProps = {
  facturaId: string;
  compact?: boolean;
};

export function DeleteFacturaForm({
  facturaId,
  compact = false,
}: DeleteFacturaFormProps) {
  return (
    <form
      action={deleteFactura}
      className={compact ? "inline-flex" : "inline"}
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Eliminar esta factura? Esta acción no se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="factura_id" value={facturaId} />
      <button
        type="submit"
        aria-label="Eliminar"
        className={
          compact
            ? "inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50 sm:h-8 sm:w-auto sm:px-2.5"
            : "rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50"
        }
      >
        {compact ? (
          <Trash2 className="size-3.5 sm:hidden" aria-hidden />
        ) : null}
        <span className={compact ? "hidden text-xs font-medium sm:inline" : undefined}>
          Eliminar
        </span>
      </button>
    </form>
  );
}
