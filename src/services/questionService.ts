import type { Attempt, Question, QuestionFlags, QuestionStatus } from "@/lib/types";

/**
 * Mastered = at least 2 correct attempts answered with certainty, on different days,
 * and the latest attempt is correct. A single correct answer never masters a question.
 */
export function isMastered(attempts: Attempt[]): boolean {
  if (!attempts.length) return false;
  const sorted = [...attempts].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted[sorted.length - 1]!.correct) return false;
  const days = new Set(sorted.filter((a) => a.correct && a.confidence === "sure").map((a) => a.date.slice(0, 10)));
  return days.size >= 2;
}

export function questionStatus(attempts: Attempt[], flags?: QuestionFlags): QuestionStatus {
  if (isMastered(attempts)) return "mastered";
  if (flags?.review) return "review";
  if (!attempts.length) return "unanswered";
  const last = [...attempts].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!;
  return last.correct ? "correct" : "incorrect";
}

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  unanswered: "Não resolvida",
  correct: "Correta",
  incorrect: "Incorreta",
  review: "Para revisão",
  mastered: "Dominada",
};
export const DIFF_LABEL = { easy: "Fácil", medium: "Média", hard: "Difícil" } as const;
export const CONF_LABEL = { sure: "Tinha certeza", doubt: "Tinha dúvida", guess: "Chutei" } as const;

export function groupAttempts(attempts: Attempt[]) {
  const m = new Map<string, Attempt[]>();
  for (const a of attempts) { const l = m.get(a.questionId) ?? []; l.push(a); m.set(a.questionId, l); }
  return m;
}

export interface QuestionFilter { text?: string; subject?: string; topic?: string; difficulty?: string; status?: string }

export function filterQuestions(qs: Question[], f: QuestionFilter, statusOf: (id: string) => QuestionStatus) {
  const t = f.text?.toLowerCase().trim();
  return qs.filter((q) =>
    (!t || `${q.statement} ${q.topic} ${q.tags.join(" ")} ${q.id}`.toLowerCase().includes(t)) &&
    (!f.subject || q.subject === f.subject) &&
    (!f.topic || q.topic === f.topic) &&
    (!f.difficulty || q.difficulty === f.difficulty) &&
    (!f.status || statusOf(q.id) === f.status));
}

/** Hierarchy: exam → subject → topic → subtopic → questions */
export function buildHierarchy(qs: Question[]) {
  const tree: Record<string, Record<string, Record<string, Question[]>>> = {};
  for (const q of qs) {
    const s = (tree[q.subject] ??= {});
    const t = (s[q.topic] ??= {});
    (t[q.subtopic || "Geral"] ??= []).push(q);
  }
  return tree;
}

/** Review priority: wrong > low-confidence correct > flagged > stale (>14 days). */
export function reviewPriority(attempts: Attempt[], flags: QuestionFlags | undefined, now = Date.now()): number {
  if (!attempts.length) return flags?.review ? 3 : 0;
  const last = [...attempts].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!;
  if (!last.correct) return 10;
  if (last.confidence !== "sure") return 7;
  if (flags?.review) return 5;
  if (now - new Date(last.date).getTime() > 14 * 86400000 && !isMastered(attempts)) return 2;
  return 0;
}
