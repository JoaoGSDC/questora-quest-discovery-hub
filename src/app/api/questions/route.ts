import { NextResponse } from "next/server";
import type { Question } from "@/lib/types";
import {
  deleteQuestions,
  getSnapshot,
  updateQuestion,
  upsertQuestions,
} from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function GET() {
  await seedIfEmpty();
  return NextResponse.json({ questions: (await getSnapshot()).questions });
}

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { questions?: Question[]; question?: Question };
  if (body.questions?.length) await upsertQuestions(body.questions);
  else if (body.question) await updateQuestion(body.question);
  else return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  return NextResponse.json({ ok: true, questions: (await getSnapshot()).questions });
}

export async function DELETE(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { ids?: string[] };
  if (!body.ids?.length) {
    return NextResponse.json({ error: "ids obrigatórios" }, { status: 400 });
  }
  await deleteQuestions(body.ids);
  return NextResponse.json({ ok: true, questions: (await getSnapshot()).questions });
}
