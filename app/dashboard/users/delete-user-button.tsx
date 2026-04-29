"use client";

import { deleteUser } from "./actions";

type DeleteUserButtonProps = {
  userId: string;
};

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  return (
    <form
      action={deleteUser}
      className="inline"
      onSubmit={(e) => {
        if (
          !confirm(
            "¿Eliminar este usuario? Perderá acceso al CRM y se borrará su cuenta de autenticación.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50"
      >
        Eliminar
      </button>
    </form>
  );
}
