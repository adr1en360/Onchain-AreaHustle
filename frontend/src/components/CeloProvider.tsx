import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { api } from "@/lib/api";
import { DEFAULT_CELO_CONFIG, type CeloConfig } from "@/lib/celo/config";
import { wagmiConfig } from "@/lib/celo/wagmi";

type CeloContextType = {
  config: CeloConfig;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CeloContext = createContext<CeloContextType>({
  config: DEFAULT_CELO_CONFIG,
  loading: true,
  refresh: async () => {},
});

export function CeloProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CeloConfig>(DEFAULT_CELO_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const remote = await api.getCeloConfig();
      setConfig({
        chainId: remote.chain_id,
        rpcUrl: remote.rpc_url,
        registryAddress: remote.registry_address as `0x${string}` | undefined,
        escrowAddress: remote.escrow_address as `0x${string}` | undefined,
        paymentToken: remote.payment_token as `0x${string}` | undefined,
        paymentSymbol: remote.payment_symbol,
        platformFeeBps: remote.platform_fee_bps,
        enabled: remote.enabled,
      });
    } catch {
      setConfig(DEFAULT_CELO_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <CeloContext.Provider value={{ config, loading, refresh }}>{children}</CeloContext.Provider>
    </WagmiProvider>
  );
}

export function useCeloConfig() {
  return useContext(CeloContext);
}
