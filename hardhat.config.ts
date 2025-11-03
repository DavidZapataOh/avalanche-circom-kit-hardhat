import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    avalanche: {
      type: "http",
      chainType: "l1",
      url: configVariable("AVALANCHE_RPC_URL"),
      accounts: [configVariable("AVALANCHE_PRIVATE_KEY")],
    },
    avalancheFuji: {
      type: "http",
      chainType: "l1",
      url: configVariable("AVALANCHE_FUJI_RPC_URL"),
      accounts: [configVariable("AVALANCHE_FUJI_PRIVATE_KEY")],
    },
  },
};

export default config;
