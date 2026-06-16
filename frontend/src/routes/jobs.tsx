import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { usdc } from "@/lib/format";
import { MapPin, Lock, Sparkles, Phone, CheckCircle, Search, X, Mic } from "lucide-react";
import { toast } from "sonner";
import { EscrowBadge } from "@/components/EscrowBadge";
import { useOnchainPayments } from "@/lib/celo/payments";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Job Feed · Onchain AreaHustle" }] }),
  component: Jobs,
});

function Jobs() {
  const { isLoggedIn, isLoading: authLoading, userRole, user, updateDemoBalance, addDemoTransaction } = useAuth();
  const { canPayOnchain } = useOnchainPayments();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"market" | "my-gigs">("market");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || userRole !== "hustler") nav({ to: "/" });
  }, [isLoggedIn, userRole, authLoading, nav]);

  const { data: marketJobs = [], isLoading: loadingMarket } = useQuery({
    queryKey: ["marketJobs", location],
    queryFn: () => api.getTasks({ status: "open", neighbourhood: location || undefined }),
    enabled: isLoggedIn && tab === "market",
  });

  const { data: myGigs = [], isLoading: loadingMyGigs } = useQuery({
    queryKey: ["myGigs"],
    queryFn: () => api.getMyTasks(),
    enabled: isLoggedIn && tab === "my-gigs",
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.matchTask(id),
    onSuccess: (data) => {
      if (data.requires_escrow_assign) {
        toast.success("Job accepted! Customer will assign you on-chain.");
      } else {
        toast.success("Job accepted! Contact details unlocked.");
      }
      queryClient.invalidateQueries({ queryKey: ["marketJobs"] });
      queryClient.invalidateQueries({ queryKey: ["myGigs"] });
      setTab("my-gigs");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.activateTask(id),
    onSuccess: () => {
      toast.success("Job started! You can now mark it as done when finished.");
      queryClient.invalidateQueries({ queryKey: ["myGigs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start job.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: (data, variables) => {
      if (data?.requires_escrow_release) {
        toast.success("Job marked done! Customer will release USDC on Celo.");
      } else {
        toast.success("Job marked as done! Payment successful!.");
      }

      const job = myGigs.find((j: any) => (j.id || j._id) == variables);
      if (job && job.payment_mode !== "onchain") {
        const amount = Number(job.budget) || 0;
        updateDemoBalance("customer", -amount);
        updateDemoBalance("hustler", amount);
        addDemoTransaction({
          amount: amount,
          desc: job.title || job.category || "Job completed",
          location: job.location || job.neighbourhood || "Local",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["myGigs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark job as done.");
    },
  });

  const handleAccept = (e: React.MouseEvent, job: any) => {
    e.stopPropagation();
    const id = job.id || job._id;
    if (job.payment_mode === "onchain" && !user?.wallet_address) {
      toast.error("Link your Celo wallet in the navbar to accept on-chain paid jobs.");
      return;
    }
    acceptMutation.mutate(id);
  };

  const handleActivate = (id: string) => {
    activateMutation.mutate(id);
  };

  const handleMarkDone = (id: string) => {
    completeMutation.mutate(id);
  };

  const filteredMarket = marketJobs.filter((j: any) => {
    const matchKeyword = keyword
      ? (j as any).title?.toLowerCase().includes(keyword.toLowerCase()) || j.category?.toLowerCase().includes(keyword.toLowerCase())
      : true;
    const matchLocation = location ? (j.location || j.neighbourhood)?.toLowerCase().includes(location.toLowerCase()) : true;
    return matchKeyword && matchLocation;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Job Feed</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Hustler Dashboard</h1>
        </div>
        <div className="flex bg-muted/50 rounded-full p-1 border">
          <button
            onClick={() => setTab("market")}
            className={`px-4 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition ${tab === "market" ? "bg-background shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            Market ({filteredMarket.length})
          </button>
          <button
            onClick={() => setTab("my-gigs")}
            className={`px-4 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition ${tab === "my-gigs" ? "bg-background shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            My Gigs ({myGigs.length})
          </button>
        </div>
      </div>

      {tab === "market" && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-card p-4 rounded-3xl shadow-soft border">
            <div className="flex-1 flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 focus-within:border-primary transition">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs by keyword..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="sm:w-64 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              <option value="">All Locations</option>
              <option value="Lekki Phase 1">Lekki Phase 1</option>
              <option value="Yaba">Yaba</option>
              <option value="Ikeja">Ikeja</option>
              <option value="Ajah">Ajah</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMarket.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-3xl">
                {loadingMarket ? "Loading open gigs..." : "No available jobs match your search."}
              </div>
            )}
            {filteredMarket.map((j: any, i: number) => (
              <article
                key={j.id || j._id || i}
                className="rounded-3xl bg-card border shadow-soft hover:shadow-elevated transition p-6 flex flex-col animate-fade-up relative overflow-hidden"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
                  {j.category}
                  <EscrowBadge paymentMode={j.payment_mode} compact />
                </div>
                <h3 className="font-display text-xl font-bold leading-snug mb-2">{(j as any).title || j.category}</h3>
                {j.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{j.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-5">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {j.location || j.neighbourhood}
                  </span>
                </div>
                <div className="border-t -mx-6 mb-4" />
                <div className="mt-auto flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Payout</div>
                    <div className="font-display text-2xl font-bold">{usdc(j.budget)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(j);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold hover:bg-muted transition"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => handleAccept(e, j)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition"
                    >
                      <Lock className="h-3.5 w-3.5" /> Accept
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "my-gigs" && (
        <div className="space-y-4">
          {myGigs.length === 0 && (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-3xl">
              You have no active gigs. Head to the market!
            </div>
          )}
          {myGigs.map((j: any, i: number) => {
            const status = j.status || j.state;
            return (
              <div
                key={j.id || j._id || i}
                className="rounded-3xl bg-card border shadow-soft p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up"
              >
                <div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-flex items-center gap-2 ${status === "accepted" || status === "matched" || status === "in_progress" || status === "active" ? "bg-primary/10 text-primary" : status === "awaiting_confirmation" ? "bg-orange-500/10 text-orange-600" : "bg-success/10 text-success"}`}
                  >
                    {status === "accepted" || status === "matched"
                      ? "Matched"
                      : status === "in_progress" || status === "active"
                        ? "In Progress"
                        : status === "awaiting_confirmation"
                          ? "Awaiting Confirmation"
                          : "Completed"}
                  </span>
                  <EscrowBadge paymentMode={j.payment_mode} escrowStatus={j.escrow_status} compact />
                  <h3 className="font-display text-xl font-bold">{(j as any).title || j.category}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1 text-foreground">
                      <MapPin className="h-4 w-4 text-primary" /> Exact Location Revealed
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-success">
                      {usdc(j.budget)} Locked
                      {j.payment_mode === "onchain" && (
                        <span className="text-[10px] font-normal text-emerald-600 ml-1">· Celo</span>
                      )}
                    </span>
                  </div>
                  {j.payment_mode === "onchain" && (j.escrow_fund_tx || j.escrow_assign_tx || j.escrow_release_tx) && (
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                      {j.escrow_fund_tx && (
                        <a href={`https://sepolia.celoscan.io/tx/${j.escrow_fund_tx}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 transition font-medium">Fund TX</a>
                      )}
                      {j.escrow_assign_tx && (
                        <a href={`https://sepolia.celoscan.io/tx/${j.escrow_assign_tx}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 transition font-medium">Assign TX</a>
                      )}
                      {j.escrow_release_tx && (
                        <a href={`https://sepolia.celoscan.io/tx/${j.escrow_release_tx}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 transition font-medium">Release TX</a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
                  {status === "accepted" || status === "matched" ? (
                    <>
                      <button className="flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition">
                        <Phone className="h-4 w-4" /> Call Customer
                      </button>
                      {j.payment_mode === "onchain" && j.escrow_status !== "assigned" ? (
                        <span className="text-xs text-muted-foreground italic px-2">
                          Waiting for customer to assign you on-chain…
                        </span>
                      ) : (
                        <button
                          onClick={() => handleActivate(j.id || j._id)}
                          disabled={activateMutation.isPending}
                          className="flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95 transition"
                        >
                          Start Job
                        </button>
                      )}
                    </>
                  ) : status === "in_progress" || status === "active" ? (
                    <>
                      <button className="flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition">
                        <Phone className="h-4 w-4" /> Call Customer
                      </button>
                      <button
                        onClick={() => handleMarkDone(j.id || j._id)}
                        disabled={completeMutation.isPending}
                        className="flex items-center justify-center gap-2 rounded-full bg-success text-success-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95 transition"
                      >
                        <CheckCircle className="h-4 w-4" /> Mark as Done
                      </button>
                    </>
                  ) : status === "awaiting_confirmation" ? (
                    <div className="text-sm text-muted-foreground italic px-4">Waiting for customer to release escrow...</div>
                  ) : (
                    <div className="text-sm text-success font-semibold px-4 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Payment Received
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80 animate-fade-up">
          <div className="relative w-full max-w-lg rounded-3xl bg-card border shadow-elevated p-8">
            <button onClick={() => setSelectedJob(null)} className="absolute right-6 top-6 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{selectedJob.category}</div>
            <h2 className="font-display text-2xl font-bold mb-4">{selectedJob.title || selectedJob.category}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" /> {selectedJob.location || selectedJob.neighbourhood}
            </div>
            <div className="bg-muted/30 rounded-2xl p-4 mb-6 text-sm text-foreground leading-relaxed">
              {selectedJob.description || "No detailed description provided by the customer."}
              {selectedJob.payment_mode === "onchain" && selectedJob.escrow_fund_tx && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <a
                    href={`https://sepolia.celoscan.io/tx/${selectedJob.escrow_fund_tx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 transition font-medium text-xs flex items-center gap-1.5"
                  >
                    View funding transaction on Celo Sepolia
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Payout</div>
                <div className="font-display text-2xl font-bold text-success">{usdc(selectedJob.budget)}</div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition">
                  <Phone className="h-4 w-4" /> Contact
                </button>
                <button
                  onClick={(e) => {
                    setSelectedJob(null);
                    handleAccept(e, selectedJob);
                  }}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95 transition"
                >
                  <Lock className="h-4 w-4" /> Accept Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => toast.info("Listening for query...", { description: "Speak now to search or ask about a job." })}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 bg-voice text-voice-foreground p-4 rounded-full shadow-elevated hover:scale-105 transition"
      >
        <Mic className="h-6 w-6" />
      </button>
    </div>
  );
}
