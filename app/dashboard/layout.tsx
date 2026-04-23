import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { logout } from "./actions";

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

  return (
    <div className="font-poppins min-h-screen w-full bg-[#FFFFFF]">
      <header className="border-b border-slate-200/80 bg-white shadow-sm">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4 lg:px-10">
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
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
