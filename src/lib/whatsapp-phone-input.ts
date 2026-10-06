import { normalizePhoneDigits } from "@/lib/phone-match";

export const MEXICO_WHATSAPP_PREFIX = "+52";

/** Strips spaces/dashes from local input and prepends 52 → e.g. "528994214152". */
export function combineMexicoWhatsAppLocalNumber(localNumber: string): string | null {
  const localDigits = localNumber.replace(/[\s-]/g, "").replace(/\D/g, "");
  if (localDigits.length < 10) {
    return null;
  }
  const national =
    localDigits.length === 10 ? localDigits : localDigits.slice(-10);
  return `52${national}`;
}

/** Normalizes stored/pasted values to digit-only MX WhatsApp id (52 + 10 digits). */
export function normalizeCombinedWhatsAppNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length === 10) {
    return `52${digits}`;
  }
  if (digits.startsWith("52") && digits.length >= 12) {
    return `52${digits.slice(-10)}`;
  }
  if (digits.length >= 11) {
    return digits.startsWith("52") ? `52${digits.slice(-10)}` : null;
  }
  return null;
}

/** Local part for editing (e.g. "899 421 4152"). */
export function splitMexicoWhatsAppStored(
  stored: string | null | undefined,
): string {
  if (!stored?.trim()) {
    return "";
  }
  const digits = normalizePhoneDigits(stored);
  if (digits.startsWith("52") && digits.length >= 12) {
    return formatLocalNumberDigits(digits.slice(-10));
  }
  if (digits.length === 10) {
    return formatLocalNumberDigits(digits);
  }
  return stored.replace(/^\+\d+\s*/, "").trim();
}

export function formatLocalNumberDigits(digits: string): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits;
}

/** Human-readable label for stored values like "528994214152". */
export function formatWhatsAppPhoneForDisplay(phone: string): string {
  const normalized = normalizeCombinedWhatsAppNumber(phone);
  const digits = normalizePhoneDigits(normalized ?? phone);
  if (digits.startsWith("52") && digits.length >= 12) {
    return `+52 ${formatLocalNumberDigits(digits.slice(-10))}`;
  }
  if (digits.length === 10) {
    return `+52 ${formatLocalNumberDigits(digits)}`;
  }
  return phone.trim();
}
