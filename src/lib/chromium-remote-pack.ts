/** Pack tar descargado en runtime (no va en el bundle de la función). */
export const DEFAULT_CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";

type ChromiumMin = {
  executablePath: (input?: string) => Promise<string>;
};

export async function resolveChromiumExecutablePath(
  chromium: ChromiumMin,
): Promise<string> {
  const remote =
    process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim() || DEFAULT_CHROMIUM_PACK_URL;
  return chromium.executablePath(remote);
}
