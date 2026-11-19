import type { AltKey, ChatMessage, Question, TutorExplanation } from "@/lib/types";

/** Contrato do tutor. Sem API key, usa fallback local baseado no gabarito. */
export interface AiTutorProvider {
  explain(q: Question): Promise<TutorExplanation>;
  ask(q: Question, history: ChatMessage[], question: string): Promise<string>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const localFallback: AiTutorProvider = {
  async explain(q) {
    await wait(400);
    const correctText = q.alternatives[q.correctAnswer];
    const alternatives: Partial<Record<AltKey, string>> = {};
    for (const [k, v] of Object.entries(q.alternatives) as [AltKey, string][]) {
      alternatives[k] =
        k === q.correctAnswer
          ? `Correta. ${q.explanation ?? `"${v}" atende ao enunciado.`}`
          : `Incorreta. "${v}" não fecha com ${q.topic.toLowerCase()}.`;
    }
    const formulas =
      q.explanation
        ?.match(/[^.]*[=×→][^.]*/g)
        ?.map((s) => s.trim())
        .slice(0, 3) ?? [];
    const statement =
      q.statement.length > 110 ? `${q.statement.slice(0, 110)}...` : q.statement;
    return {
      summary: `Questão de ${q.subject}: ${statement}`,
      concept: q.subtopic ? `${q.topic} / ${q.subtopic}` : q.topic,
      steps: [
        "Leia o comando e marque o que está sendo pedido.",
        `Isolar o conceito de ${q.topic.toLowerCase()}.`,
        "Elimine alternativas que contradizem a regra ou o dado.",
        q.explanation ??
          `Entre as restantes, "${correctText}" é a consistente.`,
      ],
      howToReach: `Alternativa ${q.correctAnswer}: "${correctText}".`,
      alternatives,
      formulas,
      tips: [
        q.board
          ? `Banca: ${q.board}.`
          : `Assunto: ${q.topic}.`,
      ],
    };
  },
  async ask(q, _history, question) {
    await wait(300);
    const t = question.toLowerCase();
    const alt = t.match(/\b([a-e])\b/i)?.[1]?.toUpperCase() as AltKey | undefined;
    if (alt && q.alternatives[alt]) {
      return alt === q.correctAnswer
        ? `A alternativa ${alt} é a correta. ${q.explanation ?? ""}`
        : `A alternativa ${alt} ("${q.alternatives[alt]}") está errada. A correta é ${q.correctAnswer}.`;
    }
    if (t.includes("fórmula") || t.includes("formula")) {
      return q.explanation
        ? `Base da resolução: ${q.explanation}`
        : `Ponto central: regra de ${q.topic}.`;
    }
    if (t.includes("simples") || t.includes("fácil")) {
      return `Em resumo: o tema é ${q.topic.toLowerCase()}. Resposta ${q.correctAnswer} ("${q.alternatives[q.correctAnswer]}").`;
    }
    if (t.includes("outra") || t.includes("maneira")) {
      return `Outro caminho: elimine absurdas e teste as restantes no enunciado (${q.topic}).`;
    }
    if (t.includes("identificar")) {
      return `Em ${q.topic}, preste atenção às palavras-chave do comando e a alternativas muito parecidas.`;
    }
    return (
      q.explanation ??
      `No tema ${q.topic}, a alternativa ${q.correctAnswer} respeita a regra cobrada.`
    );
  },
};

export const aiTutorService: AiTutorProvider = localFallback;
export const SUGGESTED_QUESTIONS = [
  "Por que essa alternativa está errada?",
  "Existe outra maneira de resolver?",
  "Qual fórmula foi utilizada?",
  "Como identificar esse tipo de questão?",
  "Pode explicar de uma maneira mais simples?",
];
