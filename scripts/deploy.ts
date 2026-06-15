import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Celo Sepolia USDC — stablecoin for Celo payments
const CELO_SEPOLIA_USDC = "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
const CELO_MAINNET_USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No deployer account found. Set PRIVATE_KEY in .env (Celo Sepolia test wallet with CELO from faucet.celo.org).",
    );
  }
  const [deployer] = signers;
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying with:", deployer.address);
  console.log("Chain ID:", chainId);

  const paymentToken =
    chainId === 42220
      ? process.env.CELO_PAYMENT_TOKEN || CELO_MAINNET_USDC
      : process.env.CELO_PAYMENT_TOKEN || CELO_SEPOLIA_USDC;

  const Registry = await ethers.getContractFactory("AreaHustleRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AreaHustleRegistry:", registryAddress);

  const Escrow = await ethers.getContractFactory("TaskEscrow");
  const escrow = await Escrow.deploy(paymentToken, deployer.address, 250);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("TaskEscrow:", escrowAddress);
  console.log("Payment token (USDC):", paymentToken);

  const addresses = {
    chainId,
    registry: registryAddress,
    escrow: escrowAddress,
    paymentToken,
    platformFeeBps: 250,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `chain-${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));
  console.log("Saved deployment to", outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
