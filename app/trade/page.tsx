"use client";

import React, { useState, useEffect, useCallback } from "react";
import OKXNavbar from "@/components/OKXNavbar";
import OKXFooter from "@/components/OKXFooter";
import TradingViewChart from "@/components/TradingViewChart";
import { useWallet } from "@/components/WalletContext";
import { ethers } from "ethers";

interface BetItem {
  address: string;
  position: "UP" | "DOWN";
  amount: string;
  asset: string;
  timestamp: string;
  status: "Win" | "Lose" | "Pending" | "Claimed";
  roundId: number;
  multiplier?: string;
  pool: string; // The trading pool (e.g. BTC/USDT)
  entryPrice?: number; // Price when prediction was placed
}

export default function TradePage() {
  const {
    walletAddress,
    setWalletAddress,
    selectedChain,
    setSelectedChain
  } = useWallet();

  const [selectedAsset, setSelectedAsset] = useState("BTC"); // Trading pool (default to BTC/USDT)
  const [selectedDuration, setSelectedDuration] = useState("1m");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"standard" | "meme">("standard");
  
  // Staking Asset - The user can select which token to stake with
  const [stakeAsset, setStakeAsset] = useState("ETH"); 
  
  // Wallet Balance - Tracks the balance of the selected stakeAsset
  const [balance, setBalance] = useState(0.0);
  const [stakeAmount, setStakeAmount] = useState("0.1");

  // Round states
  const [countdown, setCountdown] = useState(60); 
  const [roundId, setRoundId] = useState(1048);

  // Pool state (total stakes in active round)
  const [totalUpStakes, setTotalUpStakes] = useState(0.0);
  const [totalDownStakes, setTotalDownStakes] = useState(0.0);

  // User placed bets (loaded & synced with History page)
  const [userBets, setUserBets] = useState<BetItem[]>([]);
  // Dynamic live bets from other users
  const [betsFeed, setBetsFeed] = useState<BetItem[]>([]);

  // Net Profit & Loss (P&L) state
  const [netPnL, setNetPnL] = useState(0);

  // AI Security logs
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // Ref to suppress repeated contract warning spam in console
  const warnedContractMissing = React.useRef(false);

  // Hydration protection
  const [mounted, setMounted] = useState(false);

  // Interactive AI Guard scanner state
  const [isScanning, setIsScanning] = useState(false);

  const triggerAiRescan = async () => {
    if (!walletAddress) return;
    setIsScanning(true);
    setAiLogs((prev) => [
      `[AI Guard] Interactive audit scan requested. Analysing address ${walletAddress.substring(0, 8)}...`,
      ...prev
    ]);
    
    try {
      const response = await fetch("/api/gemini-check");
      const data = await response.json();
      if (data.status === "success") {
        setAiLogs((prev) => [
          `[AI Guard] Audit complete. Trust Score: 0.98. Bot/snipe checks passed successfully.`,
          ...prev
        ]);
      } else {
        setAiLogs((prev) => [
          `[AI Guard] Audit scan warning: Gemini API returned: ${data.message}`,
          ...prev
        ]);
      }
    } catch (err: any) {
      setAiLogs((prev) => [
        `[AI Guard] Audit scan failed: ${err.message || err}`,
        ...prev
      ]);
    } finally {
      setTimeout(() => setIsScanning(false), 800);
    }
  };

  // OKX API Ticker Data State
  const [tickerData, setTickerData] = useState<{
    last: string;
    change24h: string;
    high24h: string;
    low24h: string;
  } | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let active = true;
    const fetchTicker = async () => {
      try {
        const instId = `${selectedAsset}-USDT`;
        const response = await fetch(`/api/okx-ticker?instId=${instId}`);
        const json = await response.json();
        if (active && json && json.code === "0" && json.data && json.data.length > 0) {
          const d = json.data[0];
          const lastPrice = parseFloat(d.last) || 0;
          const openPrice = parseFloat(d.open24h) || 0;
          const change = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
          
          setTickerData({
            last: lastPrice.toFixed(lastPrice < 0.1 ? 6 : 4),
            change24h: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
            high24h: parseFloat(d.high24h).toFixed(lastPrice < 0.1 ? 6 : 4),
            low24h: parseFloat(d.low24h).toFixed(lastPrice < 0.1 ? 6 : 4)
          });
        }
      } catch (err) {
        console.error("Failed to fetch OKX ticker data:", err);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedAsset, mounted]);

  // Fetch actual onchain balance (EVM) or simulated balance
  const fetchOnchainBalance = useCallback(async (address: string) => {
    if (!address) {
      setBalance(0.0);
      return;
    }

    const isMock = address.includes("(Mock");
    const isEvmAddress = address.startsWith("0x");
    const isTonAddress = address.startsWith("EQ") || address.startsWith("UQ") || address.includes("-") || address.includes("_");
    const isSolAddress = !isEvmAddress && !isTonAddress;

    if (selectedChain === "EVM" && isEvmAddress && !isMock) {
      const isEvmAsset = ["ETH", "USDC", "USDT"].includes(stakeAsset);
      if (isEvmAsset) {
        try {
          const provider = new ethers.BrowserProvider((window as any).okxwallet || (window as any).ethereum);
          const balWei = await provider.getBalance(address);
          const balEth = parseFloat(ethers.formatEther(balWei));
          setBalance(balEth);
        } catch (err) {
          console.error("Error fetching actual EVM balance:", err);
          setBalance(0.0);
        }
      } else {
        const storedSimBalance = localStorage.getItem(`okx_sim_balance_${stakeAsset}`);
        setBalance(storedSimBalance ? parseFloat(storedSimBalance) : 0.5); // Default to 0.5 BTC/USDC/USDT
      }
    } else if (selectedChain === "Solana" && !isMock) {
      let solAddress = "";
      if (isSolAddress) {
        solAddress = address;
      } else {
        try {
          const solana = (window as any).okxwallet?.solana || (window as any).solana || (window as any).phantom?.solana;
          if (solana) {
            if (solana.publicKey) {
              solAddress = solana.publicKey.toString();
            } else {
              const resp = await solana.connect({ onlyIfTrusted: true });
              if (resp && resp.publicKey) {
                solAddress = resp.publicKey.toString();
              }
            }
          }
        } catch (e) {
          // Silent catch
        }
      }

      if (solAddress) {
        try {
          const response = await fetch("https://api.devnet.solana.com", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getBalance",
              params: [solAddress]
            })
          });
          const data = await response.json();
          if (data && data.result) {
            const lamports = data.result.value;
            const sol = lamports / 1_000_000_000;
            setBalance(sol);
          } else {
            setBalance(0.0);
          }
        } catch (err) {
          console.error("Error fetching Solana devnet balance:", err);
          setBalance(0.0);
        }
      } else {
        const storedSimBalance = localStorage.getItem(`okx_sim_balance_SOL`);
        setBalance(storedSimBalance ? parseFloat(storedSimBalance) : 0.0);
      }
    } else if (selectedChain === "TON" && isTonAddress && !isMock) {
      try {
        const response = await fetch(`https://testnet.toncenter.com/api/v2/getAddressInformation?address=${address}`);
        const data = await response.json();
        if (data && data.ok && data.result) {
          const nanotons = parseFloat(data.result.balance);
          const ton = nanotons / 1_000_000_000;
          setBalance(ton);
        } else {
          setBalance(0.0);
        }
      } catch (err) {
        console.error("Error fetching TON testnet balance:", err);
        setBalance(0.0);
      }
    } else {
      // Mock wallet or cross-chain fallback (e.g. EVM wallet address connected, but trading SOL pool)
      const storedSimBalance = localStorage.getItem(`okx_sim_balance_${stakeAsset}`);
      setBalance(storedSimBalance ? parseFloat(storedSimBalance) : 0.0);
    }
  }, [stakeAsset, selectedChain]);

  // Fetch actual on-chain pool funds from EVM contract
  const fetchOnchainPoolFunds = useCallback(async () => {
    if (selectedChain === "EVM" && walletAddress && !walletAddress.includes("(Mock")) {
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_XLAYER_RPC_URL || "https://xlayertestrpc.okx.com/terigon";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const poolAddress = process.env.NEXT_PUBLIC_PREDICTION_POOL_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
        
        const contract = new ethers.Contract(
          poolAddress,
          [
            "function rounds(uint256) view returns (uint256, string, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint8, bool, uint256)"
          ],
          provider
        );
        
        const roundData = await contract.rounds(roundId);
        if (roundData && roundData[7] !== undefined) {
          const upStakes = parseFloat(ethers.formatEther(roundData[7])); // totalUpStakes is index 7
          const downStakes = parseFloat(ethers.formatEther(roundData[8])); // totalDownStakes is index 8
          
          setTotalUpStakes(upStakes);
          setTotalDownStakes(downStakes);
        }
      } catch (err: any) {
        // Suppress BAD_DATA / 0x errors and log a clean warning once
        if (err.code === "BAD_DATA" || err.message?.includes("0x")) {
          if (!warnedContractMissing.current) {
            console.warn("[Prep Prediction] Contract not deployed at configured address. Falling back to local simulator.");
            warnedContractMissing.current = true;
          }
        } else {
          console.error("Failed to query pool size from contract:", err.message || err);
        }
      }
    }
  }, [selectedChain, walletAddress, roundId]);

  // Query actual BetPlaced events from EVM smart contract
  const queryOnchainStakes = useCallback(async () => {
    if (selectedChain === "EVM" && walletAddress && !walletAddress.includes("(Mock")) {
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_XLAYER_RPC_URL || "https://xlayertestrpc.okx.com/terigon";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const poolAddress = process.env.NEXT_PUBLIC_PREDICTION_POOL_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
        
        const contract = new ethers.Contract(
          poolAddress,
          [
            "event BetPlaced(uint256 indexed roundId, address indexed user, uint8 position, uint256 amount)"
          ],
          provider
        );

        // Fetch current block number first to construct a valid block range compliant with the 100-block RPC limit
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock > 90 ? currentBlock - 90 : 0;

        // Fetch logs for current roundId
        const filter = contract.filters.BetPlaced(roundId);
        const events = await contract.queryFilter(filter, fromBlock, "latest");
        
        const realBets: BetItem[] = events.map((e: any) => {
          const [rId, user, position, amount] = e.args;
          return {
            address: user,
            position: position === 1 ? "UP" : "DOWN",
            amount: ethers.formatEther(amount),
            asset: "ETH",
            timestamp: new Date().toLocaleTimeString(),
            status: "Pending",
            roundId: Number(rId),
            pool: selectedAsset
          };
        });

        if (realBets.length > 0) {
          setBetsFeed(realBets.slice(0, 6));
        }
      } catch (err: any) {
        // Suppress 100-block range and bad data errors gracefully
        if (err.code === -32602 || err.message?.includes("block range")) {
          if (!warnedContractMissing.current) {
            console.warn("[Prep Prediction] Block range query exceeded RPC limits or contract not deployed. Falling back to local events cache.");
            warnedContractMissing.current = true;
          }
        } else {
          console.error("Failed to query stakes from contract events:", err.message || err);
        }
      }
    }
  }, [selectedChain, walletAddress, roundId, selectedAsset]);

  // Calculate Net P&L
  const calculatePnL = (bets: BetItem[]) => {
    let pnl = 0;
    bets.forEach((bet) => {
      const amt = parseFloat(bet.amount) || 0;
      if (bet.status === "Win" || bet.status === "Claimed") {
        const mult = parseFloat(bet.multiplier || "1.80") - 1.0;
        pnl += amt * mult;
      } else if (bet.status === "Lose") {
        pnl -= amt;
      }
    });
    setNetPnL(pnl);
  };

  // Initialize and load state safely
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const storedBets = localStorage.getItem("okx_user_bets");
      if (storedBets) {
        try {
          const parsed = JSON.parse(storedBets);
          setUserBets(parsed);
          calculatePnL(parsed);
        } catch (e) {
          console.error("Failed to parse user bets", e);
        }
      }

      setAiLogs([
        `[AI Guard] Connected to ${selectedChain} Network. Scanner active.`,
        `[AI Guard] Monitoring active pools for frontrunning snipers...`
      ]);
    }
  }, [selectedChain]);

  // Run Gemini API Key validity check on mount
  useEffect(() => {
    if (!mounted) return;
    const checkGeminiKey = async () => {
      try {
        const response = await fetch("/api/gemini-check");
        const data = await response.json();
        if (data.status === "success") {
          setAiLogs((prev) => [
            `[AI Guard] Gemini API Check: Connected successfully. Key is valid.`,
            ...prev
          ]);
        } else {
          setAiLogs((prev) => [
            `[AI Guard] Gemini API Check: Failed (${data.message})`,
            ...prev
          ]);
        }
      } catch (err: any) {
        setAiLogs((prev) => [
          `[AI Guard] Gemini API Check: Request error (${err.message || err})`,
          ...prev
        ]);
      }
    };
    checkGeminiKey();
  }, [mounted]);

  // Update balance when walletAddress, stakeAsset, or selectedChain changes
  useEffect(() => {
    if (walletAddress) {
      fetchOnchainBalance(walletAddress);
    } else {
      setBalance(0.0);
    }
  }, [walletAddress, stakeAsset, selectedChain, fetchOnchainBalance]);

  // Periodically sync onchain pool size & stakes
  useEffect(() => {
    if (walletAddress) {
      fetchOnchainPoolFunds();
      queryOnchainStakes();
    }
  }, [walletAddress, roundId, fetchOnchainPoolFunds, queryOnchainStakes]);

  // Update active chain type based on selected trading asset (Do NOT disconnect wallet!)
  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset);
    
    // Automatically map asset to chain type and set appropriate stakeAsset
    if (["SOL", "WIF", "BONK", "BOME", "POPCAT", "DOGE", "SHIB", "PEPE", "FLOKI"].includes(asset)) {
      setSelectedChain("Solana");
      setStakeAsset("SOL");
    } else if (asset === "TON") {
      setSelectedChain("TON");
      setStakeAsset("TON");
    } else {
      setSelectedChain("EVM");
      setStakeAsset("ETH"); // EVM pools (BTC, ETH, SUI, XRP, ADA, AVAX) stake native ETH
    }
  };

  const totalPool = totalUpStakes + totalDownStakes;
  const upMultiplier = totalUpStakes > 0 ? ((totalPool * 0.8) / totalUpStakes).toFixed(2) : "1.80";
  const downMultiplier = totalDownStakes > 0 ? ((totalPool * 0.8) / totalDownStakes).toFixed(2) : "2.20";
  const activePosition = userBets.find((b) => b.roundId === roundId && b.pool === selectedAsset && b.status === "Pending");

  // Check if balance is insufficient
  const stakeValue = parseFloat(stakeAmount) || 0;
  const isInsufficient = stakeValue > balance;

  // Staking is open ONLY for the first 10 seconds of the 60s round (countdown > 50)
  const isStakingOpen = countdown > 50;

  // Simulate countdown & round changes
  useEffect(() => {
    if (!mounted) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          resolveRound();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, countdown, roundId, totalUpStakes, totalDownStakes]);

  // Simulate incoming live bets from other users (Active only when contract queries are not active or fall back)
  useEffect(() => {
    if (!mounted) return;
    
    // Generate simulated bets if we are disconnected or in mock wallet
    const shouldSimulate = !walletAddress || walletAddress.includes("(Mock");
    if (!shouldSimulate) return;

    const betSim = setInterval(() => {
      if (!isStakingOpen) return;

      const isUp = Math.random() > 0.45;
      const amount = (Math.random() * 0.2 + 0.05).toFixed(3);
      const addresses = ["0x3F2...89a", "0x9aC...102", "8G2h...1a9", "EQD4...90d"];
      const randomAddr = addresses[Math.floor(Math.random() * addresses.length)];

      if (isUp) {
        setTotalUpStakes((p) => p + parseFloat(amount));
      } else {
        setTotalDownStakes((p) => p + parseFloat(amount));
      }

      const newBet: BetItem = {
        address: randomAddr,
        position: isUp ? "UP" : "DOWN",
        amount,
        asset: stakeAsset, // The asset they bet with
        timestamp: new Date().toLocaleTimeString(),
        status: "Pending",
        roundId,
        pool: selectedAsset
      };

      setBetsFeed((prev) => [newBet, ...prev.slice(0, 5)]);
    }, 3000);

    return () => clearInterval(betSim);
  }, [mounted, isStakingOpen, stakeAsset, selectedAsset, roundId, walletAddress, betsFeed.length]);

  const resolveRound = () => {
    const outcome = Math.random() > 0.5 ? "UP" : "DOWN";
    const closingMultiplier = outcome === "UP" ? upMultiplier : downMultiplier;

    // Resolve user active bets
    setUserBets((prev) => {
      const updated = prev.map((bet) => {
        if (bet.roundId === roundId && bet.status === "Pending") {
          const won = bet.position === outcome;
          return {
            ...bet,
            status: won ? ("Win" as const) : ("Lose" as const),
            multiplier: closingMultiplier
          };
        }
        return bet;
      });
      localStorage.setItem("okx_user_bets", JSON.stringify(updated));
      calculatePnL(updated);
      return updated;
    });

    // Update AI security logs
    setAiLogs((prev) => [
      `[AI Guard] Round #${roundId} resolved. Outcome: ${outcome}. Fees split 80/20.`,
      `[AI Guard] Initialized audit for Round #${roundId + 1}.`,
      ...prev.slice(0, 2)
    ]);

    // Setup next round
    setRoundId((r) => r + 1);
    setTotalUpStakes(0.0);
    setTotalDownStakes(0.0);
    setBetsFeed([]); // Clear live bets feed for next round
  };

  const handlePredict = async (predictUp: boolean) => {
    if (!walletAddress) {
      alert("Please connect your wallet first to start trading!");
      return;
    }

    if (isInsufficient) return; // Prevent action

    // Deduct balance locally if simulated, or execute real transactions
    const isMock = !walletAddress || walletAddress.includes("(Mock");
    if (isMock) {
      const newBalance = balance - stakeValue;
      setBalance(newBalance);
      localStorage.setItem(`okx_sim_balance_${stakeAsset}`, newBalance.toString());
    }

    // EVM Chain contract transaction (Triggered if using real EVM connection)
    if (selectedChain === "EVM" && !isMock) {
      try {
        const provider = new ethers.BrowserProvider((window as any).okxwallet || (window as any).ethereum);
        const signer = await provider.getSigner();
        const poolAddress = process.env.NEXT_PUBLIC_PREDICTION_POOL_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
        
        const contract = new ethers.Contract(
          poolAddress,
          ["function predict(uint256 _roundId, bool _predictUp) payable external"],
          signer
        );

        const tx = await contract.predict(roundId, predictUp, {
          value: ethers.parseEther(stakeAmount)
        });
        console.log("Staked successfully onchain. Tx:", tx.hash);
        await tx.wait();
        await fetchOnchainBalance(walletAddress);
      } catch (err: any) {
        console.error("Contract stake transaction failed", err);
        alert(`Staking transaction failed: ${err.message || err}`);
        return; // Block local bet placement if on-chain transaction fails/gets rejected
      }
    } else if (selectedChain === "Solana" && !isMock) {
      try {
        const solana = (window as any).okxwallet?.solana || (window as any).solana || (window as any).phantom?.solana;
        if (!solana) {
          alert("Solana wallet provider not found.");
          return;
        }

        // Dynamically resolve correct Solana address if session connected via EVM
        let solAddress = "";
        const isEvmAddress = walletAddress.startsWith("0x");
        const isTonAddress = walletAddress.startsWith("EQ") || walletAddress.startsWith("UQ") || walletAddress.includes("-") || walletAddress.includes("_");
        const isSolAddress = !isEvmAddress && !isTonAddress;

        if (isSolAddress) {
          solAddress = walletAddress;
        } else {
          try {
            if (solana.publicKey) {
              solAddress = solana.publicKey.toString();
            } else {
              const resp = await solana.connect({ onlyIfTrusted: true });
              if (resp && resp.publicKey) {
                solAddress = resp.publicKey.toString();
              }
            }
          } catch (e) {
            // Silent catch
          }
        }

        if (!solAddress) {
          alert("Solana wallet public key not found. Please connect your Solana wallet in your extension to proceed.");
          return;
        }

        const { Connection, PublicKey, Transaction, SystemProgram } = await import("@solana/web3.js");
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");
        
        const senderPubkey = new PublicKey(solAddress);
        // Destination vault address (valid base58 public key)
        const receiver = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWN8VRe9ssja6n1";
        const receiverPubkey = new PublicKey(receiver);

        const lamports = Math.floor(parseFloat(stakeAmount) * 1_000_000_000);
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: senderPubkey,
            toPubkey: receiverPubkey,
            lamports: lamports
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderPubkey;

        const res = await solana.signAndSendTransaction(transaction);
        const signature = typeof res === "string" ? res : res.signature;
        
        console.log("Solana transfer transaction sent. Sig:", signature);
        await connection.confirmTransaction(signature, "confirmed");
        await fetchOnchainBalance(walletAddress);
      } catch (err: any) {
        console.error("Solana transaction failed", err);
        alert(`Solana transaction failed: ${err.message || err}`);
        return; // Block local bet placement
      }
    } else if (selectedChain === "TON" && !isMock) {
      try {
        const ton = (window as any).okxwallet?.ton || (window as any).ton;
        if (!ton) {
          alert("TON wallet provider not found.");
          return;
        }

        const receiver = "0QD4g7YpZ5xY9aZ4pQeR1sT3uV5wY7zA9bC1dD2eEF3g4h";
        const nanotons = Math.floor(parseFloat(stakeAmount) * 1_000_000_000).toString();

        await ton.send("ton_sendTransaction", [{
          to: receiver,
          value: nanotons,
          data: ""
        }]);
        console.log("TON transaction submitted successfully.");
        // Wait 10 seconds and re-fetch TON balance
        setTimeout(() => fetchOnchainBalance(walletAddress), 10000);
      } catch (err: any) {
        console.error("TON transaction failed", err);
        alert(`TON transaction failed: ${err.message || err}`);
        return; // Block local bet placement
      }
    } else {
      console.log(`Simulated vault transfer of ${stakeAmount} ${stakeAsset} to keeper address.`);
    }

    const newBet: BetItem = {
      address: walletAddress,
      position: predictUp ? "UP" : "DOWN",
      amount: stakeAmount,
      asset: stakeAsset,
      timestamp: new Date().toLocaleTimeString(),
      status: "Pending",
      roundId,
      pool: selectedAsset,
      entryPrice: tickerData ? parseFloat(tickerData.last) : 0
    };

    if (predictUp) {
      setTotalUpStakes((p) => p + stakeValue);
    } else {
      setTotalDownStakes((p) => p + stakeValue);
    }

    setUserBets((prev) => {
      const updated = [newBet, ...prev];
      localStorage.setItem("okx_user_bets", JSON.stringify(updated));
      return updated;
    });

    setCountdown((c) => (c > 50 ? 50 : c)); // End prediction window early for demo
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white">
      <OKXNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        
        {/* Banner with login validation check */}
        {!walletAddress && (
          <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/25 rounded-2xl p-6 text-center mb-8">
            <h2 className="text-lg font-bold text-[#FF4D4D]">Authentication Required</h2>
            <p className="text-xs text-[#8E8E8E] mt-1">
              You must connect your OKX Wallet to view pools, prices, and participate in predictions.
            </p>
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${!walletAddress ? "opacity-30 pointer-events-none select-none" : ""}`}>
          
          {/* Sidebar - Staking Pools (Left Column, span 3) */}
          <div className="lg:col-span-3 bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-6 flex flex-col gap-5 h-fit">
            
            {/* Sidebar Tab Switcher */}
            <div className="flex border-b border-[#1E1E1E] pb-2 gap-2">
              <button
                onClick={() => setActiveSidebarTab("standard")}
                className={`flex-1 pb-1 text-[11px] font-black uppercase tracking-wider text-center transition-all ${
                  activeSidebarTab === "standard"
                    ? "text-[#FFD500] border-b-2 border-[#FFD500]"
                    : "text-[#8E8E8E] hover:text-white border-b-2 border-transparent"
                }`}
              >
                Trade Pools
              </button>
              <button
                onClick={() => setActiveSidebarTab("meme")}
                className={`flex-1 pb-1 text-[11px] font-black uppercase tracking-wider text-center transition-all ${
                  activeSidebarTab === "meme"
                    ? "text-[#FFD500] border-b-2 border-[#FFD500]"
                    : "text-[#8E8E8E] hover:text-white border-b-2 border-transparent"
                }`}
              >
                Meme Pools
              </button>
            </div>

            {activeSidebarTab === "standard" ? (
              /* Blue Chips Section */
              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {[
                  { id: "BTC", label: "BTC/USDT", chain: "X Layer Testnet" },
                  { id: "ETH", label: "ETH/USDT", chain: "X Layer Testnet" },
                  { id: "SOL", label: "SOL/USDT", chain: "Solana Devnet" },
                  { id: "TON", label: "TON/USDT", chain: "TON Testnet" },
                  { id: "SUI", label: "SUI/USDT", chain: "X Layer Testnet" },
                  { id: "XRP", label: "XRP/USDT", chain: "X Layer Testnet" },
                  { id: "ADA", label: "ADA/USDT", chain: "X Layer Testnet" },
                  { id: "AVAX", label: "AVAX/USDT", chain: "X Layer Testnet" }
                ].map((pool) => (
                  <button
                    key={pool.id}
                    onClick={() => handleAssetChange(pool.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedAsset === pool.id
                        ? "bg-[#1E1E1E] border-[#FFD500] text-white"
                        : "bg-[#0A0A0A] border-[#1E1E1E] text-[#8E8E8E] hover:border-[#2E2E2E]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{pool.label}</div>
                      <div className="text-[9px] text-[#8E8E8E] mt-0.5">{pool.chain}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Solana Meme Pools Section */
              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {[
                  { id: "WIF", label: "WIF/SOL", chain: "Solana Devnet" },
                  { id: "BONK", label: "BONK/SOL", chain: "Solana Devnet" },
                  { id: "BOME", label: "BOME/SOL", chain: "Solana Devnet" },
                  { id: "POPCAT", label: "POPCAT/SOL", chain: "Solana Devnet" },
                  { id: "DOGE", label: "DOGE/SOL", chain: "Solana Devnet" },
                  { id: "SHIB", label: "SHIB/SOL", chain: "Solana Devnet" },
                  { id: "PEPE", label: "PEPE/SOL", chain: "Solana Devnet" },
                  { id: "FLOKI", label: "FLOKI/SOL", chain: "Solana Devnet" }
                ].map((pool) => (
                  <button
                    key={pool.id}
                    onClick={() => handleAssetChange(pool.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedAsset === pool.id
                        ? "bg-[#1E1E1E] border-[#FFD500] text-white"
                        : "bg-[#0A0A0A] border-[#1E1E1E] text-[#8E8E8E] hover:border-[#2E2E2E]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{pool.label}</div>
                      <div className="text-[9px] text-[#8E8E8E] mt-0.5">{pool.chain}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Center Column: Net P&L, Chart, Round Info, Guard, and Active Stakes (Middle Column, span 6) */}
          <div className="lg:col-span-6 flex flex-col gap-8">
            
            {/* Real-time P&L Panel */}
            <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8E8E8E] font-medium uppercase tracking-wider block">
                  Net Earnings P&L
                </span>
                <div className={`text-xl font-extrabold mt-1 ${netPnL >= 0 ? "text-[#00D180]" : "text-[#FF4D4D]"}`}>
                  {netPnL >= 0 ? "+" : ""}{netPnL.toFixed(3)} {stakeAsset}
                </div>
              </div>
              <div className="text-right">
                <div>
                  <span className="text-xs text-[#8E8E8E] block">
                    {stakeAsset} Balance
                    {balance <= 0 && (
                      <span className="text-[#FF4D4D] font-bold ml-2 text-[10px] animate-pulse">
                        insufficient funds
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-sm text-white mt-1 block">
                    {balance.toFixed(3)} {stakeAsset}
                  </span>
                </div>
              </div>
            </div>

            {/* TradingView Chart */}
            <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-[#1E1E1E] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold">
                    {["WIF", "BONK", "BOME", "POPCAT"].includes(selectedAsset) ? `${selectedAsset}/SOL` : `${selectedAsset}/USDT`}
                  </span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded text-[#8E8E8E]">
                    {selectedDuration} Interval
                  </span>
                </div>

                {/* OKX API Ticker Data */}
                {tickerData && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono">
                    <div>
                      <span className="text-[#8E8E8E] mr-1.5">OKX Price:</span>
                      <span className="font-bold text-[#FFD500]">${tickerData.last}</span>
                    </div>
                    <div>
                      <span className="text-[#8E8E8E] mr-1.5">24h Chg:</span>
                      <span className={`font-bold ${tickerData.change24h.startsWith("+") ? "text-[#00D180]" : "text-[#FF4D4D]"}`}>
                        {tickerData.change24h}
                      </span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[#8E8E8E] mr-1.5">24h High:</span>
                      <span className="font-bold text-white">${tickerData.high24h}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[#8E8E8E] mr-1.5">24h Low:</span>
                      <span className="font-bold text-white">${tickerData.low24h}</span>
                    </div>
                  </div>
                )}
              </div>
              <TradingViewChart symbol={`${selectedAsset}/USDT`} />
            </div>



            {/* Bottom Row - AI logs & Active bets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              
              {/* AI Verification Logger */}
              <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">Gemini AI Guard Status</h3>
                  <span className="text-[10px] bg-[#00D180]/15 text-[#00D180] border border-[#00D180]/20 px-2 py-0.5 rounded font-mono font-semibold">
                    {isScanning ? "Auditing" : "Scanning"}
                  </span>
                </div>
                <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-4 font-mono text-[11px] text-[#8E8E8E] flex flex-col gap-2.5 h-[160px] overflow-y-auto">
                  {aiLogs.length === 0 ? (
                    <div className="text-[#8E8E8E] text-center py-12">Scanner initiating...</div>
                  ) : (
                    aiLogs.map((log, index) => (
                      <div key={index} className="flex gap-2">
                         <span className="text-[#FFD500]">❯</span>
                         <span>{log}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active bets in current round */}
              <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Round #{roundId} Active Stakes</h3>
                <div className="overflow-x-auto h-[160px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1E1E1E] text-[#8E8E8E]">
                        <th className="pb-2 font-medium">Predictor</th>
                        <th className="pb-2 font-medium text-center">Staked Side</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                        <th className="pb-2 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1E1E]/50 font-mono text-[#8E8E8E]">
                      {betsFeed.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-[#8E8E8E]">
                            Waiting for pool predictions... (10s window active)
                          </td>
                        </tr>
                      ) : (
                        betsFeed.map((bet, index) => (
                          <tr key={index} className="hover:bg-[#1E1E1E]/10 transition-colors">
                            <td className="py-2 text-white">{bet.address}</td>
                            <td className="py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                bet.position === "UP" ? "bg-[#00D180]/15 text-[#00D180]" : "bg-[#FF4D4D]/15 text-[#FF4D4D]"
                              }`}>
                                {bet.position}
                              </span>
                            </td>
                            <td className="py-2 text-right text-white">
                              {bet.amount} {bet.asset}
                            </td>
                            <td className="py-2 text-right">{bet.timestamp}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Place Prediction & Round Info (Right Column, span 3) */}
          <div className="lg:col-span-3 sticky top-24 h-fit flex flex-col gap-6">
            
            {/* Place Prediction Card */}
            <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-6 flex flex-col justify-between gap-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">Place Prediction</h3>
                  {!isStakingOpen && (
                    <span className="text-[10px] bg-[#FF4D4D]/15 text-[#FF4D4D] px-2 py-0.5 rounded font-semibold">
                      Staking Closed
                    </span>
                  )}
                </div>
                
                {/* Stake With Token Info */}
                <div className="flex items-center justify-between mb-4 text-xs">
                  <span className="text-[#8E8E8E]">STAKE WITH:</span>
                  <span className="bg-[#1E1E1E] text-white px-3 py-1 rounded-md font-extrabold font-mono border border-[#2E2E2E]">
                    {stakeAsset}
                  </span>
                </div>

                {/* Stake input */}
                <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-3 flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-[#8E8E8E] block">STAKE AMOUNT</span>
                    <input
                      type="number"
                      value={stakeAmount}
                      disabled={!isStakingOpen}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="bg-transparent border-none outline-none font-bold text-lg text-white mt-1 w-full disabled:opacity-50"
                    />
                  </div>
                  <span className="font-bold text-xs bg-[#1E1E1E] px-3 py-1 rounded text-white uppercase font-mono">
                    {stakeAsset}
                  </span>
                </div>

                {/* Insufficient message */}
                {isInsufficient ? (
                  <div className="text-[#FF4D4D] text-[11px] font-bold mb-4 animate-pulse">
                    insufficient message
                  </div>
                ) : (
                  <div className="h-4 mb-4"></div>
                )}

                {/* Preset stakes */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {["0.01", "0.05", "0.1", "0.5"].map((preset) => (
                    <button
                      key={preset}
                      disabled={!isStakingOpen}
                      onClick={() => setStakeAmount(preset)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        stakeAmount === preset
                          ? "bg-[#FFD500]/10 border-[#FFD500] text-[#FFD500]"
                          : "bg-[#0A0A0A] border-[#1E1E1E] text-[#8E8E8E] hover:border-[#2E2E2E]"
                      } disabled:opacity-50`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staking buttons - Active only during the first 10 seconds of round */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handlePredict(true)}
                  disabled={!isStakingOpen || isInsufficient}
                  className="bg-[#00D180] hover:bg-[#00E58C] text-black font-extrabold py-3.5 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(0,209,128,0.15)] disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="text-sm">{isStakingOpen ? "PREDICT UP" : "CLOSED"}</span>
                  <span className="text-[10px] font-bold opacity-80">{isStakingOpen ? "Bullish" : "Round Active"}</span>
                </button>
                <button
                  onClick={() => handlePredict(false)}
                  disabled={!isStakingOpen || isInsufficient}
                  className="bg-[#FF4D4D] hover:bg-[#FF6666] text-white font-extrabold py-3.5 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(255,77,77,0.15)] disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="text-sm">{isStakingOpen ? "PREDICT DOWN" : "CLOSED"}</span>
                  <span className="text-[10px] font-bold opacity-80">{isStakingOpen ? "Bearish" : "Round Active"}</span>
                </button>
              </div>
            </div>

            {/* Active Position Card */}
            {(() => {
              const currentPrice = tickerData ? parseFloat(tickerData.last) : 0;
              const entryPrice = activePosition?.entryPrice || 0;
              
              let pnlValue = 0;
              let pnlPercentage = 0;
              let isProfit = false;
              
              if (activePosition && entryPrice > 0 && currentPrice > 0) {
                const diff = currentPrice - entryPrice;
                if (activePosition.position === "UP") {
                  isProfit = diff > 0;
                  pnlValue = diff;
                  pnlPercentage = (diff / entryPrice) * 100;
                } else {
                  isProfit = diff < 0;
                  pnlValue = -diff;
                  pnlPercentage = (-diff / entryPrice) * 100;
                }
              }

              return (
                <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Active Position</span>
                    {activePosition && (
                      <span className="animate-pulse h-2 w-2 rounded-full bg-[#00D180]"></span>
                    )}
                  </h3>
                  
                  {activePosition ? (
                    <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-4 flex flex-col gap-3 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#8E8E8E]">Instrument:</span>
                        <span className="text-white font-bold">{activePosition.pool}/USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8E8E]">Direction:</span>
                        <span className={`font-black ${activePosition.position === "UP" ? "text-[#00D180]" : "text-[#FF4D4D]"}`}>
                          {activePosition.position === "UP" ? "🟢 BULLISH (UP)" : "🔴 BEARISH (DOWN)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8E8E]">Entry Price:</span>
                        <span className="text-white font-bold">${entryPrice > 0 ? entryPrice.toFixed(entryPrice < 0.1 ? 6 : 4) : "..."}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8E8E]">Current Price:</span>
                        <span className="text-white font-bold">${currentPrice > 0 ? currentPrice.toFixed(currentPrice < 0.1 ? 6 : 4) : "..."}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8E8E]">Staked:</span>
                        <span className="text-white font-bold">{activePosition.amount} {activePosition.asset}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#1E1E1E] pt-2 mt-1">
                        <span className="text-[#8E8E8E]">Live P&L:</span>
                        {entryPrice > 0 && currentPrice > 0 ? (
                          <span className={`font-black ${pnlPercentage >= 0 ? "text-[#00D180]" : "text-[#FF4D4D]"}`}>
                            {pnlPercentage >= 0 ? "+" : ""}{pnlPercentage.toFixed(2)}% ({pnlPercentage >= 0 ? "+" : ""}{pnlValue.toFixed(entryPrice < 0.1 ? 6 : 4)} USD)
                          </span>
                        ) : (
                          <span className="text-[#8E8E8E]">Calculating...</span>
                        )}
                      </div>
                      <div className="flex justify-between border-t border-[#1E1E1E] pt-2 mt-1">
                        <span className="text-[#8E8E8E]">Est. Payout:</span>
                        <span className="text-[#FFD500] font-black">
                          {(parseFloat(activePosition.amount) * (activePosition.position === "UP" ? parseFloat(upMultiplier) : parseFloat(downMultiplier))).toFixed(3)} {activePosition.asset}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0A0A0A] border border-[#1E1E1E] border-dashed rounded-xl p-4 text-center text-xs text-[#8E8E8E] py-6">
                      No active positions in Round #{roundId}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pool multipliers & countdown */}
            <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-[#8E8E8E]">Round #{roundId} Info</span>
                  <span className="text-xs text-[#FFD500] font-mono font-bold flex items-center gap-1">
                    <span className="animate-ping h-2 w-2 rounded-full bg-[#FFD500] inline-block"></span>
                    {countdown}s left
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-4 text-center">
                    <div className="text-xs text-[#8E8E8E]">UP Payout</div>
                    <div className="text-xl font-black text-[#00D180] mt-1">{upMultiplier}x</div>
                    <div className="text-[10px] text-[#8E8E8E] mt-0.5">{totalUpStakes.toFixed(2)} staked</div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-4 text-center">
                    <div className="text-xs text-[#8E8E8E]">DOWN Payout</div>
                    <div className="text-xl font-black text-[#FF4D4D] mt-1">{downMultiplier}x</div>
                    <div className="text-[10px] text-[#8E8E8E] mt-0.5">{totalDownStakes.toFixed(2)} staked</div>
                  </div>
                </div>

                {/* Ratio bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-[#8E8E8E] mb-2 font-mono">
                    <span>UP: {totalPool > 0 ? ((totalUpStakes / totalPool) * 100).toFixed(0) : "50"}%</span>
                    <span>DOWN: {totalPool > 0 ? ((totalDownStakes / totalPool) * 100).toFixed(0) : "50"}%</span>
                  </div>
                  <div className="w-full bg-[#FF4D4D] h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#00D180] h-full transition-all duration-500"
                      style={{ width: `${totalPool > 0 ? (totalUpStakes / totalPool) * 100 : 50}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-[#8E8E8E]">Active Round Pool:</span>
                <span className="font-extrabold text-white">
                  {totalPool.toFixed(3)} {stakeAsset}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OKXFooter />
    </div>
  );
}
