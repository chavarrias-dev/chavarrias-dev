import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "puppeteer-core";

const DEBUG_DIR = path.join(process.cwd(), "tmp", "doda-debug");

export type SatScrapeDebugArtifacts = {
  basename: string;
  htmlPath: string;
  screenshotPath: string;
};

function buildDebugBasename(validatorUrl: string, reason: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  let suffix = "capture";

  try {
    const d3 = new URL(validatorUrl).searchParams.get("D3");
    if (d3?.trim()) {
      suffix = d3.trim();
    }
  } catch {
    // keep default suffix
  }

  const reasonSlug = reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `sat-${suffix}-${reasonSlug || "failed"}-${timestamp}`;
}

export async function saveSatScrapeDebugArtifacts(
  page: Page,
  validatorUrl: string,
  reason: string,
): Promise<SatScrapeDebugArtifacts> {
  await mkdir(DEBUG_DIR, { recursive: true });

  const basename = buildDebugBasename(validatorUrl, reason);
  const htmlPath = path.join(DEBUG_DIR, `${basename}.html`);
  const screenshotPath = path.join(DEBUG_DIR, `${basename}.png`);

  const html = await page.content();
  await writeFile(htmlPath, html, "utf8");

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    type: "png",
  });

  return { basename, htmlPath, screenshotPath };
}

export function formatSatScrapeFailureReason(
  reason: string,
  artifacts: SatScrapeDebugArtifacts,
): string {
  return `${reason} Debug: ${artifacts.htmlPath} | ${artifacts.screenshotPath}`;
}
