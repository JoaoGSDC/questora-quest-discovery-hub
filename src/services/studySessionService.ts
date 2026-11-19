import type { Attempt, Question, QuestionFlags, SessionConfig, StudySession } from "@/lib/types";
import { groupAttempts, questionStatus } from "./questionService";

export function pickQuestions(qs: Question[], attempts: Attempt[], flags: Record<string, QuestionFlags>, c: SessionConfig): string[] {
  const g = groupAttempts(attempts);
  let pool = qs.filter((q) =>
    (!c.subject || q.subject === c.subject) &&
    (!c.topic || q.topic === c.topic) &&
    (!c.difficulty || c.difficulty === "any" || q.difficulty === c.difficulty));
  pool = pool.filter((q) => {
    const st = questionStatus(g.get(q.id) ?? [], flags[q.id]);
    switch (c.filter) {
      case "unanswered": return !g.has(q.id);
      case "wrong": return st === "incorrect";
      case "review": return !!flags[q.id]?.review;
      case "favorites": return !!flags[q.id]?.favorite;
      default: return true;
    }
  });
  if (c.shuffle) pool = [...pool].sort(() => Math.random() - 0.5);
  return pool.slice(0, c.count).map((q) => q.id);
}

export function newSession(config: SessionConfig, questionIds: string[]): StudySession {
  return { id: `s-${Date.now().toString(36)}`, config, questionIds, index: 0, startedAt: new Date().toISOString(), answers: {}, xpEarned: 0 };
}

export function sessionReport(s: StudySession, qs: Question[]) {
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ans = Object.entries(s.answers);
  const correct = ans.filter(([, a]) => a.correct).length;
  const byTopic: Record<string, { total: number; correct: number }> = {};
  for (const [id, a] of ans) {
    const t = byId.get(id)?.topic ?? "?";
    byTopic[t] ??= { total: 0, correct: 0 };
    byTopic[t].total++; if (a.correct) byTopic[t].correct++;
  }
  const end = s.finishedAt ? new Date(s.finishedAt) : new Date();
  const weak = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.7).map(([k]) => k);
  const lowConf = ans.filter(([, a]) => a.correct && a.confidence !== "sure").map(([id]) => id);
  return {
    total: s.questionIds.length, answered: ans.length, correct, wrong: ans.length - correct,
    rate: ans.length ? correct / ans.length : 0,
    seconds: Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 1000),
    byTopic, xp: s.xpEarned, weak, lowConf,
  };
}
