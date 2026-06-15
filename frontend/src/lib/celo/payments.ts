import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi } from "./abis";
import { useCeloConfig } from "@/components/CeloProvider";
import { formatUsdc, formatNgnm, type CeloConfig } from "./config";

export function useUsdcBalance(config?: CeloConfig | null) {
  const { config: ctxConfig } = useCeloConfig();
  const resolved = config ?? ctxConfig;
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["usdc-balance", address, resolved.paymentToken],
    enabled: Boolean(address && resolved.paymentToken && publicClient),
    refetchInterval: 15_000,
    queryFn: async () => {
      return publicClient!.readContract({
        address: resolved.paymentToken!,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
      });
    },
  });
}

export const useUsdtBalance = useUsdcBalance;
export const useNgnmBalance = useUsdcBalance;

export function useOnchainPayments() {
  const { config, loading } = useCeloConfig();
  const { address } = useAccount();
  const linked = Boolean(address);
  const enabled = config.enabled && !loading;

  return {
    enabled,
    loading,
    config,
    linked,
    canPayOnchain: enabled && linked,
  };
}

export { formatUsdc, formatUsdt, formatNgnm };
