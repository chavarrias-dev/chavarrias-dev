"use client";

import { useState } from "react";
import { Bell, Palette, Shield, User } from "lucide-react";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { SecuritySection } from "@/components/settings/security-section";

type SettingsTabId = "perfil" | "seguridad" | "notificaciones" | "apariencia";

type SettingsTabsProps = {
  isAdmin: boolean;
  initialFullName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
  initialNotifDodaAlert: boolean;
  initialNotifDocsAlert: boolean;
  initialNotifMessagesAlert: boolean;
};

export function SettingsTabs({
  isAdmin,
  initialFullName,
  initialEmail,
  initialAvatarUrl,
  initialNotifDodaAlert,
  initialNotifDocsAlert,
  initialNotifMessagesAlert,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("perfil");

  const tabs: { id: SettingsTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { id: "perfil", label: "Mi Perfil", icon: User },
      { id: "seguridad", label: "Seguridad", icon: Shield },
      { id: "notificaciones", label: "Notificaciones", icon: Bell },
      ...(isAdmin
        ? [{ id: "apariencia" as const, label: "Apariencia", icon: Palette }]
        : []),
    ];

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
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

      <div className="max-w-2xl">
        {activeTab === "perfil" ? (
          <ProfileSection
            initialFullName={initialFullName}
            initialEmail={initialEmail}
            initialAvatarUrl={initialAvatarUrl}
          />
        ) : null}
        {activeTab === "seguridad" ? <SecuritySection /> : null}
        {activeTab === "notificaciones" ? (
          <NotificationsSection
            initialNotifDodaAlert={initialNotifDodaAlert}
            initialNotifDocsAlert={initialNotifDocsAlert}
            initialNotifMessagesAlert={initialNotifMessagesAlert}
          />
        ) : null}
        {activeTab === "apariencia" && isAdmin ? <AppearanceSection /> : null}
      </div>
    </div>
  );
}
