import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer",
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-linuxmusl-x64",
    "@napi-rs/canvas",
    "pdfjs-dist",
    "jsqr",
  ],
};

export default nextConfig;
