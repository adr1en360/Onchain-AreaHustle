import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { usdc } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Plus, CheckCircle, Clock, MapPin, Phone, Edit, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useOnchainPayments } from "@/lib/celo/payments";
import { CeloWalletBadge } from "@/components/CeloWalletBadge";
import { EscrowBadge } from "@/components/EscrowBadge";
import { useCeloContracts } from "@/lib/celo/hooks";

export const Route = createFileRoute("/customer-dashboard")({
  component: CustomerDashboard,
});

function CustomerDashboard() {
  const { isLoggedIn, isLoading: authLoading, userRole, user, updateDemoBalance, addDemoTransaction } = useAuth();
  const { canPayOnchain, config } = useOnchainPayments();
  const { assignHustler, releaseEscrow } = useCeloContracts(config);
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [editingJob, setEditingJob] = useState<any>(null);
  const [showPhoneModal, setShowPhoneModal] = useState<string | null>(null);

  const walletBalance = user?.wallet_balance || 0;

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || userRole !== "customer") nav({ to: "/" });
  }, [isLoggedIn, userRole, authLoading, nav]);

  const { data: myJobs = [], isLoading } = useQuery({
    queryKey: ["customerJobs"],
    queryFn: () => api.getMyTasks(),
    enabled: isLoggedIn,
    refetchInterval: 3000,
  });

  const { refreshUser } = useAuth();
  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setInterval(() => {
      if (refreshUser) refreshUser();
    }, 3000);
    return () => clearInterval(timer);
  }, [isLoggedIn, refreshUser]);

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const job = myJobs.find((j: any) => (j.id || j._id) == id);
      if (job?.payment_mode === "onchain") {
        if (job.escrow_status === "funded" && job.matched_hustler_wallet && job.escrow_id) {
          const assignTx = await assignHustler(job.escrow_id, job.matched_hustler_wallet);
          await api.confirmEscrowAssign(id, assignTx);
        }
        if (job.escrow_status === "assigned" && job.escrow_id) {
          const releaseTx = await releaseEscrow(job.escrow_id);
          await api.confirmEscrowRelease(id, releaseTx);
          return { onchain: true };
        }
        throw new Error("On-chain escrow is not ready for release");
      }
      return api.completeTask(id);
    },
    onSuccess: (data, variables) => {
      toast.success(data?.onchain ? "USDC payment released on Celo!" : "Payment released! Escrow funds transferred to Hustler.");

      const job = myJobs.find((j: any) => (j.id || j._id) == variables);
      if (job && job.payment_mode !== "onchain") {
        const amount = Number(job.budget) || 0;
      }

      queryClient.invalidateQueries({ queryKey: ["customerJobs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to confirm job.");
    },
  });

  const assignEscrowMutation = useMutation({
    mutationFn: async (job: any) => {
      const id = job.id || job._id;
      const tx = await assignHustler(job.escrow_id, job.matched_hustler_wallet);
      await api.confirmEscrowAssign(id, tx);
    },
    onSuccess: () => {
      toast.success("Hustler assigned on-chain — job is now active");
      queryClient.invalidateQueries({ queryKey: ["customerJobs"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to assign hustler on-chain"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => api.updateTask(data.id, data.payload),
    onSuccess: () => {
      toast.success("Job updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["customerJobs"] });
      queryClient.invalidateQueries({ queryKey: ["marketJobs"] });
      setEditingJob(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update job. Check backend PUT route.");
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(topUpAmount);
    if (amt && amt > 0) {
      updateDemoBalance("customer", amt);
      toast.success(`Successfully topped up ${usdc(amt)}`);
      setTopUpOpen(false);
      setTopUpAmount("");
    }
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(withdrawAmount);
    if (amt && amt > 0 && amt <= walletBalance) {
      updateDemoBalance("customer", -amt);
      toast.success(`Successfully withdrew ${usdc(amt)} to bank.`);
      setWithdrawOpen(false);
      setWithdrawAmount("");
    } else if (amt > walletBalance) {
      toast.error("Insufficient balance.");
    } else {
      toast.error("Invalid amount.");
    }
  };

  const handleConfirm = (id: string) => {
    confirmMutation.mutate(id);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingJob && editingJob.editsRemaining > 0) {
      const currentEdits = parseInt(localStorage.getItem(`edit_count_${editingJob.id}`) || "0", 10);
      localStorage.setItem(`edit_count_${editingJob.id}`, (currentEdits + 1).toString());

      updateMutation.mutate({
        id: editingJob.id,
        payload: {
          title: editingJob.title,
          description: editingJob.description,
          budget: editingJob.budget,
        },
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Customer Dashboard</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Manage your requests.</h1>
        </div>
        <button
          onClick={() => nav({ to: "/post-task" })}
          className="inline-flex items-center justify-center w-full sm:w-auto gap-2 rounded-full bg-voice text-voice-foreground px-5 py-3 text-sm font-semibold shadow-soft hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" /> Post New Task
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {canPayOnchain ? (
          <div className="md:col-span-1">
            <CeloWalletBadge />
          </div>
        ) : (
          <div className="rounded-3xl bg-primary text-primary-foreground p-7 shadow-soft flex flex-col justify-between">
            <div>
              <div className="text-xs opacity-70 uppercase tracking-widest">Demo Wallet (USDC)</div>
              <div className="font-display text-4xl font-bold mt-2 tabular-nums">
                <AnimatedNumber value={walletBalance} /> <span className="text-xl">USDC</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTopUpOpen(true)}
                className="flex-1 rounded-2xl bg-primary-foreground text-primary py-3 text-sm font-semibold hover:opacity-90 transition"
              >
                Top Up
              </button>
              <button
                onClick={() => setWithdrawOpen(true)}
                className="flex-1 rounded-2xl border border-primary-foreground/30 text-primary-foreground py-3 text-sm font-semibold hover:bg-primary-foreground/10 transition"
              >
                Withdraw
              </button>
            </div>
          </div>
        )}

        <div className={`${canPayOnchain ? "md:col-span-2" : "md:col-span-2"} rounded-3xl bg-card border shadow-soft p-7 flex flex-col justify-center text-center items-center`}>
          <h3 className="font-display text-xl font-bold mb-2">Need something done fast?</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">Use our voice-enabled task terminal to post a job in seconds.</p>
          <button
            onClick={() => nav({ to: "/post-task" })}
            className="rounded-full bg-muted border px-6 py-2.5 text-sm font-semibold hover:bg-muted/80 transition"
          >
            Try Voice Terminal
          </button>
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold mb-6">Active Jobs</h2>
      <div className="space-y-4">
        {myJobs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed rounded-3xl">
            {isLoading ? "Loading..." : "No active jobs found."}
          </div>
        ) : (
          myJobs.map((job: any, index: number) => {
            const jobId = job.id || job._id || index;
            const status = job.status || job.state || "open";
            const editsDone = parseInt(localStorage.getItem(`edit_count_${jobId}`) || "0", 10);
            const editsRemaining = Math.max(0, 3 - editsDone);
            let mockOffer = null;
            try {
              const str = localStorage.getItem(`mock_offer_${jobId}`);
              if (str) mockOffer = JSON.parse(str);
            } catch (e) {}

            const mockBudgetStr = localStorage.getItem(`mock_budget_${jobId}`);
            const displayBudget = mockBudgetStr ? parseInt(mockBudgetStr) : job.budget;

            return (
              <div
                key={jobId}
                className="rounded-3xl bg-card border shadow-soft p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${status === "open" || status === "pending" ? "bg-muted text-muted-foreground" : status === "matched" || status === "accepted" || status === "in_progress" || status === "active" ? "bg-primary/10 text-primary" : status === "awaiting_confirmation" ? "bg-orange-500/10 text-orange-600" : "bg-success/10 text-success"}`}
                    >
                      {status === "awaiting_confirmation"
                        ? "marked as done"
                        : status === "in_progress" || status === "active"
                          ? "in progress"
                          : status === "done" || status === "completed"
                            ? "completed"
                            : status}
                    </span>
                    <span className="text-xs text-muted-foreground">{job.category}</span>
                    <EscrowBadge paymentMode={job.payment_mode} escrowStatus={job.escrow_status} compact />
                  </div>
                  <h3 className="font-display text-lg font-bold">{job.title}</h3>
                  {job.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location || job.neighbourhood}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {usdc(displayBudget)} in Escrow
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                  {(status === "open" || status === "pending") && (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                      {mockOffer ? (
                        <div className="flex flex-col items-end gap-2 bg-muted/30 p-3 rounded-2xl border border-primary/20 animate-fade-up">
                           <span className="text-xs font-semibold text-primary">{mockOffer.hustlerName} offered <span className="font-display font-bold text-lg">{usdc(mockOffer.amount)}</span></span>
                           <div className="flex gap-2">
                             <button onClick={() => {
                               // Use mock budget update instead of calling backend since there's no PUT route
                               localStorage.setItem(`mock_budget_${jobId}`, mockOffer.amount.toString());
                               localStorage.removeItem(`mock_offer_${jobId}`);
                               toast.success("Offer accepted! Budget updated.");
                               // Force re-render
                               queryClient.invalidateQueries({ queryKey: ["customerJobs"] });
                             }} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition">Accept</button>
                             <button onClick={() => {
                               localStorage.removeItem(`mock_offer_${jobId}`);
                               queryClient.invalidateQueries({ queryKey: ["customerJobs"] });
                             }} className="rounded-full border bg-white px-4 py-1.5 text-xs font-semibold hover:bg-muted transition">Decline</button>
                           </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Waiting for Hustler...</span>
                      )}
                      <button
                        onClick={() => setEditingJob({ ...job, id: jobId, editsRemaining })}
                        disabled={editsRemaining <= 0}
                        className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit ({editsRemaining} left)
                      </button>
                    </div>
                  )}
                  {(status === "matched" || status === "accepted" || status === "in_progress" || status === "active") && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          Assigned: <span className="font-semibold">{job.assignedHustler || "A Hustler"}</span>
                          {(status === "in_progress" || status === "active") && (
                            <span className="ml-1 text-primary text-[10px] font-bold uppercase tracking-widest">(Working)</span>
                          )}
                        </div>
                        <button 
                          onClick={() => setShowPhoneModal((job as any).hustlerPhone || "+234 809 876 5432")}
                          className="h-10 w-10 shrink-0 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                      {job.payment_mode === "onchain" && job.escrow_status === "funded" && job.matched_hustler_wallet && (
                        <button
                          onClick={() => assignEscrowMutation.mutate(job)}
                          disabled={assignEscrowMutation.isPending}
                          className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted flex items-center gap-1.5"
                        >
                          <Link2 className="h-3.5 w-3.5" /> Assign hustler on-chain
                        </button>
                      )}
                      {job.payment_mode === "onchain" && job.escrow_status === "assigned" && (
                        <button
                          onClick={() => handleConfirm(job.id || job._id)}
                          disabled={confirmMutation.isPending}
                          className="rounded-full bg-[#183620] text-white px-4 py-2 text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Release USDC on Celo
                        </button>
                      )}

                    </div>
                  )}
                  {status === "awaiting_confirmation" && (
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                      <span className="text-xs text-orange-600 font-semibold italic px-1">
                        Hustler marked as done. Please review.
                        {job.payment_mode === "onchain" && " Release USDC from your wallet."}
                      </span>
                      <button
                        onClick={() => handleConfirm(job.id || job._id)}
                        disabled={confirmMutation.isPending}
                        className="w-full sm:w-auto justify-center rounded-full bg-[#183620] text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-soft animate-pulse"
                      >
                        <CheckCircle className="h-4 w-4" /> {job.payment_mode === "onchain" ? "Release USDC on Celo" : "Release Payment"}
                      </button>
                    </div>
                  )}
                  {(status === "done" || status === "completed") && (
                    <div className="text-sm text-success font-semibold sm:px-4 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Job Done
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {topUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80 animate-fade-up">
          <div className="relative w-full max-w-sm rounded-3xl bg-card border shadow-elevated p-8">
            <h2 className="font-display text-xl font-bold mb-4">Top Up Wallet</h2>
            <form onSubmit={handleTopUp}>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Amount (e.g. 10000)"
                className="w-full rounded-2xl border bg-muted/30 px-4 py-3 text-lg font-semibold mb-4 outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setTopUpOpen(false)} className="flex-1 rounded-full border py-3 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!topUpAmount}
                  className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Top Up USDC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80 animate-fade-up">
          <div className="relative w-full max-w-sm rounded-3xl bg-card border shadow-elevated p-8">
            <h2 className="font-display text-xl font-bold mb-2">Withdraw Funds</h2>
            <p className="text-xs text-muted-foreground mb-4">Available balance: {usdc(walletBalance)}</p>
            <form onSubmit={handleWithdraw}>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (e.g. 5000)"
                max={walletBalance}
                className="w-full rounded-2xl border bg-muted/30 px-4 py-3 text-lg font-semibold mb-4 outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setWithdrawOpen(false)} className="flex-1 rounded-full border py-3 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!withdrawAmount}
                  className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80 animate-fade-up">
          <div className="relative w-full max-w-sm rounded-3xl bg-card border shadow-elevated p-8 text-center">
            <button onClick={() => setShowPhoneModal(null)} className="absolute right-5 top-5 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-4">
              <Phone className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Contact Hustler</h2>
            <p className="text-muted-foreground text-sm mb-6">Reach out directly via call or WhatsApp.</p>
            <div className="rounded-2xl bg-muted/30 border py-5 mb-6">
              <div className="font-display text-3xl font-bold tracking-tight text-foreground">{showPhoneModal}</div>
            </div>
            <a href={`tel:${showPhoneModal}`} className="flex w-full items-center justify-center gap-2 rounded-full bg-success py-3.5 text-sm font-bold text-white shadow-soft hover:opacity-90 transition">
              <Phone className="h-4 w-4" /> Call Now
            </a>
          </div>
        </div>
      )}

      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80 animate-fade-up">
          <div className="relative w-full max-w-md rounded-3xl bg-card border shadow-elevated p-8">
            <button onClick={() => setEditingJob(null)} className="absolute right-6 top-6 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <h2 className="font-display text-xl font-bold mb-4">Edit Task</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={editingJob.title || ""}
                  onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                  required
                  className="mt-1 w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  required
                  rows={3}
                  className="mt-1 w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget (USDC)</label>
                <input
                  type="number"
                  value={editingJob.budget}
                  onChange={(e) => setEditingJob({ ...editingJob, budget: Number(e.target.value) })}
                  required
                  className="mt-1 w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground mt-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
