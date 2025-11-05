#!/usr/bin/env node

/**
 * Compile all Circom circuits
 * Usage: 
 *   npm run circuits:compile       # Development mode (pot8)
 *   npm run circuits:compile --prod # Production mode (pot14)
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const CIRCUITS_DIR = join(process.cwd(), "circuits");
const BUILD_DIR = join(CIRCUITS_DIR, "build");

// Parse command line arguments
const args = process.argv.slice(2);
const isProd = args.includes("--prod") || args.includes("--production");
const PTAU_SIZE = isProd ? 14 : 8; // Use pot14 for production, pot8 for development

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command: string, args: string[], cwd?: string): void {
  let useShell = false;
  let executable = command;

  if (command === "pnpm") {
    if (process.platform === "win32") {
      useShell = true;
    }
  }

  const result = spawnSync(executable, args, {
    stdio: "inherit",
    cwd: cwd || process.cwd(),
    shell: useShell,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command "${command}" exited with code ${result.status}`);
  }
}

function findCircom2(): string | null {
  const possiblePaths = [
    join(process.cwd(), "node_modules", "circom2", "cli.js"),
    join(process.cwd(), "node_modules", ".bin", "circom2"),
  ];

  // Check pnpm's nested structure
  try {
    const pnpmDir = join(process.cwd(), "node_modules", ".pnpm");
    if (existsSync(pnpmDir)) {
      const entries = readdirSync(pnpmDir);
      for (const entry of entries) {
        if (entry.startsWith("circom2@")) {
          const candidatePath = join(pnpmDir, entry, "node_modules", "circom2", "cli.js");
          if (existsSync(candidatePath)) {
            possiblePaths.unshift(candidatePath);
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function compileCircuit(circuitFile: string): void {
  const circuitName = circuitFile.replace(".circom", "");
  log(`\n📝 Compiling ${circuitName}...`, colors.blue);

  const circom2Path = findCircom2();
  if (!circom2Path) {
    throw new Error("circom2 not found. Install it with: pnpm add -D circom2");
  }

  const circom2RelativePath = relative(CIRCUITS_DIR, circom2Path);

  if (circom2Path.endsWith("cli.js")) {
    const result = spawnSync("node", [
      circom2RelativePath,
      circuitFile,
      "--r1cs",
      "--wasm",
      "--sym",
      "-o",
      "build",
    ], {
      stdio: "inherit",
      cwd: CIRCUITS_DIR,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`circom2 exited with code ${result.status}`);
    }
  } else {
    const result = spawnSync(circom2RelativePath, [
      circuitFile,
      "--r1cs",
      "--wasm",
      "--sym",
      "-o",
      "build",
    ], {
      stdio: "inherit",
      cwd: CIRCUITS_DIR,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`circom2 exited with code ${result.status}`);
    }
  }

  log(`✅ Compiled ${circuitName}`, colors.green);
}

function generateTrustedSetup(circuitName: string, ptauSize: number): void {
  log(`\n🔐 Generating trusted setup for ${circuitName}...`, colors.blue);
  log(`   Using Powers of Tau size: ${ptauSize} ${isProd ? "(PRODUCTION)" : "(DEVELOPMENT)"}`, colors.yellow);

  const ptauPath = join(BUILD_DIR, `pot${ptauSize}_0000.ptau`);
  const ptauPreparedPath = join(BUILD_DIR, `pot${ptauSize}_0000_final.ptau`);
  const r1csPath = join(BUILD_DIR, `${circuitName}.r1cs`);
  const zkeyPath = join(BUILD_DIR, `${circuitName}.zkey`);

  if (!existsSync(ptauPreparedPath)) {
    if (!existsSync(ptauPath)) {
      log(`   Generating powers of tau (pot${ptauSize})...`, colors.yellow);
      if (isProd) {
        log(`   ⚠️  WARNING: Generating pot${ptauSize} takes significant time and memory.`, colors.yellow);
        log(`   💡 Consider using pre-generated files from a trusted ceremony instead.`, colors.yellow);
      }
      runCommand("pnpm", ["exec", "snarkjs", "powersoftau", "new", "bn128", String(ptauSize), ptauPath, "-v"]);
    }

    log("   Preparing powers of tau for phase2...", colors.yellow);
    runCommand("pnpm", ["exec", "snarkjs", "powersoftau", "prepare", "phase2", ptauPath, ptauPreparedPath, "-v"]);
  }

  log("   Generating zkey...", colors.yellow);
  runCommand("pnpm", ["exec", "snarkjs", "groth16", "setup", r1csPath, ptauPreparedPath, zkeyPath]);

  log(`✅ Generated trusted setup for ${circuitName}`, colors.green);
}

function main() {
  const mode = isProd ? "PRODUCTION" : "DEVELOPMENT";
  log(`🚀 Compiling Circom circuits (${mode} mode)...\n`, colors.blue);
  
  if (isProd) {
    log(`   ⚠️  Production mode: Using pot${PTAU_SIZE} (secure but slower)\n`, colors.yellow);
  } else {
    log(`   💡 Development mode: Using pot${PTAU_SIZE} (fast for local testing)\n`, colors.blue);
    log(`   💡 Use --prod flag for production builds\n`, colors.blue);
  }

  // Create build directory if it doesn't exist
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Find all .circom files
  const files = readdirSync(CIRCUITS_DIR);
  const circuitFiles = files.filter(f => f.endsWith(".circom"));

  if (circuitFiles.length === 0) {
    log("⚠️  No circuits found in circuits/ directory", colors.yellow);
    return;
  }

  log(`Found ${circuitFiles.length} circuit(s): ${circuitFiles.join(", ")}\n`, colors.blue);

  // Compile each circuit
  for (const circuitFile of circuitFiles) {
    try {
      compileCircuit(circuitFile);
      
      const circuitName = circuitFile.replace(".circom", "");
      generateTrustedSetup(circuitName, PTAU_SIZE);
    } catch (error: any) {
      log(`\n❌ Error compiling ${circuitFile}: ${error.message}`, colors.red);
      process.exit(1);
    }
  }

  log("\n✨ All circuits compiled successfully!", colors.green);
  log("\n💡 Next step: Generate Solidity verifiers with: npm run circuits:verifiers\n", colors.blue);
}

main();

