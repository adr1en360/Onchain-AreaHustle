import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const key = process.env.PRIVATE_KEY?.trim();
  if (!key) {
    console.error("PRIVATE_KEY missing in .env");
    process.exit(1);
  }
  const wallet = new ethers.Wallet(key);
  const provider = new ethers.JsonRpcProvider(
    process.env.CELO_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
  );
  const address = await wallet.getAddress();
  const balance = await provider.getBalance(address);
  console.log("Deployer:", address);
  console.log("CELO balance:", ethers.formatEther(balance));
  if (balance === 0n) {
    console.log("\nFund this wallet on Celo Sepolia:");
    console.log("https://faucet.celo.org/celo-sepolia");
    process.exit(1);
  }
}

main();
