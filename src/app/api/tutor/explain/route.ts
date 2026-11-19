import { NextResponse } from "next/server";
import { getSnapshot, upsertNotebook } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";
import { geminiConfigured, geminiTutorService } from "@/services/geminiTutor";
import { emptyEntry } from "@/services/knowledgeService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { questionId: string };
  const snap = await getSnapshot();
  const q = snap.questions.find((x) => x.id === body.questionId);
  if (!q) return NextResponse.json({ error: "questão não encontrada" }, { status: 404 });

  const explanation = await geminiTutorService.explain(q);
  const prev = snap.notebook[q.id] ?? emptyEntry(q.id);
  const entry = {
    ...prev,
    explanation,
    formulas: [...new Set([...prev.formulas, ...explanation.formulas])],
    concepts: [...new Set([...prev.concepts, explanation.concept])],
    updatedAt: new Date().toISOString(),
  };
  await upsertNotebook(entry);

  return NextResponse.json({
    explanation,
    entry,
    provider: geminiConfigured() ? "gemini" : "local",
  });
}
