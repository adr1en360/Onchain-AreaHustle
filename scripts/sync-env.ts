import * as fs from "fs";
import * as path from "path";

const chainId = process.argv[2] || "11142220";
const root = path.join(__dirname, "..");
const deploymentFile = path.join(root, "deployments", `chain-${chainId}.json`);

if (!fs.existsSync(deploymentFile)) {
  console.error(`Missing ${deploymentFile}. Run: npm run deploy:sepolia`);
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
const celoLines = [
  `CELO_CHAIN_ID=${deployment.chainId}`,
  `CELO_REGISTRY_ADDRESS=${deployment.registry}`,
  `CELO_ESCROW_ADDRESS=${deployment.escrow}`,
  `CELO_PAYMENT_TOKEN=${deployment.paymentToken}`,
];

function upsertEnv(filePath: string, lines: string[]) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, lines.join("\n") + "\n");
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  for (const line of lines) {
    const key = line.split("=")[0];
    const re = new RegExp(`^${key}=.*$`, "m");
    content = re.test(content) ? content.replace(re, line) : `${content.trim()}\n${line}\n`;
  }
  fs.writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`);
}

upsertEnv(path.join(root, ".env"), celoLines);
upsertEnv(path.join(root, "backend", ".env"), celoLines);

console.log("Wired Celo contracts:");
console.log(`  Registry: ${deployment.registry}`);
console.log(`  Escrow:   ${deployment.escrow}`);
console.log(`  Token:    ${deployment.paymentToken}`);
console.log("Updated .env and backend/.env");
