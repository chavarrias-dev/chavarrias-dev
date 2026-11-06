"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Mail, MessageCircle, Palette, Shield, User, Users } from "lucide-react";
import {
  SettingsUsersSection,
  type SettingsUserRow,
} from "@/components/settings/settings-users-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { FacturaEmailTemplateSection } from "@/components/settings/factura-email-template-section";
import { DodaWhatsappNotificationsSection } from "@/components/settings/doda-whatsapp-notifications-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { SecuritySection } from "@/components/settings/security-section";
import { WhatsappGroupsSettingsSection } from "@/components/settings/whatsapp-groups-settings-section";

type SettingsTabId =
  | "perfil"
  | "seguridad"
  | "notificaciones"
  | "grupos-whatsapp"
  | "apariencia"
  | "correo-facturas"
  | "usuarios";

type SettingsTabsClientProps = {
  isAdmin: boolean;
  isStaff: boolean;
  initialFullName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
  initialNotifDodaAlert: boolean;
  initialNotifDocsAlert: boolean;
  initialNotifMessagesAlert: boolean;
  usersRows?: SettingsUserRow[];
  usersCanDelete?: boolean;
  usersListError?: string;
  usersLoadError?: string;
};

function parseTab(value: string | null): SettingsTabId | null {
  if (
    value === "perfil" ||
    value === "seguridad" ||
    value === "notificaciones" ||
    value === "grupos-whatsapp" ||
    value === "apariencia" ||
    value === "correo-facturas" ||
    value === "usuarios"
  ) {
    return value;
  }
  return null;
}

export function SettingsTabsClient(props: SettingsTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("perfil");

  function selectTab(tabId: SettingsTabId) {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "perfil") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    const qs = params.toString();
    router.replace(qs ? `/dashboard/settings?${qs}` : "/dashboard/settings", {
      scroll: false,
    });
  }

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
    ...(props.isStaff
      ? [{ id: "usuarios" as const, label: "Usuarios", icon: Users }]
      : []),
    ...(props.isAdmin
      ? [
          {
            id: "grupos-whatsapp" as const,
            label: "Grupos WhatsApp",
            icon: MessageCircle,
          },
          {
            id: "correo-facturas" as const,
            label: "Correo facturas",
            icon: Mail,
          },
          { id: "apariencia" as const, label: "Apariencia", icon: Palette },
        ]
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
              data-tour={tab.id === "usuarios" ? "nav-users" : undefined}
              onClick={() => selectTab(tab.id)}
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

      <div
        className={`min-w-0 space-y-6 ${activeTab === "usuarios" ? "max-w-none" : "max-w-2xl"}`}
      >
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
        {activeTab === "grupos-whatsapp" && props.isAdmin ? (
          <WhatsappGroupsSettingsSection />
        ) : null}
        {activeTab === "correo-facturas" && props.isAdmin ? (
          <FacturaEmailTemplateSection />
        ) : null}
        {activeTab === "apariencia" && props.isAdmin ? <AppearanceSection /> : null}
        {activeTab === "usuarios" && props.isStaff ? (
          <SettingsUsersSection
            rows={props.usersRows ?? []}
            canDeleteUsers={props.usersCanDelete ?? false}
            listError={props.usersListError}
            loadError={props.usersLoadError}
          />
        ) : null}
      </div>
    </div>
  );
}
