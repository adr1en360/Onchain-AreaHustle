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
import { CELO_SEPOLIA_CHAIN_ID, nairaToTokenWei, roleToRegistryEnum, type CeloConfig } from "./config";

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
      if (!config?.escrowAddress || !config.paymentToken || !address) {
        throw new Error("Celo contracts or wallet not configured");
      }
      const amount = nairaToTokenWei(budget);

      const allowance = await publicClient!.readContract({
        address: config.paymentToken,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, config.escrowAddress],
      });

      if (allowance < amount) {
        const approveHash = await writeContractAsync({
          address: config.paymentToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [config.escrowAddress, maxUint256],
          chainId: celoSepolia.id,
        });
        await waitForTx(approveHash);
      }

      const hash = await writeContractAsync({
        address: config.escrowAddress,
        abi: escrowAbi,
        functionName: "createEscrow",
        args: [taskRef, amount],
        chainId: celoSepolia.id,
      });
      await waitForTx(hash);
      return hash;
    },
    [config, publicClient, writeContractAsync, address, waitForTx],
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

  const signWalletChallenge = useCallback(async (address: string, action: "link" | "register") => {
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
