import { eq, inArray } from "drizzle-orm";
import type {
  Attempt,
  CustomList,
  NotebookEntry,
  Question,
  QuestionFlags,
  Stroke,
  TwitchSettings,
  Viewer,
  XpEvent,
} from "@/lib/types";
import { getDb, getLibsql } from "./client";
import { ensureSchema } from "./migrate";
import {
  questionToRow,
  rowToAttempt,
  rowToList,
  rowToNotebook,
  rowToQuestion,
  rowToTwitch,
  rowToViewer,
  rowToXp,
  type DraftsMap,
  type FlagsMap,
  type NotebookMap,
  type NotesMap,
} from "./mappers";
import * as schema from "./schema";

export type AppSnapshot = {
  questions: Question[];
  attempts: Attempt[];
  xp: XpEvent[];
  flags: FlagsMap;
  notebook: NotebookMap;
  lists: CustomList[];
  drafts: DraftsMap;
  notes: NotesMap;
  viewers: Viewer[];
  twitch: TwitchSettings;
  seeded: boolean;
};

async function boot() {
  await ensureSchema();
  return getDb();
}

export async function getSnapshot(): Promise<AppSnapshot> {
  const db = await boot();
  const [
    qRows,
    aRows,
    xRows,
    fRows,
    nRows,
    lRows,
    dRows,
    noteRows,
    vRows,
  ] = await Promise.all([
    db.select().from(schema.questions),
    db.select().from(schema.attempts),
    db.select().from(schema.xpEvents),
    db.select().from(schema.questionFlags),
    db.select().from(schema.notebookEntries),
    db.select().from(schema.customLists),
    db.select().from(schema.drafts),
    db.select().from(schema.personalNotes),
    db.select().from(schema.viewers),
  ]);

  let tRows = await db
    .select()
    .from(schema.twitchSettings)
    .where(eq(schema.twitchSettings.id, 1))
    .limit(1);
  if (!tRows[0]) {
    await db.insert(schema.twitchSettings).values({ id: 1 });
    tRows = await db
      .select()
      .from(schema.twitchSettings)
      .where(eq(schema.twitchSettings.id, 1))
      .limit(1);
  }
  const tRow = tRows[0]!;

  const seededRow = await db
    .select()
    .from(schema.appMeta)
    .where(eq(schema.appMeta.key, "seeded"))
    .limit(1);
  const seeded = !!seededRow[0];

  const flags: FlagsMap = {};
  for (const f of fRows)
    flags[f.questionId] = { favorite: f.favorite, review: f.review };
  const notebook: NotebookMap = {};
  for (const n of nRows) notebook[n.questionId] = rowToNotebook(n);
  const drafts: DraftsMap = {};
  for (const d of dRows) drafts[d.questionId] = d.strokes as Stroke[];
  const notes: NotesMap = {};
  for (const n of noteRows) notes[n.questionId] = n.note;

  const tw = rowToTwitch(tRow);
  return {
    questions: qRows.map(rowToQuestion),
    attempts: aRows.map(rowToAttempt),
    xp: xRows.map(rowToXp),
    flags,
    notebook,
    lists: lRows.map(rowToList),
    drafts,
    notes,
    viewers: vRows.map(rowToViewer),
    twitch: {
      channel: tw.channel,
      connected: tw.connected,
      chatEnabled: tw.chatEnabled,
      commandPrefix: tw.commandPrefix,
      pointsCorrect: tw.pointsCorrect,
      pointsParticipation: tw.pointsParticipation,
      voteSeconds: tw.voteSeconds,
    },
    seeded,
  };
}

export async function upsertQuestions(qs: Question[]) {
  const db = await boot();
  for (const q of qs) {
    const row = questionToRow(q);
    await db
      .insert(schema.questions)
      .values(row)
      .onConflictDoUpdate({
        target: schema.questions.id,
        set: row,
      });
  }
}

export async function updateQuestion(q: Question) {
  await upsertQuestions([q]);
}

