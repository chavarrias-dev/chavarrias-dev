"use client";

import {
  DEFAULT_WHATSAPP_COUNTRY_CODE,
  WHATSAPP_COUNTRY_CODE_OPTIONS,
} from "@/lib/whatsapp-phone-input";

const selectClass =
  "h-[42px] shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type WhatsAppPhoneInputProps = {
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  localNumber: string;
  onLocalNumberChange: (value: string) => void;
  disabled?: boolean;
  localInputId?: string;
  selectId?: string;
  inputClassName?: string;
  selectClassName?: string;
};

export function WhatsAppPhoneInput({
  countryCode,
  onCountryCodeChange,
  localNumber,
  onLocalNumberChange,
  disabled = false,
  localInputId,
  selectId,
  inputClassName = inputClass,
  selectClassName = selectClass,
}: WhatsAppPhoneInputProps) {
  return (
    <div className="flex gap-2">
      <select
        id={selectId}
        value={countryCode || DEFAULT_WHATSAPP_COUNTRY_CODE}
        onChange={(event) => onCountryCodeChange(event.target.value)}
        disabled={disabled}
        className={selectClassName}
        aria-label="Código de país"
      >
        {WHATSAPP_COUNTRY_CODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
