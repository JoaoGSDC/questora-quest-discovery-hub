import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function GET() {
  const snap = await seedIfEmpty();
  return NextResponse.json(snap);
}
