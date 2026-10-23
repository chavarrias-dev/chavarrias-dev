import {
  formatAppVersionLabel,
  incrementAppVersion,
  readAppVersion,
  writeAppVersion,
} from "./app-version.mjs";

const mode = process.argv[2] ?? "read";

if (mode === "read") {
  console.log(formatAppVersionLabel(readAppVersion()));
  process.exit(0);
}

if (mode === "bump") {
  const current = readAppVersion();
  const next = incrementAppVersion(current);
  writeAppVersion(next);
  console.log(formatAppVersionLabel(next));
  process.exit(0);
}

console.error("Uso: node scripts/bump-app-version.mjs [read|bump]");
process.exit(1);
