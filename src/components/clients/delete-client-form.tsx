"use client";

import { deleteClient } from "../../../app/dashboard/clients/actions";

type DeleteClientFormProps = {
  clientId: string;
};

export function DeleteClientForm({ clientId }: DeleteClientFormProps) {
  return (
    <form
      action={deleteClient}
      className="inline"
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Eliminar este cliente? Esta acción no se puede deshacer si no hay datos vinculados.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="client_id" value={clientId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50"
      >
        Eliminar
      </button>
    </form>
  );
}
