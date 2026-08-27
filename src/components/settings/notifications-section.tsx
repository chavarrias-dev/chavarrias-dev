"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { SettingsAlert } from "@/components/settings/settings-alert";
import { SettingsCard } from "@/components/settings/settings-card";
import { ToggleSwitch } from "@/components/settings/toggle-switch";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type NotificationsSectionProps = {
  initialNotifDodaAlert: boolean;
  initialNotifDocsAlert: boolean;
  initialNotifMessagesAlert: boolean;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function savePreferences(update: Record<string, boolean>) {
  const response = await fetch("/api/settings/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  const payload = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "No se pudo guardar la preferencia");
  }
}

export function NotificationsSection({
  initialNotifDodaAlert,
  initialNotifDocsAlert,
  initialNotifMessagesAlert,
}: NotificationsSectionProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [checkingSupport, setCheckingSupport] = useState(true);
  const [togglingPush, setTogglingPush] = useState(false);

  const [dodaAlert, setDodaAlert] = useState(initialNotifDodaAlert);
  const [docsAlert, setDocsAlert] = useState(initialNotifDocsAlert);
  const [messagesAlert, setMessagesAlert] = useState(initialNotifMessagesAlert);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID_PUBLIC_KEY
    ) {
      setCheckingSupport(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setSubscribed(!!existing);
      } catch (err) {
        console.error("[settings] service worker registration failed", err);
      } finally {
        setCheckingSupport(false);
      }
    })();
  }, []);

  async function handleActivatePush() {
    if (!VAPID_PUBLIC_KEY) return;
    setTogglingPush(true);
    setMessage(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        throw new Error("Permiso de notificaciones denegado");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo activar las notificaciones");
      }

      await savePreferences({ notif_push_enabled: true });
      setSubscribed(true);
      setMessage({ tone: "success", text: "Notificaciones del navegador activadas." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "No se pudo activar las notificaciones",
      });
    } finally {
      setTogglingPush(false);
    }
  }

  async function handleDeactivatePush() {
    setTogglingPush(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      await savePreferences({ notif_push_enabled: false });
      setSubscribed(false);
      setMessage({ tone: "success", text: "Notificaciones del navegador desactivadas." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "No se pudo desactivar las notificaciones",
      });
    } finally {
      setTogglingPush(false);
    }
  }

  async function handleSaveAlertPrefs() {
    setSavingPrefs(true);
    setMessage(null);

    try {
      await savePreferences({
        notif_doda_alert: dodaAlert,
        notif_docs_alert: docsAlert,
        notif_messages_alert: messagesAlert,
      });
      setMessage({ tone: "success", text: "Preferencias de alertas guardadas." });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo guardar la preferencia",
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <SettingsCard
      title="Notificaciones"
      description="Controla cómo te avisamos sobre novedades en el CRM."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BellRing className="size-4 shrink-0 text-[#227DE8]" aria-hidden />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Notificaciones push del navegador
              </p>
              <p className="text-xs text-slate-500">
                {checkingSupport
                  ? "Comprobando compatibilidad…"
                  : !supported
                    ? "Tu navegador no soporta notificaciones push."
                    : permission === "denied"
                      ? "Bloqueadas en la configuración del navegador."
                      : subscribed
                        ? "Activadas"
                        : "Desactivadas"}
              </p>
            </div>
          </div>

          {supported && permission !== "denied" ? (
            <button
              type="button"
              onClick={subscribed ? handleDeactivatePush : handleActivatePush}
              disabled={togglingPush || checkingSupport}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                subscribed
                  ? "border border-red-300 text-red-700 hover:bg-red-50"
                  : "bg-[#227DE8] text-white hover:bg-[#1a6ed4]"
              }`}
            >
              {togglingPush ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              {subscribed ? "Desactivar" : "Activar notificaciones del navegador"}
            </button>
          ) : null}
        </div>
      </div>

      {subscribed ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Alertas de DODA liberado</p>
              <p className="text-xs text-slate-500">
                Avisa cuando un DODA en monitoreo se desaduana.
              </p>
            </div>
            <ToggleSwitch
              checked={dodaAlert}
              onChange={setDodaAlert}
              label="Alertas de DODA liberado"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Alertas de documentos por vencer
              </p>
              <p className="text-xs text-slate-500">
                Avisa cuando un documento de cliente está por vencer.
              </p>
            </div>
            <ToggleSwitch
              checked={docsAlert}
              onChange={setDocsAlert}
              label="Alertas de documentos por vencer"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Notificaciones de mensajes nuevos
              </p>
              <p className="text-xs text-slate-500">
                Avisa cuando recibes un mensaje nuevo en el CRM.
              </p>
            </div>
            <ToggleSwitch
              checked={messagesAlert}
              onChange={setMessagesAlert}
              label="Notificaciones de mensajes nuevos"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Activa las notificaciones del navegador para configurar alertas específicas.
        </p>
      )}

      {message ? <SettingsAlert tone={message.tone} message={message.text} /> : null}

      {subscribed ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveAlertPrefs}
            disabled={savingPrefs}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingPrefs ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Guardar preferencias
          </button>
        </div>
      ) : null}
    </SettingsCard>
  );
}
