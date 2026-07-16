# 🔮 Prep Prediction

**Prep Prediction** is a high-fidelity, multi-chain price prediction staking platform built for the **OKX.AI Genesis Hackathon**. Deployed on **X Layer Testnet**, it integrates real-time authenticated OKX price feeds, a custom OKX Web3 Wallet adapter, TradingView analytics, and an **autonomous Gemini AI Guard scanner** to monitor rounds for bot snipers and frontrunners.

---

## 📂 Folder Structure

```
okx-one/
├── agent/
│   └── keeper.ts              # Price feed resolver and Gemini AI Guard keeper agent
├── app/
│   ├── api/
│   │   ├── gemini-check/
│   │   │   └── route.ts       # Gemini API diagnostic verification endpoint
│   │   └── okx-ticker/
│   │       └── route.ts       # CORS-free OKX Ticker API proxy with HMAC signing
│   ├── history/
│   │   └── page.tsx           # History and Profit/Loss (P&L) dashboard
│   ├── trade/
│   │   └── page.tsx           # Premium 3-column trading page with live OKX charts
│   ├── globals.css            # OKX theme styling & custom scrollbars
│   ├── layout.tsx             # Main React entry layout
│   └── page.tsx               # Redirection validation landing gate
├── components/
│   ├── AddressValidator.ts    # Zod multi-chain wallet validator schemas
│   ├── OKXFooter.tsx          # Platform footer
│   ├── OKXNavbar.tsx          # Dynamic OKX Web3 Wallet connector (forced permission popup)
│   ├── TradingViewChart.tsx   # Custom TradingView chart widget builder
│   └── WalletContext.tsx      # In-memory wallet state provider (no session caching)
├── contracts/
│   ├── MockTokens.sol         # Mock ERC20 tokens for TON/SOL validation
│   └── PredictionPool.sol     # Core EVM staking, prediction, and payout smart contract
├── scripts/
│   └── deploy.js              # Hardhat deployment script
├── hardhat.config.js          # Hardhat compiler configurations
├── package.json               # Package dependencies configuration
├── tsconfig.json              # TypeScript rules configurations
└── README.md                  # Hackathon project documentation
```

---

## 🚀 Key Features & Components

