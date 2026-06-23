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
 * Launches Puppeteer with @sparticuz/chromium on Vercel, or local Chrome via puppeteer-core.
 */
export async function launchPuppeteerBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  if (isVercelRuntime()) {
    const chromium = (await import("@sparticuz/chromium")).default;

    chromium.setGraphicsMode = false;

    return puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  return puppeteer.default.launch({
    headless: true,
    args: [...LOCAL_LAUNCH_ARGS],
    channel: "chrome",
  });
}
