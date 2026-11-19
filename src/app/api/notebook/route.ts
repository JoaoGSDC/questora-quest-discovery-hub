import { NextResponse } from "next/server";
import type { NotebookEntry } from "@/lib/types";
import { getSnapshot, setPersonalNote, upsertNotebook } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as {
    entry?: NotebookEntry;
    note?: { questionId: string; text: string };
  };
  if (body.entry) await upsertNotebook(body.entry);
  if (body.note) await setPersonalNote(body.note.questionId, body.note.text);
  const snap = await getSnapshot();
  return NextResponse.json({ notebook: snap.notebook, notes: snap.notes });
}
