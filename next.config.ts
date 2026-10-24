import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

function appReleaseFromFile(): string {
  if (process.env.NEXT_PUBLIC_APP_RELEASE) {
    return process.env.NEXT_PUBLIC_APP_RELEASE;
  }
  try {
    const filePath = path.join(process.cwd(), "app-version.json");
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      major?: number;
      minor?: number;
    };
    const major = Number(parsed.major);
    const minor = Number(parsed.minor);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) {
      return "0";
    }
    if (minor === 0) {
      return String(major);
    }
    return `${major}.${minor}`;
  } catch {
    return "0";
  }
}

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const sharpTraceIncludes = [
  "./node_modules/@img/**/*",
  "./node_modules/sharp/**/*",
] as const;

const pdfJsTraceIncludes = [
  "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  "./node_modules/pdfjs-dist/standard_fonts/**/*",
  "./node_modules/pdfjs-dist/cmaps/**/*",
] as const;

/** QR + PDF lookup (sharp, pdfjs, puppeteer-min). */
const dodaApiTraceIncludes = [
  ...sharpTraceIncludes,
  ...pdfJsTraceIncludes,
  "./node_modules/@sparticuz/chromium-min/**/*",
  "./node_modules/puppeteer-core/**/*",
  "./node_modules/@puppeteer/browsers/**/*",
] as const;

/** SAT scrape only — Chromium se descarga en runtime (pack remoto). */
const dodaPuppeteerTraceIncludes = [
  "./node_modules/@sparticuz/chromium-min/**/*",
  "./node_modules/puppeteer-core/**/*",
  "./node_modules/@puppeteer/browsers/**/*",
] as const;

const puppeteerRouteExcludes = [
  "./node_modules/@sparticuz/chromium/**",
  "./node_modules/sharp/**",
  "./node_modules/@img/**",
  "./node_modules/pdfjs-dist/**",
  "./node_modules/@napi-rs/canvas/**",
] as const;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_RELEASE: appReleaseFromFile(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    proxyClientMaxBodySize: "25mb",
  },
  turbopack: {},
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-linuxmusl-x64",
    "@img/sharp-libvips-linux-x64",
    "@img/sharp-libvips-linuxmusl-x64",
    "@sparticuz/chromium-min",
    "puppeteer-core",
    "@napi-rs/canvas",
    "pdfjs-dist",
    "jsqr",
    "resend",
  ],
  outputFileTracingIncludes: {
    "/api/doda/lookup": [...dodaApiTraceIncludes],
    "/api/doda/lookup-by-number": [...dodaPuppeteerTraceIncludes],
    "/api/doda/schedule": [...dodaApiTraceIncludes],
    "/api/doda/cron": [...dodaPuppeteerTraceIncludes],
    "/api/doda/[id]/retry": [...dodaPuppeteerTraceIncludes],
    "/api/doda/[id]/check-now": [...dodaPuppeteerTraceIncludes],
    "/api/cron/check-dodas": [...dodaPuppeteerTraceIncludes],
    "/api/whatsapp/webhook": [...dodaApiTraceIncludes],
  },
  outputFileTracingExcludes: {
    "/api/doda/lookup-by-number": [...puppeteerRouteExcludes],
    "/api/doda/cron": [...puppeteerRouteExcludes],
    "/api/doda/[id]/retry": [...puppeteerRouteExcludes],
    "/api/doda/[id]/check-now": [...puppeteerRouteExcludes],
    "/api/cron/check-dodas": [...puppeteerRouteExcludes],
  },
};

export default withPWA(nextConfig as any);

