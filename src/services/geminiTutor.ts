import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, Question, TutorExplanation } from "@/lib/types";
import { ALT_KEYS } from "@/lib/types";
import type { AiTutorProvider } from "./aiTutorService";
import { aiTutorService as localTutor } from "./aiTutorService";

function getClient() {
  const key = process.env['GEMINI_API_KEY'];
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export function geminiConfigured() {
  return !!process.env['GEMINI_API_KEY'];
}

function questionContext(q: Question) {
  const alts = ALT_KEYS.filter((k) => q.alternatives[k])
    .map((k) => `${k}) ${q.alternatives[k]}`)
    .join("\n");
  return [
    `Disciplina: ${q.subject}`,
    `Assunto: ${q.topic}${q.subtopic ? ` / ${q.subtopic}` : ""}`,
    `Enunciado: ${q.statement}`,
    `Alternativas:\n${alts}`,
    `Gabarito: ${q.correctAnswer}`,
    q.explanation ? `Explicação de referência: ${q.explanation}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function explainWithGemini(q: Question): Promise<TutorExplanation> {
  const client = getClient();
  if (!client) return localTutor.explain(q);
  const model = client.getGenerativeModel({
    model: process.env['GEMINI_MODEL'] ?? "gemini-2.0-flash",
  });
  const prompt = `Você é um tutor de concursos públicos brasileiros. Explique a questão abaixo de forma clara e didática.
Responda APENAS com JSON válido neste formato:
{
  "summary": string,
  "concept": string,
  "steps": string[],
  "howToReach": string,
  "alternatives": { "A"?: string, "B"?: string, "C"?: string, "D"?: string, "E"?: string },
  "formulas": string[],
  "tips": string[]
}

${questionContext(q)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta Gemini sem JSON");
  const parsed = JSON.parse(jsonMatch[0]) as TutorExplanation;
  return {
    summary: parsed.summary ?? "",
    concept: parsed.concept ?? q.topic,
    steps: parsed.steps ?? [],
    howToReach: parsed.howToReach ?? "",
    alternatives: parsed.alternatives ?? {},
    formulas: parsed.formulas ?? [],
    tips: parsed.tips ?? [],
  };
}

async function askWithGemini(
  q: Question,
  history: ChatMessage[],
  question: string,
): Promise<string> {
  const client = getClient();
  if (!client) return localTutor.ask(q, history, question);
  const model = client.getGenerativeModel({
    model: process.env['GEMINI_MODEL'] ?? "gemini-2.0-flash",
  });
  const hist = history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Aluno" : "Tutor"}: ${m.content}`)
    .join("\n");
  const prompt = `Você é um tutor de concursos. Responda em português, de forma objetiva e didática (máx. 2 parágrafos curtos, a menos que peçam detalhe).

Contexto da questão:
${questionContext(q)}

Histórico recente:
${hist || "(vazio)"}

Pergunta do aluno: ${question}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export const geminiTutorService: AiTutorProvider = {
  async explain(q) {
    try {
      return await explainWithGemini(q);
    } catch (e) {
      console.error("Gemini explain fallback", e);
      return localTutor.explain(q);
    }
  },
  async ask(q, history, question) {
    try {
      return await askWithGemini(q, history, question);
    } catch (e) {
      console.error("Gemini ask fallback", e);
      return localTutor.ask(q, history, question);
    }
  },
};
