import { Wallet, ExternalLink, RefreshCw } from "lucide-react";
import { useCeloConfig } from "@/components/CeloProvider";
import { useCeloWallet } from "@/lib/celo/hooks";
import { formatUsdt, shortenAddress } from "@/lib/celo/config";
import { useUsdtBalance } from "@/lib/celo/payments";

type Props = {
  compact?: boolean;
  showBalance?: boolean;
};

export function CeloWalletBadge({ compact, showBalance = true }: Props) {
  const { config } = useCeloConfig();
  const { address, isConnected, onCeloSepolia } = useCeloWallet();
  const { data: balance, isFetching, refetch } = useUsdtBalance();

  if (!config.enabled || !isConnected || !address) return null;

  const explorer = `https://celo-sepolia.blockscout.com/address/${address}`;

  if (compact) {
    return (
      <a
        href={explorer}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/15"
        title={showBalance ? formatUsdt(balance) : undefined}
      >
        <Wallet className="h-3 w-3" />
        {showBalance && balance != null ? formatUsdt(balance) : <span className="font-mono">{shortenAddress(address)}</span>}
      </a>
    );
  }

  return (
    <div className="rounded-2xl border bg-emerald-500/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold">Celo Wallet</div>
          <div className="font-mono text-base font-bold mt-1 tracking-tight">{shortenAddress(address)}</div>
          {!onCeloSepolia && <p className="text-xs text-amber-600 mt-1">Switch network to Celo Sepolia</p>}
        </div>
        <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground" title="Refresh balance">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      {showBalance && (
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Available for escrow</div>
            <div className="font-display text-2xl font-bold text-emerald-700">{formatUsdt(balance)}</div>
          </div>
          <a href={explorer} target="_blank" rel="noreferrer" className="text-xs font-semibold inline-flex items-center gap-1 text-emerald-700">
            Explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
