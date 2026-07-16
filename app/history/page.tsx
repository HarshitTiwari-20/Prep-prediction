"use client";

import React, { useState, useEffect } from "react";
import OKXNavbar from "@/components/OKXNavbar";
import OKXFooter from "@/components/OKXFooter";
import { useWallet } from "@/components/WalletContext";

interface BetItem {
  address: string;
  position: "UP" | "DOWN";
  amount: string;
  asset: string;
  timestamp: string;
  status: "Win" | "Lose" | "Pending" | "Claimed";
  roundId: number;
  multiplier?: string;
  pool: string;
}

export default function HistoryPage() {
  const { walletAddress, selectedChain } = useWallet();
  const [userBets, setUserBets] = useState<BetItem[]>([]);

  // Stats calculation
  const [stats, setStats] = useState({
    totalStaked: 0,
    totalProfit: 0,
    totalLoss: 0,
    netPnL: 0,
    winRate: 0
  });

  // Load bets from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedBets = localStorage.getItem("okx_user_bets");
      if (storedBets) {
        try {
          const parsed: BetItem[] = JSON.parse(storedBets);
          setUserBets(parsed);
          calculateStats(parsed);
        } catch (e) {
          console.error("Failed to parse user bets", e);
        }
      }
    }
  }, []);

  const calculateStats = (bets: BetItem[]) => {
    let staked = 0;
    let profit = 0;
    let loss = 0;
    let wins = 0;
    let resolvedCount = 0;

    bets.forEach((bet) => {
      const amt = parseFloat(bet.amount) || 0;
      staked += amt;

      if (bet.status === "Win" || bet.status === "Claimed") {
        wins++;
        resolvedCount++;
        const mult = parseFloat(bet.multiplier || "1.80") - 1.0;
        profit += amt * mult;
      } else if (bet.status === "Lose") {
        resolvedCount++;
        loss += amt;
      }
    });

    const net = profit - loss;
    const wr = resolvedCount > 0 ? (wins / resolvedCount) * 100 : 0;

    setStats({
      totalStaked: staked,
      totalProfit: profit,
      totalLoss: loss,
      netPnL: net,
      winRate: Math.round(wr)
    });
  };

  const handleClaim = (betRoundId: number) => {
    let payoutAmount = 0;
    let assetName = "ETH";

    const updated = userBets.map((bet) => {
      if (bet.roundId === betRoundId && bet.status === "Win") {
        const amt = parseFloat(bet.amount) || 0;
        const mult = parseFloat(bet.multiplier || "1.80");
        payoutAmount = amt * mult;
        assetName = bet.asset;
        return { ...bet, status: "Claimed" as const };
      }
      return bet;
    });

    // Update state & storage
    setUserBets(updated);
    localStorage.setItem("okx_user_bets", JSON.stringify(updated));
    calculateStats(updated);

    // Update simulated balance in localStorage
    if (typeof window !== "undefined") {
      const balanceKey = `okx_sim_balance_${assetName}`;
      const storedBal = localStorage.getItem(balanceKey);
      const currentBal = storedBal ? parseFloat(storedBal) : 0.0;
      localStorage.setItem(balanceKey, (currentBal + payoutAmount).toString());
    }

    alert(`Claim successful! Payout of ${payoutAmount.toFixed(3)} ${assetName} (Stake + Winnings) added back to your ${selectedChain} Wallet balance.`);
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your prediction history?")) {
      setUserBets([]);
      localStorage.removeItem("okx_user_bets");
      // Reset simulated balances
      ["ETH", "SOL", "TON", "USDC", "USDT"].forEach((asset) => {
        localStorage.removeItem(`okx_sim_balance_${asset}`);
      });
      setStats({
        totalStaked: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnL: 0,
        winRate: 0
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white">
      <OKXNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Prediction History</h1>
            <p className="text-xs text-[#8E8E8E] mt-1">
              Review your past pool stakes, resolutions, and net earnings.
            </p>
          </div>
          {userBets.length > 0 && (
            <button
              onClick={clearHistory}
              className="border border-[#FF4D4D]/30 hover:border-[#FF4D4D] text-[#FF4D4D] text-xs px-3 py-1.5 rounded-lg transition-all"
            >
              Clear History
            </button>
          )}
        </div>

        {/* Profit & Loss (P&L) Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-5">
            <span className="text-xs text-[#8E8E8E] font-medium uppercase tracking-wider block">Total Staked</span>
            <div className="text-2xl font-extrabold mt-1 text-white">
              {stats.totalStaked.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-5">
            <span className="text-xs text-[#8E8E8E] font-medium uppercase tracking-wider block">Profit (Gross)</span>
            <div className="text-2xl font-extrabold mt-1 text-[#00D180]">
              +{stats.totalProfit.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-5">
            <span className="text-xs text-[#8E8E8E] font-medium uppercase tracking-wider block">Loss (Gross)</span>
            <div className="text-2xl font-extrabold mt-1 text-[#FF4D4D]">
              -{stats.totalLoss.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-5 okx-glow-yellow">
            <span className="text-xs text-[#8E8E8E] font-medium uppercase tracking-wider block">Net Profit / Loss (P&L)</span>
            <div className={`text-2xl font-extrabold mt-1 ${stats.netPnL >= 0 ? "text-[#00D180]" : "text-[#FF4D4D]"}`}>
              {stats.netPnL >= 0 ? "+" : ""}{stats.netPnL.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Win Rate Meter */}
        <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-5 mb-8 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Accuracy Win Rate</div>
            <div className="text-xs text-[#8E8E8E] mt-1">Percentage of correct pool predictions.</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-black text-white">{stats.winRate}%</div>
            </div>
            <div className="w-32 bg-[#1E1E1E] h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#FFD500] h-full transition-all duration-1000"
                style={{ width: `${stats.winRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Detailed Staking Table */}
        <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1E1E1E] text-[#8E8E8E]">
                  <th className="pb-3 font-medium">Round ID</th>
                  <th className="pb-3 font-medium">Trading Pool</th>
                  <th className="pb-3 font-medium text-center">Direction</th>
                  <th className="pb-3 font-medium text-right">Staked</th>
                  <th className="pb-3 font-medium text-right">Time</th>
                  <th className="pb-3 font-medium text-center">Outcome</th>
                  <th className="pb-3 font-medium text-right">Claim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]/50 font-mono text-[#8E8E8E]">
                {userBets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8E8E8E]">
                      You have no prediction history. Placed stakes will appear here.
                    </td>
                  </tr>
                ) : (
                  userBets.map((bet, index) => (
                    <tr key={index} className="hover:bg-[#1E1E1E]/10 transition-colors">
                      <td className="py-4 text-white">#{bet.roundId}</td>
                      <td className="py-4 text-white font-bold">{bet.pool}/USDT</td>
                      <td className="py-4 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          bet.position === "UP" ? "bg-[#00D180]/15 text-[#00D180]" : "bg-[#FF4D4D]/15 text-[#FF4D4D]"
                        }`}>
                          {bet.position}
                        </span>
                      </td>
                      <td className="py-4 text-right text-white">
                        {bet.amount} {bet.asset}
                      </td>
                      <td className="py-4 text-right">{bet.timestamp}</td>
                      <td className="py-4 text-center">
                        {bet.status === "Pending" ? (
                          <span className="text-[#FFD500] font-semibold">Active</span>
                        ) : bet.status === "Win" ? (
                          <span className="text-[#00D180] font-semibold font-sans">Won</span>
                        ) : bet.status === "Claimed" ? (
                          <span className="text-[#8E8E8E] font-semibold font-sans">Claimed</span>
                        ) : (
                          <span className="text-[#FF4D4D] font-semibold font-sans">Lost</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        {bet.status === "Win" ? (
                          <button
                            onClick={() => handleClaim(bet.roundId)}
                            className="bg-[#00D180] hover:bg-[#00E58C] text-black font-extrabold text-[10px] px-2.5 py-1 rounded transition-all active:scale-95"
                          >
                            Claim Payout
                          </button>
                        ) : bet.status === "Claimed" ? (
                          <span className="text-[#00D180] text-[10px] font-semibold font-sans">Payout Claimed</span>
                        ) : bet.status === "Pending" ? (
                          <span className="text-[#8E8E8E] text-[10px]">Active Round</span>
                        ) : (
                          <span className="text-[#8E8E8E] text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <OKXFooter />
    </div>
  );
}
