import { NextResponse } from "next/server";
import { geminiConfigured } from "@/services/geminiTutor";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    gemini: geminiConfigured(),
    model: process.env['GEMINI_MODEL'] ?? "gemini-2.0-flash",
  });
}
