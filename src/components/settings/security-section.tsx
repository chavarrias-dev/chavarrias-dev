"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SettingsAlert } from "@/components/settings/settings-alert";
import { SettingsCard } from "@/components/settings/settings-card";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ tone: "error", text: "Las contraseñas nuevas no coinciden" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({
        tone: "error",
        text: "La nueva contraseña debe tener al menos 6 caracteres",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo cambiar la contraseña");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ tone: "success", text: "Contraseña actualizada correctamente." });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo cambiar la contraseña",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Seguridad" description="Actualiza la contraseña de tu cuenta.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="current_password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Contraseña actual
          </label>
          <input
            id="current_password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="new_password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Nueva contraseña
          </label>
          <input
            id="new_password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="confirm_password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Confirmar nueva contraseña
          </label>
          <input
            id="confirm_password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {message ? <SettingsAlert tone={message.tone} message={message.text} /> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Cambiar contraseña
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
