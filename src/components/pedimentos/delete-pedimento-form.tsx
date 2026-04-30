"use client";

import { deletePedimento } from "../../../app/dashboard/pedimentos/actions";

type DeletePedimentoFormProps = {
  pedimentoId: string;
};

export function DeletePedimentoForm({ pedimentoId }: DeletePedimentoFormProps) {
  return (
    <form
      action={deletePedimento}
      className="inline"
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Eliminar este pedimento? Esta acción no se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pedimento_id" value={pedimentoId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50"
      >
        Eliminar
      </button>
    </form>
  );
}
