import type { AltKey, ChatMessage, Question, TutorExplanation } from "@/lib/types";

/**
 * AI tutor contract. The current implementation is a local simulation; swap
 * `aiTutorService` for an implementation that calls a real model API later.
 */
export interface AiTutorProvider {
  explain(q: Question): Promise<TutorExplanation>;
  ask(q: Question, history: ChatMessage[], question: string): Promise<string>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockProvider: AiTutorProvider = {
  async explain(q) {
    await wait(700);
    const correctText = q.alternatives[q.correctAnswer];
    const alternatives: Partial<Record<AltKey, string>> = {};
    for (const [k, v] of Object.entries(q.alternatives) as [AltKey, string][]) {
      alternatives[k] = k === q.correctAnswer
        ? `Correta. ${q.explanation ?? `“${v}” atende exatamente ao que o enunciado pede.`}`
        : `Incorreta. “${v}” não é compatível com o conceito de ${q.topic.toLowerCase()} cobrado no enunciado.`;
    }
    const formulas = q.explanation?.match(/[^.]*[=×→][^.]*/g)?.map((s) => s.trim()).slice(0, 3) ?? [];
    return {
      summary: `A questão de ${q.subject} pede que você identifique ${q.statement.length > 110 ? q.statement.slice(0, 110) + "…" : q.statement}`,
      concept: `${q.topic}${q.subtopic ? ` — ${q.subtopic}` : ""}`,
      steps: [
        "Leia o comando com atenção e destaque o que está sendo perguntado.",
        `Identifique o conceito de ${q.topic.toLowerCase()} envolvido.`,
        "Elimine as alternativas que contradizem a regra ou o dado principal.",
        q.explanation ?? `Compare as alternativas restantes: apenas “${correctText}” é consistente.`,
      ],
      howToReach: `Aplicando a regra, chega-se à alternativa ${q.correctAnswer}: “${correctText}”.`,
      alternatives,
      formulas,
      tips: [
        `Questões de ${q.topic.toLowerCase()} costumam ${q.difficulty === "hard" ? "trazer pegadinhas nas alternativas mais longas" : "cobrar a regra geral"}.`,
        q.board ? `A banca ${q.board} recorre com frequência a esse tema.` : "Revise esse assunto em até 7 dias para fixar.",
      ],
    };
  },
  async ask(q, _history, question) {
    await wait(600 + Math.random() * 600);
    const t = question.toLowerCase();
    const alt = t.match(/\b([a-e])\b/i)?.[1]?.toUpperCase() as AltKey | undefined;
    if (alt && q.alternatives[alt]) {
      return alt === q.correctAnswer
        ? `A alternativa ${alt} é a correta. ${q.explanation ?? ""}`
        : `A alternativa ${alt} (“${q.alternatives[alt]}”) está errada porque não corresponde ao que o tema ${q.topic} estabelece. A correta é ${q.correctAnswer}.`;
    }
    if (t.includes("fórmula") || t.includes("formula")) return q.explanation ? `A base da resolução é: ${q.explanation}` : `Esta questão é mais conceitual — o ponto central é a regra de ${q.topic}.`;
    if (t.includes("simples") || t.includes("fácil")) return `Explicando de forma simples: a pergunta quer saber ${q.topic.toLowerCase()}. A resposta é ${q.correctAnswer} porque “${q.alternatives[q.correctAnswer]}” é a única que faz sentido com a regra.`;
    if (t.includes("outra") || t.includes("maneira")) return `Outro caminho: comece eliminando alternativas absurdas e teste as restantes no enunciado. Em ${q.topic}, isso costuma deixar só uma opção viável.`;
    if (t.includes("identificar")) return `Sinais típicos de questões de ${q.topic}: palavras-chave no comando e alternativas muito parecidas entre si. Ao reconhecê-los, aplique diretamente a regra.`;
    return `Boa pergunta! No contexto de ${q.topic}, o ponto-chave é: ${q.explanation ?? `a alternativa ${q.correctAnswer} é a que respeita a regra cobrada`}. Quer que eu detalhe alguma alternativa específica?`;
  },
};

export const aiTutorService: AiTutorProvider = mockProvider;
export const SUGGESTED_QUESTIONS = [
  "Por que essa alternativa está errada?",
  "Existe outra maneira de resolver?",
  "Qual fórmula foi utilizada?",
  "Como identificar esse tipo de questão?",
  "Pode explicar de uma maneira mais simples?",
];
