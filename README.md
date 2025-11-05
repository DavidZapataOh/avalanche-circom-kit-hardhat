# Avalanche Circom Kit - Hardhat 3 Template

A Hardhat 3 template for building zero-knowledge proof (ZK) applications using Circom circuits on Avalanche. This template includes automated circuit compilation, Solidity verifier generation, and seamless integration with Hardhat's testing framework.

## Features

- **Hardhat 3**: Latest Hardhat with native TypeScript support
- **Circom Integration**: Automated compilation and trusted setup for Circom circuits
- **Cross-Platform**: Works on Windows, Linux, and macOS
- **Automated Verifier Generation**: One command to generate Solidity verifiers from circuits
- **TypeScript Tests**: Full TypeScript support with `node:test` and `viem`
- **Circuit Utility Class**: Easy-to-use `Circuit` class for proof generation and verification
- **Avalanche Support**: Pre-configured for Avalanche C-Chain and Fuji testnet

## Prerequisites

- Node.js >= v22.x
- pnpm (or npm/yarn)
- Circom >= 2.1.9 (installed automatically via circom2)

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd avalanche-circom-kit-hardhat

# Install dependencies
pnpm install
```

## Project Structure

```
.
├── circuits/               # Circom circuit files
│   ├── multiplier2.circom # Example circuit
│   └── build/             # Compiled circuits (auto-generated)
├── contracts/             # Solidity contracts
│   ├── Multiplier.sol     # Example contract using verifier
│   └── verifiers/         # Auto-generated Solidity verifiers
├── scripts/               # Utility scripts
│   ├── compile-circuits.ts      # Circuit compilation
│   ├── generate-verifiers.ts    # Verifier generation
│   └── clean-circuits.ts        # Clean build artifacts
├── test/                  # Test files
│   ├── multiplier2.test.ts      # Circuit tests
│   └── Counter.ts               # Contract tests
└── utils/                 # Utility classes
    └── Circuit.ts         # Circuit helper class
```

## Circuit Development

### 1. Compile Circuits

Compile all Circom circuits and generate trusted setup files:

```bash
# Development mode (default, fast, uses pot8)
pnpm circuits:compile

# Production mode (secure, uses pot14)
pnpm circuits:compile:prod
```

This command:
- Compiles all `.circom` files in the `circuits/` directory
- Generates `.wasm` and `.r1cs` files
- Creates trusted setup files (Powers of Tau)
- Generates `.zkey` files for proof generation

**Development Mode** (default):
- Uses `pot8` for fast local testing
- Suitable for development and CI/CD
- Faster compilation and proof generation

**Production Mode** (`--prod` flag):
- Uses `pot14` for secure production builds
- Takes significantly more time and memory
- Recommended for production deployments
- **Warning**: Consider using pre-generated files from trusted ceremonies instead of generating locally

### 2. Generate Solidity Verifiers

Generate Solidity verifier contracts from compiled circuits:

```bash
pnpm circuits:verifiers
```

This creates verifier contracts in `contracts/verifiers/` that can be deployed and used on-chain.

### 3. Build Everything

Compile circuits and generate verifiers in one command:

```bash
# Development build
pnpm circuits:build

# Production build
pnpm circuits:build:prod
```

### 4. Clean Build Artifacts

Remove all circuit build artifacts and generated verifiers:

```bash
pnpm circuits:clean
```

## Testing

### Run All Tests

```bash
pnpm test
# or
npx hardhat test
```

### Run Circuit Tests Only

```bash
pnpm test:circuits
```

### Run Solidity Tests Only

```bash
npx hardhat test solidity
```

## Using the Circuit Class

The `Circuit` utility class makes it easy to work with Circom circuits in tests:

```typescript
import { Circuit } from "../utils/Circuit.js";

// Initialize circuit (auto-compiles if needed)
const circuit = new Circuit("multiplier2");

// Generate a proof
const input = { a: "3", b: "11" };
const { offchain, onchain } = await circuit.generateProof(input);

// offchain format: for snarkjs verification
// onchain format: for Solidity verifier calls

// Verify proof off-chain
const isValid = await circuit.verifyProof(
  offchain.proof,
  offchain.publicSignals
);

console.log("Proof valid:", isValid);
console.log("Public output:", offchain.publicSignals[0]); // "33"
```

## Deploying to Avalanche

### Configure Networks

Set up your private keys and RPC URLs:

```bash
# For Avalanche C-Chain Mainnet
npx hardhat keystore set AVALANCHE_PRIVATE_KEY
npx hardhat keystore set AVALANCHE_RPC_URL

