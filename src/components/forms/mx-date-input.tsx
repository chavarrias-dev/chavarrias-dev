"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatMxDateDigits,
  isoDateToMxDisplay,
  parseMxDateToIso,
} from "@/lib/mx-date";

type MxDateInputProps = {
  id?: string;
  /** Omitir en filtros solo-cliente (sin envío de formulario). */
  name?: string;
  className?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (iso: string) => void;
  showHint?: boolean;
  "aria-label"?: string;
};

function normalizeIso(raw: string): string {
  const d = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

export function MxDateInput({
  id,
  name,
  className,
  required,
  defaultValue = "",
  value,
  onValueChange,
  showHint = true,
  "aria-label": ariaLabel,
}: MxDateInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const isControlled = value !== undefined;
  const skipExternalSync = useRef(false);

  const [display, setDisplay] = useState(() =>
    isoDateToMxDisplay(isControlled ? normalizeIso(value) : normalizeIso(defaultValue)),
  );
  const [iso, setIso] = useState(() =>
    normalizeIso(isControlled ? (value ?? "") : defaultValue),
  );
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!isControlled) return;
    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }
    const normalized = normalizeIso(value ?? "");
    if (normalized === parseMxDateToIso(display)) return;
    setDisplay(isoDateToMxDisplay(normalized));
    setIso(normalized);
    setInvalid(false);
  }, [display, isControlled, value]);

  function syncFromDisplay(nextDisplay: string) {
    setDisplay(nextDisplay);
    const parsed = parseMxDateToIso(nextDisplay);
    const complete = /^\d{2}\/\d{2}\/\d{4}$/.test(nextDisplay.trim());
    setInvalid(complete && !parsed);
    const nextIso = parsed ?? "";
    if (!isControlled) {
      setIso(nextIso);
    } else {
      skipExternalSync.current = true;
    }
    onValueChange?.(nextIso);
  }

  const hiddenValue = isControlled
    ? (parseMxDateToIso(display) ?? "")
    : iso;

  const borderClass = invalid
    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
    : "border-slate-200 focus:border-[#227DE8] focus:ring-[#227DE8]/20";

  return (
    <div>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={hiddenValue}
          required={required}
        />
      ) : null}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={`${className ?? ""} ${borderClass}`.trim()}
        value={display}
        onChange={(event) => {
          syncFromDisplay(formatMxDateDigits(event.target.value));
        }}
        onBlur={() => {
          if (!display.trim()) {
            setInvalid(false);
            return;
          }
          const parsed = parseMxDateToIso(display);
          setInvalid(!parsed);
        }}
      />
      {showHint ? (
        <p className="mt-1 text-xs text-slate-500">Formato día/mes/año (México)</p>
      ) : null}
      {invalid ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          Fecha inválida. Usa dd/mm/aaaa.
        </p>
      ) : null}
    </div>
  );
}
