import tmi from "tmi.js";
import type { AltKey, Vote } from "@/lib/types";
import { getTwitchFull, setTwitch } from "@/db/repository";
import { applyVote, parseCommand } from "@/services/twitchService";

type ChatEvent = {
  type: "vote" | "status" | "chat" | "error";
  at: string;
  payload: unknown;
};

type Listener = (ev: ChatEvent) => void;

type CachedSettings = {
  commandPrefix: string;
  chatEnabled: boolean;
};

const globalIrc = globalThis as unknown as {
  __questoraTmi?: {
    client: tmi.Client | null;
    listeners: Set<Listener>;
    votes: Vote[];
    connected: boolean;
    channel: string;
    settings: CachedSettings;
  };
};

function state() {
  if (!globalIrc.__questoraTmi) {
    globalIrc.__questoraTmi = {
      client: null,
      listeners: new Set(),
      votes: [],
      connected: false,
      channel: "",
      settings: { commandPrefix: "!", chatEnabled: true },
    };
  }
  return globalIrc.__questoraTmi;
}

function emit(ev: ChatEvent) {
  for (const l of state().listeners) {
    try {
      l(ev);
    } catch {
      /* ignore */
    }
  }
}

export function subscribeTwitch(listener: Listener) {
  state().listeners.add(listener);
  return () => state().listeners.delete(listener);
}

export function getLiveVotes() {
  return state().votes;
}

export function clearLiveVotes() {
  state().votes = [];
}

export function setLiveVotes(votes: Vote[]) {
  state().votes = votes;
}

export function getTwitchRuntimeStatus() {
  const s = state();
  return {
    ircConnected: s.connected,
    channel: s.channel,
    listeners: s.listeners.size,
    votes: s.votes.length,
  };
}

export async function connectTwitchIrc(channelOverride?: string) {
  const settings = await getTwitchFull();
  if (!settings.accessToken) {
    throw new Error("Autorize a Twitch em Configurações antes de conectar.");
  }
  const channel = (channelOverride || settings.channel || "").replace(/^#/, "");
  if (!channel) throw new Error("Informe o nome do canal Twitch.");

  await disconnectTwitchIrc();

  const username = settings.twitchUsername || "questora_bot";
  const client = new tmi.Client({
    options: { skipUpdatingEmotesets: true },
    connection: { reconnect: true, secure: true },
    identity: {
      username,
      password: `oauth:${settings.accessToken}`,
    },
    channels: [channel],
  });

  const s = state();
  s.client = client;
  s.channel = channel;
  s.votes = [];
  s.settings = {
    commandPrefix: settings.commandPrefix || "!",
    chatEnabled: settings.chatEnabled,
  };

  client.on("connected", () => {
    s.connected = true;
    void setTwitch({ connected: true, channel });
    emit({
      type: "status",
      at: new Date().toISOString(),
      payload: { connected: true, channel },
    });
  });

  client.on("disconnected", () => {
    s.connected = false;
    void setTwitch({ connected: false });
    emit({
      type: "status",
      at: new Date().toISOString(),
      payload: { connected: false, channel },
    });
  });

  client.on("message", (_ch, tags, message, self) => {
    if (self) return;
    const user = tags.username || tags["display-name"] || "anon";
    const prefix = s.settings.commandPrefix || "!";
    const alt = parseCommand(message, prefix);
    emit({
      type: "chat",
      at: new Date().toISOString(),
      payload: { user, message },
    });
    if (!alt) return;
    if (!s.settings.chatEnabled) return;
    s.votes = applyVote(s.votes, user, alt as AltKey);
    const vote = s.votes.find((v) => v.user === user);
    emit({
      type: "vote",
      at: new Date().toISOString(),
      payload: vote,
    });
  });

  await client.connect();
  return { channel, username };
}

export async function disconnectTwitchIrc() {
  const s = state();
  if (s.client) {
    try {
      await s.client.disconnect();
    } catch {
      /* ignore */
    }
  }
  s.client = null;
  s.connected = false;
  void setTwitch({ connected: false });
  emit({
    type: "status",
    at: new Date().toISOString(),
    payload: { connected: false },
  });
}