### 1. 🔗 Multi-Chain OKX Web3 Wallet Adapter
* **Zod Address Validator**: Integrates [AddressValidator.ts](file:///home/harshit/Desktop/projects/okx-projects/okx-one/components/AddressValidator.ts) using **Zod schemas** to strictly validate address structures before allowing access (EVM hex, Solana base58, and TON base64/friendly formats).
* **Unconditional Connection Popups**: Fully disables browser auto-connect cache. Clicking "Connect" always prompts the OKX Wallet extension's account selection pop-up (`wallet_requestPermissions` and `solana.connect({ onlyIfTrusted: false })`).
* **Cross-Chain Provider Resolution**: Extracts the active Solana public key dynamically from the browser's injected provider (`window.okxwallet.solana` / `window.solana`) even if the user is connected via an EVM wallet session, enabling seamless cross-chain balance lookups.

### 2. ⚡ Real On-Chain Staking & Payout Claims
* **EVM (X Layer Testnet)**: Takes real funds from the user's connected wallet and stakes it directly into the deployed smart contract by executing `predict(roundId, predictUp)`. Resolving and claiming payouts triggers `claimPayout(roundId)` on-chain, transferring the user's stake and split winnings (80/20 ratio) directly back into their wallet.
* **Solana Devnet**: Submits native SOL transfer transactions on-chain using `@solana/web3.js` and calls `solana.signAndSendTransaction` to deduct and stake SOL.
* **TON Testnet**: Triggers transaction payloads via `ton_sendTransaction` to stake native TON.
* **Mismatched Fallbacks Removed**: If no wallet is connected or RPC checks return zero, balances display strictly as `0.000` (no hardcoded false funds).

### 🛡️ 3. Gemini AI Guard & Price Feed Keeper
* **OKX Price Feed**: An autonomous keeper script queries OKX API spot prices to resolve round outcomes.
* **Gemini AI Guard rails**: Queries the Gemini API to analyze round metrics (total stakes, participant address velocities, volume spikes) to detect and flag bot manipulations, frontrunning snipers, and abnormal bet positioning, maintaining pool integrity.
* **90-Block Range Safety**: Limits logs fetching lookbacks to 90 blocks to fully comply with X Layer RPC's strict 100-block range queries limit, avoiding RPC crash failures.

### 📊 4. Premium 3-Column Trading Terminal Layout
* **Left Column**: Interactive sidebar list of active trading pools: **BTC/USDT, ETH/USDT, SOL/USDT, and TON/USDT**.
* **Center Column**: Real-time Net P&L card, a customized solid black TradingView chart (indicators toolbar and volume grid removed), active round logs, and the Gemini AI Guard status feed.
* **Right Column** (`sticky top-24`): The **Place Prediction** and **Round Info** cards grouped together to stay in view as you scroll.
* **Silent UX**: Removed intrusive browser alerts for transaction submission/confirmation in favor of silent background executions and console receipts.

---

## 📈 Supported Assets & Tickers (Scripts)
The platform supports **16 separate trading instruments** categorized into two independent sections:

| Category | Pair Symbol | Settlement Token | Chain Network |
| :--- | :--- | :--- | :--- |
| **Trade Pools (Blue Chips)** | BTC/USDT | Native ETH | X Layer Testnet |
| | ETH/USDT | Native ETH | X Layer Testnet |
| | SOL/USDT | Native SOL | Solana Devnet |
| | TON/USDT | Native TON | TON Testnet |
| | SUI/USDT | Native ETH | X Layer Testnet |
| | XRP/USDT | Native ETH | X Layer Testnet |
| | ADA/USDT | Native ETH | X Layer Testnet |
| | AVAX/USDT | Native ETH | X Layer Testnet |
| **Meme Pools (Solana)** | WIF/SOL | Native SOL | Solana Devnet |
| | BONK/SOL | Native SOL | Solana Devnet |
| | BOME/SOL | Native SOL | Solana Devnet |
| | POPCAT/SOL | Native SOL | Solana Devnet |
| | DOGE/SOL | Native SOL | Solana Devnet |
| | SHIB/SOL | Native SOL | Solana Devnet |
| | PEPE/SOL | Native SOL | Solana Devnet |
| | FLOKI/SOL | Native SOL | Solana Devnet |

---

## 🔧 OKX & Gemini API Integrations

### OKX Exchange API Integration & Signature Signing
The frontend queries live market ticker prices from the OKX spot tickers endpoint. To avoid browser CORS restrictions and secure your API credentials, we implemented a server-side Next.js route handler proxy `/api/okx-ticker`.
* **Authenticated Headers**: If `OKX_API_KEY`, `OKX_SECRET_KEY`, and `OKX_PASSPHRASE` are defined in the `.env` file, the route dynamically generates access signatures using HMAC-SHA256 of `timestamp + method + requestPath` and adds authentication headers:
  * `OK-ACCESS-KEY`
  * `OK-ACCESS-SIGN`
  * `OK-ACCESS-TIMESTAMP`
  * `OK-ACCESS-PASSPHRASE`

### Gemini Pro API Guard Check
We implemented a backend diagnostic route `/api/gemini-check` that runs on startup. It tests your configured `GEMINI_API_KEY` by making a small validation prompt to the Gemini API (`gemini-1.5-flash` model). The result is parsed and displayed in real time directly inside the **AI Guard Scanner logger console** on the trading page on page load.

---

## 📝 Smart Contract Details: `PredictionPool.sol`

Deployed on **X Layer Testnet**:
* **Contract Address**: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
* **X Layer Testnet Block Explorer**: [X Layer Explorer](https://www.okx.com/web3/explorer/xlayer-testnet)
* **Core Functions**:
  - `predict(uint256 _roundId, bool _predictUp) external payable`: Places a prediction using native funds.
  - `claimPayout(uint256 _roundId)`: Claim winnings directly back into your address.
  - `resolveRound(uint256 _roundId, uint256 _endPrice)`: Resolves predictions and triggers fees payout.

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_PREDICTION_POOL_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
FEE_WALLET=0x90F79bf6EB2c4f870365E785982E1f101E93b906
XLAYER_RPC_URL=https://xlayertestrpc.okx.com/terigon

# OKX Exchange API Credentials (Optional - Authenticates REST queries)
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase

# Gemini API Key (Enables Gemini AI Guard Bot Scanner)
GEMINI_API_KEY=your_gemini_api_key

# Keeper Account Secrets (For round resolution automation)
PRIVATE_KEY=your_keeper_private_key
SOLANA_PRIVATE_KEY=your_solana_payout_private_key
TON_MNEMONIC=your_ton_passphrase_mnemonic
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
bun install
# or
npm install
```

### 2. Run keeper script
```bash
npx ts-node agent/keeper.ts
```

### 3. Launch Development Server
```bash
bun run dev
# or
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) using Chrome with your OKX Web3 Wallet extension enabled.
