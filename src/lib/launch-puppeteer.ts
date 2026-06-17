import "server-only";

import type { Browser } from "puppeteer-core";

const LOCAL_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
] as const;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Launches Puppeteer with Chromium bundled locally, or @sparticuz/chromium on Vercel.
 */
export async function launchPuppeteerBrowser(): Promise<Browser> {
  if (isVercelRuntime()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");

    chromium.setGraphicsMode = false;

    return puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: [...LOCAL_LAUNCH_ARGS],
  });
}
