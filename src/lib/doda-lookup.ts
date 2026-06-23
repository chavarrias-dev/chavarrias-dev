import "server-only";

import {
  decodeDodaQrFromFile,
  DodaQrDecodeError,
} from "@/lib/decode-doda-qr";
import type { DodaLookupStatus, SatDodaDetails } from "@/lib/doda-types";
import { buildSatValidatorUrlFromIntegrationNumber } from "@/lib/doda-sat-details";
import { scrapeSatDodaStatus } from "@/lib/scrape-sat-doda";

export type ProcessDodaLookupInput = {
  file: File;
};

export type ProcessDodaLookupSuccess = {
  lookupStatus: Extract<DodaLookupStatus, "verificado" | "revision_manual">;
  validatorUrl: string | null;
  numeroIntegracion: string | null;
  satStatus: string | null;
  satDetails: SatDodaDetails | null;
  lookupError: string | null;
  lookedUpAt: string;
  /** Temporary debug field: raw QR string before URL validation. */
  debugRawQrPayload: string | null;
};

export type ProcessDodaLookupResult = ProcessDodaLookupSuccess;

/**
 * Decodes the DODA QR and scrapes the SAT validator page.
 * Failures are returned as `revision_manual` instead of throwing.
 */
export async function processDodaLookup(
  input: ProcessDodaLookupInput,
): Promise<ProcessDodaLookupResult> {
  const lookedUpAt = new Date().toISOString();

  let validatorUrl: string | null = null;
  let numeroIntegracion: string | null = null;
  let debugRawQrPayload: string | null = null;

  try {
    const decoded = await decodeDodaQrFromFile(input.file);
    validatorUrl = decoded.validatorUrl;
    numeroIntegracion = decoded.numeroIntegracion;
    debugRawQrPayload = decoded.rawQrPayload;
  } catch (error) {
    const reason =
      error instanceof DodaQrDecodeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No se pudo leer el código QR del DODA.";

    if (error instanceof DodaQrDecodeError && error.rawQrPayload) {
      debugRawQrPayload = error.rawQrPayload;
    }

    return {
      lookupStatus: "revision_manual",
      validatorUrl: null,
      numeroIntegracion: null,
      satStatus: null,
      satDetails: null,
      lookupError: reason,
      lookedUpAt,
      debugRawQrPayload,
    };
  }

  const scrapeResult = await scrapeSatDodaStatus(validatorUrl);
  if (!scrapeResult.ok) {
    return {
      lookupStatus: "revision_manual",
      validatorUrl,
      numeroIntegracion,
      satStatus: null,
      satDetails: null,
      lookupError: scrapeResult.reason,
      lookedUpAt,
      debugRawQrPayload,
    };
  }

  return {
    lookupStatus: "verificado",
    validatorUrl: scrapeResult.validatorUrl,
    numeroIntegracion:
      scrapeResult.numeroIntegracion ?? numeroIntegracion,
    satStatus: scrapeResult.satStatus,
    satDetails: scrapeResult.details,
    lookupError: null,
    lookedUpAt,
    debugRawQrPayload,
  };
}

/**
 * Builds the SAT validator URL from an integration number and scrapes status.
 */
export async function processDodaLookupByIntegrationNumber(
  integrationNumber: string,
): Promise<ProcessDodaLookupResult> {
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

export type ProcessDodaSatRecheckResult = ProcessDodaLookupSuccess;

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
