import type { AltKey, Confidence } from "@/lib/types";

export type LiveLayoutMode =
  | "split"
  | "question-focus"
  | "board-focus"
  | "question-only"
  | "board-only";

export interface LiveHostAnswer {
  selected: AltKey | null;
  confirmed: boolean;
  confidence: Confidence;
  /** Snapshot da última confirmação (para cancelar alteração). */
  lockedSelected?: AltKey | null;
  lockedConfidence?: Confidence;
}

export interface LiveSessionState {
  listId: string | null;
  index: number;
  active: boolean;
  paused: boolean;
  layout: LiveLayoutMode;
  showResults: boolean;
  revealed: boolean;
  showExplanation: boolean;
  demoMode: boolean;
  hostAnswers: Record<string, LiveHostAnswer>;
  updatedAt: string;
}

export const DEFAULT_LIVE_STATE: LiveSessionState = {
  listId: null,
  index: 0,
  active: false,
  paused: false,
  layout: "split",
  showResults: false,
  revealed: false,
  showExplanation: false,
  demoMode: false,
  hostAnswers: {},
  updatedAt: new Date(0).toISOString(),
};

export function parseLiveSessionState(raw: unknown): LiveSessionState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_LIVE_STATE };
  const o = raw as Partial<LiveSessionState>;
  return {
    listId: typeof o.listId === "string" ? o.listId : null,
    index: typeof o.index === "number" && o.index >= 0 ? o.index : 0,
    active: !!o.active,
    paused: !!o.paused,
    layout: (o.layout as LiveLayoutMode) || "split",
    showResults: !!o.showResults,
    revealed: !!o.revealed,
    showExplanation: !!o.showExplanation,
    demoMode: !!o.demoMode,
    hostAnswers:
      o.hostAnswers && typeof o.hostAnswers === "object" ? o.hostAnswers : {},
    updatedAt:
      typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}
