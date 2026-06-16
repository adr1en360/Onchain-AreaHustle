import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { usdc } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useAccount } from "wagmi";
import { useUsdcBalance } from "@/lib/celo/useUsdcBalance";
import {
  ShieldCheck,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  History,
  CreditCard,
  Mic,
  Share2,
  CheckCircle,
  Clock,
  MapPin,
  X,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/passport")({
  component: PassportPage,
});

function PassportTrustDial({ value }: { value: number }) {
  const max = 1000;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 300);
    return () => clearTimeout(t);
  }, [value]);
  const pct = shown / max;
  const r = 50;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct * 0.75); // 270 degree circle
  return (
    <div className="relative flex items-center justify-center h-36 w-36 sm:h-40 sm:w-40 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-[135deg]">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * 0.25}
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#0D3B2E"
          className="transition-all duration-[1500ms] ease-out"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-3xl sm:text-4xl font-bold tabular-nums text-[#0D3B2E]">{shown}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-widest">/ 1000</div>
      </div>
    </div>
  );
}

function PassportPage() {
  const { isLoggedIn, userRole, user } = useAuth();
  const nav = useNavigate();
  const [voiceExpanded, setVoiceExpanded] = useState(false);
  // Use wallet connection directly — don't depend on backend config.enabled
  const { isConnected: walletConnected } = useAccount();
  // No config arg → falls back to hardcoded Celo Sepolia USDC address
  const { balance: usdcOnchain, loading: usdcLoading } = useUsdcBalance();

  const { data: passport } = useQuery({
    queryKey: ["passport"],
    queryFn: () => api.getPassport(),
    enabled: isLoggedIn,
  });

  const { data: apiTxns = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.getTransactions(),
    enabled: isLoggedIn,
  });

  const [demoTxns, setDemoTxns] = useState<any[]>([]);
  useEffect(() => {
    setDemoTxns(JSON.parse(localStorage.getItem("demo_transactions") || "[]"));
  }, []);

  const txns = [...demoTxns, ...apiTxns];

  useEffect(() => {
    if (!isLoggedIn || userRole !== "hustler") nav({ to: "/" });
  }, [isLoggedIn, userRole, nav]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://areahustle.com/p/tunde-820");
    toast.success("Passport link copied! Share it directly with lenders via WhatsApp.");
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] font-sans pb-0">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-40 bg-[#F9F9F8]/80 backdrop-blur-md border-b px-4 sm:px-6 lg:px-8 py-4">
        <div className="mx-auto max-w-5xl flex justify-between items-center">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0D3B2E]">Financial Passport</h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                {walletConnected ? "On-chain USDC" : "Wallet Balance"}
              </div>
              <div className="font-display font-bold text-base sm:text-lg text-[#0D3B2E]">
                {walletConnected
                  ? usdcLoading
                    ? "..."
                    : `${usdcOnchain.toFixed(2)} USDC`
                  : usdc(user?.wallet_balance || 0)}
              </div>
              {walletConnected && (
                <div className="text-[10px] text-muted-foreground">On-chain · Celo Sepolia</div>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-[#0D3B2E] text-white flex items-center justify-center font-bold shadow-soft">EA</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* The Trust Score Bento Box */}
        <div className="rounded-[2rem] bg-white border border-gray-100 shadow-elevated p-6 sm:p-10 mb-8 animate-fade-up">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            {/* Left: Dial & Copy Link */}
            <div className="flex flex-col items-center text-center">
              <div className="text-xs uppercase tracking-widest text-[#0D3B2E] font-semibold mb-2">Verified Trust Score</div>
              <PassportTrustDial value={user?.trust_score || passport?.trust_score || 0} />
              <button
                onClick={handleCopyLink}
                className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#0D3B2E] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0D3B2E]/90 transition shadow-soft w-full"
              >
                <Share2 className="h-4 w-4" /> Copy Public Link
              </button>
            </div>

            {/* Right: Data Breakdown */}
            <div className="flex-1 w-full bg-[#F9F9F8] rounded-3xl p-6 border border-gray-100">
              <h3 className="text-sm font-bold text-[#0D3B2E] mb-5 uppercase tracking-wider">Score Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Job Completion Rate</div>
                  <div className="font-display text-2xl font-bold text-[#10B981]">
                    {passport?.job_completion_rate || 0}%{" "}
                    <span className="text-[10px] bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full ml-1 align-middle uppercase">
                      High Weight
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">On-Time Arrival</div>
                  <div className="font-display text-xl font-bold text-[#0D3B2E]">{passport?.on_time_arrival || 0}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Repeat Hire Ratio</div>
                  <div className="font-display text-xl font-bold text-[#0D3B2E]">{passport?.repeat_hire_ratio || 0}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Dispute Rate</div>
                  <div className="font-display text-xl font-bold text-[#0D3B2E]">{passport?.dispute_rate || 0}%</div>
                </div>
                <div className="sm:col-span-2 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> Avg. Response Time
                    </span>
                    <span className="font-display text-lg font-bold text-[#0D3B2E]">&lt; 5 mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Transaction Ledger */}
        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h2 className="font-display text-xl font-bold mb-4 text-[#0D3B2E]">Recent Payouts</h2>
          <div className="rounded-[2rem] bg-white border border-gray-100 shadow-soft p-2 sm:p-4">
            <div className="space-y-2">
              {txns.map((t, idx) => {
                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-6 rounded-3xl hover:bg-[#F9F9F8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${t.amount > 0 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-gray-100 text-gray-500"}`}
                      >
                        {t.amount > 0 ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-[#0D3B2E]">{t.desc}</div>
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-1">
                          {t.location && <span>[{t.location}]</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`font-display text-xl font-bold self-end sm:self-center ${t.amount > 0 ? "text-[#10B981]" : "text-gray-900"}`}>
                      {t.amount > 0 ? "+" : ""}
                      {usdc(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Aethex Voice-Assisted Financial Passport FAB */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end">
        {voiceExpanded && (
          <div className="mb-4 w-72 sm:w-80 bg-white rounded-3xl shadow-elevated border border-gray-100 p-6 animate-fade-up origin-bottom-right">
            <div className="flex justify-between items-start mb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] flex items-center gap-1.5">
                <Mic className="h-3 w-3 animate-pulse" /> Aethex Listening
              </div>
              <button onClick={() => setVoiceExpanded(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-lg font-display font-semibold text-[#0D3B2E] leading-snug">"What is my Trust Score?"</p>

            {/* Simulated Audio Waveform */}
            <div className="flex items-center justify-center gap-1 h-12 mt-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#4F46E5] rounded-full animate-wave"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: `${0.6 + (i % 3) * 0.2}s`,
                    height: `${20 + Math.random() * 80}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!voiceExpanded && (
          <button
            onClick={() => setVoiceExpanded(true)}
            className="group flex items-center gap-3 bg-[#4F46E5] text-white rounded-full p-4 pr-6 shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:scale-105 hover:bg-[#4338ca] transition-all duration-300 animate-fade-up"
          >
            <div className="relative">
              <Mic className="h-6 w-6 relative z-10" />
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "3s" }}></span>
            </div>
            <span className="font-semibold text-sm max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap">
              Ask Aethex...
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
