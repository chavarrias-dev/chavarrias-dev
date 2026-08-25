import "server-only";

import type { Browser, Page } from "puppeteer-core";
import type {
  PedimentoInfo,
  SatDodaDetails,
  SatDodaLookupOutcome,
} from "@/lib/doda-types";
import { extractIntegrationNumberFromUrl } from "@/lib/doda-sat-details";
import { launchPuppeteerBrowser } from "@/lib/launch-puppeteer";
import {
  formatSatScrapeFailureReason,
  saveSatScrapeDebugArtifacts,
} from "@/lib/sat-scrape-debug";

const NAVIGATION_TIMEOUT_MS = 60_000;
const CONTENT_TIMEOUT_MS = 45_000;
const BODY_TEXT_PREVIEW_LENGTH = 500;
const BODY_TEXT_LOG_CAP = 6000;

const SECTION_INTEGRACION = "Número de Integración";
const SECTION_DATOS_GENERALES = "Datos Generales Consultados";
const SECTION_PEDIMENTOS = "Información de Pedimento(s)";

/**
 * Logs page title/URL/HTTP status/body-text preview so we can see in Vercel
 * runtime logs exactly what the SAT returned, without relying on the
 * filesystem-based debug artifacts (which don't survive a serverless
 * invocation and can't be inspected after the fact).
 */
async function logPageDiagnostics(
  page: Page,
  label: string,
  response?: import("puppeteer-core").HTTPResponse | null,
): Promise<string> {
  try {
    const url = page.url();
    const title = await page.title().catch(() => null);
    const bodyText = await page
      .evaluate(() => document.body?.innerText ?? "")
      .catch(() => "");

    console.log(`[scrape-sat-doda] ${label}`, {
      url,
      responseStatus: response ? response.status() : null,
      responseOk: response ? response.ok() : null,
      responseUrl: response ? response.url() : null,
      title,
      bodyTextLength: bodyText.length,
      bodyTextPreview: bodyText.slice(0, BODY_TEXT_PREVIEW_LENGTH),
    });

    return bodyText;
  } catch (logError) {
    console.error(
      `[scrape-sat-doda] failed to log diagnostics (${label})`,
      logError,
    );
    return "";
  }
}


