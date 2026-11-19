import type {
  AltKey,
  Attempt,
  Confidence,
  CustomList,
  NotebookEntry,
  Question,
  QuestionFlags,
  Stroke,
  TutorExplanation,
  TwitchSettings,
  Viewer,
  XpEvent,
} from "@/lib/types";
import type { InferSelectModel } from "drizzle-orm";
import * as schema from "./schema";

type QRow = InferSelectModel<typeof schema.questions>;
type ARow = InferSelectModel<typeof schema.attempts>;
type NRow = InferSelectModel<typeof schema.notebookEntries>;
type TRow = InferSelectModel<typeof schema.twitchSettings>;

export function rowToQuestion(r: QRow): Question {
  const q: Question = {
    id: r.id,
    statement: r.statement,
    alternatives: r.alternatives as Question["alternatives"],
    correctAnswer: r.correctAnswer as AltKey,
    subject: r.subject,
    topic: r.topic,
    difficulty: r.difficulty as Question["difficulty"],
    tags: r.tags ?? [],
  };
  if (r.explanation) q.explanation = r.explanation;
  if (r.subtopic) q.subtopic = r.subtopic;
  if (r.board) q.board = r.board;
  if (r.exam) q.exam = r.exam;
  if (r.image) q.image = r.image;
  if (r.source) q.source = r.source;
  return q;
}

export function questionToRow(q: Question) {
  return {
    id: q.id,
    statement: q.statement,
    alternatives: q.alternatives as Record<string, string>,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? null,
    subject: q.subject,
    topic: q.topic,
    subtopic: q.subtopic ?? null,
    difficulty: q.difficulty,
    board: q.board ?? null,
    exam: q.exam ?? null,
    tags: q.tags,
    image: q.image ?? null,
    source: q.source ?? null,
  };
}

export function rowToAttempt(r: ARow): Attempt {
  const a: Attempt = {
    id: r.id,
    questionId: r.questionId,
    date: r.date,
    selected: r.selected as AltKey,
    correct: r.correct,
    timeSpent: r.timeSpent,
    confidence: r.confidence as Confidence,
    hasDraft: r.hasDraft,
  };
  if (r.sessionId) a.sessionId = r.sessionId;
  return a;
}

export function rowToNotebook(r: NRow): NotebookEntry {
  const e: NotebookEntry = {
    questionId: r.questionId,
    chat: (r.chat as NotebookEntry["chat"]) ?? [],
    formulas: r.formulas ?? [],
    concepts: r.concepts ?? [],
    updatedAt: r.updatedAt,
  };
  if (r.explanation) e.explanation = r.explanation as TutorExplanation;
  if (r.personalNotes) e.personalNotes = r.personalNotes;
  return e;
}

export function rowToTwitch(r: TRow): TwitchSettings & {
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: number | null;
  twitchUsername?: string | null;
} {
  return {
    channel: r.channel,
    connected: r.connected,
    chatEnabled: r.chatEnabled,
    commandPrefix: r.commandPrefix,
    pointsCorrect: r.pointsCorrect,
    pointsParticipation: r.pointsParticipation,
    voteSeconds: r.voteSeconds,
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
    tokenExpiresAt: r.tokenExpiresAt,
    twitchUsername: r.twitchUsername,
  };
}

export function rowToXp(r: InferSelectModel<typeof schema.xpEvents>): XpEvent {
  return { id: r.id, date: r.date, amount: r.amount, reason: r.reason };
}

export function rowToList(r: InferSelectModel<typeof schema.customLists>): CustomList {
  return {
    id: r.id,
    name: r.name,
    questionIds: r.questionIds ?? [],
    createdAt: r.createdAt,
  };
}

export function rowToViewer(r: InferSelectModel<typeof schema.viewers>): Viewer {
  return {
    name: r.name,
    answered: r.answered,
    correct: r.correct,
    score: r.score,
  };
}

export type FlagsMap = Record<string, QuestionFlags>;
export type DraftsMap = Record<string, Stroke[]>;
export type NotesMap = Record<string, string>;
export type NotebookMap = Record<string, NotebookEntry>;
