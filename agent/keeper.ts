import { ethers } from "ethers";
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { TonClient, WalletContractV4, Address, toNano, fromNano } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize AI SDK if key exists
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Mock ABIs for local verification
const PredictionPoolABI = [
  "function roundCount() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 roundId, string symbol, uint256 duration, uint256 startTime, uint256 endTime, uint256 startPrice, uint256 endPrice, uint256 totalUpStakes, uint256 totalDownStakes, uint8 outcome, bool isResolved, uint256 payoutPerWei)",
  "function resolveRound(uint256 _roundId, uint256 _endPrice) external",
  "event RoundStarted(uint256 indexed roundId, string symbol, uint256 duration, uint256 startTime, uint256 endTime, uint256 startPrice)",
  "event BetPlaced(uint256 indexed roundId, address indexed user, uint8 position, uint256 amount)"
];

/**
 * 1. AI User Validation (Anti-Bot & Fair Payout Multipliers)
 */
async function runAIBotCheck(
  userAddress: string,
  chain: string,
  txPattern: { frequencySec: number; gasPriceGwei: number; amountStaked: number }
): Promise<{ isBot: boolean; trustScore: number; feeAdjustment: number }> {
  console.log(`[AI Evaluator] Scanning address ${userAddress} on ${chain}...`);

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analyze the following on-chain transaction pattern for bot-like activity or sniping:
        - Address: ${userAddress}
        - Chain: ${chain}
        - Staking Frequency: Once every ${txPattern.frequencySec} seconds
        - Gas Price Paid: ${txPattern.gasPriceGwei} Gwei
        - Stake Amount: ${txPattern.amountStaked} tokens
        
        Is this likely a bot/sniper trying to frontrun or exploit a prediction pool?
        Respond in strict JSON format:
        {
          "isBot": true/false,
          "trustScore": 0.0 to 1.0,
          "explanation": "Brief explanation",
          "feeAdjustment": 1.0 (normal) or 1.5 (higher fee penalty for bot-like behavior)
        }
      `;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      console.log(`[AI Evaluator] Gemini Result:`, parsed);
      return parsed;
    } catch (e) {
      console.error("[AI Evaluator] Gemini failed, falling back to heuristics:", e);
    }
  }

  // Heuristic Fallback
  let isBot = false;
  let trustScore = 0.9;
  let feeAdjustment = 1.0;

  if (txPattern.frequencySec < 5) {
    isBot = true;
    trustScore = 0.2;
    feeAdjustment = 1.5; // Bot penalty
    console.log(`[AI Evaluator] Flagged ${userAddress} as BOT (frequency < 5s)`);
  } else {
    console.log(`[AI Evaluator] Checked ${userAddress} as GENUINE user.`);
  }

  return { isBot, trustScore, feeAdjustment };
}

/**
 * 2. OKX Market Price Fetcher
 */
async function fetchOKXPrice(symbol: string): Promise<number> {
  try {
    // OKX Instrument IDs follow: BTC-USDT, ETH-USDT, SOL-USDT, TON-USDT
    const instId = `${symbol.replace("/", "-")}`;
    const url = `https://www.okx.com/api/v5/market/ticker?instId=${instId}`;
    const res = await axios.get(url);
    if (res.data && res.data.data && res.data.data[0]) {
      const price = parseFloat(res.data.data[0].last);
      console.log(`[OKX Oracle] Fetched ${symbol} price from OKX: $${price}`);
      return price;
    }
  } catch (error) {
    console.error(`[OKX Oracle] Error fetching price for ${symbol}:`, error);
  }
  // Fallbacks for offline testing
  const fallbackPrices: Record<string, number> = {
    "BTC/USDT": 65000,
    "ETH/USDT": 3400,
    "SOL/USDT": 140,
    "TON/USDT": 7.2
  };
  console.log(`[OKX Oracle] Using fallback price for ${symbol}: $${fallbackPrices[symbol] || 100}`);
  return fallbackPrices[symbol] || 100;
}

/**
 * 3. EVM Resolver Loop (X Layer Testnet)
 */
async function runEVMKeeper() {
  const rpcUrl = process.env.XLAYER_RPC_URL || "https://xlayertestrpc.okx.com/terigon";
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.PREDICTION_POOL_ADDRESS;

  if (!privateKey || !contractAddress) {
    console.log("[EVM Keeper] Missing PRIVATE_KEY or PREDICTION_POOL_ADDRESS. EVM Keeper skipped.");
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, PredictionPoolABI, wallet);

  console.log("[EVM Keeper] Listening to contract at:", contractAddress);

  setInterval(async () => {
    try {
      const roundCount = await contract.roundCount();
      for (let i = 1; i <= Number(roundCount); i++) {
        const round = await contract.rounds(i);
        const [
          roundId,
          symbol,
          duration,
          startTime,
          endTime,
          startPrice,
          endPrice,
          totalUpStakes,
          totalDownStakes,
          outcome,
          isResolved
        ] = round;

        const now = Math.floor(Date.now() / 1000);
        if (!isResolved && now >= Number(endTime)) {
          console.log(`[EVM Keeper] Round ${roundId} for ${symbol} is ready to resolve.`);
          
          // Fetch OKX price
          const price = await fetchOKXPrice(symbol);
          
          // Convert price to 8 decimals / scale for contract
          const scalePrice = Math.floor(price * 100000000); 

          console.log(`[EVM Keeper] Submitting resolution for Round ${roundId} with price ${price}`);
          const tx = await contract.resolveRound(roundId, scalePrice);
          await tx.wait();
          console.log(`[EVM Keeper] Round ${roundId} resolved successfully. Tx: ${tx.hash}`);
        }
      }
    } catch (e) {
      console.error("[EVM Keeper] Error in resolution loop:", e);
    }
  }, 15000); // Check every 15s
}

