function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").toLowerCase().trim();
}

type RoleBadgeProps = {
  role: string | null | undefined;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const r = normalizeRole(role);
  const label =
    r === "admin"
      ? "Admin"
      : r === "empleado"
        ? "Empleado"
        : r === "cliente"
          ? "Cliente"
          : role?.trim() || "Usuario";

  const styles =
    r === "admin"
      ? "bg-red-100 text-red-800 ring-red-200/70"
      : r === "empleado"
        ? "bg-amber-100 text-amber-900 ring-amber-200/70"
        : r === "cliente"
          ? "bg-[#227DE8]/15 text-[#227DE8] ring-[#227DE8]/30"
          : "bg-slate-100 text-slate-700 ring-slate-200/80";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-inset transition-colors duration-200 ${styles}`}
    >
      {label}
    </span>
  );
}
