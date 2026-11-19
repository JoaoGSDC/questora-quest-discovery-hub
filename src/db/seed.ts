import { getSnapshot, markSeeded, resetAllData } from "./repository";
import { ensureSchema } from "./migrate";

/** Garante schema; não injeta dados fictícios. */
export async function seedIfEmpty() {
  await ensureSchema();
  const snap = await getSnapshot();
  if (!snap.seeded) await markSeeded();
  return getSnapshot();
}

/** Limpa o banco e deixa pronto (vazio). */
export async function forceReseed() {
  await resetAllData();
  await markSeeded();
  return getSnapshot();
}
