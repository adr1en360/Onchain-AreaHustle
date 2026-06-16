import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { X, Loader2, Wallet, User, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useCeloConfig } from "@/components/CeloProvider";
import { useCeloContracts, useCeloWallet } from "@/lib/celo/hooks";
import logo from "@/assets/logo.png";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialRole?: "customer" | "hustler";
  initialMode?: "login" | "register";
}

export function AuthModal({ open, onClose, initialRole, initialMode }: AuthModalProps) {
  const { loginWithWallet } = useAuth();
  const { config } = useCeloConfig();
  const { address, connectWallet, isConnected } = useCeloWallet();
  const { signWalletChallenge } = useCeloContracts(config);
  const [mode, setMode] = useState<"login" | "register">(initialMode || "login");
  const [role, setRole] = useState<"customer" | "hustler">(initialRole || "customer");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (open) {
      setMode(initialMode || "login");
      setRole(initialRole || "customer");
      setName("");
    }
  }, [open, initialMode, initialRole]);

  if (!open) return null;

  const handleWalletAuth = async () => {
    setLoading(true);
    try {
      let walletAddress = address;
      if (!isConnected || !walletAddress) {
        await connectWallet();
        // Wait briefly for address to become available from window.ethereum
        walletAddress = (window as any).ethereum?.selectedAddress;
      }
      if (!walletAddress) {
        throw new Error("Could not detect wallet address. Please make sure MetaMask or another Celo wallet is connected.");
      }

      toast.loading("Requesting challenge signature from wallet...", { id: "wallet-auth" });
      
      const challengeAction = mode === "register" ? "register" : "login";
      const signed = await signWalletChallenge(walletAddress, challengeAction);
      
      toast.loading("Authenticating with AreaHustle network...", { id: "wallet-auth" });

      const res = await loginWithWallet({
        address: walletAddress,
        signature: signed.signature,
        nonce: signed.nonce,
        role: role,
        name: mode === "register" ? (name || `Wallet ${walletAddress.slice(0, 8)}`) : "",
      });

      toast.success(res?.is_new ? "Passport created successfully!" : "Signed in successfully!", { id: "wallet-auth" });
      onClose();

      // Navigate based on role and onboarding status
      const userRole = res?.role || role;
      const targetRoute = res?.is_new && userRole === "hustler" ? "/onboarding" : userRole === "customer" ? "/customer-dashboard" : "/jobs";
      nav({ to: targetRoute });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Wallet authentication failed", { id: "wallet-auth" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      {/* Premium Card */}
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-[32px] bg-card border border-border shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute right-6 top-6 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
          <X className="h-5 w-5" />
        </button>

        {/* Header with Logo */}
        <div className="flex flex-col items-center text-center mb-6 mt-2 sm:mt-0">
          <div className="mb-4 flex h-14 items-center justify-center">
            <img src={logo} alt="Onchain AreaHustle Logo" className="h-12 w-auto object-contain" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {mode === "login" ? "Sign In to AreaHustle" : "Create Onchain Passport"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
            {mode === "login" 
              ? "Access your dashboard using your connected Celo wallet" 
              : "Set up your role and connect a wallet to verify your identity"}
          </p>
        </div>

        {/* Tab Selectors (Login vs Register) */}
        <div className="grid grid-cols-2 p-1 bg-muted/40 rounded-2xl mb-6 border border-white/5">
          <button
            onClick={() => setMode("login")}
            className={`py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("register")}
            className={`py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Register
          </button>
        </div>

        {/* Profile Type Selector (Visible for both Login and Register) */}
        <div className="mb-6">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Profile Type</label>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition ${role === "customer" ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/10" : "bg-card border-white/5 hover:bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="h-4 w-4" />
              Hire (Customer)
            </button>
            <button
              type="button"
              onClick={() => setRole("hustler")}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition ${role === "hustler" ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/10" : "bg-card border-white/5 hover:bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <User className="h-4 w-4" />
              Work (Hustler)
            </button>
          </div>
        </div>

        {/* Form Fields only for Registration */}
        {mode === "register" && (
          <div className="space-y-5 mb-6 animate-in slide-in-from-top-4 duration-200">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name / Business Name</label>
              <input
                type="text"
                placeholder="e.g. Kolawole Davies"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-white/5 bg-background/50 px-4 py-3.5 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
              />
            </div>
          </div>
        )}

        {/* Wallet Auth Button */}
        <button
          onClick={handleWalletAuth}
          disabled={loading}
          className="w-full rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 text-sm font-semibold flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition duration-200"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Wallet className="h-5 w-5" />
          )}
          {mode === "login" ? "Connect & Sign In" : "Connect & Create Passport"}
        </button>

        {/* Security disclaimer */}
        <p className="text-[10px] text-muted-foreground/50 text-center mt-5 leading-normal">
          Secure, cryptographic authentication on Celo. By connecting, you verify ownership of this wallet address.
        </p>
      </div>
    </div>
  );
}
