type LogoutButtonProps = {
  action: () => Promise<void>;
};

export function LogoutButton({ action }: LogoutButtonProps) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-[#227DE8]"
      >
        Cerrar sesion
      </button>
    </form>
  );
}
