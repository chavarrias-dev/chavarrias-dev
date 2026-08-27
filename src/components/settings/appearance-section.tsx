"use client";

import { useEffect, useState } from "react";
import { SettingsAlert } from "@/components/settings/settings-alert";
import { SettingsCard } from "@/components/settings/settings-card";

const TIMEZONE_STORAGE_KEY = "crm-timezone";
const DEFAULT_TIMEZONE = "America/Matamoros";

const TIMEZONE_OPTIONS = [
  { value: "America/Matamoros", label: "Matamoros (Hora del Centro)" },
  { value: "America/Mexico_City", label: "Ciudad de México (Hora del Centro)" },
  { value: "America/Tijuana", label: "Tijuana (Hora del Pacífico)" },
  { value: "America/Hermosillo", label: "Hermosillo (Hora de la Montaña)" },
  { value: "America/Cancun", label: "Cancún (Hora del Este)" },
];

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function AppearanceSection() {
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
      if (stored) {
        setTimezone(stored);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — keep the default.
    }
  }, []);

  function handleSave() {
    try {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
      setMessage({ tone: "success", text: "Preferencias de apariencia guardadas." });
    } catch {
      setMessage({ tone: "error", text: "No se pudo guardar la preferencia" });
    }
  }

  return (
    <SettingsCard
      title="Apariencia"
      description="Idioma y zona horaria para todo el equipo."
    >
      <div>
        <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-slate-700">
          Idioma
        </label>
        <select id="language" disabled defaultValue="es" className={selectClass}>
          <option value="es">Español</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">Más idiomas próximamente.</p>
      </div>

      <div>
        <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-slate-700">
          Zona horaria
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={selectClass}
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {message ? <SettingsAlert tone={message.tone} message={message.text} /> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
        >
          Guardar cambios
        </button>
      </div>
    </SettingsCard>
  );
}
