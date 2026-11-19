import { NextResponse } from "next/server";
import { disconnectTwitchIrc, getTwitchRuntimeStatus } from "@/server/twitch-irc";

export const runtime = "nodejs";

export async function POST() {
  await disconnectTwitchIrc();
  return NextResponse.json({ ok: true, runtime: getTwitchRuntimeStatus() });
}
