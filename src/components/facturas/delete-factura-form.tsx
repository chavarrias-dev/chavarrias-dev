"use client";

import { deleteFactura } from "../../../app/dashboard/facturas/actions";

type DeleteFacturaFormProps = {
  facturaId: string;
};

export function DeleteFacturaForm({ facturaId }: DeleteFacturaFormProps) {
  return (
    <form
      action={deleteFactura}
      className="inline"
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
        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50"
      >
        Eliminar
      </button>
    </form>
  );
}
