import "server-only";

/** Matches @sparticuz/chromium-min@133 — Sparticuz/chromium release v133.0.0. */
export const DEFAULT_CHROMIUM_REMOTE_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";

/**
 * Remote `.tar` of brotli Chromium binaries for @sparticuz/chromium-min.
 * Override in Vercel/local without code changes (name is historical: URL, not a path).
 */
export function getChromiumRemotePackUrl(): string {
  const fromEnv = process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim();
  return fromEnv || DEFAULT_CHROMIUM_REMOTE_PACK_URL;
}
