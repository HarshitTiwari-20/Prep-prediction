import React from "react";

export default function OKXFooter() {
  return (
    <footer className="border-t border-[#1E1E1E] bg-[#0A0A0A] py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="bg-[#FFD500] text-black font-extrabold px-2 py-0.5 text-xs rounded-sm">
            Prep
          </span>
          <span className="font-bold text-white text-sm">Prediction</span>
          <span className="text-xs text-[#8E8E8E] ml-2">
            © 2026. All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#8E8E8E]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#00D180] animate-pulse"></span>
            X Layer Testnet Live
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#00D180] animate-pulse"></span>
            Solana Devnet Vault Live
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#00D180] animate-pulse"></span>
            TON Testnet Vault Live
          </span>
        </div>
        <div className="text-xs text-[#8E8E8E]">
          Powered by <span className="text-white font-medium">OKX Onchain OS</span> & <span className="text-white font-medium">Gemini AI Guard</span>
        </div>
      </div>
    </footer>
  );
}
