import type { AltKey, Vote } from "@/lib/types";
import { VIEWER_POOL } from "@/data/mocks";

/** One vote per user; a user may change their vote while voting is open. */
export function applyVote(votes: Vote[], user: string, alt: AltKey, at = new Date().toISOString()): Vote[] {
  const existing = votes.find((v) => v.user === user);
  if (existing) return existing.alt === alt ? votes : votes.map((v) => (v.user === user ? { ...v, alt, at, changed: true } : v));
  return [...votes, { user, alt, at, changed: false }];
}

export function tallyVotes(votes: Vote[], keys: AltKey[]) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<AltKey, number>;
  for (const v of votes) if (v.alt in counts) counts[v.alt]++;
  const total = votes.length;
  const top = total ? keys.reduce((a, b) => (counts[b] > counts[a] ? b : a)) : undefined;
  return { counts, total, top, pct: (k: AltKey) => (total ? Math.round((counts[k] / total) * 100) : 0) };
}

/** Parses chat commands like "!A" with the configured prefix. */
export function parseCommand(msg: string, prefix = "!"): AltKey | null {
  const m = msg.trim().match(new RegExp(`^\\${prefix}([a-eA-E])$`));
  return m ? (m[1].toUpperCase() as AltKey) : null;
}

/** Simulated chat feed. Replace with a real Twitch IRC/EventSub client later. */
export function startSimulatedChat(keys: AltKey[], correct: AltKey, onMessage: (user: string, msg: string) => void, prefix = "!") {
  const bias = 0.45 + Math.random() * 0.3;
  const id = setInterval(() => {
    const user = VIEWER_POOL[Math.floor(Math.random() * VIEWER_POOL.length)];
    const alt = Math.random() < bias ? correct : keys[Math.floor(Math.random() * keys.length)];
    onMessage(user, `${prefix}${alt}`);
  }, 450 + Math.random() * 500);
  return () => clearInterval(id);
}