# For Avalanche Fuji Testnet
npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY
npx hardhat keystore set AVALANCHE_FUJI_RPC_URL
```

**Note**: Fuji RPC URL should be: `https://api.avax-test.network/ext/bc/C/rpc`

### Deploy Contracts

#### Deploy Counter Contract

```bash
# Deploy to local network (in-process Hardhat Network)
pnpm hardhat ignition deploy ignition/modules/Counter.ts

# Deploy to Fuji testnet
pnpm hardhat ignition deploy --network avalancheFuji ignition/modules/Counter.ts

# Deploy to Avalanche mainnet
pnpm hardhat ignition deploy --network avalanche ignition/modules/Counter.ts
```

#### Deploy Multiplier Contract with Verifier

The Multiplier module deploys both the verifier and the Multiplier contract:

```bash
# First, compile circuits and generate verifiers
pnpm circuits:compile
pnpm circuits:verifiers

# Then deploy to local network (in-process Hardhat Network)
pnpm hardhat ignition deploy ignition/modules/Multiplier.ts

# Deploy to Fuji testnet
pnpm hardhat ignition deploy --network avalancheFuji ignition/modules/Multiplier.ts

# Deploy to Avalanche mainnet
pnpm hardhat ignition deploy --network avalanche ignition/modules/Multiplier.ts
```

**Note**: The module will automatically check if the verifier exists and throw a helpful error if you need to generate it first.

## Example: Multiplier Circuit

The included `multiplier2.circom` circuit multiplies two numbers and outputs the result:

```circom
pragma circom 2.1.9;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;
    c <== a*b;
}

component main = Multiplier2();
```

### Testing the Circuit

```typescript
// test/multiplier2.test.ts
const circuit = new Circuit("multiplier2");
const { offchain } = await circuit.generateProof({ a: "3", b: "11" });

// Check the result
assert.equal(offchain.publicSignals[0], "33");

// Verify the proof
const isValid = await circuit.verifyProof(
  offchain.proof,
  offchain.publicSignals
);
assert.equal(isValid, true);
```

### Using in Solidity

```solidity
// contracts/Multiplier.sol
interface ICircomVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[] calldata _pubSignals
    ) external view returns (bool);
}

contract Multiplier {
    ICircomVerifier public verifier;

    constructor(address _verifier) {
        verifier = ICircomVerifier(_verifier);
    }

    function check(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[] calldata _pubSignals
    ) external returns (bool) {
        bool ok = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(ok, "invalid proof");
        emit Verified(_pubSignals[0], msg.sender);
        return true;
    }
}
```

## Development Workflow

1. **Write your circuit** in `circuits/yourCircuit.circom`
2. **Compile the circuit**: `pnpm circuits:compile`
3. **Generate the verifier**: `pnpm circuits:verifiers`
4. **Test the circuit**: Create tests in `test/yourCircuit.test.ts`
5. **Deploy the verifier**: Use Hardhat Ignition or deployment scripts
6. **Use in your dApp**: Integrate with your Solidity contracts

## Production Considerations

### Trusted Setup

For production, use pre-generated Powers of Tau files from trusted ceremonies:

1. Download files from [Perpetual Powers of Tau](https://github.com/iden3/snarkjs#7-prepare-phase-2)
2. Place in `circuits/build/` with the correct naming (`pot14_0000_final.ptau` for pot14)
3. Use `pnpm circuits:compile:prod` to compile with production settings

**Note**: The script automatically detects existing `.ptau` files and uses them instead of generating new ones. This allows you to use pre-generated trusted setup files from ceremonies.

### Security

- Always use secure trusted setup files for production
- Audit your circuits thoroughly
- Test with multiple edge cases
- Consider using formal verification tools

### Optimization

- Use appropriate Powers of Tau size (not too large, not too small)
- Optimize circuit constraints
- Cache compiled artifacts
- Consider using Groth16 for smaller proofs or PLONK for universal setup

## Cross-Platform Compatibility

This template works seamlessly across:

- **Windows**: PowerShell/CMD
- **Linux**: bash/sh
- **macOS**: bash/zsh (Intel and Apple Silicon)

The scripts automatically detect your platform and use the appropriate executables and shells.

## Troubleshooting

### Circuit compilation fails

```bash
# Clean and rebuild
pnpm circuits:clean
pnpm circuits:compile
```

### Verifier generation fails

Make sure circuits are compiled first:
```bash
pnpm circuits:compile
pnpm circuits:verifiers
```

### Memory warnings during proof generation

These warnings are harmless on Windows. They're automatically suppressed in the `Circuit` class.

## Resources

- [Hardhat 3 Documentation](https://hardhat.org/docs/getting-started)
- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Avalanche Documentation](https://docs.avax.network/)
- [Viem Documentation](https://viem.sh/)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
