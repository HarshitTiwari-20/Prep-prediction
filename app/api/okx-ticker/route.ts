import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instId = searchParams.get("instId") || "BTC-USDT";

  // OKX Domains to try in order of connection success in restricted regions
  const baseUrls = [
    "https://www.okx.pub",
    "https://www.okx.cab",
    "https://www.okx.com"
  ];

  const requestPath = `/api/v5/market/ticker?instId=${instId}`;
  const method = "GET";

  const apiKey = process.env.OKX_API_KEY || "";
  const secretKey = process.env.OKX_SECRET_KEY || "";
  const passphrase = process.env.OKX_PASSPHRASE || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Sign headers if OKX credentials are present in .env
  if (apiKey && secretKey && passphrase) {
    const timestamp = new Date().toISOString();
    const signStr = timestamp + method + requestPath;
    const sign = crypto
      .createHmac("sha256", secretKey)
      .update(signStr)
      .digest("base64");

    headers["OK-ACCESS-KEY"] = apiKey;
    headers["OK-ACCESS-SIGN"] = sign;
    headers["OK-ACCESS-TIMESTAMP"] = timestamp;
    headers["OK-ACCESS-PASSPHRASE"] = passphrase;
  }

  // Fallback domain loop to prevent ISP connection timeouts
  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}${requestPath}`;
    try {
      console.log(`[OKX API Proxy] Attempting fetch to ${url}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout per domain
      
      const response = await fetch(url, { 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        console.log(`[OKX API Proxy] Success using domain ${baseUrl} for ${instId}`);
        return NextResponse.json(json);
      }
    } catch (err: any) {
      console.warn(`[OKX API Proxy] Domain ${baseUrl} failed or timed out: ${err.message || err}`);
    }
  }

  // If all domains failed
  console.error(`[OKX API Proxy] All fallback OKX domains failed for ${instId}`);
  return NextResponse.json({ 
    code: "-1", 
    msg: "All connection attempts to OKX API endpoints timed out due to local network/ISP blocks. Please verify your internet connection or use a VPN." 
  }, { status: 504 });
}
