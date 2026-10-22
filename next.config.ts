import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

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

const dodaApiTraceIncludes = [
  ...sharpTraceIncludes,
  ...pdfJsTraceIncludes,
  "./node_modules/puppeteer-core/**/*",
  "./node_modules/@sparticuz/chromium-min/**/*",
] as const;

/** Cron + lookup-by-number: Puppeteer only (no sharp/pdfjs). Chromium binary is fetched at runtime. */
const dodaPuppeteerTraceIncludes = [
  "./node_modules/puppeteer-core/**/*",
  "./node_modules/@sparticuz/chromium-min/**/*",
] as const;

const nextConfig: NextConfig = {
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
    "/api/cron/check-dodas": [...dodaPuppeteerTraceIncludes],
    "/api/whatsapp/webhook": [...dodaApiTraceIncludes],
  },
};

export default withPWA(nextConfig as any);

