/** Versión visible (ej. 15.1, 16) embebida en build desde app-version.json */
export const APP_RELEASE_RAW = process.env.NEXT_PUBLIC_APP_RELEASE ?? "";

export function formatAppReleaseLabel(): string {
  const raw = APP_RELEASE_RAW.trim();
  if (!raw || raw === "0") {
    return "v?";
  }
  return raw.startsWith("v") ? raw : `v${raw}`;
}
