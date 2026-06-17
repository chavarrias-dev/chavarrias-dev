import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer",
    "sharp",
    "@napi-rs/canvas",
    "pdfjs-dist",
  ],
};

export default nextConfig;
