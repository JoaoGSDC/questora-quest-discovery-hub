import { NextResponse } from "next/server";
import { forceReseed } from "@/db/seed";

export const runtime = "nodejs";

export async function POST() {
  const snap = await forceReseed();
  return NextResponse.json(snap);
}
