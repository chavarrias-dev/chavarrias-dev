import type { SatDodaDetails } from "@/lib/doda-types";

export const SAT_VALIDATOR_BASE_URL =
  "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf";

const INTEGRATION_INPUT_PATTERN = /^[\d,\s]+$/;

export function buildSatValidatorUrlFromIntegrationNumber(
  integrationNumber: string,
): string {
  const trimmed = integrationNumber.trim();
  return `${SAT_VALIDATOR_BASE_URL}?D1=16&D2=1&D3=${encodeURIComponent(trimmed)}`;
}

export function parseIntegrationNumbersInput(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export type IntegrationNumbersValidation =
  | { ok: true; numbers: string[] }
  | { ok: false; error: string };

export function validateIntegrationNumbersInput(
  raw: string,
  maxCount?: number,
): IntegrationNumbersValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Ingresa al menos un número de integración." };
  }

  if (!INTEGRATION_INPUT_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "Solo se permiten números y comas (ej. 144822281, 145260516).",
    };
  }

  const numbers = parseIntegrationNumbersInput(trimmed);
  if (numbers.length === 0) {
    return { ok: false, error: "Ingresa al menos un número de integración." };
  }

  if (maxCount !== undefined && numbers.length > maxCount) {
    return {
      ok: false,
      error: `Solo puedes ingresar hasta ${maxCount} números a la vez.`,
    };
  }

  if (!numbers.every((value) => /^\d+$/.test(value))) {
    return {
      ok: false,
      error: "Cada número de integración debe contener solo dígitos.",
    };
  }

  return { ok: true, numbers };
}

export function isSatDodaValidatorUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (!hostname.endsWith("sat.gob.mx")) {
      return false;
    }

    if (!pathname.includes("validadorqr.jsf")) {
      return false;
    }

    const d1 = parsed.searchParams.get("D1");
    const d2 = parsed.searchParams.get("D2");
    const d3 = parsed.searchParams.get("D3");

    return Boolean(d1?.trim() && d2?.trim() && d3?.trim());
  } catch {
    return false;
  }
}

export function extractIntegrationNumberFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const d3 = parsed.searchParams.get("D3");
    return d3?.trim() || null;
  } catch {
    return null;
  }
}

/** Parses SAT details JSON stored in the database. */
export function parseSatDetails(raw: string | null): SatDodaDetails {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")]),
    );
  } catch {
    return {};
  }
}
