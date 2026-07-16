"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface WalletContextType {
  walletAddress: string;
  setWalletAddress: (addr: string) => void;
  selectedChain: string;
  setSelectedChain: (chain: string) => void;
  balances: Record<string, number>;
  setBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("EVM");
  const [balances, setBalances] = useState<Record<string, number>>({
    ETH: 0.0,
    SOL: 0.0,
    TON: 0.0,
    USDC: 0.0,
    USDT: 0.0
  });

  const pathname = usePathname();
  const router = useRouter();

  // Authentication gate: Redirect to "/" if not connected and trying to access trade/history
  useEffect(() => {
    if (!walletAddress && pathname !== "/") {
      router.push("/");
    }
  }, [walletAddress, pathname, router]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        setWalletAddress,
        selectedChain,
        setSelectedChain,
        balances,
        setBalances
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
