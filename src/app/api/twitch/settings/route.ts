import { NextResponse } from "next/server";
import type { TwitchSettings, Viewer } from "@/lib/types";
import { getSnapshot, getTwitchFull, setTwitch, setViewers } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function GET() {
  await seedIfEmpty();
  const full = await getTwitchFull();
  return NextResponse.json({
    twitch: {
      channel: full.channel,
      connected: full.connected,
      chatEnabled: full.chatEnabled,
      commandPrefix: full.commandPrefix,
      pointsCorrect: full.pointsCorrect,
      pointsParticipation: full.pointsParticipation,
      voteSeconds: full.voteSeconds,
    },
    authenticated: !!full.accessToken,
    username: full.twitchUsername ?? null,
    viewers: (await getSnapshot()).viewers,
  });
}

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as {
    twitch?: Partial<TwitchSettings>;
    viewers?: Viewer[];
  };
  if (body.twitch) await setTwitch(body.twitch);
  if (body.viewers) await setViewers(body.viewers);
  return GET();
}