/**
 * 4. Solana Vault Keeper (Solana Devnet)
 */
interface SolBet {
  user: string;
  amount: number;
  predictUp: boolean;
  timestamp: number;
  duration: number;
  resolved: boolean;
}
const solActiveBets: SolBet[] = [];

async function runSolanaKeeper() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const privateKeyString = process.env.SOLANA_PRIVATE_KEY;
  
  if (!privateKeyString) {
    console.log("[Solana Keeper] Missing SOLANA_PRIVATE_KEY. Solana Keeper skipped.");
    return;
  }

  const secretKey = Uint8Array.from(JSON.parse(privateKeyString));
  const keeperKeypair = Keypair.fromSecretKey(secretKey);
  console.log("[Solana Keeper] Vault address:", keeperKeypair.publicKey.toBase58());

  // Listen to transactions to vault
  connection.onLogs(keeperKeypair.publicKey, async (logs) => {
    try {
      console.log("[Solana Keeper] Transaction detected, parsing...");
      // In production, we parse tx for bet details: amount, predictUp, duration
      // For MVP, we mock adding a active bet when a log is received:
      const mockBet: SolBet = {
        user: "8G2h1... (OKX Wallet User)",
        amount: 0.1, // 0.1 SOL
        predictUp: Math.random() > 0.5,
        timestamp: Math.floor(Date.now() / 1000),
        duration: 60, // 60 seconds
        resolved: false
      };
      solActiveBets.push(mockBet);
      console.log(`[Solana Keeper] Registered SOL prediction: ${mockBet.predictUp ? "UP" : "DOWN"} on SOL/USDT`);
    } catch (err) {
      console.error("[Solana Keeper] Error parsing log:", err);
    }
  });

  // Resolution loop
  setInterval(async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const bet of solActiveBets) {
      if (!bet.resolved && now >= bet.timestamp + bet.duration) {
        bet.resolved = true;
        console.log(`[Solana Keeper] Resolving SOL prediction for ${bet.user}`);

        // Fetch SOL price from OKX
        const startPrice = 140.0; // Simulated start price
        const endPrice = await fetchOKXPrice("SOL/USDT");

        // AI Bot Check
        const aiCheck = await runAIBotCheck(bet.user, "Solana", {
          frequencySec: 10,
          gasPriceGwei: 1,
          amountStaked: bet.amount
        });

        const isWin = (endPrice > startPrice && bet.predictUp) || (endPrice < startPrice && !bet.predictUp);
        if (isWin) {
          // Calculate payout: 80% increase = bet.amount * 1.8
          let payout = bet.amount * 1.8;
          if (aiCheck.isBot) {
            payout = bet.amount * 1.2; // Penalize bot payouts
            console.log("[Solana Keeper] AI detected bot. Payout multiplier reduced.");
          }
          console.log(`[Solana Keeper] User Won! Sending payout: ${payout} SOL to ${bet.user}`);
          // Send SOL transfer transaction...
        } else {
          console.log(`[Solana Keeper] User Lost SOL prediction.`);
        }
      }
    }
  }, 10000);
}

/**
 * 5. TON Vault Keeper (TON Testnet)
 */
interface TonBet {
  user: string;
  amount: number;
  predictUp: boolean;
  timestamp: number;
  duration: number;
  resolved: boolean;
}
const tonActiveBets: TonBet[] = [];

async function runTONKeeper() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    console.log("[TON Keeper] Missing TON_MNEMONIC. TON Keeper skipped.");
    return;
  }

  const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: process.env.TON_API_KEY || ""
  });

  const key = await mnemonicToPrivateKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
  console.log("[TON Keeper] Vault address:", wallet.address.toString());

  // Listen and resolution loop
  setInterval(async () => {
    try {
      // In production, poll wallet transactions using client.getTransactions()
      // For MVP, we simulate a resolved bet:
      const now = Math.floor(Date.now() / 1000);
      for (const bet of tonActiveBets) {
        if (!bet.resolved && now >= bet.timestamp + bet.duration) {
          bet.resolved = true;
          const endPrice = await fetchOKXPrice("TON/USDT");
          console.log(`[TON Keeper] Resolving TON prediction for ${bet.user}. Final price: $${endPrice}`);
          // Execute payouts...
        }
      }
    } catch (e) {
      console.error("[TON Keeper] Error:", e);
    }
  }, 15000);
}

// Start all keepers
async function main() {
  console.log("=========================================");
  console.log("  OKX Predict AI Oracle Keeper & ASP Agent ");
  console.log("=========================================");
  
  await runEVMKeeper();
  await runSolanaKeeper();
  await runTONKeeper();
}

main().catch(console.error);
