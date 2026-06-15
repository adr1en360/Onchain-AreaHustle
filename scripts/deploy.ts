import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Celo Sepolia NGNm — local-currency stablecoin for Nigerian gig payments
const CELO_SEPOLIA_NGNM = "0x3d5ae86F34E2a82771496D140daFAEf3789dF888";
const CELO_SEPOLIA_USDT = "0xd077A400968890Eacc75cdc901F0356c943e4fDb";
const CELO_MAINNET_NGNM = "0x3d5ae86F34E2a82771496D140daFAEf3789dF888";

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
      ? process.env.CELO_PAYMENT_TOKEN || CELO_MAINNET_NGNM
      : process.env.CELO_PAYMENT_TOKEN || CELO_SEPOLIA_USDT;

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
  console.log("Payment token (USDT):", paymentToken);

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
