import "server-only";

import type { Browser } from "puppeteer-core";
import { resolveChromiumExecutablePath } from "@/lib/chromium-remote-pack";

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
 * Vercel: @sparticuz/chromium-min + pack remoto (Functions Storage bajo).
 * Local: Chrome instalado vía puppeteer-core channel.
 */
export async function launchPuppeteerBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  if (isVercelRuntime()) {
    const chromium = (await import("@sparticuz/chromium-min")).default;

    chromium.setGraphicsMode = false;

    const executablePath = await resolveChromiumExecutablePath(chromium);

    return puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  }

  return puppeteer.default.launch({
    headless: true,
    args: [...LOCAL_LAUNCH_ARGS],
    channel: "chrome",
  });
}
