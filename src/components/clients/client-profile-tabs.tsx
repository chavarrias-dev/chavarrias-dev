"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, FolderOpen, Receipt, Sheet } from "lucide-react";

export type ClientProfileTabId =
  | "documentos"
  | "facturas"
  | "pedimentos"
  | "estado-cuenta";

type ClientProfileTabsProps = {
  clientId: string;
  initialTab?: ClientProfileTabId;
  counts: {
    documentos: number;
    facturas: number;
    pedimentos: number;
    hasEstadoCuenta: boolean;
  };
  panels: {
    documentos: ReactNode;
    facturas: ReactNode;
    pedimentos: ReactNode;
    estadoCuenta: ReactNode;
  };
};

function parseTab(value: string | null): ClientProfileTabId | null {
  if (
    value === "documentos" ||
    value === "facturas" ||
    value === "pedimentos" ||
    value === "estado-cuenta"
  ) {
    return value;
  }
  return null;
}

const TAB_META: {
  id: ClientProfileTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "documentos", label: "Documentos", shortLabel: "Docs", icon: FolderOpen },
  { id: "facturas", label: "Facturas", shortLabel: "Facturas", icon: Receipt },
  { id: "pedimentos", label: "Pedimentos", shortLabel: "Pedim.", icon: FileText },
  {
    id: "estado-cuenta",
    label: "Estado de cuenta",
    shortLabel: "E. cuenta",
    icon: Sheet,
  },
];

function tabCount(
  id: ClientProfileTabId,
  counts: ClientProfileTabsProps["counts"],
): number | null {
  switch (id) {
    case "documentos":
      return counts.documentos;
    case "facturas":
      return counts.facturas;
    case "pedimentos":
      return counts.pedimentos;
    default:
      return null;
  }
}

export function ClientProfileTabs({
  clientId,
  initialTab = "documentos",
  counts,
  panels,
}: ClientProfileTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] =
    useState<ClientProfileTabId>(initialTab);
  const [panelVisible, setPanelVisible] = useState(true);

  useEffect(() => {
    const fromQuery = parseTab(searchParams.get("tab"));
    if (fromQuery) {
      setActiveTab(fromQuery);
      return;
    }
    if (
      searchParams.get("google_sheet_ok") ||
      searchParams.get("google_sheet_error")
    ) {
      setActiveTab("estado-cuenta");
    }
  }, [searchParams]);

  function selectTab(tabId: ClientProfileTabId) {
    if (tabId === activeTab) {
      return;
    }
    setPanelVisible(false);
    window.setTimeout(() => {
      setActiveTab(tabId);
      setPanelVisible(true);
    }, 120);

    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "documentos") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    const qs = params.toString();
    router.replace(
      qs
        ? `/dashboard/clients/${clientId}?${qs}`
        : `/dashboard/clients/${clientId}`,
      { scroll: false },
    );
  }

  const panelKey: keyof typeof panels =
    activeTab === "estado-cuenta" ? "estadoCuenta" : activeTab;
  const content = panels[panelKey];

  return (
    <div className="font-poppins">
      <nav
        className="-mx-1 mb-5 flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200/90 bg-slate-50/50 p-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:mb-6 sm:flex-wrap sm:overflow-visible"
        aria-label="Secciones del perfil"
      >
        {TAB_META.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const count = tabCount(tab.id, counts);
          const linked =
            tab.id === "estado-cuenta" ? counts.hasEstadoCuenta : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 sm:min-h-0 sm:gap-2 sm:px-4 ${
                active
                  ? "bg-white text-[#227DE8] shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap sm:hidden">{tab.shortLabel}</span>
              <span className="hidden whitespace-nowrap sm:inline">
                {tab.label}
              </span>
              {count !== null && count > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    active
                      ? "bg-[#227DE8]/10 text-[#227DE8]"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              ) : null}
              {linked === true ? (
                <span
                  className="size-2 shrink-0 rounded-full bg-emerald-500"
                  title="Hoja vinculada"
                  aria-hidden
                />
              ) : null}
              {linked === false && tab.id === "estado-cuenta" ? (
                <span
                  className="size-2 shrink-0 rounded-full bg-slate-300"
                  title="Sin vincular"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div
        key={activeTab}
        className={`transition-all duration-200 ease-out ${
          panelVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-1 opacity-0"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
