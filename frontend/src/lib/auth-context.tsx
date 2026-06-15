import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";
import { toast } from "sonner";

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userRole: "customer" | "hustler" | null;
  user: any;
  token: string | null;
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  loginWithWallet: (data: { address: string; signature: string; nonce: string; role?: string; name?: string }) => Promise<any>;
  logout: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  areas: string[];
  setAreas: (areas: string[]) => void;
  refreshUser: () => Promise<any>;
  loginWithToken: (accessToken: string) => Promise<any>;
  updateDemoBalance: (role: string, amount: number) => void;
  addDemoTransaction: (txn: any) => void;
  usesOnchainWallet: boolean;
};


const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichUser(u: any) {
  if (!u) return u;
  if (u.wallet_address) return { ...u, usesOnchainWallet: true };

  const isCustomer = u.role === "customer";
  if (isCustomer && !localStorage.getItem("demo_customer_balance")) {
    localStorage.setItem("demo_customer_balance", "1000000");
  }
  if (!isCustomer && !localStorage.getItem("demo_hustler_balance")) {
    localStorage.setItem("demo_hustler_balance", "0");
  }

  const balance = parseInt(localStorage.getItem(isCustomer ? "demo_customer_balance" : "demo_hustler_balance") || "0");
  const trustScore = parseInt(localStorage.getItem("demo_hustler_trust") || "820");
  return { ...u, wallet_balance: balance, trust_score: trustScore, usesOnchainWallet: false };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!token);
  const [language, setLanguage] = useState("English");
  const [areas, setAreas] = useState<string[]>([]);


  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.info("Logged out successfully");
  };


  const refreshUser = async () => {
    const u = await api.getMe();
    setUser(enrichUser(u));
    return enrichUser(u);
  };

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      refreshUser()
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const loginWithToken = async (accessToken: string) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    return refreshUser();
  };

  const login = async (data: any) => {
    const res = await api.login(data);
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    return refreshUser();
  };

  const register = async (data: any) => {
    await api.register(data);
    return await login({ username: data.email, password: data.password });
  };

  const loginWithWallet = async (data: { address: string; signature: string; nonce: string; role?: string; name?: string }) => {
    const res = await api.walletAuth(data);
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    return refreshUser();
  };

  const updateDemoBalance = (role: string, amount: number) => {
    if (user?.wallet_address) return;
    const key = role === "customer" ? "demo_customer_balance" : "demo_hustler_balance";
    const current = parseInt(localStorage.getItem(key) || (role === "customer" ? "1000000" : "0"));
    const newBalance = current + Number(amount);
    localStorage.setItem(key, newBalance.toString());
    setUser((prev: any) => (prev && prev.role === role ? { ...prev, wallet_balance: newBalance } : prev));
  };

  const addDemoTransaction = (txn: any) => {
    if (user?.wallet_address) return;
    const txns = JSON.parse(localStorage.getItem("demo_transactions") || "[]");
    txns.unshift(txn);
    localStorage.setItem("demo_transactions", JSON.stringify(txns));
    const trust = parseInt(localStorage.getItem("demo_hustler_trust") || "820");
    const newTrust = Math.min(1000, trust + 15);
    localStorage.setItem("demo_hustler_trust", newTrust.toString());
    setUser((prev: any) => (prev?.role === "hustler" ? { ...prev, trust_score: newTrust } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        isLoading,
        userRole: user?.role || null,
        user,
        token,
        login,
        register,
        loginWithWallet,
        logout,
        language,
        setLanguage,
        areas,
        setAreas,
        refreshUser,
        loginWithToken,
        updateDemoBalance,
        addDemoTransaction,
        usesOnchainWallet: Boolean(user?.wallet_address),

      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
