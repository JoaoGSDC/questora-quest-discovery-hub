import { getLibsql } from "./client";

const DDL = `
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  statement TEXT NOT NULL,
  alternatives TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT NOT NULL,
  board TEXT,
  exam TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  image TEXT,
  source TEXT
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  date TEXT NOT NULL,
  selected TEXT NOT NULL,
  correct INTEGER NOT NULL,
  time_spent INTEGER NOT NULL,
  confidence TEXT NOT NULL,
  has_draft INTEGER NOT NULL DEFAULT 0,
  session_id TEXT
);
CREATE TABLE IF NOT EXISTS question_flags (
  question_id TEXT PRIMARY KEY,
  favorite INTEGER NOT NULL DEFAULT 0,
  review INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS drafts (
  question_id TEXT PRIMARY KEY,
  strokes TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS notebook_entries (
  question_id TEXT PRIMARY KEY,
  explanation TEXT,
  chat TEXT NOT NULL DEFAULT '[]',
  personal_notes TEXT,
  formulas TEXT NOT NULL DEFAULT '[]',
  concepts TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS custom_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS personal_notes (
  question_id TEXT PRIMARY KEY,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS viewers (
  name TEXT PRIMARY KEY,
  answered INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS twitch_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  channel TEXT NOT NULL DEFAULT 'questora_ao_vivo',
  connected INTEGER NOT NULL DEFAULT 0,
  chat_enabled INTEGER NOT NULL DEFAULT 1,
  command_prefix TEXT NOT NULL DEFAULT '!',
  points_correct INTEGER NOT NULL DEFAULT 10,
  points_participation INTEGER NOT NULL DEFAULT 2,
  vote_seconds INTEGER NOT NULL DEFAULT 45,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at INTEGER,
  twitch_username TEXT
);
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

let schemaReady: Promise<void> | null = null;

/** Bootstrap idempotente do schema (Turso / libSQL). */
export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = getLibsql();
      await client.executeMultiple(DDL);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
