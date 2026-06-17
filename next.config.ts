import type { NextConfig } from "next";

const sharpTraceIncludes = [
  "./node_modules/@img/**/*",
  "./node_modules/sharp/**/*",
] as const;

const nextConfig: NextConfig = {
  // Next.js 15+ stable key (replaces experimental.serverComponentsExternalPackages).
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-linuxmusl-x64",
    "@img/sharp-libvips-linux-x64",
    "@img/sharp-libvips-linuxmusl-x64",
    "@sparticuz/chromium",
    "puppeteer-core",
    "puppeteer",
    "@napi-rs/canvas",
    "pdfjs-dist",
    "jsqr",
  ],
  // Ensure native sharp/libvips binaries are bundled into serverless functions.
  outputFileTracingIncludes: {
    "/api/doda/lookup": [...sharpTraceIncludes],
    "/api/whatsapp/webhook": [
      ...sharpTraceIncludes,
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

export default nextConfig;
