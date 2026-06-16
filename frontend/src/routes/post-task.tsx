import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { usdc } from "@/lib/format";
import { Mic, Lock, MapPin, Tag, Wallet, Sparkles, Check, Keyboard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCeloContracts } from "@/lib/celo/hooks";
import { useOnchainPayments } from "@/lib/celo/payments";
import { useUsdcBalance } from "@/lib/celo/useUsdcBalance";
import { CeloWalletBadge } from "@/components/CeloWalletBadge";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { usdcToTokenWei } from "@/lib/celo/config";

export const Route = createFileRoute("/post-task")({
  head: () => ({ meta: [{ title: "Post a Task · Onchain AreaHustle" }] }),
  component: PostTask,
});

type Phase = "idle" | "recording" | "processing" | "result" | "locked";

function PostTask() {
  const { isLoggedIn } = useAuth();
  const { canPayOnchain, enabled: celoEnabled, config } = useOnchainPayments();
  const { fundEscrow } = useCeloContracts(config);
  // No arg → always reads from hardcoded Celo Sepolia USDC (0x01C5C...)
  // This is the exact same token the CeloWalletBadge displays and the contract pulls from
  const { balance: usdcBalance, raw: usdcRaw, loading: balanceLoading } = useUsdcBalance();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [manualMode, setManualMode] = useState(false);
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState("");

  useEffect(() => {
    if (!isLoggedIn) nav({ to: "/" });
  }, [isLoggedIn, nav]);

  /**
   * Validates that the user has enough USDC to cover the budget.
   * Returns true if valid, false + sets balanceError if not.
   */
  function checkBalance(budgetAmount: number): boolean {
    setBalanceError(null);

    if (!budgetAmount || budgetAmount <= 0) {
      setBalanceError("Invalid amount — budget must be greater than 0.");
      return false;
    }

    if (canPayOnchain) {
      // Compare budget (plain USDC) against on-chain balance
      const requiredWei = usdcToTokenWei(budgetAmount);
      if (usdcRaw < requiredWei) {
        setBalanceError(
          `Insufficient USDC balance. You have ${usdcBalance.toFixed(2)} USDC but need ${budgetAmount.toFixed ? budgetAmount.toFixed(2) : budgetAmount} USDC to fund this escrow.`
        );
        return false;
      }
    }

    return true;
  }

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; budget: number; neighbourhood: string; category: string }) => {
      // Always fund on-chain if wallet connected — no demo fallback
      const payment_mode = canPayOnchain ? "onchain" : "offchain";

      const created = await api.createTask({ ...data, payment_mode });

      if (canPayOnchain && created.escrow?.task_ref) {
        toast.info("Approve USDC spend in your wallet…");
        const txHash = await fundEscrow(created.escrow.task_ref as `0x${string}`, data.budget);
        await api.confirmEscrowFund(created.id, txHash);
      }

      return created;
    },
    onSuccess: () => {
      toast.success(
        canPayOnchain
          ? "Job posted — USDC locked in escrow on Celo!"
          : "Job posted successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["customerJobs"] });
      queryClient.invalidateQueries({ queryKey: ["marketJobs"] });
      nav({ to: "/customer-dashboard" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post task");
      setPhase("result");
    },
  });

  const start = () => {
    setPhase("recording");
    setTimeout(async () => {
      setPhase("processing");
      try {
        const result = await api.voiceToIntent("demo");
        setVoiceResult(result);
        setPhase("result");
      } catch (err) {
        toast.error("Failed to parse intent. Please try typing manually.");
        setPhase("idle");
      }
    }, 2200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = Number(budget);
    if (!checkBalance(budgetNum)) return;
    createMutation.mutate({ title, description, budget: budgetNum, neighbourhood: area, category: "General" });
  };

  const handleVoiceLock = () => {
    const budgetAmount = voiceResult?.budget || 25;
    if (!checkBalance(budgetAmount)) return;

    setPhase("locked");
    createMutation.mutate({
      title: voiceResult?.category || "Generator Servicing",
      description:
        voiceResult?.description ||
        "I need someone to come service my Tiger generator today in Lekki Phase 1, budget around 25 USDC.",
      budget: budgetAmount,
      neighbourhood: voiceResult?.neighbourhood || "Lekki Phase 1",
      category: voiceResult?.category || "Repairs",
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-voice font-semibold mb-3">Task Terminal</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Speak your task.</h1>
        <p className="text-muted-foreground mt-3 max-w-md mx-auto">
          {canPayOnchain
            ? "Your USDC will be locked in escrow on Celo the moment you publish. Hustlers get paid automatically on release."
            : "Connect your Celo wallet to post jobs with on-chain USDC escrow."}
        </p>

        {celoEnabled && !canPayOnchain && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-amber-700">Connect your Celo wallet to pay with USDC escrow.</p>
            <WalletConnectButton />
          </div>
        )}

        {canPayOnchain && (
          <div className="mt-6 max-w-sm mx-auto">
            <CeloWalletBadge />
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-card border shadow-elevated p-8 sm:p-12">
        {/* Balance error banner */}
        {balanceError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{balanceError}</span>
          </div>
        )}

        {manualMode ? (
          <form onSubmit={handleManualSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Fix my generator"
                className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Explain the job so the hustler understands it better..."
                rows={4}
                className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Budget (USDC)
                  {canPayOnchain && !balanceLoading && (
                    <span className="ml-2 text-emerald-600 normal-case font-normal">
                      — {usdcBalance.toFixed(2)} available
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    setBalanceError(null);
                  }}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5.00"
                  className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
                />
                {canPayOnchain && budget && Number(budget) > 0 && usdcRaw < usdcToTokenWei(Number(budget)) && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Insufficient balance
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                  placeholder="e.g. Lekki Phase 1"
                  className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setManualMode(false); setBalanceError(null); }}
                className="flex-1 rounded-full border py-3.5 text-sm font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 rounded-full bg-primary text-primary-foreground py-3.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-70"
              >
                {createMutation.isPending ? "Posting…" : canPayOnchain ? "Lock USDC & Post Job" : "Post Job"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setManualMode(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
              >
                <Keyboard className="h-4 w-4" /> Type it manually
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <button
                onClick={start}
                disabled={phase !== "idle" && phase !== "locked"}
                className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-voice text-voice-foreground shadow-elevated flex items-center justify-center hover:scale-105 transition disabled:opacity-90"
              >
                <Mic className="h-8 w-8 sm:h-10 sm:w-10" />
                {(phase === "recording" || phase === "processing") && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-voice animate-voice-pulse" />
                    <span className="absolute inset-0 rounded-full bg-voice animate-voice-pulse" style={{ animationDelay: "0.6s" }} />
                  </>
                )}
              </button>
              <div className="mt-6 font-display text-xl font-semibold">
                {phase === "idle" && "Speak Task"}
                {phase === "recording" && "Listening…"}
                {phase === "processing" && "Parsing intent…"}
                {phase === "result" && "Here's your task"}
                {phase === "locked" && "Escrow locked"}
              </div>
              <div className="text-sm text-muted-foreground mt-1 max-w-sm">
                {phase === "idle" && 'Try: "I need someone to service my generator in Lekki for 25 USDC".'}
                {phase === "recording" && "Aethex Speech-to-Text active"}
                {phase === "processing" && "Gemini structuring fields"}
                {phase === "result" && "Review and lock escrow to publish to nearby hustlers."}
                {phase === "locked" && "Hustlers in your area have been notified."}
              </div>
            </div>

            {/* Waveform */}
            {(phase === "recording" || phase === "processing") && (
              <div className="mt-10 flex items-end justify-center gap-1.5 h-20">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-voice/70 animate-wave"
                    style={{
                      height: `${10 + Math.abs(Math.sin(i / 2.5)) * 80}%`,
                      animationDelay: `${i * 40}ms`,
                      animationDuration: `${0.7 + (i % 4) * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {(phase === "result" || phase === "locked") && (
              <div className="mt-10 animate-fade-up">
                <div className="rounded-2xl border bg-muted/40 p-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Sparkles className="h-3.5 w-3.5 text-voice" /> Structured by Gemini
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field icon={Tag} label="Category" value={voiceResult?.category || "Repairs"} />
                    <Field icon={Wallet} label="Budget" value={usdc(voiceResult?.budget || 25)} />
                    <Field icon={MapPin} label="Location" value={voiceResult?.neighbourhood || "Lekki Phase 1"} />
                  </div>
                  <div className="mt-5 rounded-xl bg-card border p-4 text-sm text-muted-foreground italic">
                    "
                    {voiceResult?.description ||
                      "I need someone to come service my Tiger generator today in Lekki Phase 1, budget around 25 USDC."}
                    "
                  </div>
                </div>

                {/* Balance check warning for voice result */}
                {canPayOnchain && !balanceLoading && usdcRaw < usdcToTokenWei(voiceResult?.budget || 25) && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Insufficient USDC — you have {usdcBalance.toFixed(2)} USDC but need {(voiceResult?.budget || 25).toFixed ? (voiceResult?.budget || 25).toFixed(2) : voiceResult?.budget || 25} USDC
                  </div>
                )}

                <button
                  onClick={handleVoiceLock}
                  disabled={phase === "locked" || createMutation.isPending}
                  className="mt-6 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-90"
                >
                  {phase === "locked" || createMutation.isPending ? (
                    <>
                      <Check className="h-4 w-4" /> {createMutation.isPending ? "Locking escrow…" : "Locked · Releasing to feed"}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> {canPayOnchain ? "Lock USDC escrow on Celo" : "Lock Escrow to Confirm"}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof Mic; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display font-semibold">{value}</div>
    </div>
  );
}
