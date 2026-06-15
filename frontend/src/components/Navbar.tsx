import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { naira } from "@/lib/format";
import { LogOut, Shield, LayoutDashboard, Briefcase, CreditCard, PlusCircle, User as UserIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { AuthModal } from "./AuthModal";
import { WalletConnectButton } from "./WalletConnectButton";
import { CeloWalletBadge } from "./CeloWalletBadge";
import { useOnchainPayments } from "@/lib/celo/payments";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export function Navbar() {
  const { isLoggedIn, userRole, user, logout, updateDemoBalance, usesOnchainWallet } = useAuth();
  const { enabled: celoEnabled, canPayOnchain } = useOnchainPayments();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  const walletBalance = user?.wallet_balance || 0;
  const trustScore = user?.trust_score || 0;
  const showDemoWallet = !usesOnchainWallet && !canPayOnchain;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(withdrawAmount);
    if (amt && amt <= walletBalance) {
      updateDemoBalance(userRole as string, -amt);
      toast.success(`Successfully withdrew ${naira(amt)} to bank.`);
      setWithdrawOpen(false);
      setWithdrawAmount("");
    } else {
      toast.error("Invalid amount or insufficient balance.");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight hover:opacity-90 transition shrink-0">
            <img src={logo} alt="AreaHustle Logo" className="h-8 w-auto object-contain" />
            <span className="hidden sm:inline">AreaHustle.</span>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <WalletConnectButton compact />
              {userRole === "customer" ? (
                <>
                  <Link to="/customer-dashboard" className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-primary transition">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link to="/post-task" className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-primary transition">
                    <PlusCircle className="h-4 w-4" /> Post Task
                  </Link>
                  {canPayOnchain ? <CeloWalletBadge compact /> : showDemoWallet ? (
                    <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      {naira(walletBalance)}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <Link to="/jobs" className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-primary transition">
                    <Briefcase className="h-4 w-4" /> Jobs
                  </Link>
                  <Link to="/passport" className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-primary transition">
                    <CreditCard className="h-4 w-4" /> Passport
                  </Link>
                  <div className="hidden sm:flex items-center gap-2">
                    <Shield className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">{trustScore}</span>
                  </div>
                  {canPayOnchain ? (
                    <CeloWalletBadge compact />
                  ) : showDemoWallet ? (
                    <button onClick={() => setWithdrawOpen(true)} className="hidden sm:flex rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      <AnimatedNumber value={walletBalance} />
                    </button>
                  ) : null}
                </>
              )}
              <button onClick={() => logout()} className="text-muted-foreground hover:text-foreground transition shrink-0">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              {celoEnabled && <WalletConnectButton compact />}
              <button onClick={() => { setAuthMode("login"); setAuthOpen(true); }} className="text-sm font-medium hover:text-primary transition">
                Login
              </button>
              <button
                onClick={() => { setAuthMode("register"); setAuthOpen(true); }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 transition"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </nav>

      {withdrawOpen && showDemoWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80">
          <div className="relative w-full max-w-sm rounded-3xl bg-card border shadow-elevated p-8">
            <h2 className="font-display text-xl font-bold mb-2">Withdraw Funds</h2>
            <p className="text-xs text-muted-foreground mb-4">Available balance: {naira(walletBalance)}</p>
            <form onSubmit={handleWithdraw}>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount"
                max={walletBalance}
                className="w-full rounded-2xl border bg-muted/30 px-4 py-3 text-lg font-semibold mb-4 outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setWithdrawOpen(false)} className="flex-1 rounded-full border py-3 text-sm font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={!withdrawAmount} className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </>
  );
}
