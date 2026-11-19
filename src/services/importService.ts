import { ALT_KEYS, type AltKey, type Difficulty, type Question } from "@/lib/types";

export interface ImportResult {
  ok: boolean;
  format?: string;
  title?: string;
  description?: string;
  questions: Question[];
  errors: string[];
  warnings: string[];
  subjects: string[];
  topics: string[];
}

/** Pluggable parsers: add new formats by pushing to this list. */
type ImportPayload = {
  title?: unknown;
  description?: unknown;
  subject?: unknown;
  board?: unknown;
  exam?: unknown;
  questions?: unknown;
};

export interface ImportFormat {
  id: string;
  label: string;
  detect: (data: unknown) => boolean;
  parse: (data: ImportPayload, r: ImportResult) => void;
}

const DIFFS: Record<string, Difficulty> = {
  easy: "easy",
  facil: "easy",
  fácil: "easy",
  medium: "medium",
  media: "medium",
  média: "medium",
  hard: "hard",
  dificil: "hard",
  difícil: "hard",
};

type RawQuestion = {
  id?: unknown;
  statement?: unknown;
  alternatives?: unknown;
  correctAnswer?: unknown;
  difficulty?: unknown;
  explanation?: unknown;
  subject?: unknown;
  topic?: unknown;
  subtopic?: unknown;
  board?: unknown;
  exam?: unknown;
  tags?: unknown;
};

const standardFormat: ImportFormat = {
  id: "questora-v1",
  label: "Questora JSON v1",
  detect: (d: unknown) =>
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as { questions?: unknown }).questions),
  parse: (d, r) => {
    if (typeof d.title === "string") r.title = d.title;
    if (typeof d.description === "string") r.description = d.description;
    if (!d.subject) {
      r.warnings.push(
        'Campo "subject" ausente no arquivo; questões sem disciplina usarão "Sem disciplina".',
      );
    }
    const questions = Array.isArray(d.questions) ? d.questions : [];
    questions.forEach((raw, i) => {
      const q = (raw ?? {}) as RawQuestion;
      const label = `Questão ${i + 1}${q.id ? ` (${String(q.id)})` : ""}`;
      if (!raw || typeof raw !== "object") {
        r.errors.push(`${label}: não é um objeto.`);
        return;
      }
      if (!q.statement || typeof q.statement !== "string") {
        r.errors.push(`${label}: campo "statement" obrigatório.`);
      }
      const alts = q.alternatives;
      if (!alts || typeof alts !== "object") {
        r.errors.push(`${label}: campo "alternatives" obrigatório.`);
        return;
      }
      const altRecord = alts as Record<string, unknown>;
      const keys = Object.keys(altRecord).map((k) => k.toUpperCase());
      const bad = keys.filter((k) => !ALT_KEYS.includes(k as AltKey));
      if (bad.length) {
        r.errors.push(
          `${label}: alternativas inválidas (${bad.join(", ")}). Use A–E.`,
        );
      }
      if (keys.length < 2) {
        r.errors.push(`${label}: são necessárias pelo menos 2 alternativas.`);
      }
      const ca = String(q.correctAnswer ?? "").toUpperCase();
      if (!keys.includes(ca)) {
        r.errors.push(
          `${label}: "correctAnswer" deve ser uma das alternativas (${keys.join(", ")}).`,
        );
      }
      const diff = DIFFS[String(q.difficulty ?? "medium").toLowerCase()];
      if (!diff) {
        r.warnings.push(
          `${label}: dificuldade "${String(q.difficulty)}" desconhecida, usando média.`,
        );
      }
      if (!q.explanation) {
        r.warnings.push(
          `${label}: sem explicação (o tutor IA poderá gerar uma).`,
        );
      }
      const alternatives: Partial<Record<AltKey, string>> = {};
      for (const [k, v] of Object.entries(altRecord)) {
        alternatives[k.toUpperCase() as AltKey] = String(v);
      }
      const question: Question = {
        id: String(q.id ?? `imp-${Date.now().toString(36)}-${i}`),
        statement: String(q.statement ?? ""),
        alternatives,
        correctAnswer: ca as AltKey,
        subject: String(q.subject || d.subject || "Sem disciplina"),
        topic: String(q.topic || "Geral"),
        difficulty: diff ?? "medium",
        tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
        source: typeof d.title === "string" ? d.title : "Importação",
      };
      if (typeof q.explanation === "string" && q.explanation) {
        question.explanation = q.explanation;
      }
      if (typeof q.subtopic === "string") question.subtopic = q.subtopic;
      if (typeof q.board === "string" || typeof d.board === "string") {
        question.board = String(q.board ?? d.board);
      }
      if (typeof q.exam === "string" || typeof d.exam === "string") {
        question.exam = String(q.exam ?? d.exam);
      }
      r.questions.push(question);
    });
  },
};

export const IMPORT_FORMATS: ImportFormat[] = [standardFormat];

export function parseImport(
  text: string,
  existingIds: Set<string> = new Set(),
): ImportResult {
  const r: ImportResult = {
    ok: false,
    questions: [],
    errors: [],
    warnings: [],
    subjects: [],
    topics: [],
  };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    r.errors.push(`JSON inválido: ${(e as Error).message}`);
    return r;
  }
  const fmt = IMPORT_FORMATS.find((f) => f.detect(data));
  if (!fmt) {
    r.errors.push(
      'Formato não reconhecido: esperado um objeto com a lista "questions".',
    );
    return r;
  }
  r.format = fmt.label;
  fmt.parse(data as ImportPayload, r);
  const seen = new Set<string>();
  for (const q of r.questions) {
    if (seen.has(q.id)) r.errors.push(`ID duplicado no arquivo: ${q.id}`);
    else if (existingIds.has(q.id)) {
      r.warnings.push(`ID ${q.id} já existe no banco e será substituído.`);
    }
    seen.add(q.id);
  }
  r.subjects = [...new Set(r.questions.map((q) => q.subject))];
  r.topics = [...new Set(r.questions.map((q) => q.topic))];
  r.ok = r.errors.length === 0 && r.questions.length > 0;
  return r;
}

export const SAMPLE_JSON = {
  title: "Simulado de Português",
  description: "Questões de interpretação de texto",
  subject: "Língua Portuguesa",
  questions: [
    {
      id: "port-ex-001",
      topic: "Interpretação de texto",
      difficulty: "medium",
      statement:
        "“O silêncio da biblioteca era interrompido apenas pelo virar das páginas.” O trecho sugere um ambiente:",
      alternatives: {
        A: "agitado e barulhento",
        B: "abandonado",
        C: "calmo e concentrado",
        D: "hostil",
        E: "festivo",
      },
      correctAnswer: "C",
      explanation:
        "Silêncio interrompido apenas pelo som das páginas indica tranquilidade e concentração.",
    },
    {
      id: "port-ex-002",
      topic: "Semântica",
      difficulty: "easy",
      statement: "Na frase “O prazo é exíguo”, exíguo significa:",
      alternatives: {
        A: "amplo",
        B: "curto",
        C: "flexível",
        D: "indefinido",
        E: "vencido",
      },
      correctAnswer: "B",
    },
  ],
};

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
