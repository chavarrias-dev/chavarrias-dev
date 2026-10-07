"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Palette, Shield, User } from "lucide-react";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { DodaWhatsappNotificationsSection } from "@/components/settings/doda-whatsapp-notifications-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { SecuritySection } from "@/components/settings/security-section";

type SettingsTabId = "perfil" | "seguridad" | "notificaciones" | "apariencia";

type SettingsTabsClientProps = {
  isAdmin: boolean;
  initialFullName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
  initialNotifDodaAlert: boolean;
  initialNotifDocsAlert: boolean;
  initialNotifMessagesAlert: boolean;
};

function parseTab(value: string | null): SettingsTabId | null {
  if (
    value === "perfil" ||
    value === "seguridad" ||
    value === "notificaciones" ||
    value === "apariencia"
  ) {
    return value;
  }
  return null;
}

export function SettingsTabsClient(props: SettingsTabsClientProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("perfil");

  useEffect(() => {
    const fromQuery = parseTab(searchParams.get("tab"));
    if (fromQuery) {
      setActiveTab(fromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined" || activeTab !== "notificaciones") {
      return;
    }
    if (window.location.hash !== "#notificaciones-doda") {
      return;
    }
    const timer = window.setTimeout(() => {
      document
        .getElementById("notificaciones-doda")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [activeTab, searchParams]);

  const tabs: {
    id: SettingsTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "perfil", label: "Mi Perfil", icon: User },
    { id: "seguridad", label: "Seguridad", icon: Shield },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    ...(props.isAdmin
      ? [{ id: "apariencia" as const, label: "Apariencia", icon: Palette }]
      : []),
  ];

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto overscroll-x-contain border-b border-slate-200 pb-px [-webkit-overflow-scrolling:touch]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "border-[#227DE8] text-[#227DE8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl min-w-0 space-y-6">
        {activeTab === "perfil" ? (
          <ProfileSection
            initialFullName={props.initialFullName}
            initialEmail={props.initialEmail}
            initialAvatarUrl={props.initialAvatarUrl}
          />
        ) : null}
        {activeTab === "seguridad" ? <SecuritySection /> : null}
        {activeTab === "notificaciones" ? (
          <>
            <NotificationsSection
              initialNotifDodaAlert={props.initialNotifDodaAlert}
              initialNotifDocsAlert={props.initialNotifDocsAlert}
              initialNotifMessagesAlert={props.initialNotifMessagesAlert}
            />
            <DodaWhatsappNotificationsSection isAdmin={props.isAdmin} />
          </>
        ) : null}
        {activeTab === "apariencia" && props.isAdmin ? <AppearanceSection /> : null}
      </div>
    </div>
  );
}
