import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 15+ stable key (replaces experimental.serverComponentsExternalPackages).
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-linuxmusl-x64",
    "puppeteer",
    "@napi-rs/canvas",
    "pdfjs-dist",
    "jsqr",
  ],
};

export default nextConfig;
