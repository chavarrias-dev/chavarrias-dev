type LogoutButtonProps = {
  action: () => Promise<void>;
};

export function LogoutButton({ action }: LogoutButtonProps) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-lg border border-[#227DE8] px-4 py-2 text-sm font-semibold text-[#227DE8] transition hover:bg-[#227DE8] hover:text-white"
      >
        Cerrar sesion
      </button>
    </form>
  );
}
