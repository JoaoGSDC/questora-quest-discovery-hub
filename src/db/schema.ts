import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  statement: text("statement").notNull(),
  alternatives: text("alternatives", { mode: "json" }).$type<Record<string, string>>().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"),
  difficulty: text("difficulty").notNull(),
  board: text("board"),
  exam: text("exam"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  image: text("image"),
  source: text("source"),
});

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull(),
  date: text("date").notNull(),
  selected: text("selected").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  timeSpent: integer("time_spent").notNull(),
  confidence: text("confidence").notNull(),
  hasDraft: integer("has_draft", { mode: "boolean" }).notNull().default(false),
  sessionId: text("session_id"),
});

export const questionFlags = sqliteTable("question_flags", {
  questionId: text("question_id").primaryKey(),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  review: integer("review", { mode: "boolean" }).notNull().default(false),
});

export const drafts = sqliteTable("drafts", {
  questionId: text("question_id").primaryKey(),
  strokes: text("strokes", { mode: "json" }).$type<unknown[]>().notNull().default([]),
});

export const notebookEntries = sqliteTable("notebook_entries", {
  questionId: text("question_id").primaryKey(),
  explanation: text("explanation", { mode: "json" }),
  chat: text("chat", { mode: "json" }).$type<unknown[]>().notNull().default([]),
  personalNotes: text("personal_notes"),
  formulas: text("formulas", { mode: "json" }).$type<string[]>().notNull().default([]),
  concepts: text("concepts", { mode: "json" }).$type<string[]>().notNull().default([]),
  updatedAt: text("updated_at").notNull(),
});

export const xpEvents = sqliteTable("xp_events", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
});

export const customLists = sqliteTable("custom_lists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  questionIds: text("question_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: text("created_at").notNull(),
});

export const personalNotes = sqliteTable("personal_notes", {
  questionId: text("question_id").primaryKey(),
  note: text("note").notNull().default(""),
});

export const viewers = sqliteTable("viewers", {
  name: text("name").primaryKey(),
  answered: integer("answered").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  score: integer("score").notNull().default(0),
});

export const twitchSettings = sqliteTable("twitch_settings", {
  id: integer("id").primaryKey().default(1),
  channel: text("channel").notNull().default("questora_ao_vivo"),
  connected: integer("connected", { mode: "boolean" }).notNull().default(false),
  chatEnabled: integer("chat_enabled", { mode: "boolean" }).notNull().default(true),
  commandPrefix: text("command_prefix").notNull().default("!"),
  pointsCorrect: integer("points_correct").notNull().default(10),
  pointsParticipation: integer("points_participation").notNull().default(2),
  voteSeconds: integer("vote_seconds").notNull().default(45),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: integer("token_expires_at"),
  twitchUsername: text("twitch_username"),
});

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
