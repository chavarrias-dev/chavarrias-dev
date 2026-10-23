import { execSync } from "node:child_process";
import {
  formatAppVersionLabel,
  incrementAppVersion,
  readAppVersion,
  writeAppVersion,
} from "./app-version.mjs";

const pushArgs = process.argv.slice(2).join(" ");

const next = incrementAppVersion(readAppVersion());
writeAppVersion(next);
console.log(`Versión → ${formatAppVersionLabel(next)}`);

execSync("git add app-version.json", { stdio: "inherit" });

try {
  execSync("git diff --cached --quiet -- app-version.json", { stdio: "ignore" });
} catch {
  execSync('git commit -m "chore: bump app version"', { stdio: "inherit" });
}

const pushCmd = pushArgs ? `git push ${pushArgs}` : "git push";
execSync(pushCmd, { stdio: "inherit", shell: true });
