import "server-only";

import type { Browser, Page } from "puppeteer-core";
import type { SatDodaDetails, SatDodaLookupOutcome } from "@/lib/doda-types";
import { extractIntegrationNumberFromUrl } from "@/lib/doda-sat-details";
import { launchPuppeteerBrowser } from "@/lib/launch-puppeteer";
import {
  formatSatScrapeFailureReason,
  saveSatScrapeDebugArtifacts,
} from "@/lib/sat-scrape-debug";

const NAVIGATION_TIMEOUT_MS = 60_000;
const CONTENT_TIMEOUT_MS = 45_000;

const SECTION_INTEGRACION = "Número de Integración";
const SECTION_DATOS_GENERALES = "Datos Generales Consultados";
const SECTION_PEDIMENTOS = "Información de Pedimento(s)";

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
  details: SatDodaDetails;
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
        const cell =
          section.querySelector("table.ui-panelgrid.prueba td[role='gridcell']") ??
          section.querySelector("td[role='gridcell']") ??
          section.querySelector(".ui-panelgrid td");
        return cellTextWithBreaks(cell);
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
      }

      return {
        numeroIntegracion,
        datosGeneralesConsultados,
        satStatus,
        details,
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

    await page.goto(validatorUrl, {
      waitUntil: "networkidle2",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    await waitForValidatorContent(page);

    const extracted = await extractSatValidatorData(page);

    if (!extracted.numeroIntegracion && !extracted.datosGeneralesConsultados) {
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
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al consultar SAT";

    if (page) {
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