function extractSatStatusFromDatosGenerales(text: string): string | null {
  const starred = text.match(/\*\*\*(.+?)\*\*\*/);
  if (starred?.[1]) {
    return starred[1].trim();
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const skipPatterns = [
    /^fecha\b/i,
    /^hora\b/i,
    /^ad\b/i,
    /^aduana\b/i,
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/,
    /^\d{1,2}:\d{2}/,
  ];

  const candidates = lines.filter(
    (line) => !skipPatterns.some((pattern) => pattern.test(line)),
  );

  const statusLike = candidates.find(
    (line) =>
      line.length >= 6 &&
      /[A-ZÁÉÍÓÚÑ]/.test(line) &&
      /^[A-ZÁÉÍÓÚÑ0-9\s\-_/().,]+$/.test(line),
  );
  if (statusLike) {
    return statusLike;
  }

  return candidates.length > 0 ? (candidates[candidates.length - 1] ?? null) : null;
}

/**
 * DOM extraction aligned with PrimeFaces Mobile listview markup from SAT validator.
 * See tmp/doda-debug/*.html for reference structure.
 */
async function extractSatValidatorData(
  page: Page,
): Promise<{
  numeroIntegracion: string | null;
  datosGeneralesConsultados: string | null;
  satStatus: string | null;
  satStatusSource: string | null;
  details: SatDodaDetails;
  pedimentoInfo: PedimentoInfo;
  pageTitle: string | null;
  bodyText: string;
  foundDesaduanamientoLibreInBody: boolean;
  foundDodaKeywordInBody: boolean;
}> {
  return page.evaluate(
    (sectionIntegracion, sectionDatosGenerales, sectionPedimentos) => {
      function normalizeText(value: string | null | undefined): string {
        return (value ?? "")
          .replace(/\u00a0/g, " ")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n");
      }

      function normalizeTitle(value: string | null | undefined): string {
        return (value ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
      }

      function cellTextWithBreaks(cell: Element | null | undefined): string | null {
        if (!cell) {
          return null;
        }

        const html = cell.innerHTML ?? "";
        const fromHtml = html
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/\u00a0/g, " ")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n");

        const text = normalizeText(fromHtml || cell.textContent);
        return text || null;
      }

      function findSectionContent(title: string): Element | null {
        const target = normalizeTitle(title);
        const dividers = Array.from(
          document.querySelectorAll(
            'li[data-role="list-divider"], li.ui-li-divider, .ui-li-divider',
          ),
        );
        const divider = dividers.find((element) => {
          const label = normalizeTitle(element.textContent);
          return label === target || label.includes(target) || target.includes(label);
        });

        if (!divider) {
          return null;
        }

        let sibling = divider.nextElementSibling;
        while (sibling) {
          if (
            sibling.matches("li.ui-li-static, li.ui-li") ||
            sibling.querySelector("table.ui-panelgrid")
          ) {
            return sibling;
          }
          if (sibling.matches('li[data-role="list-divider"], li.ui-li-divider')) {
            break;
          }
          sibling = sibling.nextElementSibling;
        }

        return null;
      }

      function getPrimaryGridcellText(section: Element): string | null {
        // SAT sometimes reports status via a nested PrimeFaces message
        // component (e.g. "DODA no presentado al Mecanismo de Selección
        // Automatizado") instead of plain gridcell text — check that first.
        const messageDetail = section.querySelector(
          ".ui-messages-info-detail, .ui-messages-error-detail, .ui-messages-warn-detail",
        );
        const messageText = cellTextWithBreaks(messageDetail);
        if (messageText) {
          return messageText;
        }

        // The first gridcell in these sections is often an empty spacer row,
        // so scan for the first one that actually has content instead of
        // grabbing whichever matches first.
        const cells = section.querySelectorAll(
          "table.ui-panelgrid.prueba td[role='gridcell'], td[role='gridcell'], .ui-panelgrid td",
        );
        for (const cell of cells) {
          const text = cellTextWithBreaks(cell);
          if (text) {
            return text;
          }
        }

        return null;
      }

      function parseLabelValueRows(section: Element): Record<string, string> {
        const parsed: Record<string, string> = {};

        const rows = section.querySelectorAll(
          "table.ui-panelgrid.prueba tr.ui-widget-content, table.ui-panelgrid tr",
        );
        for (const row of rows) {
          const cells = row.querySelectorAll("td[role='gridcell'], td");
          if (cells.length < 2) {
            continue;
          }

          const labels = normalizeText(cells[0]?.textContent ?? null)
            .split("\n")
            .map((line) => line.replace(/:$/, "").trim())
            .filter(Boolean);
          const values = normalizeText(cells[1]?.textContent ?? null)
            .split("\n")
            .map((line) => line.trim());

          for (let index = 0; index < labels.length; index += 1) {
            parsed[labels[index]!] = values[index] ?? "";
          }
        }

        return parsed;
      }

      function extractStatusFromText(text: string | null): string | null {
        if (!text) {
          return null;
        }

        const starred = text.match(/\*\*\*(.+?)\*\*\*/);
        if (starred?.[1]) {
          return starred[1].trim();
        }

        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        const skipPatterns = [
          /^fecha\b/i,
          /^hora\b/i,
          /^ad\b/i,
          /^aduana\b/i,
          /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/,
        ];

        const candidates = lines.filter(
          (line) => !skipPatterns.some((pattern) => pattern.test(line)),
        );

        const statusLike = candidates.find(
          (line) =>
            line.length >= 6 &&
            /[A-ZÁÉÍÓÚÑ]/.test(line) &&
            /^[A-ZÁÉÍÓÚÑ0-9\s\-_/().,]+$/.test(line),
        );
        if (statusLike) {
          return statusLike;
        }

        return candidates.length > 0
          ? (candidates[candidates.length - 1] ?? null)
          : null;
      }

      const details: Record<string, string> = {};

      const integracionSection = findSectionContent(sectionIntegracion);
      const numeroIntegracion = integracionSection
        ? getPrimaryGridcellText(integracionSection)
        : null;

      if (numeroIntegracion) {
        details[sectionIntegracion] = numeroIntegracion;
      }

      const datosGeneralesSection = findSectionContent(sectionDatosGenerales);
      const datosGeneralesConsultados = datosGeneralesSection
        ? getPrimaryGridcellText(datosGeneralesSection)
        : null;

      if (datosGeneralesConsultados) {
        details[sectionDatosGenerales] = datosGeneralesConsultados;
      }

      const pedimentosSection = findSectionContent(sectionPedimentos);
      if (pedimentosSection) {
        const pedimentoFields = parseLabelValueRows(pedimentosSection);
        for (const [key, value] of Object.entries(pedimentoFields)) {
          if (key && value) {
            details[key] = value;
          }
        }
      }

      let satStatus = extractStatusFromText(datosGeneralesConsultados);
      let satStatusSource: string | null = satStatus
        ? "datos_generales_section"
        : null;

      if (!satStatus) {
        const boldCandidates = Array.from(
          document.querySelectorAll("b, strong, span[style*='font-weight']"),
        )
          .map((element) => normalizeText(element.textContent))
          .filter(Boolean);

        satStatus =
          boldCandidates.find(
            (line) =>
              line.length >= 6 &&
              /[A-ZÁÉÍÓÚÑ]/.test(line) &&
              !/integraci/i.test(line),
          ) ?? null;

        if (satStatus) {
          satStatusSource = "bold_text";
        }
      }

      // Fallback: scan every gridcell on the page (not just the "Datos
      // Generales" section) for a ***STATUS*** marker — covers cases where
      // the section-divider lookup breaks but SAT still emits the marker.
      if (!satStatus) {
        const allGridcells = Array.from(
          document.querySelectorAll("td[role='gridcell'], td"),
        );
        for (const cell of allGridcells) {
          const text = normalizeText(cell.textContent);
          const starred = text.match(/\*\*\*(.+?)\*\*\*/);
          if (starred?.[1]) {
            satStatus = starred[1].trim();
            satStatusSource = "any_gridcell_marker";
            break;
          }
        }
      }

      // Fallback: PrimeFaces message boxes (info/warn/error banners) that
      // SAT sometimes uses instead of the gridcell layout.
      if (!satStatus) {
        const messageEls = Array.from(
          document.querySelectorAll(
            ".ui-messages-info-detail, .ui-messages-error-detail, .ui-messages-warn-detail, .ui-messages-info-summary",
          ),
        );
        for (const el of messageEls) {
          const text = normalizeText(el.textContent);
          if (/desaduanamiento\s+libre/i.test(text)) {
            satStatus = "DESADUANAMIENTO LIBRE";
            satStatusSource = "primefaces_message_box";
            break;
          }
        }
      }

      const bodyText = document.body?.innerText ?? "";
      const foundDesaduanamientoLibreInBody =
        /desaduanamiento\s+libre/i.test(bodyText);
      const foundDodaKeywordInBody = /\bdoda\b/i.test(bodyText);

      // Last resort: if "DESADUANAMIENTO LIBRE" appears anywhere in the
      // rendered page text, treat the DODA as resolved even though none of
      // the structured selectors above matched.
      if (!satStatus && foundDesaduanamientoLibreInBody) {
        satStatus = "DESADUANAMIENTO LIBRE";
        satStatusSource = "body_text_scan";
      }

      function normalizeLabelKey(value: string): string {
        return value
          .normalize("NFD")
          .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
      }

      function findDetailValue(
        source: Record<string, string>,
        label: string,
      ): string | null {
        const target = normalizeLabelKey(label);
        for (const [key, value] of Object.entries(source)) {
          if (normalizeLabelKey(key) === target) {
            return value || null;
          }
        }
        return null;
      }

      const pedimentoInfo = {
        tipoPedimento: findDetailValue(details, "Tipo de Pedimento"),
        pedimento: findDetailValue(details, "Pedimento"),
        remesasPresentadas: findDetailValue(details, "Remesas Presentadas"),
        clavePedimento: findDetailValue(details, "Clave de Pedimento"),
        datosVehiculo: findDetailValue(
          details,
          "Datos de Identificación del Vehículo",
        ),
        cantidadMercancia: findDetailValue(details, "Cantidad de Mercancía"),
      };

      return {
        numeroIntegracion,
        datosGeneralesConsultados,
        satStatus,
        satStatusSource,
        details,
        pedimentoInfo,
        pageTitle: document.title || null,
        bodyText,
        foundDesaduanamientoLibreInBody,
        foundDodaKeywordInBody,
      };
    },
    SECTION_INTEGRACION,
    SECTION_DATOS_GENERALES,
    SECTION_PEDIMENTOS,
  );
}

async function waitForValidatorContent(page: Page): Promise<void> {
  await page.waitForFunction(
    (sectionIntegracion) => {
      const dividers = Array.from(
        document.querySelectorAll(
          'li[data-role="list-divider"], li.ui-li-divider, .ui-li-divider',
        ),
      );
      return dividers.some((element) =>
        (element.textContent ?? "").includes(sectionIntegracion),
      );
    },
    { timeout: CONTENT_TIMEOUT_MS },
    SECTION_INTEGRACION,
  );
}

async function buildFailureOutcome(
  page: Page,
  validatorUrl: string,
  reason: string,
): Promise<SatDodaLookupOutcome> {
  try {
    const artifacts = await saveSatScrapeDebugArtifacts(page, validatorUrl, reason);
    return {
      ok: false,
      reason: formatSatScrapeFailureReason(reason, artifacts),
      validatorUrl,
      debugHtmlPath: artifacts.htmlPath,
      debugScreenshotPath: artifacts.screenshotPath,
    };
  } catch (debugError) {
    console.error("[scrape-sat-doda] failed to save debug artifacts", debugError);
    return {
      ok: false,
      reason,
      validatorUrl,
    };
  }
}

/**
 * Opens the SAT public QR validator and extracts DODA status/details.
 */
export async function scrapeSatDodaStatus(
  validatorUrl: string,
): Promise<SatDodaLookupOutcome> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await launchPuppeteerBrowser();

    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1280, height: 900 });

    console.log("[scrape-sat-doda] navigating", { validatorUrl });

    const response = await page.goto(validatorUrl, {
      waitUntil: "networkidle2",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    await logPageDiagnostics(page, "after navigation", response);

    try {
      await waitForValidatorContent(page);
    } catch (waitError) {
      await logPageDiagnostics(page, "timed out waiting for validator content");
      throw waitError;
    }

    const extracted = await extractSatValidatorData(page);

    console.log("[scrape-sat-doda] extraction result", {
      validatorUrl,
      pageTitle: extracted.pageTitle,
      numeroIntegracion: extracted.numeroIntegracion,
      satStatus: extracted.satStatus,
      satStatusSource: extracted.satStatusSource,
      foundDesaduanamientoLibreInBody: extracted.foundDesaduanamientoLibreInBody,
      foundDodaKeywordInBody: extracted.foundDodaKeywordInBody,
      bodyTextLength: extracted.bodyText.length,
    });

    if (!extracted.numeroIntegracion && !extracted.datosGeneralesConsultados) {
      console.error(
        "[scrape-sat-doda] no expected sections found — full page text below",
        {
          validatorUrl,
          pageTitle: extracted.pageTitle,
          foundDodaKeywordInBody: extracted.foundDodaKeywordInBody,
          bodyText: extracted.bodyText.slice(0, BODY_TEXT_LOG_CAP),
        },
      );
      return buildFailureOutcome(
        page,
        validatorUrl,
        "El SAT cargó la página pero no se encontraron secciones de datos esperadas.",
      );
    }

    const satStatus =
      extracted.satStatus ??
      (extracted.datosGeneralesConsultados
        ? extractSatStatusFromDatosGenerales(extracted.datosGeneralesConsultados)
        : null);

    if (!satStatus) {
      console.error(
        "[scrape-sat-doda] status not found — full page text below",
        {
          validatorUrl,
          pageTitle: extracted.pageTitle,
          numeroIntegracion: extracted.numeroIntegracion,
          datosGeneralesConsultados: extracted.datosGeneralesConsultados,
          foundDesaduanamientoLibreInBody:
            extracted.foundDesaduanamientoLibreInBody,
          foundDodaKeywordInBody: extracted.foundDodaKeywordInBody,
          bodyText: extracted.bodyText.slice(0, BODY_TEXT_LOG_CAP),
        },
      );
      return buildFailureOutcome(
        page,
        validatorUrl,
        "No se pudo identificar el estado del DODA en la respuesta del SAT.",
      );
    }

    return {
      ok: true,
      validatorUrl,
      numeroIntegracion:
        extracted.numeroIntegracion?.trim() ||
        extractIntegrationNumberFromUrl(validatorUrl),
      satStatus,
      details: extracted.details,
      pedimentoInfo: extracted.pedimentoInfo,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al consultar SAT";

    console.error("[scrape-sat-doda] scrape failed", {
      validatorUrl,
      message,
    });

    if (page) {
      await logPageDiagnostics(page, "on error before failure");
      const reason = /timeout/i.test(message)
        ? "Tiempo de espera agotado al cargar el validador del SAT. Requiere revisión manual."
        : message;
      return buildFailureOutcome(page, validatorUrl, reason);
    }

    return {
      ok: false,
      reason: message,
      validatorUrl,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
