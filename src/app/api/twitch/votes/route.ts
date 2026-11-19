import { NextResponse } from "next/server";
import { clearLiveVotes, getLiveVotes, setLiveVotes } from "@/server/twitch-irc";
import type { Vote } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ votes: getLiveVotes() });
}

export async function DELETE() {
  clearLiveVotes();
  return NextResponse.json({ votes: [] });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { votes?: Vote[] };
  setLiveVotes(body.votes ?? []);
  return NextResponse.json({ votes: getLiveVotes() });
}
