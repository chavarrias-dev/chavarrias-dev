"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";
import type { DodaRecord } from "@/lib/doda-types";

export type WhatsappGroupOption = {
  id: string;
  name: string;
  group_id: string;
  created_at: string | null;
};
import { combineMexicoWhatsAppLocalNumber } from "@/lib/whatsapp-phone-input";
import {
  WhatsAppPhoneInput,
  whatsAppPhoneFieldClass,
} from "@/components/dodas/whatsapp-phone-input";

export type DodaNotifyDestinationDialogProps = {
  open: boolean;
  onClose: () => void;
  doda: DodaRecord;
  groups: WhatsappGroupOption[];
  onSaved: (doda: DodaRecord) => void;
};

type NotifyEditMode = "none" | "individual" | "group";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function mexicoLocalFromStoredNumber(full: string | null | undefined): string {
  const digits = (full ?? "").replace(/\D/g, "");
  if (digits.startsWith("52") && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits.length === 10 ? digits : digits;
}

function matchGroupRowId(
  groups: WhatsappGroupOption[],
  storedGroupId: string | null | undefined,
): string {
  const g = (storedGroupId ?? "").trim();
  if (!g) {
    return "";
  }
  const row = groups.find((r) => r.group_id === g);
  return row?.id ?? "";
}

export function DodaNotifyDestinationDialog({
  open,
  onClose,
  doda,
  groups,
  onSaved,
}: DodaNotifyDestinationDialogProps) {
  const [mode, setMode] = useState<NotifyEditMode>("none");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [groupRowId, setGroupRowId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    const t = doda.notify_type?.trim();
    if (t === "individual") {
      setMode("individual");
      setPhoneLocal(mexicoLocalFromStoredNumber(doda.notify_whatsapp_number));
    } else if (t === "group") {
      setMode("group");
      setGroupRowId(matchGroupRowId(groups, doda.notify_whatsapp_group_id));
    } else {
      setMode("none");
      setPhoneLocal("");
      setGroupRowId("");
    }
  }, [open, doda, groups]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let body: Record<string, string | null>;
      if (mode === "none") {
        body = { notify_type: "none" };
      } else if (mode === "individual") {
        const combined = combineMexicoWhatsAppLocalNumber(phoneLocal);
        if (!combined) {
          setError("Introduce un teléfono válido (10 dígitos).");
          setSaving(false);
          return;
        }
        body = {
          notify_type: "individual",
          notify_whatsapp_number: combined,
          notify_whatsapp_group_id: null,
        };
      } else {
        if (!groupRowId.trim()) {
          setError("Selecciona un grupo registrado.");
          setSaving(false);
          return;
        }
        body = {
          notify_type: "group",
          notify_whatsapp_number: null,
          notify_whatsapp_group_id: groupRowId.trim(),
        };
      }

      const response = await fetch(`/api/doda/${doda.id}/notify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        doda?: DodaRecord;
      };
      if (!response.ok || !payload.ok || !payload.doda) {
        throw new Error(payload.error ?? "No se pudo guardar");
      }
      onSaved(payload.doda);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-labelledby="doda-notify-dialog-title"
        className="w-full max-w-md min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3
              id="doda-notify-dialog-title"
              className="text-base font-medium text-slate-900"
            >
              Asignar grupo (WhatsApp)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              DODA {doda.numero_integracion ?? doda.id.slice(0, 8)} · solo si sigue
              pendiente. El aviso al liberar va al grupo o número que elijas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 has-[:checked]:border-[#227DE8] has-[:checked]:bg-[#227DE8]/5">
              <input
                type="radio"
                name="doda_notify_edit_mode"
                checked={mode === "none"}
                onChange={() => setMode("none")}
                disabled={saving}
                className="size-4 border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/30"
              />
              <span className="text-sm text-slate-800">Sin notificación</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 has-[:checked]:border-[#227DE8] has-[:checked]:bg-[#227DE8]/5">
              <input
                type="radio"
                name="doda_notify_edit_mode"
                checked={mode === "individual"}
                onChange={() => setMode("individual")}
                disabled={saving}
                className="size-4 border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/30"
              />
              <span className="text-sm text-slate-800">Número individual</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 has-[:checked]:border-[#227DE8] has-[:checked]:bg-[#227DE8]/5">
              <input
                type="radio"
                name="doda_notify_edit_mode"
                checked={mode === "group"}
                onChange={() => setMode("group")}
                disabled={saving}
                className="size-4 border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/30"
              />
              <span className="text-sm text-slate-800">Asignar grupo</span>
            </label>
          </div>

          {mode === "individual" ? (
            <div>
              <label
                htmlFor="doda_notify_edit_phone"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Teléfono
              </label>
              <WhatsAppPhoneInput
                localInputId="doda_notify_edit_phone"
                localNumber={phoneLocal}
                onLocalNumberChange={setPhoneLocal}
                disabled={saving}
                inputClassName={`${whatsAppPhoneFieldClass} text-[15px]`}
              />
            </div>
          ) : null}

          {mode === "group" ? (
            <div>
              <label
                htmlFor="doda_notify_edit_group"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Grupo del catálogo
              </label>
              <select
                id="doda_notify_edit_group"
                value={groupRowId}
                onChange={(e) => setGroupRowId(e.target.value)}
                disabled={saving}
                className={fieldClass}
              >
                <option value="">Selecciona un grupo importado o registrado…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {groups.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-800">
                  No hay grupos en el catálogo. Un administrador puede importarlos o
                  crearlos en Configuración → Grupos WhatsApp.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => onClose()}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#227DE8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="size-4" aria-hidden />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
