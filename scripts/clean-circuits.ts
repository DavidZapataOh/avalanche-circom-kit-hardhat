#!/usr/bin/env node

/**
 * Clean circuit build artifacts
 * Usage: npm run circuits:clean
 */

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const BUILD_DIR = join(process.cwd(), "circuits", "build");
const VERIFIERS_DIR = join(process.cwd(), "contracts", "verifiers");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function main() {
  log("🧹 Cleaning circuit build artifacts...\n", colors.blue);

  let cleaned = false;

  if (existsSync(BUILD_DIR)) {
    log(`   Removing ${BUILD_DIR}...`, colors.yellow);
    rmSync(BUILD_DIR, { recursive: true, force: true });
    cleaned = true;
  }

  if (existsSync(VERIFIERS_DIR)) {
    log(`   Removing ${VERIFIERS_DIR}...`, colors.yellow);
    rmSync(VERIFIERS_DIR, { recursive: true, force: true });
    cleaned = true;
  }

  if (cleaned) {
    log("\n✨ Build artifacts cleaned successfully!", colors.green);
  } else {
    log("✅ No build artifacts to clean", colors.green);
  }
}

main();

