import type { SatDodaDetails } from "@/lib/doda-types";

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
