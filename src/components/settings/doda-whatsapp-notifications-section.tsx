"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { SettingsAlert } from "@/components/settings/settings-alert";
import { SettingsCard } from "@/components/settings/settings-card";

type ConfigType = "individual" | "group";

type SavedConfig = {
  id: string;
  type: ConfigType;
  whatsapp_number: string | null;
  whatsapp_group_id: string | null;
  created_at: string;
};

type DodaWhatsappNotificationsSectionProps = {
  isAdmin: boolean;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function DodaWhatsappNotificationsSection({
  isAdmin,
}: DodaWhatsappNotificationsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ConfigType>("individual");
  const [saved, setSaved] = useState<SavedConfig | null>(null);
  const [destinationLabel, setDestinationLabel] = useState(
    "números de administrador",
  );
  const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const applyPayload = useCallback(
    (payload: {
      config: SavedConfig | null;
      destinationLabel: string;
    }) => {
      setSaved(payload.config);
      setDestinationLabel(payload.destinationLabel);
      if (payload.config?.type === "group") {
        setMode("group");
        setGroupId(payload.config.whatsapp_group_id ?? "");
        setPhone("");
      } else if (payload.config?.type === "individual") {
        setMode("individual");
        setPhone(payload.config.whatsapp_number ?? "");
        setGroupId("");
      }
    },
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/settings/doda-notification-config");
        const payload = (await response.json()) as {
          ok?: boolean;
          config?: SavedConfig | null;
          destinationLabel?: string;
        };
        if (response.ok && payload.ok) {
          applyPayload({
            config: payload.config ?? null,
            destinationLabel:
              payload.destinationLabel ?? "números de administrador",
          });
        }
      } catch (error) {
        console.error("[settings] doda whatsapp config load failed", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [applyPayload]);

  async function handleSaveIndividual() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/doda-notification-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "individual",
          whatsapp_number: phone,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        config?: SavedConfig | null;
        destinationLabel?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el número");
      }
      applyPayload({
        config: payload.config ?? null,
        destinationLabel:
          payload.destinationLabel ?? "números de administrador",
      });
      setMessage({ tone: "success", text: "Número guardado correctamente." });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGroup() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/doda-notification-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "group",
          whatsapp_group_id: groupId,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        config?: SavedConfig | null;
        destinationLabel?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el grupo");
      }
      applyPayload({
        config: payload.config ?? null,
        destinationLabel:
          payload.destinationLabel ?? "números de administrador",
      });
      setMessage({ tone: "success", text: "Grupo guardado correctamente." });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Notificaciones de DODA"
      description="Configura a dónde se enviarán las notificaciones cuando un DODA sea liberado."
    >
      <div id="notificaciones-doda" className="scroll-mt-24">
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="text-sm font-medium text-slate-900">
              Notificaciones WhatsApp
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Destino actual:{" "}
              <span className="font-medium text-slate-800">{destinationLabel}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Cargando configuración…
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <ModeButton
                active={mode === "individual"}
                onClick={() => setMode("individual")}
                label="Enlazar chat individual"
                disabled={!isAdmin}
              />
              <ModeButton
                active={mode === "group"}
                onClick={() => setMode("group")}
                label="Enlazar grupo"
                disabled={!isAdmin}
              />
            </div>

            {mode === "individual" ? (
              <div className="space-y-3">
                {saved?.type === "individual" && saved.whatsapp_number ? (
                  <p className="text-xs text-slate-500">
                    Número guardado:{" "}
                    <span className="font-medium text-slate-800">
                      {saved.whatsapp_number}
                    </span>
                  </p>
                ) : null}
                <div>
                  <label
                    htmlFor="doda_notify_phone"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Número de teléfono
                  </label>
                  <input
                    id="doda_notify_phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+52 899 421 4152"
                    disabled={!isAdmin || saving}
                    className={fieldClass}
                  />
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveIndividual()}
                    disabled={saving || !phone.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Guardar número
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">
                    Solo un administrador puede cambiar esta configuración.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {saved?.type === "group" && saved.whatsapp_group_id ? (
                  <p className="text-xs text-slate-500">
                    Grupo guardado:{" "}
                    <span className="font-medium text-slate-800">
                      {saved.whatsapp_group_id}
                    </span>
                  </p>
                ) : null}
                <div>
                  <label
                    htmlFor="doda_notify_group"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    ID de grupo de WhatsApp
                  </label>
                  <input
                    id="doda_notify_group"
                    type="text"
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    placeholder="Ej. 120363019502650977"
                    disabled={!isAdmin || saving}
                    className={fieldClass}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Para obtener el ID del grupo, el número de negocio debe ser
                    admin del grupo. El ID se obtiene desde Meta Business Manager.
                  </p>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveGroup()}
                    disabled={saving || !groupId.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Guardar grupo
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">
                    Solo un administrador puede cambiar esta configuración.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {message ? <SettingsAlert tone={message.tone} message={message.text} /> : null}
      </div>
    </SettingsCard>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-[#227DE8] bg-[#227DE8]/10 text-[#227DE8]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}
