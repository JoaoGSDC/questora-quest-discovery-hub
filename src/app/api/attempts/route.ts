import { NextResponse } from "next/server";
import type { AltKey, Attempt, Confidence, XpEvent } from "@/lib/types";
import { addAttempt, addXp, getSnapshot } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";
import { xpForAnswer, XP_RULES } from "@/services/gamificationService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as {
    questionId: string;
    selected: AltKey;
    confidence: Confidence;
    timeSpent: number;
    sessionId?: string;
    sessionComplete?: boolean;
  };

  const snap = await getSnapshot();
  const q = snap.questions.find((x) => x.id === body.questionId);
  if (!q) return NextResponse.json({ error: "questão não encontrada" }, { status: 404 });

  const correct = body.selected === q.correctAnswer;
  const prev = snap.attempts
    .filter((a) => a.questionId === body.questionId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = prev.at(-1);
  const isReviewOfOld =
    !!last && Date.now() - new Date(last.date).getTime() > 14 * 86400000;
  const { amount, reasons } = xpForAnswer({
    correct,
    difficulty: q.difficulty,
    confidence: body.confidence,
    isReviewOfOld,
  });

  const attempt: Attempt = {
    id: `a-${Date.now().toString(36)}`,
    questionId: body.questionId,
    date: new Date().toISOString(),
    selected: body.selected,
    correct,
    timeSpent: Math.max(body.timeSpent, 1),
    confidence: body.confidence,
    hasDraft: (snap.drafts[body.questionId]?.length ?? 0) > 0,
  };
  if (body.sessionId) attempt.sessionId = body.sessionId;

  const xp: XpEvent = {
    id: `xp-${attempt.id}`,
    date: attempt.date,
    amount,
    reason: reasons[0] ?? "Questão resolvida",
  };
  await addAttempt(attempt, xp);

  let sessionXp = 0;
  if (body.sessionComplete) {
    sessionXp = XP_RULES.sessionComplete;
    await addXp({
      id: `xp-sess-${Date.now().toString(36)}`,
      date: new Date().toISOString(),
      amount: sessionXp,
      reason: "Sessão concluída",
    });
  }

  return NextResponse.json({
    attempt,
    xp: amount,
    reasons,
    sessionXp,
    snapshot: await getSnapshot(),
  });
}
