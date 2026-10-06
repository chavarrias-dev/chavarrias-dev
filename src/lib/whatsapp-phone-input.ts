import { normalizePhoneDigits } from "@/lib/phone-match";

export const DEFAULT_WHATSAPP_COUNTRY_CODE = "+52";

export const WHATSAPP_COUNTRY_CODE_OPTIONS = [
  { value: "+52", label: "+52 (México)" },
  { value: "+1", label: "+1 (USA)" },
] as const;

/** Combines country code + local digits → e.g. "+528994214152". */
export function combineWhatsAppPhoneParts(
  countryCode: string,
  localNumber: string,
): string | null {
  const codeDigits = normalizePhoneDigits(countryCode);
  const localDigits = localNumber.replace(/[\s-]/g, "").replace(/\D/g, "");
  if (!codeDigits || localDigits.length < 10) {
    return null;
  }
  return `+${codeDigits}${localDigits}`;
}

/** Normalizes a stored or pasted full number to "+{digits}" without spaces. */
export function normalizeCombinedWhatsAppNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 11) {
    return null;
  }
  return `+${digits}`;
}

export function splitWhatsAppPhoneStored(stored: string | null | undefined): {
  countryCode: string;
  localNumber: string;
} {
  const fallback = {
    countryCode: DEFAULT_WHATSAPP_COUNTRY_CODE,
    localNumber: "",
  };
  if (!stored?.trim()) {
    return fallback;
  }

  const normalized = normalizeCombinedWhatsAppNumber(stored);
  const digits = normalizePhoneDigits(normalized ?? stored);

  if (digits.startsWith("52") && digits.length >= 12) {
    return {
      countryCode: "+52",
      localNumber: formatLocalNumberDigits(digits.slice(2)),
    };
  }
  if (digits.startsWith("1") && digits.length === 11) {
    return {
      countryCode: "+1",
      localNumber: formatLocalNumberDigits(digits.slice(1)),
    };
  }
  if (digits.length === 10) {
    return {
      countryCode: DEFAULT_WHATSAPP_COUNTRY_CODE,
      localNumber: formatLocalNumberDigits(digits),
    };
  }

  const match = stored.trim().match(/^(\+\d{1,3})\s*(.+)$/);
  if (match) {
    return {
      countryCode: match[1],
      localNumber: match[2].replace(/[\s-]+/g, " ").trim(),
    };
  }

  return fallback;
}

export function formatLocalNumberDigits(digits: string): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits;
}

/** Human-readable label for stored values like "+528994214152". */
export function formatWhatsAppPhoneForDisplay(phone: string): string {
  const normalized = normalizeCombinedWhatsAppNumber(phone) ?? phone.trim();
  const digits = normalizePhoneDigits(normalized);
  if (digits.length === 12 && digits.startsWith("52")) {
    return `+52 ${formatLocalNumberDigits(digits.slice(2))}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${formatLocalNumberDigits(digits.slice(1))}`;
  }
  if (digits.length === 10) {
    return `+52 ${formatLocalNumberDigits(digits)}`;
  }
  return normalized;
}
