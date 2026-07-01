import type { NextConfig } from "next";

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

const dodaApiTraceIncludes = [
  ...sharpTraceIncludes,
  ...pdfJsTraceIncludes,
  "./node_modules/@sparticuz/chromium/**/*",
  "./node_modules/puppeteer-core/**/*",
] as const;

/** Cron + lookup-by-number: Puppeteer only (no sharp/pdfjs). */
const dodaPuppeteerTraceIncludes = [
  "./node_modules/@sparticuz/chromium/**/*",
  "./node_modules/puppeteer-core/**/*",
] as const;

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-linuxmusl-x64",
    "@img/sharp-libvips-linux-x64",
    "@img/sharp-libvips-linuxmusl-x64",
    "@sparticuz/chromium",
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
    "/api/cron/check-dodas": [...dodaPuppeteerTraceIncludes],
    "/api/whatsapp/webhook": [...dodaApiTraceIncludes],
  },
};

export default nextConfig;
