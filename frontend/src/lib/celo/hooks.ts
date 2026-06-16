import { useCallback } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { celoSepolia } from "wagmi/chains";
import { maxUint256 } from "viem";
import { api } from "@/lib/api";
import { escrowAbi, erc20Abi, registryAbi } from "./abis";
import { CELO_SEPOLIA_CHAIN_ID, usdcToTokenWei, roleToRegistryEnum, type CeloConfig } from "./config";

// ─── Canonical deployed addresses (chain-11142220.json) ──────────────────────
// These are the source of truth. The backend /celo/config may have stale
// env vars on Render. If config provides a value we use it, but these are
// the known-correct fallbacks from the latest hardhat deployment.
const DEPLOYMENT_ESCROW   = "0x61D4fd78A858D0A74397fAe8F89b0bb7A2576e65" as `0x${string}`;
const DEPLOYMENT_USDC     = "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as `0x${string}`;
// ─────────────────────────────────────────────────────────────────────────────

export function useCeloWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const connectWallet = useCallback(async () => {
    const connector = connectors[0];
    if (!connector) throw new Error("No wallet found. Install MetaMask or Valora.");
    await connect({ connector, chainId: CELO_SEPOLIA_CHAIN_ID });
    if (chainId && chainId !== CELO_SEPOLIA_CHAIN_ID) {
      await switchChainAsync({ chainId: CELO_SEPOLIA_CHAIN_ID });
    }
  }, [chainId, connect, connectors, switchChainAsync]);

  return {
    address,
    isConnected,
    chainId,
    connectWallet,
    disconnect,
    isConnecting,
    onCeloSepolia: chainId === CELO_SEPOLIA_CHAIN_ID,
  };
}

export function useCeloContracts(config: CeloConfig | null) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const waitForTx = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) throw new Error("Chain client unavailable");
      return publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient],
  );

  const fundEscrow = useCallback(
    async (taskRef: `0x${string}`, budget: number) => {
      // Always use the deployment-file addresses — the backend Render env may
      // have stale values from an older deployment.
      const escrowAddress = DEPLOYMENT_ESCROW;
      const usdcAddress   = DEPLOYMENT_USDC;

      if (!address) throw new Error("Wallet not connected");
      const amount = usdcToTokenWei(budget);
      // Check allowance on the Celo Sepolia USDC contract
      const allowance = await publicClient!.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, escrowAddress],
      });

      if ((allowance as bigint) < amount) {
        // Approve the escrow to spend USDC on behalf of the user
        const approveHash = await writeContractAsync({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [escrowAddress, maxUint256],
          chainId: celoSepolia.id,
        });
        await waitForTx(approveHash);
      }

      // Call createEscrow — the contract will safeTransferFrom USDC into itself
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: "createEscrow",
        args: [taskRef, amount],
        chainId: celoSepolia.id,
      });
      await waitForTx(hash);
      return hash;
    },
    [publicClient, writeContractAsync, address, waitForTx],
  );

  const assignHustler = useCallback(
    async (escrowId: number, hustlerWallet: `0x${string}`) => {
      if (!config?.escrowAddress) throw new Error("Escrow contract not configured");
      const hash = await writeContractAsync({
        address: config.escrowAddress,
        abi: escrowAbi,
        functionName: "assignHustler",
        args: [BigInt(escrowId), hustlerWallet],
        chainId: celoSepolia.id,
      });
      await waitForTx(hash);
      return hash;
    },
    [config, writeContractAsync, waitForTx],
  );

  const releaseEscrow = useCallback(
    async (escrowId: number) => {
      if (!config?.escrowAddress) throw new Error("Escrow contract not configured");
      const hash = await writeContractAsync({
        address: config.escrowAddress,
        abi: escrowAbi,
        functionName: "releaseEscrow",
        args: [BigInt(escrowId)],
        chainId: celoSepolia.id,
      });
      await waitForTx(hash);
      return hash;
    },
    [config, writeContractAsync, waitForTx],
  );

  const registerOnChain = useCallback(
    async (role: string, displayName: string) => {
      if (!config?.registryAddress) throw new Error("Registry contract not configured");
      const hash = await writeContractAsync({
        address: config.registryAddress,
        abi: registryAbi,
        functionName: "register",
        args: [roleToRegistryEnum(role), displayName],
        chainId: celoSepolia.id,
      });
      await waitForTx(hash);
      return hash;
    },
    [config, writeContractAsync, waitForTx],
  );

  const signWalletChallenge = useCallback(async (address: string, action: "link" | "register" | "login" | "auth") => {
    const challenge = await api.getWalletChallenge(address, action);
    const provider = (window as any).ethereum;
    if (!provider) throw new Error("Wallet not available");
    const signature = await provider.request({
      method: "personal_sign",
      params: [challenge.message, address],
    });
    return { ...challenge, signature };
  }, []);

  return { fundEscrow, assignHustler, releaseEscrow, registerOnChain, signWalletChallenge };
}
