import { $ } from "bun";
import path from "path";

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json");
const rootPkg = await Bun.file(rootPkgPath).json();
const expectedBunVersion = rootPkg.packageManager?.split("@")[1];

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json");
}

if (process.versions.bun !== expectedBunVersion) {
  throw new Error(
    `This script requires bun@${expectedBunVersion}, but you are using bun@${process.versions.bun}`
  );
}

const env = {
  BERRY_CHANNEL: process.env["BERRY_CHANNEL"],
  BERRY_BUMP: process.env["BERRY_BUMP"],
  BERRY_VERSION: process.env["BERRY_VERSION"],
};
const CHANNEL = await (async () => {
  if (env.BERRY_CHANNEL) return env.BERRY_CHANNEL;
  if (env.BERRY_BUMP) return "latest";
  if (env.BERRY_VERSION && !env.BERRY_VERSION.startsWith("0.0.0-")) return "latest";
  return await $`git branch --show-current`.text().then((x) => x.trim());
})();
const IS_PREVIEW = CHANNEL !== "latest";

const VERSION = await (async () => {
  if (env.BERRY_VERSION) return env.BERRY_VERSION;
  if (IS_PREVIEW)
    return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
  // For release builds, read version from packages/cli/package.json (managed by changesets)
  const cliPkgPath = path.resolve(import.meta.dir, "../../cli/package.json");
  const cliPkg = await Bun.file(cliPkgPath).json();
  return cliPkg.version;
})();

export const Script = {
  get channel() {
    return CHANNEL;
  },
  get version() {
    return VERSION;
  },
  get preview() {
    return IS_PREVIEW;
  },
};
console.log(`berry script`, JSON.stringify(Script, null, 2));
