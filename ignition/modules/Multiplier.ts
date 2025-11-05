import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Deploy Multiplier contract with its verifier
 * 
 * This module:
 * 1. Checks if Multiplier2Verifier exists in contracts/verifiers/
 * 2. Deploys Multiplier2Verifier contract (if found)
 * 3. Deploys Multiplier contract with the verifier address
 * 
 * Usage:
 *   pnpm hardhat ignition deploy ignition/modules/Multiplier.ts
 *   pnpm hardhat ignition deploy --network avalancheFuji ignition/modules/Multiplier.ts
 * 
 * Note: Make sure to run 'pnpm circuits:compile' and 'pnpm circuits:verifiers' first
 *       to generate the verifier contract.
 */
export default buildModule("MultiplierModule", (m) => {
  // Check if verifier exists
  const verifierPath = join(process.cwd(), "contracts", "verifiers", "Multiplier2Verifier.sol");
  const verifierExists = existsSync(verifierPath);

  if (!verifierExists) {
    throw new Error(
      "Multiplier2Verifier.sol not found in contracts/verifiers/.\n" +
      "Please run: pnpm circuits:compile && pnpm circuits:verifiers"
    );
  }

  // Deploy the verifier contract
  // Hardhat will find it automatically as it's in contracts/verifiers/
  const verifier = m.contract("Multiplier2Verifier");

  // Deploy Multiplier contract with verifier address
  const multiplier = m.contract("Multiplier", [verifier]);

  return { 
    verifier,
    multiplier 
  };
});

