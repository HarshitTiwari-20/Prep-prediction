"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "./WalletContext";
import { validateWalletAddress } from "./AddressValidator";

export default function OKXNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    walletAddress,
    setWalletAddress,
    selectedChain,
    setSelectedChain
  } = useWallet();

  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  const connectWallet = async () => {
    setIsWalletConnecting(true);
    try {
      let address = "";
      
      if (selectedChain === "EVM") {
        // Prioritize injected OKX Wallet provider, fallback to standard ethereum
        const provider = (window as any).okxwallet || (window as any).ethereum;
        
        if (provider) {
          const accounts = await provider.request({
            method: "eth_requestAccounts"
          });
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          }
        } else {
          // Hardhat local node / mock fallback if no extension found
          address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        }
      } else if (selectedChain === "Solana") {
        // Prioritize OKX Solana provider
        const solana = (window as any).okxwallet?.solana || (window as any).solana;
        
        if (solana) {
          const resp = await solana.connect();
          if (resp && resp.publicKey) {
            address = resp.publicKey.toString();
          } else if (resp && resp.address) {
            address = resp.address;
          }
        } else {
          address = "8G2h1Pq9mBv5xY9aZ4pQeR1sT3uV5wY7zA9bC1dD2eEF";
        }
      } else if (selectedChain === "TON") {
        // Prioritize OKX TON provider
        const ton = (window as any).okxwallet?.ton || (window as any).ton;
        
        if (ton) {
          const accounts = await ton.send("ton_requestAccounts");
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          }
        } else {
          address = "EQD4g7YpZ5xY9aZ4pQeR1sT3uV5wY7zA9bC1dD2eEF3g4h";
        }
      }

      if (address) {
        // Validate wallet address format using Zod schema
        const validation = validateWalletAddress(address, selectedChain);
        if (!validation.success) {
          alert(`Wallet Address Validation Failed: ${validation.error}`);
          return;
        }

        setWalletAddress(address);
        
        // Redirect to trade dashboard upon successful connection
        if (pathname === "/") {
          router.push("/trade");
        }
      } else {
        alert(`No accounts found. Please unlock your OKX Wallet for ${selectedChain} and try again.`);
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      alert(`Wallet connection rejected: ${error.message || error}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    router.push("/");
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="border-b border-[#1E1E1E] bg-[#0A0A0A]/90 sticky top-0 z-50 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo - Prep Prediction */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-[#FFD500] text-black font-extrabold px-2.5 py-1 text-sm tracking-tighter uppercase rounded-sm">
              Prep
            </span>
            <span className="font-bold text-white text-lg tracking-tight">
              Prediction
            </span>
            <span className="text-[10px] bg-[#00D180]/20 text-[#00D180] px-1.5 py-0.5 rounded font-mono font-semibold">
              AI Guard
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/"
              className={`hover:text-white transition-colors ${
                pathname === "/" ? "text-white font-medium" : "text-[#8E8E8E]"
              }`}
            >
              Overview
            </Link>
            {walletAddress && (
              <>
                <Link
                  href="/trade"
                  className={`hover:text-white transition-colors ${
                    pathname === "/trade" ? "text-white font-medium" : "text-[#8E8E8E]"
                  }`}
                >
                  Trade Pools
                </Link>
                <Link
                  href="/history"
                  className={`hover:text-white transition-colors ${
                    pathname === "/history" ? "text-white font-medium" : "text-[#8E8E8E]"
                  }`}
                >
                  History & P&L
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-4">
          {/* Chain Selector (visible only when disconnected) */}
          {!walletAddress ? (
            <div className="flex bg-[#0E0E0E] p-0.5 rounded-lg border border-[#1E1E1E] text-xs">
              {["EVM", "Solana", "TON"].map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSelectedChain(chain)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    selectedChain === chain
                      ? "bg-[#1E1E1E] text-white"
                      : "text-[#8E8E8E] hover:text-white"
                  }`}
                >
                  {chain}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs bg-[#1E1E1E] text-white border border-[#2E2E2E] px-2.5 py-1.5 rounded-md font-semibold font-mono">
              {selectedChain}
            </span>
          )}

          {/* Wallet Connection Trigger */}
          {walletAddress ? (
            <div className="flex items-center bg-[#0E0E0E] border border-[#1E1E1E] rounded-lg p-0.5 pl-3">
              <span className="text-xs font-mono font-medium text-white mr-2">
                {formatAddress(walletAddress)}
              </span>
              <button
                onClick={disconnectWallet}
                className="bg-[#2E2E2E] hover:bg-[#3E3E3E] text-white text-xs px-2.5 py-1.5 rounded-md transition-all animate-fade-in"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isWalletConnecting}
              className="bg-[#FFD500] hover:bg-[#FFE359] text-black font-semibold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {isWalletConnecting ? (
                <span className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
