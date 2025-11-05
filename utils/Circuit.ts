import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
// @ts-expect-error - snarkjs doesn't have type definitions
import { groth16, zKey } from "snarkjs";

export interface Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface ProofData {
  proof: Proof;
  publicSignals: string[];
}

export interface OnchainProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

export interface OnchainProofData {
  proof: OnchainProof;
  publicSignals: string[];
}

export interface ProofResults {
  offchain: ProofData;
  onchain: OnchainProofData;
}

export class Circuit {
  private circuitName: string;
  private circuitPath: string;
  private buildDir: string;
  private wasmPath: string;
  private zkeyPath: string;
  private r1csPath: string;

  constructor(circuitName: string) {
    this.circuitName = circuitName;
    this.circuitPath = join("circuits", `${circuitName}.circom`);
    this.buildDir = join("circuits", "build");
    this.wasmPath = join(this.buildDir, `${circuitName}_js`, `${circuitName}.wasm`);
    this.zkeyPath = join(this.buildDir, `${circuitName}.zkey`);
    this.r1csPath = join(this.buildDir, `${circuitName}.r1cs`);

    if (!existsSync(this.buildDir)) {
      mkdirSync(this.buildDir, { recursive: true });
    }

    this.ensureCompiled();
  }

  private ensureCompiled() {
    if (!existsSync(this.wasmPath)) {
      console.log(`Compiling circuit ${this.circuitName}...`);
      const circuitsDir = join(process.cwd(), "circuits");
      const circuitFile = `${this.circuitName}.circom`;
      const outputDir = "build";

      const circom2Path = this.findCircom2();
      if (!circom2Path) {
        throw new Error(
          `circom2 not found. Install it with: pnpm add -D circom2`
        );
      }

      try {
        const circom2RelativePath = relative(circuitsDir, circom2Path);
        
        if (circom2Path.endsWith("cli.js")) {
          // Use spawnSync with arguments array for cross-platform compatibility
          const result = spawnSync("node", [
            circom2RelativePath,
            circuitFile,
            "--r1cs",
            "--wasm",
            "--sym",
            "-o",
            outputDir,
          ], {
            stdio: "inherit",
            cwd: circuitsDir,
          });

          if (result.error) {
            throw result.error;
          }
          if (result.status !== 0) {
            throw new Error(`circom2 exited with code ${result.status}`);
          }
        } else {
          // For executables, use the path directly
          const result = spawnSync(circom2RelativePath, [
            circuitFile,
            "--r1cs",
            "--wasm",
            "--sym",
            "-o",
            outputDir,
          ], {
            stdio: "inherit",
            cwd: circuitsDir,
          });

          if (result.error) {
            throw result.error;
          }
          if (result.status !== 0) {
            throw new Error(`circom2 exited with code ${result.status}`);
          }
        }

        if (!existsSync(this.wasmPath)) {
          throw new Error("Circuit compilation failed. Check errors above.");
        }
      } catch (error: any) {
        throw new Error(
          `Circuit compilation error: ${error.message}. ` +
          `Compile manually with: cd circuits && circom2 ${circuitFile} --r1cs --wasm --sym -o ${outputDir}`
        );
      }
    }

    if (!existsSync(this.zkeyPath)) {
      console.log(`Generating zkey for ${this.circuitName}...`);
      
      // Use pot8 for local testing (faster, less memory)
      // For production, use pot14 or pot15 with pre-generated files
      const ptauSize = 8;
      const ptauPath = join(this.buildDir, `pot${ptauSize}_0000.ptau`);
      const ptauPreparedPath = join(this.buildDir, `pot${ptauSize}_0000_final.ptau`);
      
      if (!existsSync(ptauPreparedPath)) {
        if (!existsSync(ptauPath)) {
          console.log(`Generating initial trusted setup file (pot${ptauSize})...`);
          this.runCommand("pnpm", ["exec", "snarkjs", "powersoftau", "new", "bn128", String(ptauSize), ptauPath, "-v"]);
        }
        
        console.log("Preparing powers of tau for phase2...");
        this.runCommand("pnpm", ["exec", "snarkjs", "powersoftau", "prepare", "phase2", ptauPath, ptauPreparedPath, "-v"]);
      }

      const r1csFullPath = join(process.cwd(), this.r1csPath);
      const zkeyFullPath = join(process.cwd(), this.zkeyPath);

      console.log("Generating zkey...");
      this.runCommand("pnpm", ["exec", "snarkjs", "groth16", "setup", r1csFullPath, join(process.cwd(), ptauPreparedPath), zkeyFullPath]);
    }
  }

  private runCommand(command: string, args: string[]): void {
    // For pnpm, we need to handle platform-specific wrappers
    // pnpm exec works best when called through shell or with proper executable
    let useShell = false;
    let executable = command;

    if (command === "pnpm") {
      if (process.platform === "win32") {
        // On Windows, pnpm is often a .cmd wrapper that needs shell
        useShell = true;
      } else {
        // On Unix systems, try to find pnpm in common locations
        const possiblePaths = [
          join(process.cwd(), "node_modules", ".bin", "pnpm"),
          "/usr/local/bin/pnpm",
          "/opt/homebrew/bin/pnpm", // Homebrew on Apple Silicon
        ];

        for (const path of possiblePaths) {
          if (existsSync(path)) {
            executable = path;
            break;
          }
        }
        // If not found, assume it's in PATH
      }
    }

    const result = spawnSync(executable, args, {
      stdio: "inherit",
      cwd: process.cwd(),
      shell: useShell,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`Command "${command}" exited with code ${result.status}`);
    }
  }

  private findCircom2(): string | null {
    // Search for circom2 in node_modules (avoids .bin wrapper issues on Windows)
    const possiblePaths = [
      join(process.cwd(), "node_modules", "circom2", "cli.js"),
      join(process.cwd(), "node_modules", ".bin", "circom2"),
    ];

    // Also check pnpm's nested structure (dynamically find version)
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
      // Ignore errors when searching pnpm directory
    }

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    return null;
  }

  async generateProof(input: Record<string, string | string[]>): Promise<ProofResults> {
    // Suppress memory warnings from snarkjs (these are harmless on Windows)
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = function(chunk: any, enc?: any, cb?: any): boolean {
      const msg = chunk?.toString() || '';
      if (msg.includes('Could not allocate') && msg.includes('severe instability')) {
        if (typeof enc === 'function') enc();
        else if (cb) cb();
        return true;
      }
      return originalStderrWrite(chunk, enc, cb);
    } as any;

    try {
      const { proof, publicSignals } = await groth16.fullProve(
        input,
        this.wasmPath,
        this.zkeyPath
      );

      const onchainProof = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        c: [proof.pi_c[0], proof.pi_c[1]],
      };

      return {
        offchain: { proof, publicSignals },
        onchain: {
          proof: {
            a: onchainProof.a.map((x) => x.toString()) as [string, string],
            b: onchainProof.b.map((x) => x.map((y) => y.toString()) as [string, string]) as [[string, string], [string, string]],
            c: onchainProof.c.map((x) => x.toString()) as [string, string],
          },
          publicSignals,
        },
      };
    } finally {
      process.stderr.write = originalStderrWrite;
    }
  }

  async verifyProof(proof: Proof, publicSignals: string[]): Promise<boolean> {
    const vkey = await zKey.exportVerificationKey(this.zkeyPath);
    return await groth16.verify(vkey, publicSignals, proof);
  }
}
