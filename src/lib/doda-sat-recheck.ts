import "server-only";

import type { DodaLookupStatus, SatDodaDetails } from "@/lib/doda-types";
import { buildSatValidatorUrlFromIntegrationNumber } from "@/lib/doda-sat-details";
import { scrapeSatDodaStatus } from "@/lib/scrape-sat-doda";

export type ProcessDodaLookupSuccess = {
  lookupStatus: Extract<DodaLookupStatus, "verificado" | "revision_manual">;
  validatorUrl: string | null;
  numeroIntegracion: string | null;
  satStatus: string | null;
  satDetails: SatDodaDetails | null;
  lookupError: string | null;
  lookedUpAt: string;
  debugRawQrPayload: string | null;
};

export type ProcessDodaSatRecheckResult = ProcessDodaLookupSuccess;

/**
 * Builds the SAT validator URL from an integration number and scrapes status.
 * No QR/sharp dependencies — safe for cron and lookup-by-number routes.
 */
export async function processDodaLookupByIntegrationNumber(
  integrationNumber: string,
): Promise<ProcessDodaLookupSuccess> {
  const trimmed = integrationNumber.trim();
  const validatorUrl = buildSatValidatorUrlFromIntegrationNumber(trimmed);
  const lookedUpAt = new Date().toISOString();

  const scrapeResult = await scrapeSatDodaStatus(validatorUrl);
  if (!scrapeResult.ok) {
    return {
      lookupStatus: "revision_manual",
      validatorUrl,
      numeroIntegracion: trimmed,
      satStatus: null,
      satDetails: null,
      lookupError: scrapeResult.reason,
      lookedUpAt,
      debugRawQrPayload: null,
    };
  }

  return {
    lookupStatus: "verificado",
    validatorUrl: scrapeResult.validatorUrl,
    numeroIntegracion: scrapeResult.numeroIntegracion ?? trimmed,
    satStatus: scrapeResult.satStatus,
    satDetails: scrapeResult.details,
    lookupError: null,
    lookedUpAt,
    debugRawQrPayload: null,
  };
}

/**
 * Re-scrapes the SAT validator URL without decoding a file (for cron monitoring).
 */
export async function processDodaSatRecheck(
  validatorUrl: string,
): Promise<ProcessDodaSatRecheckResult> {
  const lookedUpAt = new Date().toISOString();
  const scrapeResult = await scrapeSatDodaStatus(validatorUrl);

  if (!scrapeResult.ok) {
    return {
      lookupStatus: "revision_manual",
      validatorUrl,
      numeroIntegracion: null,
      satStatus: null,
      satDetails: null,
      lookupError: scrapeResult.reason,
      lookedUpAt,
      debugRawQrPayload: null,
    };
  }

  return {
    lookupStatus: "verificado",
    validatorUrl: scrapeResult.validatorUrl,
    numeroIntegracion: scrapeResult.numeroIntegracion,
    satStatus: scrapeResult.satStatus,
    satDetails: scrapeResult.details,
    lookupError: null,
    lookedUpAt,
    debugRawQrPayload: null,
  };
}
