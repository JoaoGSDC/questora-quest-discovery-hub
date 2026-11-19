import { NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/types";
import { getSnapshot, upsertNotebook } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";
import { geminiConfigured, geminiTutorService } from "@/services/geminiTutor";
import { emptyEntry } from "@/services/knowledgeService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as {
    questionId: string;
    message: string;
    history?: ChatMessage[];
  };
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "mensagem obrigatória" }, { status: 400 });
  }
  const snap = await getSnapshot();
  const q = snap.questions.find((x) => x.id === body.questionId);
  if (!q) return NextResponse.json({ error: "questão não encontrada" }, { status: 404 });

  const prev = snap.notebook[q.id] ?? emptyEntry(q.id);
  const history = body.history ?? prev.chat;
  const userMsg: ChatMessage = {
    id: `c-${Date.now()}`,
    role: "user",
    content: body.message.trim(),
    date: new Date().toISOString(),
  };
  const reply = await geminiTutorService.ask(q, history, body.message.trim());
  const asst: ChatMessage = {
    id: `c-${Date.now()}-a`,
    role: "assistant",
    content: reply,
    date: new Date().toISOString(),
  };
  const chat = [...history, userMsg, asst];
  const entry = {
    ...prev,
    chat,
    updatedAt: new Date().toISOString(),
  };
  await upsertNotebook(entry);

  return NextResponse.json({
    reply,
    chat,
    entry,
    provider: geminiConfigured() ? "gemini" : "local",
  });
}
