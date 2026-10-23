import fs from "node:fs";
import path from "node:path";

export const VERSION_FILE = path.join(process.cwd(), "app-version.json");

/** @typedef {{ major: number; minor: number }} AppVersion */

/** @returns {AppVersion} */
export function readAppVersion() {
  const raw = fs.readFileSync(VERSION_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const major = Number(parsed.major);
  const minor = Number(parsed.minor);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    throw new Error("app-version.json inválido");
  }
  return { major, minor };
}

/** @param {AppVersion} version */
export function writeAppVersion(version) {
  fs.writeFileSync(
    VERSION_FILE,
    `${JSON.stringify(version, null, 2)}\n`,
    "utf8",
  );
}

/** @param {AppVersion} version */
export function formatAppVersion(version) {
  if (version.minor === 0) {
    return String(version.major);
  }
  return `${version.major}.${version.minor}`;
}

/** @param {AppVersion} version */
export function formatAppVersionLabel(version) {
  return `v${formatAppVersion(version)}`;
}

/**
 * 15.1 → … → 15.9 → 16 → 16.1 → … → 16.9 → 17 → …
 * @param {AppVersion} version
 * @returns {AppVersion}
 */
export function incrementAppVersion(version) {
  if (version.minor === 0) {
    return { major: version.major, minor: 1 };
  }
  if (version.minor >= 1 && version.minor < 9) {
    return { major: version.major, minor: version.minor + 1 };
  }
  if (version.minor === 9) {
    return { major: version.major + 1, minor: 0 };
  }
  return { major: version.major, minor: 1 };
}
