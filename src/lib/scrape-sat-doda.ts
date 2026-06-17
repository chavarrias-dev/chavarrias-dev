import "server-only";

import puppeteer, { type Browser, type Page } from "puppeteer";
import type { SatDodaDetails, SatDodaLookupOutcome } from "@/lib/doda-types";
import { extractIntegrationNumberFromUrl } from "@/lib/doda-sat-details";

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

  return lines.length > 0 ? (lines[lines.length - 1] ?? null) : null;
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

      function findSectionContent(title: string): Element | null {
        const dividers = Array.from(
          document.querySelectorAll('li[data-role="list-divider"], li.ui-li-divider'),
        );
        const divider = dividers.find(
          (element) => normalizeText(element.textContent) === title,
        );
        if (!divider) {
          return null;
        }

        const contentLi = divider.nextElementSibling;
        if (!contentLi || !contentLi.classList.contains("ui-li-static")) {
          return null;
        }

        return contentLi;
      }

      function getPrimaryGridcellText(section: Element): string | null {
        const cell = section.querySelector(
          "table.ui-panelgrid.prueba td[role='gridcell']",
        );
        const text = normalizeText(cell?.textContent ?? null);
        return text || null;
      }

      function parseLabelValueRows(section: Element): Record<string, string> {
        const parsed: Record<string, string> = {};

        const rows = section.querySelectorAll("table.ui-panelgrid.prueba tr.ui-widget-content");
        for (const row of rows) {
          const cells = row.querySelectorAll("td[role='gridcell']");
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

      let satStatus: string | null = null;
      if (datosGeneralesConsultados) {
        const starred = datosGeneralesConsultados.match(/\*\*\*(.+?)\*\*\*/);
        if (starred?.[1]) {
          satStatus = starred[1].trim();
        } else {
          const lines = datosGeneralesConsultados.split("\n").filter(Boolean);
          satStatus = lines.length > 0 ? (lines[lines.length - 1] ?? null) : null;
        }
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
        document.querySelectorAll('li[data-role="list-divider"], li.ui-li-divider'),
      );
      return dividers.some((element) =>
        (element.textContent ?? "").includes(sectionIntegracion),
      );
    },
    { timeout: CONTENT_TIMEOUT_MS },
    SECTION_INTEGRACION,
  );
}

/**
 * Opens the SAT public QR validator and extracts DODA status/details.
 */
export async function scrapeSatDodaStatus(
  validatorUrl: string,
): Promise<SatDodaLookupOutcome> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
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
      return {
        ok: false,
        reason:
          "El SAT cargó la página pero no se encontraron secciones de datos esperadas.",
        validatorUrl,
      };
    }

    const satStatus =
      extracted.satStatus ??
      (extracted.datosGeneralesConsultados
        ? extractSatStatusFromDatosGenerales(extracted.datosGeneralesConsultados)
        : null);

    if (!satStatus) {
      return {
        ok: false,
        reason:
          "No se pudo identificar el estado del DODA en la respuesta del SAT.",
        validatorUrl,
      };
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

    if (/timeout/i.test(message)) {
      return {
        ok: false,
        reason:
          "Tiempo de espera agotado al cargar el validador del SAT. Requiere revisión manual.",
        validatorUrl,
      };
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
