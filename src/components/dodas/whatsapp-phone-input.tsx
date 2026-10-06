"use client";

import { MEXICO_WHATSAPP_PREFIX } from "@/lib/whatsapp-phone-input";

const prefixClass =
  "inline-flex h-full shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700";

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type WhatsAppPhoneInputProps = {
  localNumber: string;
  onLocalNumberChange: (value: string) => void;
  disabled?: boolean;
  localInputId?: string;
  inputClassName?: string;
  prefixClassName?: string;
};

export function WhatsAppPhoneInput({
  localNumber,
  onLocalNumberChange,
  disabled = false,
  localInputId,
  inputClassName = inputClass,
  prefixClassName = prefixClass,
}: WhatsAppPhoneInputProps) {
  return (
    <div className="flex gap-2">
      <span className={prefixClassName} aria-hidden>
        {MEXICO_WHATSAPP_PREFIX}
      </span>
      <input
        id={localInputId}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={localNumber}
        onChange={(event) => onLocalNumberChange(event.target.value)}
        placeholder="899 421 4152"
        disabled={disabled}
        className={inputClassName}
      />
    </div>
  );
}
