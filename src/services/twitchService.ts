import type { AltKey, Vote } from "@/lib/types";
import { SIM_CHAT_USERS } from "@/data/mocks";

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
  const top = total ? keys.reduce((a, b) => (counts[b] > counts[a] ? b : a), keys[0]!) : undefined;
  return { counts, total, top, pct: (k: AltKey) => (total ? Math.round((counts[k] / total) * 100) : 0) };
}

/** Parses chat commands like "!A" with the configured prefix. */
export function parseCommand(msg: string, prefix = "!"): AltKey | null {
  const m = msg.trim().match(new RegExp(`^\\${prefix}([a-eA-E])$`));
  return m?.[1] ? (m[1].toUpperCase() as AltKey) : null;
}

/** Feed local de votos quando a Twitch não está conectada. */
export function startSimulatedChat(keys: AltKey[], correct: AltKey, onMessage: (user: string, msg: string) => void, prefix = "!") {
  const bias = 0.45 + Math.random() * 0.3;
  const id = setInterval(() => {
    const user = SIM_CHAT_USERS[Math.floor(Math.random() * SIM_CHAT_USERS.length)]!;
    const alt = Math.random() < bias ? correct : keys[Math.floor(Math.random() * keys.length)];
    onMessage(user, `${prefix}${alt}`);
  }, 450 + Math.random() * 500);
  return () => clearInterval(id);
}
