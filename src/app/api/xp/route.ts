import { NextResponse } from "next/server";
import type { XpEvent } from "@/lib/types";
import { addXp, getSnapshot } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { amount: number; reason: string };
  if (!body.amount || !body.reason) {
    return NextResponse.json({ error: "amount/reason obrigatórios" }, { status: 400 });
  }
  const xp: XpEvent = {
    id: `xp-${Date.now().toString(36)}`,
    date: new Date().toISOString(),
    amount: body.amount,
    reason: body.reason,
  };
  await addXp(xp);
  return NextResponse.json({ xp, snapshot: await getSnapshot() });
}
