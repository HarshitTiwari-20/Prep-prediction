"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletContext";
import OKXNavbar from "@/components/OKXNavbar";
import OKXFooter from "@/components/OKXFooter";

export default function Home() {
  const { walletAddress } = useWallet();

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white">
      <OKXNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b border-[#1E1E1E]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,213,0,0.08),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-[#FFD500]/10 border border-[#FFD500]/20 rounded-full px-3 py-1 text-xs text-[#FFD500] font-semibold mb-6">
            <span>OKX.AI Genesis Hackathon Project</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-none">
            Staking-Based Price Predictions
            <span className="block mt-3 text-[#FFD500]">Guarded by AI.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-[#8E8E8E] max-w-2xl mx-auto">
            Stake native tokens, predict price movements, and earn up to **80% increased payouts** from the losing pool. Powered by OKX Onchain OS and Gemini bot detection.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            {walletAddress ? (
              <Link
                href="/trade"
                className="w-full sm:w-auto bg-[#FFD500] hover:bg-[#FFE359] text-black font-bold px-8 py-4 rounded-xl text-base transition-all active:scale-95 shadow-[0_0_20px_rgba(255,213,0,0.2)]"
              >
                Go to Trading Dashboard
              </Link>
            ) : (
              <button
                onClick={() => alert("Please connect your wallet at the top right to start trading!")}
                className="w-full sm:w-auto bg-[#FFD500] hover:bg-[#FFE359] text-black font-bold px-8 py-4 rounded-xl text-base transition-all active:scale-95 shadow-[0_0_20px_rgba(255,213,0,0.2)]"
              >
                Connect Wallet to Trade
              </button>
            )}
            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-[#0E0E0E] hover:bg-[#1E1E1E] border border-[#1E1E1E] text-white font-medium px-8 py-4 rounded-xl text-base transition-all"
            >
              How It Works
            </a>
          </div>

          {/* Stats Bar */}
          <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border border-[#1E1E1E] bg-[#0E0E0E]/50 rounded-2xl p-6 backdrop-blur-sm">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-white">$148,250+</div>
              <div className="text-xs text-[#8E8E8E] mt-1">Total Staked Volume</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-[#00D180]">80%</div>
              <div className="text-xs text-[#8E8E8E] mt-1">Winner Pool Share</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-[#FFD500]">20%</div>
              <div className="text-xs text-[#8E8E8E] mt-1">Platform Backed Fee</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-white">99.9%</div>
              <div className="text-xs text-[#8E8E8E] mt-1">AI Trust Score Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="py-20 border-b border-[#1E1E1E]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Designed for Professional Predictors</h2>
            <p className="text-sm text-[#8E8E8E] mt-2">
              Combining Web3 liquidity pools with AI-driven compliance for maximum fairness.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-[#1E1E1E] bg-[#0E0E0E]/40 rounded-2xl p-8 hover:border-[#FFD500]/30 transition-all group">
              <div className="h-10 w-10 bg-[#FFD500]/10 rounded-xl flex items-center justify-center text-[#FFD500] font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                %
              </div>
              <h3 className="text-lg font-bold text-white">80% Winner Pool Payouts</h3>
              <p className="text-xs text-[#8E8E8E] mt-3 leading-relaxed">
                Stakers pool their funds. When a round finishes, correct predictions split 80% of the entire pool. Dynamic multipliers maximize payouts for contrarian bets.
              </p>
            </div>
            <div className="border border-[#1E1E1E] bg-[#0E0E0E]/40 rounded-2xl p-8 hover:border-[#00D180]/30 transition-all group">
              <div className="h-10 w-10 bg-[#00D180]/10 rounded-xl flex items-center justify-center text-[#00D180] font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                AI
              </div>
              <h3 className="text-lg font-bold text-white">Gemini AI Guard</h3>
              <p className="text-xs text-[#8E8E8E] mt-3 leading-relaxed">
                Built-in AI models evaluate prediction frequency, wallet history, and transaction timings to filter snipers and botnets, securing fair payout distributions for human stakers.
              </p>
            </div>
            <div className="border border-[#1E1E1E] bg-[#0E0E0E]/40 rounded-2xl p-8 hover:border-[#FF4D4D]/30 transition-all group">
              <div className="h-10 w-10 bg-[#FF4D4D]/10 rounded-xl flex items-center justify-center text-[#FF4D4D] font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                ⛓️
              </div>
              <h3 className="text-lg font-bold text-white">True Multichain Pools</h3>
              <p className="text-xs text-[#8E8E8E] mt-3 leading-relaxed">
                Staking is fully integrated across chains. Play with OKB/ETH on X Layer L2, SOL on Solana, and TON on TON Network. Supported directly by your OKX Wallet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-[#070707] border-b border-[#1E1E1E]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight">How To Play</h2>
            <p className="text-sm text-[#8E8E8E] mt-2">Get started in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-[#1E1E1E] border border-[#2E2E2E] flex items-center justify-center text-[#FFD500] font-extrabold text-base mb-6">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Connect & Choose</h3>
              <p className="text-xs text-[#8E8E8E] mt-3 max-w-xs leading-relaxed">
                Connect your OKX Wallet. Select your preferred blockchain network (EVM, Solana, TON) and your prediction timeframe (1m, 5m, 15m).
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-[#1E1E1E] border border-[#2E2E2E] flex items-center justify-center text-[#FFD500] font-extrabold text-base mb-6">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Stake & Predict</h3>
              <p className="text-xs text-[#8E8E8E] mt-3 max-w-xs leading-relaxed">
                Analyze the charts, choose whether you think the price goes UP or DOWN, stake a constant amount, and submit the onchain transaction.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-[#1E1E1E] border border-[#2E2E2E] flex items-center justify-center text-[#FFD500] font-extrabold text-base mb-6">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Claim Winnings</h3>
              <p className="text-xs text-[#8E8E8E] mt-3 max-w-xs leading-relaxed">
                Once the countdown hits zero, the AI Oracle resolves the round using live OKX market feeds. Claim your payout directly to your wallet!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(0,209,128,0.06),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center border border-[#1E1E1E] bg-[#0E0E0E]/40 rounded-3xl p-12 backdrop-blur-sm relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to join the prediction pools?</h2>
          <p className="mt-4 text-[#8E8E8E] max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of predictors and test your strategy. Leverage your OKX wallet on testnet now.
          </p>
          <div className="mt-8 flex justify-center">
            {walletAddress ? (
              <Link
                href="/trade"
                className="bg-[#FFD500] hover:bg-[#FFE359] text-black font-bold px-8 py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(255,213,0,0.15)]"
              >
                Launch Platform Dashboard
              </Link>
            ) : (
              <button
                onClick={() => alert("Please connect your wallet at the top right to start trading!")}
                className="bg-[#FFD500] hover:bg-[#FFE359] text-black font-bold px-8 py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(255,213,0,0.15)]"
              >
                Connect Wallet to Trade
              </button>
            )}
          </div>
        </div>
      </section>

      <OKXFooter />
    </div>
  );
}