export async function deleteQuestions(ids: string[]) {
  if (!ids.length) return;
  const db = await boot();
  await db.delete(schema.questions).where(inArray(schema.questions.id, ids));
  await db
    .delete(schema.questionFlags)
    .where(inArray(schema.questionFlags.questionId, ids));
  await db.delete(schema.drafts).where(inArray(schema.drafts.questionId, ids));
  await db
    .delete(schema.personalNotes)
    .where(inArray(schema.personalNotes.questionId, ids));
  await db
    .delete(schema.notebookEntries)
    .where(inArray(schema.notebookEntries.questionId, ids));
}

export async function setFlag(
  questionId: string,
  patch: Partial<QuestionFlags>,
) {
  const db = await boot();
  const cur = (
    await db
      .select()
      .from(schema.questionFlags)
      .where(eq(schema.questionFlags.questionId, questionId))
      .limit(1)
  )[0];
  const favorite = patch.favorite ?? cur?.favorite ?? false;
  const review = patch.review ?? cur?.review ?? false;
  await db
    .insert(schema.questionFlags)
    .values({ questionId, favorite, review })
    .onConflictDoUpdate({
      target: schema.questionFlags.questionId,
      set: { favorite, review },
    });
}

export async function setDraft(questionId: string, strokes: Stroke[]) {
  const db = await boot();
  await db
    .insert(schema.drafts)
    .values({ questionId, strokes })
    .onConflictDoUpdate({
      target: schema.drafts.questionId,
      set: { strokes },
    });
}

export async function setPersonalNote(questionId: string, note: string) {
  const db = await boot();
  await db
    .insert(schema.personalNotes)
    .values({ questionId, note })
    .onConflictDoUpdate({
      target: schema.personalNotes.questionId,
      set: { note },
    });
}

export async function upsertNotebook(entry: NotebookEntry) {
  const db = await boot();
  await db
    .insert(schema.notebookEntries)
    .values({
      questionId: entry.questionId,
      explanation: entry.explanation ?? null,
      chat: entry.chat,
      personalNotes: entry.personalNotes ?? null,
      formulas: entry.formulas,
      concepts: entry.concepts,
      updatedAt: entry.updatedAt,
    })
    .onConflictDoUpdate({
      target: schema.notebookEntries.questionId,
      set: {
        explanation: entry.explanation ?? null,
        chat: entry.chat,
        personalNotes: entry.personalNotes ?? null,
        formulas: entry.formulas,
        concepts: entry.concepts,
        updatedAt: entry.updatedAt,
      },
    });
}

export async function addList(
  name: string,
  questionIds: string[],
): Promise<CustomList> {
  const db = await boot();
  const list: CustomList = {
    id: `list-${Date.now().toString(36)}`,
    name,
    questionIds,
    createdAt: new Date().toISOString(),
  };
  await db.insert(schema.customLists).values({
    id: list.id,
    name: list.name,
    questionIds: list.questionIds,
    createdAt: list.createdAt,
  });
  return list;
}

export async function removeList(id: string) {
  const db = await boot();
  await db.delete(schema.customLists).where(eq(schema.customLists.id, id));
}

export async function addAttempt(attempt: Attempt, xp?: XpEvent) {
  const db = await boot();
  await db.insert(schema.attempts).values({
    id: attempt.id,
    questionId: attempt.questionId,
    date: attempt.date,
    selected: attempt.selected,
    correct: attempt.correct,
    timeSpent: attempt.timeSpent,
    confidence: attempt.confidence,
    hasDraft: attempt.hasDraft,
    sessionId: attempt.sessionId ?? null,
  });
  if (xp) {
    await db.insert(schema.xpEvents).values({
      id: xp.id,
      date: xp.date,
      amount: xp.amount,
      reason: xp.reason,
    });
  }
}

export async function addXp(xp: XpEvent) {
  const db = await boot();
  await db.insert(schema.xpEvents).values({
    id: xp.id,
    date: xp.date,
    amount: xp.amount,
    reason: xp.reason,
  });
}

