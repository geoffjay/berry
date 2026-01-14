#!/usr/bin/env bun

/**
 * Publish script for @hlfbkd/berry packages
 *
 * This script publishes the built packages from the dist/ folder to npm.
 * It's designed to be called after `bun run build` has created the dist packages.
 *
 * Authentication:
 *   - CI: Uses NPM_TOKEN environment variable or OIDC trusted publishing
 *   - Local: Run `npm login` first, or set NPM_TOKEN
 */

import { $ } from "bun";
import { readdir, stat, writeFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

// Configure npm auth if NPM_TOKEN is set
const npmToken = process.env.NPM_TOKEN;
if (npmToken) {
  const npmrcPath = path.join(homedir(), ".npmrc");
  const authLine = `//registry.npmjs.org/:_authToken=${npmToken}`;

  // Read existing .npmrc and replace/add auth token
  const existingContent = await Bun.file(npmrcPath).text().catch(() => "");
  const lines = existingContent.split("\n").filter((line) => {
    // Remove any existing registry auth lines
    return !line.includes("registry.npmjs.org/:_authToken");
  });
  lines.push(authLine);
  await writeFile(npmrcPath, lines.filter(Boolean).join("\n") + "\n");
  console.log("Configured npm authentication from NPM_TOKEN\n");
}

const distDir = path.resolve(import.meta.dir, "../packages/cli/dist");
const scopeDir = path.join(distDir, "@hlfbkd");

// Check if dist directory exists
const scopeExists = await stat(scopeDir).then(() => true).catch(() => false);
if (!scopeExists) {
  console.error("Error: dist/@hlfbkd/ directory not found. Run 'bun run build' first.");
  process.exit(1);
}

// Find all package directories in dist/@hlfbkd/
const entries = await readdir(scopeDir, { withFileTypes: true });
const packageDirs = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => `@hlfbkd/${entry.name}`);

if (packageDirs.length === 0) {
  console.error("Error: No packages found in dist/@hlfbkd/");
  process.exit(1);
}

console.log(`Found ${packageDirs.length} packages to publish:`);
packageDirs.forEach((pkg) => console.log(`  - ${pkg}`));
console.log();

// Publish each package
for (const pkgName of packageDirs) {
  const pkgDir = path.join(distDir, pkgName);
  console.log(`Publishing ${pkgName}...`);

  try {
    // Use --provenance in CI for OIDC trusted publishing
    const isCI = process.env.CI === "true";
    const provenanceFlag = isCI ? "--provenance" : "";
    await $`npm publish ${pkgDir} --access public ${provenanceFlag}`.quiet();
    console.log(`  ✓ Published ${pkgName}`);
  } catch (error: any) {
    // Check if it's a "already exists" error (which is fine for re-runs)
    if (error.stderr?.includes("cannot publish over the previously published versions")) {
      console.log(`  ⊘ ${pkgName} already published at this version`);
    } else {
      console.error(`  ✗ Failed to publish ${pkgName}`);
      console.error(`    ${error.stderr || error.message}`);
      process.exit(1);
    }
  }
}

console.log();
console.log("✓ All packages published successfully!");
