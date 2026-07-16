import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  
  if (!geminiApiKey) {
    return NextResponse.json({
      status: "error",
      message: "GEMINI_API_KEY is not defined in the .env file. Please add it to enable Gemini AI Guard."
    }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Respond with exactly the word OK");
    const text = result.response.text().trim();
    
    if (text.toUpperCase().includes("OK")) {
      return NextResponse.json({
        status: "success",
        model: "gemini-1.5-flash",
        message: "Gemini API key is configured and working properly!"
      });
    } else {
      return NextResponse.json({
        status: "warning",
        message: `Gemini API key is configured, but returned unexpected response: ${text}`
      });
    }
  } catch (err: any) {
    console.error("[Gemini Diagnostic] API Key Check Failed:", err);
    return NextResponse.json({
      status: "error",
      message: `Gemini API key check failed: ${err.message || err}`
    }, { status: 500 });
  }
}
