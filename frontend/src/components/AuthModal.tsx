import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { X, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useCeloConfig } from "@/components/CeloProvider";
import { useCeloContracts, useCeloWallet } from "@/lib/celo/hooks";
import { api } from "@/lib/api";

export function AuthModal({ open, onClose, initialRole, initialMode }: any) {
  const { login, register, loginWithToken } = useAuth();
  const { config } = useCeloConfig();
  const { address, connectWallet, isConnected } = useCeloWallet();
  const { signWalletChallenge } = useCeloContracts(config);
  const [mode, setMode] = useState(initialMode || "login");
  const [role, setRole] = useState(initialRole || "customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (open) {
      setMode(initialMode || "login");
      setRole(initialRole || "customer");
    }
  }, [open, initialMode, initialRole]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let loggedInUser;
      if (mode === "login") {
        loggedInUser = await login({ username: email, password });
        toast.success("Logged in successfully!");
      } else {
        loggedInUser = await register({ email, password, name, role, language_preference: "english" });
        toast.success("Registered successfully!");
      }
      onClose();

      const userRole = loggedInUser?.role || role;
      const targetRoute = mode === "register" && userRole === "hustler" ? "/onboarding" : userRole === "customer" ? "/customer-dashboard" : "/jobs";
      nav({ to: targetRoute });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletRegister = async () => {
    setLoading(true);
    try {
      let walletAddress = address;
      if (!isConnected || !walletAddress) {
        await connectWallet();
        walletAddress = (window as any).ethereum?.selectedAddress;
      }
      if (!walletAddress) throw new Error("Connect a wallet first");

      const signed = await signWalletChallenge(walletAddress, "register");
      const res = await api.walletRegister({
        address: walletAddress,
        signature: signed.signature,
        nonce: signed.nonce,
        role,
        name: name || `Wallet ${walletAddress.slice(0, 8)}`,
      });
      await loginWithToken(res.access_token);
      toast.success("Wallet account created");
      onClose();
      const targetRoute = role === "hustler" ? "/onboarding" : "/customer-dashboard";
      nav({ to: targetRoute });
    } catch (err: any) {
      toast.error(err.message || "Wallet sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-card border shadow-elevated p-8">
        <button onClick={onClose} className="absolute right-6 top-6 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h2 className="font-display text-2xl font-bold mb-2">{mode === "login" ? "Welcome Back" : "Join AreaHustle"}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login" ? "Sign in to your account to continue" : "Create an account to get started"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">I want to</label>
                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${role === "customer" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted"}`}
                  >
                    Hire
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("hustler")}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${role === "hustler" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted"}`}
                  >
                    Work
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground flex justify-center items-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Login" : "Register"}
          </button>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-sm text-muted-foreground hover:text-foreground font-medium transition"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>

          {mode === "register" && config.enabled && (
            <div className="mt-6 border-t pt-6">
              <p className="text-xs text-muted-foreground text-center mb-3">Optional: sign up with Celo wallet only</p>
              <button
                type="button"
                onClick={handleWalletRegister}
                disabled={loading}
                className="w-full rounded-full border py-3 text-sm font-semibold flex justify-center items-center gap-2 hover:bg-muted transition"
              >
                <Wallet className="h-4 w-4" /> Sign up with Celo Wallet
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
