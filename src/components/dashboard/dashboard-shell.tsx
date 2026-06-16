"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  Package,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { RoleBadge } from "@/components/dashboard/role-badge";
import { SidebarMessagesLink } from "@/components/dashboard/sidebar-messages-link";

const STORAGE_KEY = "dashboard-sidebar-collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  tourId?: string;
};

function DatabaseStatusIndicator({
  connected,
  collapsed,
}: {
  connected: boolean;
  collapsed: boolean;
}) {
  const label = connected
    ? "Base de datos conectada"
    : "Error de conexión a la base de datos";

  return (
    <span
      title={label}
      className="group relative flex shrink-0 items-center"
      aria-label={label}
    >
      <span className="relative flex h-2 w-2">
        {connected ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        ) : null}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            connected ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
      </span>
      {collapsed ? (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
          {label}
        </span>
      ) : null}
    </span>
  );
}

type DashboardShellProps = {
  children: ReactNode;
  alerts?: ReactNode;
  userName: string;
  userEmail: string;
  role: string;
  isStaff: boolean;
  isAdmin: boolean;
  dbConnected?: boolean;
  currentUserId: string;
  logoutAction: () => Promise<void>;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLink({
  item,
  collapsed,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      data-tour={item.tourId}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
        active
          ? "bg-[#227DE8]/10 text-[#227DE8] shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <Icon
        className={`size-5 shrink-0 transition-colors duration-300 ${active ? "text-[#227DE8]" : "text-slate-500 group-hover:text-slate-700"}`}
        aria-hidden
      />
      <span
        className={`truncate transition-all duration-300 ${
          collapsed ? "sr-only w-0 opacity-0" : "opacity-100"
        }`}
      >
        {item.label}
      </span>
      {collapsed ? (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardShell({
  children,
  alerts,
  userName,
  userEmail,
  role,
  isStaff,
  isAdmin,
  dbConnected,
  currentUserId,
  logoutAction,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: Home, show: true },
    { href: "/dashboard/clients", label: "Clientes", icon: Users, show: isStaff, tourId: "nav-clients" },
    {
      href: "/dashboard/users",
      label: "Usuarios",
      icon: UserPlus,
      show: isStaff,
      tourId: "nav-users",
    },
    {
      href: "/dashboard/facturas",
      label: "Facturas",
      icon: FileText,
      show: true,
      tourId: "nav-facturas",
    },
    {
      href: "/dashboard/pedimentos",
      label: "Pedimentos",
      icon: Package,
      show: true,
      tourId: "nav-pedimentos",
    },
    {
      href: "/dashboard/expediente",
      label: "Mi Expediente",
      icon: FolderOpen,
      show: role === "cliente",
      tourId: "nav-expediente",
    },
    {
      href: "/dashboard/activity",
      label: "Actividad",
      icon: Activity,
      show: isAdmin,
    },
    {
      href: "/dashboard/tools/merge-pdf",
      label: "Herramientas",
      icon: Wrench,
      show: isStaff,
      tourId: "nav-tools",
    },
  ].filter((item) => item.show);

  const initials = initialsFromName(userName);
  const sidebarWidth = collapsed ? "w-16" : "w-60";

  const sidebarContent = (
    <>
      <div
        className={`flex shrink-0 items-center border-b border-slate-100 px-3 py-4 ${
          collapsed ? "justify-center" : "justify-between gap-2"
        }`}
      >
        <div
          className={`flex min-w-0 items-center gap-2 ${
            collapsed ? "flex-col" : ""
          }`}
        >
          <Link
            href="/dashboard"
            className={`flex min-w-0 items-center transition-opacity hover:opacity-90 ${
              collapsed ? "justify-center" : ""
            }`}
            onClick={() => setMobileOpen(false)}
          >
            <Image
              src="/chavarrias_logo.svg"
              alt="Chavarrias"
              width={1715}
              height={395}
              className={
                collapsed
                  ? "h-8 w-8 object-contain object-center"
                  : "h-8 w-auto max-w-[170px] object-contain object-left"
              }
              priority
            />
          </Link>
          {isAdmin && dbConnected !== undefined ? (
            <DatabaseStatusIndicator
              connected={dbConnected}
              collapsed={collapsed && !mobileOpen}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav
        className="flex-1 space-y-1 overflow-y-auto px-2 py-4"
        aria-label="Principal"
      >
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            collapsed={collapsed && !mobileOpen}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
        <SidebarMessagesLink
          collapsed={collapsed && !mobileOpen}
          currentUserId={currentUserId}
          onNavigate={() => setMobileOpen(false)}
        />
      </nav>

      <div className="shrink-0 space-y-2 border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          className={`hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-slate-100 lg:flex ${
            collapsed ? "justify-center px-2" : ""
          }`}
        >
          {collapsed ? (
            <ChevronRight className="size-5 shrink-0" aria-hidden />
          ) : (
            <>
              <ChevronLeft className="size-5 shrink-0" aria-hidden />
              <span className="truncate">Contraer</span>
            </>
          )}
        </button>

        <div
          className={`rounded-xl border border-slate-100 bg-slate-50/60 p-2 ${
            collapsed ? "flex flex-col items-center gap-2" : ""
          }`}
        >
          <Link
            href="/dashboard/profile"
            data-tour="user-profile"
            title={collapsed ? "Mi perfil" : undefined}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-all duration-300 hover:bg-slate-100/90 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#227DE8]/15 text-sm font-semibold text-[#227DE8] ring-2 ring-[#227DE8]/10"
              aria-hidden
            >
              {initials}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {userName}
                </p>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
                <div className="mt-1.5">
                  <RoleBadge role={role} />
                </div>
              </div>
            ) : null}
            {collapsed ? (
              <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                Mi perfil
              </span>
            ) : null}
          </Link>

          <div className={collapsed ? "w-full" : ""}>
            {collapsed ? (
              <form action={logoutAction} className="w-full">
                <button
                  type="submit"
                  title="Cerrar sesión"
                  className="group relative flex w-full items-center justify-center rounded-lg px-2 py-2 text-slate-600 transition-all duration-300 hover:bg-white hover:text-[#227DE8]"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                    Cerrar sesión
                  </span>
                </button>
              </form>
            ) : (
              <LogoutButton action={logoutAction} />
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="font-poppins flex h-screen overflow-hidden bg-white">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        data-tour="sidebar"
        className={`${sidebarWidth} sticky top-0 z-50 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          mobileOpen
            ? "fixed inset-y-0 left-0 w-60"
            : "hidden lg:flex"
        }`}
      >
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition-all duration-200 hover:bg-slate-50 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">{alerts}</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div key={pathname} className="animate-page-in">
            {children}
          </div>
          <footer className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400 lg:px-10">
            © 2026 Chavarrias Servicios Aduanales SA de CV. Todos los derechos
            reservados.
          </footer>
        </div>
      </div>
    </div>
  );
}
