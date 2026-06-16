/**
 * useUsdcBalance
 *
 * Reads USDC balance directly from the Celo Sepolia ERC-20 contract
 * using @wagmi/core readContract.
 *
 * Falls back to the hardcoded Celo Sepolia USDC address if no token
 * address is found in the config — so the balance always shows as long
 * as the wallet is connected, regardless of whether the backend config
 * endpoint has responded.
 *
 * Celo Sepolia USDC: 0x01C5C0122039549AD1493B8220cABEdD739BC44E
 */
import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { wagmiConfig } from "@/lib/celo/wagmi";
import type { CeloConfig } from "@/lib/celo/config";

// Hardcoded Celo Sepolia USDC — never changes, no backend dependency
const CELO_SEPOLIA_USDC = "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as const;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

/**
 * Resolve the token address from a CeloConfig, raw string, or fall back
 * to the hardcoded Celo Sepolia USDC address.
 */
function resolveTokenAddress(tokenOrConfig?: CeloConfig | string | null): `0x${string}` {
  if (!tokenOrConfig) return CELO_SEPOLIA_USDC;
  if (typeof tokenOrConfig === "string" && tokenOrConfig.startsWith("0x")) {
    return tokenOrConfig as `0x${string}`;
  }
  if (typeof tokenOrConfig === "object" && tokenOrConfig.paymentToken) {
    return tokenOrConfig.paymentToken;
  }
  // Always fall back to hardcoded USDC — don't block on backend config
  return CELO_SEPOLIA_USDC;
}

export function useUsdcBalance(tokenOrConfig?: CeloConfig | string | null) {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<number>(0);
  const [raw, setRaw] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Always resolve to a token address — never undefined
  const tokenAddress = resolveTokenAddress(tokenOrConfig);

  const fetchBalance = useCallback(async () => {
    if (!address || !isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const [rawBalance, decimals] = await Promise.all([
        readContract(wagmiConfig, {
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        }),
        readContract(wagmiConfig, {
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
      ]);
      const divisor = 10 ** Number(decimals);
      const raw = rawBalance as bigint;
      setRaw(raw);
      setBalance(Number(raw) / divisor);
    } catch (err) {
      console.error("[useUsdcBalance] Failed to read contract:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, tokenAddress]);

  // Fetch on mount and whenever wallet / token changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh every 15 seconds while connected
  useEffect(() => {
    if (!address || !isConnected) return;
    const interval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(interval);
  }, [address, isConnected, fetchBalance]);

  return { balance, raw, loading, error, refetch: fetchBalance };
}
