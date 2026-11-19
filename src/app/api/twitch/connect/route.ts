import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { connectTwitchIrc, getTwitchRuntimeStatus } from "@/server/twitch-irc";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  try {
    const body = (await req.json().catch(() => ({}))) as { channel?: string };
    const result = await connectTwitchIrc(body.channel);
    return NextResponse.json({ ok: true, ...result, runtime: getTwitchRuntimeStatus() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }
}
