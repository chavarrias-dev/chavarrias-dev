"use client";

import { useCallback, useId, useState } from "react";
import { X } from "lucide-react";
import { validateIntegrationNumbersInput } from "@/lib/doda-sat-details";

type IntegrationNumbersInputProps = {
  id?: string;
  name?: string;
  value: string[];
  onChange: (numbers: string[]) => void;
  disabled?: boolean;
  maxCount?: number;
  placeholder?: string;
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  onDraftChange?: (draft: string) => void;
};

function splitDraft(raw: string): { numbers: string[]; remainder: string } {
  const parts = raw.split(",");
  if (parts.length === 1) {
    return { numbers: [], remainder: parts[0]?.trim() ?? "" };
  }

  const remainder = (parts.pop() ?? "").trim();
  const numbers = parts
    .map((part) => part.trim())
    .filter(Boolean);

  return { numbers, remainder };
}

function isValidDigitToken(value: string): boolean {
  return /^\d+$/.test(value);
}

export function integrationNumbersToFieldValue(numbers: string[]): string {
  return numbers.join(", ");
}

export function IntegrationNumbersInput({
  id,
  name = "integration_numbers",
  value,
  onChange,
  disabled = false,
  maxCount,
  placeholder = "144822281, 145260516, 7899688",
  label = "Números de integración",
  required = false,
  hint = "Pega o escribe números separados por comas. Cada número aparece como etiqueta.",
  error,
  onErrorChange,
  onDraftChange,
}: IntegrationNumbersInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [draft, setDraft] = useState("");

  const appendNumbers = useCallback(
    (incoming: string[]) => {
      if (incoming.length === 0) {
        return;
      }

      const invalid = incoming.find((token) => !isValidDigitToken(token));
      if (invalid) {
        onErrorChange?.(
          "Solo se permiten dígitos en cada número de integración.",
        );
        return;
      }

      onErrorChange?.(null);
      const merged = [...value];
      for (const token of incoming) {
        if (maxCount !== undefined && merged.length >= maxCount) {
          onErrorChange?.(
            `Solo puedes ingresar hasta ${maxCount} números a la vez.`,
          );
          break;
        }
        if (!merged.includes(token)) {
          merged.push(token);
        }
      }
      onChange(merged);
    },
    [maxCount, onChange, onErrorChange, value],
  );

  function commitDraft(nextDraft: string) {
    const trimmed = nextDraft.trim();
    if (!trimmed) {
      setDraft("");
      onDraftChange?.("");
      return;
    }

    if (!isValidDigitToken(trimmed)) {
      onErrorChange?.("Solo se permiten dígitos en cada número de integración.");
      return;
    }

    appendNumbers([trimmed]);
    setDraft("");
    onDraftChange?.("");
  }

  function handleInputChange(raw: string) {
    if (!/^[\d,\s]*$/.test(raw)) {
      onErrorChange?.(
        "Solo se permiten números y comas (ej. 144822281, 145260516).",
      );
      return;
    }

    onErrorChange?.(null);

    if (!raw.includes(",")) {
      setDraft(raw);
      onDraftChange?.(raw);
      return;
    }

    const { numbers, remainder } = splitDraft(raw);
    appendNumbers(numbers);
    setDraft(remainder);
    onDraftChange?.(remainder);
  }

  function removeNumber(index: number) {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
    onErrorChange?.(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft(draft);
    } else if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      removeNumber(value.length - 1);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
        {maxCount !== undefined ? (
          <span className="ml-2 text-xs font-normal text-slate-500">
            (máximo {maxCount})
          </span>
        ) : null}
      </label>

      <input type="hidden" name={name} value={integrationNumbersToFieldValue(value)} />

      <input
        id={inputId}
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={() => commitDraft(draft)}
        onKeyDown={handleKeyDown}
        className={fieldClass}
      />

      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((number, index) => (
            <span
              key={`${number}-${index}`}
              className="inline-flex items-center gap-1 rounded-full border border-[#227DE8]/20 bg-[#227DE8]/8 px-2.5 py-1 text-sm font-medium text-[#227DE8]"
            >
              {number}
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeNumber(index)}
                className="rounded-full p-0.5 text-[#227DE8]/80 transition hover:bg-[#227DE8]/15 hover:text-[#227DE8] disabled:opacity-50"
                aria-label={`Quitar ${number}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}

      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function mergeIntegrationDraft(
  numbers: string[],
  draft: string,
  maxCount?: number,
): string[] {
  const trimmed = draft.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return numbers;
  }
  if (numbers.includes(trimmed)) {
    return numbers;
  }
  if (maxCount !== undefined && numbers.length >= maxCount) {
    return numbers;
  }
  return [...numbers, trimmed];
}

export function validateIntegrationNumberList(
  numbers: string[],
  maxCount?: number,
): { ok: true; numbers: string[] } | { ok: false; error: string } {
  if (numbers.length === 0) {
    return { ok: false, error: "Agrega al menos un número de integración." };
  }

  return validateIntegrationNumbersInput(numbers.join(", "), maxCount);
}

export function getNextHourlyCheckTime(from = new Date()): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  if (from.getMinutes() > 0 || from.getSeconds() > 0 || from.getMilliseconds() > 0) {
    next.setHours(next.getHours() + 1);
  }
  return next;
}

export function formatNextHourlyCheckTime(from = new Date()): string {
  return getNextHourlyCheckTime(from).toLocaleString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
