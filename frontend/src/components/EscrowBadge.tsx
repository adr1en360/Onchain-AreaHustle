type Props = {
  paymentMode?: string;
  escrowStatus?: string | null;
  compact?: boolean;
};

export function EscrowBadge({ paymentMode, escrowStatus, compact }: Props) {
  if (paymentMode !== "onchain") return null;

  const label =
    escrowStatus === "released"
      ? "Paid on Celo"
      : escrowStatus === "assigned"
        ? "Escrow assigned"
        : escrowStatus === "funded"
          ? "USDC locked"
          : "Celo escrow";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 font-semibold uppercase tracking-widest ${
        compact ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
    >
      {label}
    </span>
  );
}
