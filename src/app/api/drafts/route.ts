import { NextResponse } from "next/server";
import type { Stroke } from "@/lib/types";
import { getSnapshot, setDraft } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { questionId: string; strokes: Stroke[] };
  if (!body.questionId) {
    return NextResponse.json({ error: "questionId obrigatório" }, { status: 400 });
  }
  await setDraft(body.questionId, body.strokes ?? []);
  return NextResponse.json({ drafts: (await getSnapshot()).drafts });
}
