"use client";

import React, { useEffect, useRef, useState } from "react";

interface TradingViewChartProps {
  symbol: string; // e.g., "ETH/USDT"
}

// Suppress noisy TradingView console errors about iframe contentWindow
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const errorMsg = args[0];
    if (
      errorMsg &&
      typeof errorMsg === "string" &&
      (errorMsg.includes("contentWindow") || errorMsg.includes("TradingView") || errorMsg.includes("iframe"))
    ) {
      // Suppress TradingView frame detachment warnings
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerId = `tv-chart-${symbol.replace("/", "-").toLowerCase()}`;

  // Step 1: Load TradingView library script
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).TradingView) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "tradingview-tv-js";
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => setScriptLoaded(true);

    document.head.appendChild(script);

    return () => {
      // Clean up script if needed, but keeping it loaded globally is fine
    };
  }, []);

  // Step 2: Initialize Widget when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || typeof window === "undefined") return;

    // Clear previous contents
    containerRef.current.innerHTML = "";

    // Create target container
    const chartDiv = document.createElement("div");
    chartDiv.id = containerId;
    chartDiv.style.width = "100%";
    chartDiv.style.height = "100%";
    containerRef.current.appendChild(chartDiv);

    // Map symbol to TV standard
    let tvSymbol = "BINANCE:ETHUSDT";
    if (symbol === "SOL/USDT") tvSymbol = "BINANCE:SOLUSDT";
    else if (symbol === "TON/USDT") tvSymbol = "OKX:TONUSDT";
    else if (symbol === "USDC/USDT") tvSymbol = "BINANCE:USDCUSDT";
    else if (symbol === "USDT/USDC" || symbol === "USDT/USDT") tvSymbol = "BINANCE:USDTUSDC";
    else if (symbol === "ETH/USDT") tvSymbol = "BINANCE:ETHUSDT";
    else if (symbol === "BTC/USDT") tvSymbol = "BINANCE:BTCUSDT";

    try {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          hide_side_toolbar: true, // Hides drawing tools
          hide_top_toolbar: true,  // Hides timeframes & indicators toolbar header
          hide_legend: true,       // Hides indicator legends
          studies: [],             // Empty studies array completely removes volume bars
          container_id: containerId,
          overrides: {
            // Force solid black background
            "paneProperties.background": "#000000", 
            "paneProperties.backgroundType": "solid",
            // Set vertical & horizontal grid lines to a subtle dark gray to make them visible
            "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.06)",
            "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.06)",
            "paneProperties.vertGridProperties.style": 0, // 0 = Solid
            "paneProperties.horzGridProperties.style": 0
          }
        });
      }
    } catch (e) {
      console.warn("Failed to initialize TradingView widget", e);
    }

    return () => {
      // Safe cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [scriptLoaded, symbol, containerId]);

  return (
    <div className="w-full h-[350px] md:h-[450px] bg-black border border-[#1E1E1E] rounded-xl overflow-hidden relative animate-fade-in">
      <div ref={containerRef} className="w-full h-full bg-black" />
    </div>
  );
}
