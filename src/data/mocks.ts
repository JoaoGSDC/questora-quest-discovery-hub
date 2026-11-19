import type { Attempt, AltKey, Confidence, NotebookEntry, Viewer, XpEvent, CustomList } from "@/lib/types";
import { SEED_QUESTIONS } from "./questions";

// Deterministic PRNG so server and client render the same demo data.
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function buildMockHistory(): { attempts: Attempt[]; xp: XpEvent[] } {
  const r = rng(42);
  const attempts: Attempt[] = [];
  const xp: XpEvent[] = [];
  const today = startOfToday();
  const pool = SEED_QUESTIONS.slice(0, 38);
  for (let day = 28; day >= 1; day--) {
    if (day > 9 && r() < 0.3) continue; // gaps before the current 9-day streak
    const n = 2 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      const q = pool[Math.floor(r() * pool.length)]!;
      const skill = q.difficulty === "easy" ? 0.82 : q.difficulty === "medium" ? 0.65 : 0.45;
      const correct = r() < skill + (28 - day) * 0.006;
      const keys = Object.keys(q.alternatives) as AltKey[];
      const selected = correct ? q.correctAnswer : keys.filter((x) => x !== q.correctAnswer)[Math.floor(r() * 4)]!;
      const confidence: Confidence = correct ? (r() < 0.65 ? "sure" : r() < 0.6 ? "doubt" : "guess") : r() < 0.4 ? "sure" : "doubt";
      const date = new Date(today - day * DAY + (9 + k) * 3600000 + Math.floor(r() * 3000000)).toISOString();
      attempts.push({ id: `seed-a-${day}-${k}`, questionId: q.id, date, selected, correct, timeSpent: 40 + Math.floor(r() * 200), confidence, hasDraft: r() < 0.3 });
      xp.push({ id: `seed-x-${day}-${k}`, date, amount: correct ? 10 + (q.difficulty === "hard" ? 6 : 0) : 2, reason: correct ? "Acerto" : "Questão resolvida" });
    }
    xp.push({ id: `seed-s-${day}`, date: new Date(today - day * DAY + 20 * 3600000).toISOString(), amount: 20, reason: "Sessão concluída" });
  }
  return { attempts, xp };
}

export const MOCK_NOTEBOOK: Record<string, NotebookEntry> = {
  "mat-001": {
    questionId: "mat-001",
    chat: [
      { id: "n1", role: "user", content: "Por que não é 20%?", date: new Date(startOfToday() - 3 * DAY).toISOString() },
      { id: "n2", role: "assistant", content: "Porque o segundo aumento incide sobre o valor já aumentado. 100 → 110 → 121. Aumentos sucessivos se multiplicam (1,1 × 1,1), não se somam.", date: new Date(startOfToday() - 3 * DAY).toISOString() },
    ],
    personalNotes: "Aumentos sucessivos: multiplicar os fatores. Nunca somar porcentagens!",
    formulas: ["Fator de aumento = 1 + i", "Aumento total = (1+i₁)(1+i₂) − 1"],
    concepts: ["Porcentagem", "Fator multiplicativo"],
    updatedAt: new Date(startOfToday() - 3 * DAY).toISOString(),
  },
  "ce-004": {
    questionId: "ce-004",
    chat: [
      { id: "n3", role: "user", content: "Qual a diferença entre revogação e anulação?", date: new Date(startOfToday() - 5 * DAY).toISOString() },
      { id: "n4", role: "assistant", content: "Anulação: ato ilegal, efeitos ex tunc (retroagem), feita pela Administração ou pelo Judiciário. Revogação: ato legal mas inconveniente, efeitos ex nunc, só a Administração.", date: new Date(startOfToday() - 5 * DAY).toISOString() },
    ],
    personalNotes: "Revoga = mérito / ex nunc. Anula = legalidade / ex tunc. Súmula 473 STF.",
    formulas: [],
    concepts: ["Revogação", "Anulação", "Súmula 473"],
    updatedAt: new Date(startOfToday() - 5 * DAY).toISOString(),
  },
  "port-003": {
    questionId: "port-003",
    chat: [],
    personalNotes: "Truque: troque por palavra masculina. Se virar “ao”, tem crase.",
    formulas: ["a + a = à"],
    concepts: ["Crase", "Regência"],
    updatedAt: new Date(startOfToday() - 8 * DAY).toISOString(),
  },
};

export const MOCK_LISTS: CustomList[] = [
  { id: "list-1", name: "Revisão de crase", questionIds: ["port-003", "port-004"], createdAt: new Date(startOfToday() - 6 * DAY).toISOString() },
  { id: "list-2", name: "Juros — pré-prova", questionIds: ["mat-007", "mat-008", "mat-001"], createdAt: new Date(startOfToday() - 2 * DAY).toISOString() },
];

export const MOCK_VIEWERS: Viewer[] = [
  ["concurseira_ana", 42, 35], ["joaopedro_br", 38, 27], ["focoeforca", 51, 33], ["marina.estuda", 29, 24],
  ["tiago_inss", 33, 20], ["luiza_trf", 22, 17], ["caiocodes", 18, 11], ["bia_aprovada", 40, 31],
  ["renan_rlm", 15, 9], ["dani.dir.adm", 26, 19], ["paulo_pf", 12, 6], ["vivi_vunesp", 20, 15],
].map(([name, answered, correct]) => ({ name: name as string, answered: answered as number, correct: correct as number, score: (correct as number) * 10 + (answered as number) * 2 }));

export const VIEWER_POOL = [...MOCK_VIEWERS.map((v) => v.name), "gabi_estudos", "rafa_cespe", "lucas.fcc", "nina_tj", "pedro_bb", "carol_receita", "andre_mpu", "julia_ibge", "matheus.prf", "bruna_sefaz", "igor_tcu", "sofia_alesp"];
