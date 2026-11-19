import { NextResponse } from "next/server";
import {
  DEFAULT_LIVE_STATE,
  parseLiveSessionState,
  type LiveSessionState,
} from "@/lib/live-session";
import { getLiveSessionRaw, saveLiveSessionRaw } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function GET() {
  await seedIfEmpty();
  const raw = await getLiveSessionRaw();
  if (!raw) {
    return NextResponse.json(DEFAULT_LIVE_STATE);
  }
  try {
    return NextResponse.json(parseLiveSessionState(JSON.parse(raw)));
  } catch {
    return NextResponse.json(DEFAULT_LIVE_STATE);
  }
}

export async function PUT(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as Partial<LiveSessionState>;
  const currentRaw = await getLiveSessionRaw();
  let current = DEFAULT_LIVE_STATE;
  if (currentRaw) {
    try {
      current = parseLiveSessionState(JSON.parse(currentRaw));
    } catch {
      /* keep default */
    }
  }
  const next = parseLiveSessionState({
    ...current,
    ...body,
    hostAnswers: body.hostAnswers ?? current.hostAnswers,
    updatedAt: new Date().toISOString(),
  });
  await saveLiveSessionRaw(JSON.stringify(next));
  return NextResponse.json(next);
}
