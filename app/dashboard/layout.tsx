import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { logout } from "./actions";

const navLinkClass =
  "group inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 hover:text-[#227DE8]";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  const isStaff = role === "admin" || role === "empleado";

  return (
    <div className="font-poppins min-h-screen w-full bg-[#FFFFFF]">
      <header className="border-b border-slate-200/80 bg-white shadow-sm">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 lg:gap-6">
            <Link
              href="/dashboard"
              className="transition-opacity duration-200 hover:opacity-90"
            >
              <Image
                src="/chavarrias_logo.svg"
                alt="Chavarrias"
                width={1715}
                height={395}
                className="h-8 w-auto max-w-[180px] object-contain object-left sm:h-9 sm:max-w-[220px]"
                priority
              />
            </Link>
            <nav
              className="flex flex-wrap items-center gap-1 sm:gap-2"
              aria-label="Principal"
            >
              {isStaff ? (
                <Link href="/dashboard/clients" className={navLinkClass}>
                  Clientes
                </Link>
              ) : null}
              {isStaff ? (
                <Link href="/dashboard/users" className={navLinkClass}>
                  Usuarios
                </Link>
              ) : null}
              <Link href="/dashboard/facturas" className={navLinkClass}>
                Facturas
              </Link>
              <Link href="/dashboard/pedimentos" className={navLinkClass}>
                Pedimentos
              </Link>
              {isStaff ? (
                <Link
                  href="/dashboard/tools/merge-pdf"
                  className={navLinkClass}
                >
                  <svg
                    className="h-5 w-5 shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-[#227DE8]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                  <span className="hidden md:inline">Herramientas</span>
                  <span className="md:hidden">Herr.</span>
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/dashboard/profile"
              className="group inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 hover:text-[#227DE8]"
            >
              <svg
                className="h-5 w-5 shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-[#227DE8]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
              <span className="hidden sm:inline">Mi perfil</span>
            </Link>
            <LogoutButton action={logout} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
