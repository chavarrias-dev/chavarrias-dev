import "server-only";

import type {
  DodaLookupStatus,
  PedimentoInfo,
  SatDodaDetails,
} from "@/lib/doda-types";
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
  pedimentoInfo: PedimentoInfo | null;
  lookupError: string | null;
  lookedUpAt: string;
  /** Temporary debug field: raw QR string before URL validation. */
  debugRawQrPayload: string | null;
};

export type ProcessDodaLookupResult = ProcessDodaLookupSuccess;

export {
  processDodaLookupByIntegrationNumber,
  processDodaSatRecheck,
  type ProcessDodaSatRecheckResult,
} from "@/lib/doda-sat-recheck";

/**
 * Decodes the DODA QR and scrapes the SAT validator page.
 * Failures are returned as `revision_manual` instead of throwing.
 */
export async function processDodaLookup(
  input: ProcessDodaLookupInput,
): Promise<ProcessDodaLookupResult> {
  const lookedUpAt = new Date().toISOString();
  const { decodeDodaQrFromFile, DodaQrDecodeError } = await import(
    "@/lib/decode-doda-qr"
  );

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
      pedimentoInfo: null,
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
      pedimentoInfo: null,
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
    pedimentoInfo: scrapeResult.pedimentoInfo,
    satDetails: scrapeResult.details,
    lookupError: null,
    lookedUpAt,
    debugRawQrPayload,
  };
}
