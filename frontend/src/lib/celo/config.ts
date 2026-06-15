export type CeloConfig = {
  chainId: number;
  rpcUrl: string;
  registryAddress?: `0x${string}`;
  escrowAddress?: `0x${string}`;
  paymentToken?: `0x${string}`;
  paymentSymbol: string;
  platformFeeBps: number;
  enabled: boolean;
};

export const CELO_SEPOLIA_CHAIN_ID = 11142220;

export const DEFAULT_CELO_CONFIG: CeloConfig = {
  chainId: CELO_SEPOLIA_CHAIN_ID,
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  paymentSymbol: "NGNm",
  platformFeeBps: 250,
  enabled: false,
};

export function nairaToTokenWei(budget: number): bigint {
  return BigInt(Math.round(budget * 1e18));
}

export function shortenAddress(address?: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatNgnm(wei: bigint | undefined | null) {
  if (wei == null) return "— NGNm";
  const amount = Number(wei) / 1e18;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} NGNm`;
}

export function roleToRegistryEnum(role: string): number {
  return role === "hustler" ? 2 : 1;
}
