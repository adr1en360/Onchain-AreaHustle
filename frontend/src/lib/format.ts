/** Format a USDC amount (plain float, not wei) as e.g. "45.00 USDC" */
export const usdc = (n?: number) =>
  `${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
