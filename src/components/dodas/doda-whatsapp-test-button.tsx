"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";
import { DodaToast, type DodaToastTone } from "@/components/dodas/doda-toast";
import { WhatsAppPhoneInput } from "@/components/dodas/whatsapp-phone-input";
import { combineMexicoWhatsAppLocalNumber } from "@/lib/whatsapp-phone-input";
import type { WhatsappGroupOption } from "@/components/dodas/doda-notify-destination-dialog";

type NotifyMode = "individual" | "group";

type DodaWhatsappTestButtonProps = {
  isAdmin: boolean;
  defaultNotifyMode?: NotifyMode | null;
  defaultPhoneLocal?: string;
  /** Row id from `whatsapp_groups` when mode is group */
  defaultRegisteredGroupId?: string;
  whatsappGroups: WhatsappGroupOption[];
};

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function DodaWhatsappTestButton({
  isAdmin,
  defaultNotifyMode = null,
  defaultPhoneLocal = "",
  defaultRegisteredGroupId = "",
  whatsappGroups,
}: DodaWhatsappTestButtonProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<NotifyMode>(
    defaultNotifyMode === "group" ? "group" : "individual",
  );
  const [phoneLocal, setPhoneLocal] = useState(defaultPhoneLocal);
  const [registeredGroupId, setRegisteredGroupId] = useState(
    defaultRegisteredGroupId,
  );
  const [toast, setToast] = useState<{
    key: number;
    tone: DodaToastTone;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setMode(defaultNotifyMode === "group" ? "group" : "individual");
    setPhoneLocal(defaultPhoneLocal);
    setRegisteredGroupId(defaultRegisteredGroupId);
  }, [open, defaultNotifyMode, defaultPhoneLocal, defaultRegisteredGroupId]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isAdmin) {
    return null;
  }

  async function handleSend() {
    setSending(true);
    try {
      const combinedPhone =
        mode === "individual"
          ? combineMexicoWhatsAppLocalNumber(phoneLocal)
          : null;

      const response = await fetch("/api/doda/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_type: mode,
          notify_whatsapp_number: combinedPhone,
          notify_whatsapp_group_id:
            mode === "group" ? registeredGroupId || null : null,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        evolution?: { number?: string; response?: unknown };
      };
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error ?? "No se pudo enviar la prueba (Evolution API).",
        );
      }
      setOpen(false);
      const dest =
        typeof payload.evolution?.number === "string"
          ? ` Destino: ${payload.evolution.number}`
          : "";
      setToast({
        key: Date.now(),
        tone: "success",
        message: `✅ Mensaje de prueba enviado (Evolution).${dest}`,
      });
    } catch (error) {
      setToast({
        key: Date.now(),
        tone: "error",
        message:
          error instanceof Error ? error.message : "Error al enviar la prueba",
      });
    } finally {
      setSending(false);
    }
  }

  const canSendIndividual = Boolean(combineMexicoWhatsAppLocalNumber(phoneLocal));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#227DE8]/40 bg-white px-2.5 py-1.5 text-xs font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5"
      >
        <MessageCircle className="size-3.5" aria-hidden />
        Enviar prueba
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => !sending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="doda-wa-test-title"
            className="font-poppins w-full max-w-md min-w-0 overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="doda-wa-test-title"
                  className="text-base font-medium text-slate-900"
                >
                  Enviar prueba WhatsApp
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  El mensaje de prueba se enviará al destino que indiques.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !sending && setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMode("individual")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mode === "individual"
                      ? "border-[#227DE8] bg-[#227DE8]/10 text-[#227DE8]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Número
                </button>
                <button
                  type="button"
                  onClick={() => setMode("group")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mode === "group"
                      ? "border-[#227DE8] bg-[#227DE8]/10 text-[#227DE8]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Grupo
                </button>
              </div>

              {mode === "individual" ? (
                <WhatsAppPhoneInput
                  localNumber={phoneLocal}
                  onLocalNumberChange={setPhoneLocal}
                  disabled={sending}
                />
              ) : (
                <div className="space-y-1">
                  <select
                    value={registeredGroupId}
                    onChange={(event) =>
                      setRegisteredGroupId(event.target.value)
                    }
                    disabled={sending}
                    className={fieldClass}
                  >
                    <option value="">Selecciona un grupo…</option>
                    {whatsappGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.group_id})
                      </option>
                    ))}
                  </select>
                  {whatsappGroups.length === 0 ? (
                    <p className="text-xs text-amber-800">
                      Registra grupos en Configuración → Grupos WhatsApp.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={
                  sending ||
                  (mode === "individual"
                    ? !canSendIndividual
                    : !registeredGroupId.trim())
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#227DE8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MessageCircle className="size-4" aria-hidden />
                )}
                Enviar prueba
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <DodaToast key={toast.key} tone={toast.tone} message={toast.message} />
      ) : null}
    </>
  );
}
