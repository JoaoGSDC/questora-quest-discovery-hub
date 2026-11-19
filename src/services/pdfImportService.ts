import type { AltKey, Difficulty, Question } from "@/lib/types";
import type { ImportResult } from "./importService";

const SUBJECT_PT = "Língua Portuguesa";
const SUBJECT_MAT = "Matemática";

function normalizeText(raw: string) {
  return raw
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function parseAlternatives(block: string): Partial<Record<AltKey, string>> {
  const alts: Partial<Record<AltKey, string>> = {};
  const re = /(?:^|\n)\s*([A-E])\)\s*([\s\S]*?)(?=(?:\n\s*[A-E]\)|$))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const key = m[1] as AltKey;
    const text = m[2]!.replace(/\s+/g, " ").trim();
    if (text) alts[key] = text;
  }
  return alts;
}

function topicBefore(text: string, index: number): string {
  const before = text.slice(Math.max(0, index - 160), index);
  const line =
    before
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .at(-1) ?? "Geral";
  if (
    !line ||
    line.length > 90 ||
    /^Questão/i.test(line) ||
    /PORTUGUESA|MATEMÁTICA|MATEMATICA|SIMULADO|Concurso|Banca|Material|QUESTÕES|GABARITO/i.test(
      line,
    )
  ) {
    return "Geral";
  }
  return line;
}

export function parseLimeiraPdfText(rawText: string): ImportResult {
  const r: ImportResult = {
    ok: false,
    format: "PDF Limeira / Avança SP",
    questions: [],
    errors: [],
    warnings: [],
    subjects: [],
    topics: [],
  };

  const text = normalizeText(rawText);
  const titleMatch = text.match(/Concurso Público[^\n]*/i);
  const boardMatch = text.match(/Banca Organizadora:\s*([^\n]+)/i);
  if (titleMatch?.[0]) r.title = titleMatch[0].trim();
  else r.title = "Simulado importado do PDF";
  if (boardMatch?.[1]) r.description = `Banca: ${boardMatch[1].trim()}`;

  const gabSplit = text.split(/\n\s*GABARITO\b/i);
  const body = gabSplit[0] ?? text;
  const gabText = gabSplit[1] ?? "";

  // Prefer the section title with "QUESTÕES", not the cover blurb.
  let mathHeader = body.search(
    /MATEM[ÁA]TICA E RACIOC[IÍ]NIO L[OÓ]GICO\s*[—–-]\s*\d+\s*QUEST/i,
  );
  if (mathHeader < 0) {
    mathHeader = body.search(
      /\n\s*MATEM[ÁA]TICA E RACIOC[IÍ]NIO L[OÓ]GICO\s*[—–-]/i,
    );
  }

  const questionRe =
    /Questão\s+(\d+)\.\s*([\s\S]*?)(?=Questão\s+\d+\.|\s*$)/gi;
  type RawQ = {
    num: number;
    index: number;
    statement: string;
    alternatives: Partial<Record<AltKey, string>>;
    topic: string;
  };
  const rawQs: RawQ[] = [];
  let m: RegExpExecArray | null;
  while ((m = questionRe.exec(body))) {
    const num = Number(m[1]);
    const chunk = m[2] ?? "";
    const altStart = chunk.search(/\n\s*A\)/);
    let statement = chunk;
    let altBlock = "";
    if (altStart >= 0) {
      statement = chunk.slice(0, altStart).trim();
      altBlock = chunk.slice(altStart);
    }
    rawQs.push({
      num,
      index: m.index,
      statement: statement.replace(/\s+/g, " ").trim(),
      alternatives: parseAlternatives(altBlock),
      topic: topicBefore(body, m.index),
    });
  }

  if (!rawQs.length) {
    r.errors.push("Nenhuma questão encontrada no PDF.");
    return r;
  }

  type Gab = {
    num: number;
    topic: string;
    correct: AltKey;
    explanation: string;
  };
  const gabs: Gab[] = [];
  const gabBlocks = gabText.split(/(?=Questão\s+\d+\s*[—–-])/i);
  for (const block of gabBlocks) {
    const hm = block.match(
      /Questão\s+(\d+)\s*[—–-]\s*([^\n]+)\n\s*Resposta correta:\s*([A-E])\s*\n?([\s\S]*)/i,
    );
    if (!hm) continue;
    gabs.push({
      num: Number(hm[1]),
      topic: hm[2]!.trim(),
      correct: hm[3]!.toUpperCase() as AltKey,
      explanation: hm[4]!.replace(/\s+/g, " ").trim(),
    });
  }

  for (let i = 0; i < rawQs.length; i++) {
    const q = rawQs[i]!;
    const subject =
      mathHeader >= 0 && q.index >= mathHeader ? SUBJECT_MAT : SUBJECT_PT;
    const g = gabs[i];
    const prefix = subject === SUBJECT_MAT ? "mat" : "port";
    const id = `${prefix}-pdf-${String(q.num).padStart(3, "0")}`;
    const keys = Object.keys(q.alternatives);
    if (keys.length < 2) {
      r.warnings.push(
        `Questão ${q.num} (${subject}): poucas alternativas parseadas (${keys.length}).`,
      );
    }
    if (!g) {
      r.warnings.push(
        `Questão ${q.num} (${subject}): sem entrada correspondente no gabarito.`,
      );
    }
    const question: Question = {
      id,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAnswer: g?.correct ?? "A",
      subject,
      topic: g?.topic || q.topic,
      difficulty: "medium" as Difficulty,
      tags: ["pdf", "limeira", "avanca-sp"],
      exam: r.title,
      board: boardMatch?.[1]?.trim() ?? "Instituto Avança SP",
      source: "pdf-import",
    };
    if (g?.explanation) question.explanation = g.explanation;
    r.questions.push(question);
  }

  r.subjects = [...new Set(r.questions.map((q) => q.subject))];
  r.topics = [...new Set(r.questions.map((q) => q.topic))];
  r.ok = r.errors.length === 0 && r.questions.length > 0;
  if (r.questions.length < 40) {
    r.warnings.push(
      `Foram encontradas apenas ${r.questions.length} questões (esperado ~50).`,
    );
  }
  return r;
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const value: unknown = text;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");
  return String(value ?? "");
}

export async function importPdfBuffer(
  buffer: ArrayBuffer,
): Promise<ImportResult> {
  try {
    const text = await extractPdfText(buffer);
    if (!text.trim()) {
      return {
        ok: false,
        questions: [],
        errors: ["Não foi possível extrair texto do PDF."],
        warnings: [],
        subjects: [],
        topics: [],
      };
    }
    return parseLimeiraPdfText(text);
  } catch (e) {
    return {
      ok: false,
      questions: [],
      errors: [`Falha ao ler PDF: ${(e as Error).message}`],
      warnings: [],
      subjects: [],
      topics: [],
    };
  }
}
