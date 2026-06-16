# TODO: Fix USDC Celo Sepolia not displaying + escrow flow

- [x] Update frontend CeloProvider config mapping so `paymentToken` is correctly passed into `useUsdcBalance` (fix undefined token / query enabling).

- [ ] If needed, adjust UI gating in CeloWalletBadge/EscrowBadge.
- [ ] Verify escrow flow: customer funds -> assigns -> hustler completes -> customer release (and add admin verification step if required by product spec).
- [ ] Run frontend lint/build + relevant hardhat tests.
