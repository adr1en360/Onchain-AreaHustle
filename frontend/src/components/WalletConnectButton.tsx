import { useState } from "react";
import { Wallet, Link2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useCeloConfig } from "@/components/CeloProvider";
import { useCeloContracts, useCeloWallet } from "@/lib/celo/hooks";
import { shortenAddress } from "@/lib/celo/config";
import { CeloWalletBadge } from "@/components/CeloWalletBadge";

type Props = {
  compact?: boolean;
};

export function WalletConnectButton({ compact }: Props) {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const { config } = useCeloConfig();
  const { address, isConnected, connectWallet, disconnect, isConnecting, onCeloSepolia } = useCeloWallet();
  const { signWalletChallenge, registerOnChain } = useCeloContracts(config);
  const [busy, setBusy] = useState(false);

  const linkedWallet = user?.wallet_address?.toLowerCase();
  const activeWallet = address?.toLowerCase();
  const isLinked = !!linkedWallet && linkedWallet === activeWallet;

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast.success("Connected to Celo Sepolia");
    } catch (err: any) {
      toast.error(err.message || "Failed to connect wallet");
    }
  };

  const handleLink = async () => {
    if (!address) return;
    setBusy(true);
    try {
      const signed = await signWalletChallenge(address, "link");
      await api.linkWallet({ address, signature: signed.signature, nonce: signed.nonce });
      await refreshUser();
      toast.success("Wallet linked — payments use NGNm escrow");
    } catch (err: any) {
      toast.error(err.message || "Failed to link wallet");
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterOnChain = async () => {
    if (!address || !user?.role) return;
    setBusy(true);
    try {
      const hash = await registerOnChain(user.role, user.name || "AreaHustle User");
      await api.confirmOnchainRegistration(hash);
      await refreshUser();
      toast.success("On-chain profile live on Celo");
    } catch (err: any) {
      toast.error(err.message || "On-chain registration failed");
    } finally {
      setBusy(false);
    }
  };

  if (!config.enabled) return null;

  if (isLinked && isConnected) {
    return compact ? (
      <CeloWalletBadge compact showBalance />
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <CeloWalletBadge />
        {!user?.onchain_registered && (
          <button
            onClick={handleRegisterOnChain}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            On-chain profile
          </button>
        )}
        <button onClick={() => disconnect()} className="text-xs text-muted-foreground hover:text-foreground">
          Disconnect
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
      >
        <Wallet className="h-3.5 w-3.5" />
        {isConnecting ? "Connecting…" : compact ? "Connect" : "Connect Celo Wallet"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800">
        {shortenAddress(address)}
        {!onCeloSepolia && " · switch to Celo Sepolia"}
      </span>
      {isLoggedIn && (
        <button
          onClick={handleLink}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          Link wallet
        </button>
      )}
    </div>
  );
}
