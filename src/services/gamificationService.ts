import type { Achievement, Attempt, Confidence, Difficulty, Question, XpEvent } from "@/lib/types";

/** XP rules. Quality (confidence, difficulty, review) is weighted, not just volume. */
export const XP_RULES = {
  answer: 2,
  correct: 8,
  hardBonus: 6,
  mediumBonus: 2,
  confidentCorrect: 3,
  guessCorrectPenalty: -4,
  reviewOld: 6,
  sessionComplete: 20,
  streakDay: 5,
  studyBlock15min: 10,
} as const;

export function xpForAnswer(opts: {
  correct: boolean;
  difficulty: Difficulty;
  confidence: Confidence;
  isReviewOfOld: boolean;
}): { amount: number; reasons: string[] } {
  let amount: number = XP_RULES.answer;
  const reasons = ["Questão resolvida"];
  if (opts.correct) {
    amount += XP_RULES.correct;
    reasons.push("Acerto");
    if (opts.difficulty === "hard") { amount += XP_RULES.hardBonus; reasons.push("Questão difícil"); }
    if (opts.difficulty === "medium") amount += XP_RULES.mediumBonus;
    if (opts.confidence === "sure") { amount += XP_RULES.confidentCorrect; reasons.push("Acerto com segurança"); }
    if (opts.confidence === "guess") { amount += XP_RULES.guessCorrectPenalty; reasons.push("Chute (XP reduzido)"); }
  }
  if (opts.isReviewOfOld) { amount += XP_RULES.reviewOld; reasons.push("Revisão de questão antiga"); }
  return { amount: Math.max(amount, 1), reasons };
}

/** Cumulative XP required to reach level n (level 1 = 0 XP). */
export const xpToReachLevel = (n: number) => 50 * (n - 1) * n;

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) level++;
  const base = xpToReachLevel(level);
  const next = xpToReachLevel(level + 1);
  return { level, current: xp - base, needed: next - base, progress: (xp - base) / (next - base) };
}

export const LEVEL_TITLES = ["Iniciante", "Aprendiz", "Dedicado", "Persistente", "Estrategista", "Avançado", "Especialista", "Mestre", "Lenda"];
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(Math.floor((level - 1) / 2), LEVEL_TITLES.length - 1)];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function streakDays(attempts: Attempt[], now = new Date()): number {
  const days = new Set(attempts.map((a) => dayKey(new Date(a.date))));
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export const totalXp = (events: XpEvent[]) => events.reduce((s, e) => s + e.amount, 0);

export function computeAchievements(attempts: Attempt[], questions: Question[], mastered: number): Achievement[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const correct = attempts.filter((a) => a.correct);
  const solved = new Set(attempts.map((a) => a.questionId)).size;
  const subjCorrect = (s: string) => correct.filter((a) => byId.get(a.questionId)?.subject === s).length;
  const interp = correct.filter((a) => byId.get(a.questionId)?.topic === "Interpretação de texto").length;
  const streak = streakDays(attempts);
  // comeback: correct answer right after 3+ consecutive errors
  const sorted = [...attempts].sort((a, b) => a.date.localeCompare(b.date));
  let run = 0, comeback = false;
  for (const a of sorted) { if (!a.correct) run++; else { if (run >= 3) comeback = true; run = 0; } }
  const a = (id: string, title: string, description: string, icon: string, value: number, goal: number): Achievement =>
    ({ id, title, description, icon, unlocked: value >= goal, progress: Math.min(value / goal, 1) });
  return [
    a("first", "Primeiro passo", "Resolva sua primeira questão", "Footprints", attempts.length, 1),
    a("c10", "Pegando ritmo", "Acerte 10 questões", "Target", correct.length, 10),
    a("s100", "Centenário", "Resolva 100 questões diferentes", "Trophy", solved, 100),
    a("streak7", "Semana de ferro", "Estude 7 dias seguidos", "Flame", streak, 7),
    a("math", "Especialista em Matemática", "Acerte 25 questões de Matemática", "Sigma", subjCorrect("Matemática"), 25),
    a("interp", "Mestre da Interpretação", "Acerte 15 questões de interpretação", "BookOpen", interp, 15),
    a("comeback", "Virada", "Acerte após uma sequência de 3 erros", "TrendingUp", comeback ? 1 : 0, 1),
    a("mastery", "Domínio", "Domine 10 questões", "Crown", mastered, 10),
  ];
}
