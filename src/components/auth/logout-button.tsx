type LogoutButtonProps = {
  action: () => Promise<void>;
};

export function LogoutButton({ action }: LogoutButtonProps) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="font-poppins rounded-lg border border-[#227DE8] bg-white px-4 py-2 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/4 hover:shadow"
      >
        Cerrar sesion
      </button>
    </form>
  );
}
