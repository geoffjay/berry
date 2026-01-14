#!/usr/bin/env bun

/**
 * Publish script for @hlfbkd/berry packages
 *
 * This script publishes the built packages from the dist/ folder to npm.
 * It's designed to be called after `bun run build` has created the dist packages.
 *
 * Usage:
 *   bun run scripts/publish.ts              # CI mode (uses NPM_TOKEN)
 *   bun run scripts/publish.ts --otp=123456 # Manual mode with 2FA
 */

import { $ } from "bun";
import { readdir, stat } from "fs/promises";
import path from "path";

// Parse --otp argument
const otpArg = process.argv.find((arg) => arg.startsWith("--otp="));
const otp = otpArg?.split("=")[1];

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
    const otpFlag = otp ? `--otp=${otp}` : "";
    await $`npm publish ${pkgDir} --access public ${otpFlag}`.quiet();
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
