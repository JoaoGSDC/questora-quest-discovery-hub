import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __questoraLibsql?: Client;
  __questoraDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function resolveUrl() {
  const url = process.env["TURSO_DATABASE_URL"];
  if (url) return url;
  // Dev local sem Turso: arquivo SQLite via libSQL
  return "file:./data/questora.db";
}

export function getLibsql() {
  if (globalForDb.__questoraLibsql) return globalForDb.__questoraLibsql;
  const url = resolveUrl();
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  const authToken = process.env["TURSO_AUTH_TOKEN"];
  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
  globalForDb.__questoraLibsql = client;
  return client;
}

export function getDb() {
  if (globalForDb.__questoraDb) return globalForDb.__questoraDb;
  const db = drizzle(getLibsql(), { schema });
  globalForDb.__questoraDb = db;
  return db;
}

export type Db = ReturnType<typeof getDb>;