export async function setTwitch(
  patch: Partial<TwitchSettings> & {
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: number | null;
    twitchUsername?: string | null;
  },
) {
  const db = await boot();
  const cur = await getTwitchFull();
  const next = {
    channel: patch.channel ?? cur.channel,
    connected: patch.connected ?? cur.connected,
    chatEnabled: patch.chatEnabled ?? cur.chatEnabled,
    commandPrefix: patch.commandPrefix ?? cur.commandPrefix,
    pointsCorrect: patch.pointsCorrect ?? cur.pointsCorrect,
    pointsParticipation:
      patch.pointsParticipation ?? cur.pointsParticipation,
    voteSeconds: patch.voteSeconds ?? cur.voteSeconds,
    accessToken:
      patch.accessToken !== undefined ? patch.accessToken : cur.accessToken,
    refreshToken:
      patch.refreshToken !== undefined ? patch.refreshToken : cur.refreshToken,
    tokenExpiresAt:
      patch.tokenExpiresAt !== undefined
        ? patch.tokenExpiresAt
        : cur.tokenExpiresAt,
    twitchUsername:
      patch.twitchUsername !== undefined
        ? patch.twitchUsername
        : cur.twitchUsername,
  };
  await db
    .insert(schema.twitchSettings)
    .values({ id: 1, ...next })
    .onConflictDoUpdate({
      target: schema.twitchSettings.id,
      set: next,
    });
}

export async function getTwitchFull() {
  const db = await boot();
  let tRows = await db
    .select()
    .from(schema.twitchSettings)
    .where(eq(schema.twitchSettings.id, 1))
    .limit(1);
  if (!tRows[0]) {
    await db.insert(schema.twitchSettings).values({ id: 1 });
    tRows = await db
      .select()
      .from(schema.twitchSettings)
      .where(eq(schema.twitchSettings.id, 1))
      .limit(1);
  }
  return rowToTwitch(tRows[0]!);
}

export async function setViewers(list: Viewer[]) {
  const db = await boot();
  await db.delete(schema.viewers);
  for (const v of list) {
    await db.insert(schema.viewers).values({
      name: v.name,
      answered: v.answered,
      correct: v.correct,
      score: v.score,
    });
  }
}

export async function upsertViewer(v: Viewer) {
  const db = await boot();
  await db
    .insert(schema.viewers)
    .values(v)
    .onConflictDoUpdate({
      target: schema.viewers.name,
      set: {
        answered: v.answered,
        correct: v.correct,
        score: v.score,
      },
    });
}

export async function markSeeded() {
  const db = await boot();
  await db
    .insert(schema.appMeta)
    .values({ key: "seeded", value: "1" })
    .onConflictDoUpdate({
      target: schema.appMeta.key,
      set: { value: "1" },
    });
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await boot();
  const row = (
    await db
      .select()
      .from(schema.appMeta)
      .where(eq(schema.appMeta.key, key))
      .limit(1)
  )[0];
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  const db = await boot();
  await db
    .insert(schema.appMeta)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.appMeta.key,
      set: { value },
    });
}

const LIVE_META_KEY = "live_session";

export async function getLiveSessionRaw(): Promise<string | null> {
  return getMeta(LIVE_META_KEY);
}

export async function saveLiveSessionRaw(json: string) {
  await setMeta(LIVE_META_KEY, json);
}

export async function resetAllData() {
  await boot();
  const client = getLibsql();
  for (const t of [
    "questions",
    "attempts",
    "question_flags",
    "drafts",
    "notebook_entries",
    "xp_events",
    "custom_lists",
    "personal_notes",
    "viewers",
    "app_meta",
  ]) {
    await client.execute(`DELETE FROM ${t}`);
  }
  const db = getDb();
  await db
    .update(schema.twitchSettings)
    .set({
      connected: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      twitchUsername: null,
    })
    .where(eq(schema.twitchSettings.id, 1));
}
