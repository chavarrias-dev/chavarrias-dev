/** Número de release (commits en git al momento del build). */
export const APP_RELEASE_NUMBER = Number(
  process.env.NEXT_PUBLIC_APP_RELEASE ?? "0",
);

export function formatAppReleaseLabel(): string {
  if (!APP_RELEASE_NUMBER || Number.isNaN(APP_RELEASE_NUMBER)) {
    return "v?";
  }
  return `v${APP_RELEASE_NUMBER}`;
}
