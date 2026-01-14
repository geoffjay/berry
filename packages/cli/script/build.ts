#!/usr/bin/env bun

import path from "path";
import { $ } from "bun";
import { fileURLToPath } from "url";
import { Script } from "@berry/script";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, "..");

process.chdir(dir);

import rootPkg from "../../../package.json";

// Use @hlfbkd scope for npm publishing (internal packages remain @berry/*)
const mainPackageName = "@hlfbkd/berry";

const singleFlag = process.argv.includes("--single");
const baselineFlag = process.argv.includes("--baseline");
const skipInstall = process.argv.includes("--skip-install");

const allTargets: {
  os: string;
  arch: "arm64" | "x64";
  abi?: "musl";
  avx2?: false;
}[] = [
  // {
  //   os: "linux",
  //   arch: "arm64",
  // },
  // {
  //   os: "linux",
  //   arch: "x64",
  // },
  // {
  //   os: "linux",
  //   arch: "x64",
  //   avx2: false,
  // },
  // {
  //   os: "linux",
  //   arch: "arm64",
  //   abi: "musl",
  // },
  // {
  //   os: "linux",
  //   arch: "x64",
  //   abi: "musl",
  // },
  // {
  //   os: "linux",
  //   arch: "x64",
  //   abi: "musl",
  //   avx2: false,
  // },
  {
    os: "darwin",
    arch: "arm64",
  },
  {
    os: "darwin",
    arch: "x64",
  },
  {
    os: "darwin",
    arch: "x64",
    avx2: false,
  },
];

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) {
        return false;
      }

      // When building for the current platform, prefer a single native binary by default.
      // Baseline binaries require additional Bun artifacts and can be flaky to download.
      if (item.avx2 === false) {
        return baselineFlag;
      }

      return true;
    })
  : allTargets;

await $`rm -rf dist`;

const binaries: Record<string, string> = {};
if (!skipInstall) {
  await $`bun install --os="*" --cpu="*" @parcel/watcher@${rootPkg.dependencies["@parcel/watcher"]}`;
}
for (const item of targets) {
  const name = [
    mainPackageName,
    item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.abi === undefined ? undefined : item.abi,
  ]
    .filter(Boolean)
    .join("-");
  console.log(`building ${name}`);
  await $`mkdir -p dist/${name}/bin`;

  await Bun.build({
    tsconfig: "./tsconfig.json",
    minify: true,
    define: {
      "process.env.BERRY_VERSION": JSON.stringify(Script.version),
    },
    compile: {
      target: name.replace(mainPackageName, "bun") as any,
      outfile: `dist/${name}/bin/berry`,
      autoloadPackageJson: true,
    },
    entrypoints: ["./src/cli.ts"],
  });

  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version: Script.version,
        os: [item.os],
        cpu: [item.arch],
        repository: {
          type: "git",
          url: "https://github.com/geoffjay/berry.git",
        },
      },
      null,
      2
    )
  );
  binaries[name] = Script.version;

  // Create release archive (replace / with - for GitHub release filename compatibility)
  const archiveName = name.replace("/", "-");
  console.log(`packaging ${archiveName}.tar.gz`);
  await $`tar -czf dist/${archiveName}.tar.gz -C dist/${name} bin package.json`;
}

// Generate the main berry-cli package
console.log(`building ${mainPackageName} (main package)`);
await $`mkdir -p dist/${mainPackageName}/bin`;

// Build optionalDependencies from all targets (not just the ones we built)
const optionalDependencies: Record<string, string> = {};
for (const item of allTargets) {
  const name = [
    mainPackageName,
    item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.abi === undefined ? undefined : item.abi,
  ]
    .filter(Boolean)
    .join("-");
  optionalDependencies[name] = Script.version;
}

// Create the platform detection wrapper script
const wrapperScript = `#!/usr/bin/env node
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const platform = process.platform;
const arch = process.arch;

// Map Node.js arch names to package names
const archMap = { x64: "x64", arm64: "arm64" };
const osMap = { darwin: "darwin", linux: "linux", win32: "windows" };

const mappedOs = osMap[platform];
const mappedArch = archMap[arch];

if (!mappedOs || !mappedArch) {
  console.error(\`Unsupported platform: \${platform}-\${arch}\`);
  process.exit(1);
}

// Try to find the platform-specific package
const variants = [
  \`@hlfbkd/berry-\${mappedOs}-\${mappedArch}\`,
  \`@hlfbkd/berry-\${mappedOs}-\${mappedArch}-baseline\`,
];

let binaryPath = null;

for (const variant of variants) {
  try {
    const pkgPath = require.resolve(\`\${variant}/package.json\`);
    const pkgDir = path.dirname(pkgPath);
    const candidate = path.join(pkgDir, "bin", "berry");
    if (fs.existsSync(candidate)) {
      binaryPath = candidate;
      break;
    }
  } catch {
    // Package not installed, try next variant
  }
}

if (!binaryPath) {
  console.error(\`Could not find berry binary for \${platform}-\${arch}\`);
  console.error("Please try reinstalling: npm install -g @hlfbkd/berry");
  process.exit(1);
}

// Execute the binary with all arguments
try {
  execFileSync(binaryPath, process.argv.slice(2), { stdio: "inherit" });
} catch (error) {
  process.exit(error.status || 1);
}
`;

await Bun.file(`dist/${mainPackageName}/bin/berry.js`).write(wrapperScript);

// Create the main package.json
await Bun.file(`dist/${mainPackageName}/package.json`).write(
  JSON.stringify(
    {
      name: mainPackageName,
      version: Script.version,
      description: "Berry CLI - A tool for managing your development environment",
      bin: {
        berry: "./bin/berry.js",
      },
      optionalDependencies,
      repository: {
        type: "git",
        url: "https://github.com/geoffjay/berry.git",
      },
      license: "MIT",
      engines: {
        node: ">=18",
      },
    },
    null,
    2
  )
);

console.log(`packaging ${mainPackageName}.tar.gz`);
await $`tar -czf dist/${mainPackageName}.tar.gz -C dist/${mainPackageName} bin package.json`;

export { binaries };
