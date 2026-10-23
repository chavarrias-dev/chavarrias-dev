import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

function gitReleaseNumber(): string {
  if (process.env.NEXT_PUBLIC_APP_RELEASE) {
    return process.env.NEXT_PUBLIC_APP_RELEASE;
  }
  try {
    const count = execSync("git rev-list --count HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return count || "0";
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
  env: {
    NEXT_PUBLIC_APP_RELEASE: gitReleaseNumber(),
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

export default withPWA(nextConfig as any);

