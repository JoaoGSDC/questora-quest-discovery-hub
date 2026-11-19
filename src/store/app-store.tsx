"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AltKey,
  Attempt,
  Confidence,
  CustomList,
  NotebookEntry,
  Question,
  QuestionFlags,
  Stroke,
  StudySession,
  TwitchSettings,
  Viewer,
  XpEvent,
} from "@/lib/types";
import { emptyEntry } from "@/services/knowledgeService";
import {
  groupAttempts,
  isMastered,
  questionStatus,
} from "@/services/questionService";
import { xpForAnswer, XP_RULES } from "@/services/gamificationService";

interface Persisted {
  questions: Question[];
  attempts: Attempt[];
  xp: XpEvent[];
  flags: Record<string, QuestionFlags>;
  notebook: Record<string, NotebookEntry>;
  lists: CustomList[];
  drafts: Record<string, Stroke[]>;
  notes: Record<string, string>;
  viewers: Viewer[];
  twitch: TwitchSettings;
  lastSessionId?: string;
}

const emptyTwitch: TwitchSettings = {
  channel: "questora_ao_vivo",
  connected: false,
  chatEnabled: true,
  commandPrefix: "!",
  pointsCorrect: 10,
  pointsParticipation: 2,
  voteSeconds: 45,
};

function emptyState(): Persisted {
  return {
    questions: [],
    attempts: [],
    xp: [],
    flags: {},
    notebook: {},
    lists: [],
    drafts: {},
    notes: {},
    viewers: [],
    twitch: emptyTwitch,
  };
}

function applySnapshot(data: Partial<Persisted>): Persisted {
  const base = emptyState();
  return {
    ...base,
    ...data,
    questions: data.questions ?? base.questions,
    attempts: data.attempts ?? base.attempts,
    xp: data.xp ?? base.xp,
    flags: data.flags ?? base.flags,
    notebook: data.notebook ?? base.notebook,
    lists: data.lists ?? base.lists,
    drafts: data.drafts ?? base.drafts,
    notes: data.notes ?? base.notes,
    viewers: data.viewers ?? base.viewers,
    twitch: { ...base.twitch, ...data.twitch },
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

interface AppStore extends Persisted {
  hydrated: boolean;
  activeSession: StudySession | null;
  questionMap: Map<string, Question>;
  attemptsByQuestion: Map<string, Attempt[]>;
  statusOf: (id: string) => ReturnType<typeof questionStatus>;
  upsertQuestions: (qs: Question[]) => void;
  updateQuestion: (q: Question) => void;
  deleteQuestions: (ids: string[]) => void;
  setFlag: (id: string, patch: Partial<QuestionFlags>) => void;
  setDraft: (questionId: string, strokes: Stroke[]) => void;
  setPersonalNote: (questionId: string, note: string) => void;
  upsertNotebook: (entry: NotebookEntry) => void;
  addList: (name: string, questionIds: string[]) => void;
  removeList: (id: string) => void;
  setTwitch: (patch: Partial<TwitchSettings>) => void;
  setViewers: (v: Viewer[] | ((prev: Viewer[]) => Viewer[])) => void;
  startSession: (session: StudySession) => void;
  updateSession: (updater: (s: StudySession) => StudySession) => void;
  endSession: () => void;
  clearSession: () => void;
  recordAnswer: (opts: {
    questionId: string;
    selected: AltKey;
    confidence: Confidence;
    timeSpent: number;
    sessionId?: string;
  }) => { attempt: Attempt; xp: number; reasons: string[] };
  resetDemo: () => void;
  refresh: () => Promise<void>;
}

const AppCtx = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchJson<Persisted>("/api/state");
    setState(applySnapshot(data));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (e) {
        console.error("Falha ao carregar estado SQLite", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, [refresh]);

  const questionMap = useMemo(
    () => new Map(state.questions.map((q) => [q.id, q])),
    [state.questions],
  );
  const attemptsByQuestion = useMemo(
    () => groupAttempts(state.attempts),
    [state.attempts],
  );

  const statusOf = useCallback(
    (id: string) =>
      questionStatus(attemptsByQuestion.get(id) ?? [], state.flags[id]),
    [attemptsByQuestion, state.flags],
  );

  const upsertQuestions = useCallback((qs: Question[]) => {
    setState((s) => {
      const map = new Map(s.questions.map((q) => [q.id, q]));
      for (const q of qs) map.set(q.id, q);
      return { ...s, questions: [...map.values()] };
    });
    void fetchJson("/api/questions", {
      method: "POST",
      body: JSON.stringify({ questions: qs }),
    }).catch(console.error);
  }, []);

  const updateQuestion = useCallback((q: Question) => {
    setState((s) => ({
      ...s,
      questions: s.questions.map((x) => (x.id === q.id ? q : x)),
    }));
    void fetchJson("/api/questions", {
      method: "POST",
      body: JSON.stringify({ question: q }),
    }).catch(console.error);
  }, []);

  const deleteQuestions = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setState((s) => ({
      ...s,
      questions: s.questions.filter((q) => !set.has(q.id)),
      lists: s.lists.map((l) => ({
        ...l,
        questionIds: l.questionIds.filter((id) => !set.has(id)),
      })),
    }));
    void fetchJson("/api/questions", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }).catch(console.error);
  }, []);

  const setFlag = useCallback((id: string, patch: Partial<QuestionFlags>) => {
    setState((s) => ({
      ...s,
      flags: { ...s.flags, [id]: { ...s.flags[id], ...patch } },
    }));
    void fetchJson("/api/flags", {
      method: "POST",
      body: JSON.stringify({ id, patch }),
    }).catch(console.error);
  }, []);

  const setDraft = useCallback((questionId: string, strokes: Stroke[]) => {
    setState((s) => ({
      ...s,
      drafts: { ...s.drafts, [questionId]: strokes },
    }));
    void fetchJson("/api/drafts", {
      method: "POST",
      body: JSON.stringify({ questionId, strokes }),
    }).catch(console.error);
  }, []);

  const setPersonalNote = useCallback((questionId: string, note: string) => {
    setState((s) => ({ ...s, notes: { ...s.notes, [questionId]: note } }));
    void fetchJson("/api/notebook", {
      method: "POST",
      body: JSON.stringify({ note: { questionId, text: note } }),
    }).catch(console.error);
  }, []);

  const upsertNotebook = useCallback((entry: NotebookEntry) => {
    setState((s) => ({
      ...s,
      notebook: { ...s.notebook, [entry.questionId]: entry },
    }));
    void fetchJson("/api/notebook", {
      method: "POST",
      body: JSON.stringify({ entry }),
    }).catch(console.error);
  }, []);

  const addList = useCallback((name: string, questionIds: string[]) => {
    const temp: CustomList = {
      id: `list-${Date.now().toString(36)}`,
      name,
      questionIds,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, lists: [...s.lists, temp] }));
    void fetchJson<{ lists: CustomList[] }>("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name, questionIds }),
    })
      .then((r) => setState((s) => ({ ...s, lists: r.lists })))
      .catch(console.error);
  }, []);

  const removeList = useCallback((id: string) => {
    setState((s) => ({ ...s, lists: s.lists.filter((l) => l.id !== id) }));
    void fetchJson("/api/lists", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }).catch(console.error);
  }, []);

  const setTwitch = useCallback((patch: Partial<TwitchSettings>) => {
    setState((s) => ({ ...s, twitch: { ...s.twitch, ...patch } }));
    void fetchJson("/api/twitch/settings", {
      method: "POST",
      body: JSON.stringify({ twitch: patch }),
    }).catch(console.error);
  }, []);

  const setViewers = useCallback(
    (v: Viewer[] | ((prev: Viewer[]) => Viewer[])) => {
      setState((s) => {
        const viewers = typeof v === "function" ? v(s.viewers) : v;
        void fetchJson("/api/twitch/settings", {
          method: "POST",
          body: JSON.stringify({ viewers }),
        }).catch(console.error);
        return { ...s, viewers };
      });
    },
    [],
  );

  const startSession = useCallback((session: StudySession) => {
    setActiveSession(session);
    setState((s) => ({ ...s, lastSessionId: session.id }));
  }, []);

  const updateSession = useCallback(
    (updater: (s: StudySession) => StudySession) => {
      setActiveSession((s) => (s ? updater(s) : s));
    },
    [],
  );

  const endSession = useCallback(() => {
    setActiveSession((s) => {
      if (!s || s.finishedAt) return s;
      const bonus =
        Object.keys(s.answers).length > 0 ? XP_RULES.sessionComplete : 0;
      if (bonus) {
        const xpEv: XpEvent = {
          id: `xp-sess-${s.id}`,
          date: new Date().toISOString(),
          amount: bonus,
          reason: "Sessão concluída",
        };
        setState((st) => ({ ...st, xp: [...st.xp, xpEv] }));
        void fetchJson("/api/xp", {
          method: "POST",
          body: JSON.stringify({ amount: bonus, reason: "Sessão concluída" }),
        }).catch(console.error);
      }
      return {
        ...s,
        finishedAt: new Date().toISOString(),
        xpEarned: s.xpEarned + bonus,
      };
    });
  }, []);

  const clearSession = useCallback(() => setActiveSession(null), []);

  const recordAnswer = useCallback(
    (opts: {
      questionId: string;
      selected: AltKey;
      confidence: Confidence;
      timeSpent: number;
      sessionId?: string;
    }) => {
      const q = questionMap.get(opts.questionId);
      if (!q) throw new Error("Questão não encontrada");
      const correct = opts.selected === q.correctAnswer;
      const prev = attemptsByQuestion.get(opts.questionId) ?? [];
      const last = [...prev].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
      const isReviewOfOld =
        !!last &&
        Date.now() - new Date(last.date).getTime() > 14 * 86400000;
      const { amount, reasons } = xpForAnswer({
        correct,
        difficulty: q.difficulty,
        confidence: opts.confidence,
        isReviewOfOld,
      });
      const attempt: Attempt = {
        id: `a-${Date.now().toString(36)}`,
        questionId: opts.questionId,
        date: new Date().toISOString(),
        selected: opts.selected,
        correct,
        timeSpent: opts.timeSpent,
        confidence: opts.confidence,
        hasDraft: (state.drafts[opts.questionId]?.length ?? 0) > 0,
      };
      if (opts.sessionId) attempt.sessionId = opts.sessionId;

      setState((s) => ({
        ...s,
        attempts: [...s.attempts, attempt],
        xp: [
          ...s.xp,
          {
            id: `xp-${attempt.id}`,
            date: attempt.date,
            amount,
            reason: reasons[0] ?? "Questão resolvida",
          },
        ],
      }));
      if (opts.sessionId) {
        setActiveSession((sess) => {
          if (!sess || sess.id !== opts.sessionId) return sess;
          return {
            ...sess,
            answers: {
              ...sess.answers,
              [opts.questionId]: {
                selected: opts.selected,
                correct,
                confidence: opts.confidence,
                timeSpent: opts.timeSpent,
              },
            },
            xpEarned: sess.xpEarned + amount,
          };
        });
      }

      const payload: {
        questionId: string;
        selected: AltKey;
        confidence: Confidence;
        timeSpent: number;
        sessionId?: string;
      } = {
        questionId: opts.questionId,
        selected: opts.selected,
        confidence: opts.confidence,
        timeSpent: opts.timeSpent,
      };
      if (opts.sessionId) payload.sessionId = opts.sessionId;
      void fetchJson("/api/attempts", {
        method: "POST",
        body: JSON.stringify(payload),
      }).catch(console.error);

      return { attempt, xp: amount, reasons };
    },
    [questionMap, attemptsByQuestion, state.drafts],
  );

  const resetDemo = useCallback(() => {
    void fetchJson<Persisted>("/api/reset", { method: "POST" })
      .then((data) => {
        setState(applySnapshot(data));
        setActiveSession(null);
      })
      .catch(console.error);
  }, []);

  const value: AppStore = {
    ...state,
    hydrated,
    activeSession,
    questionMap,
    attemptsByQuestion,
    statusOf,
    upsertQuestions,
    updateQuestion,
    deleteQuestions,
    setFlag,
    setDraft,
    setPersonalNote,
    upsertNotebook,
    addList,
    removeList,
    setTwitch,
    setViewers,
    startSession,
    updateSession,
    endSession,
    clearSession,
    recordAnswer,
    resetDemo,
    refresh,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useMasteredCount() {
  const { attemptsByQuestion } = useApp();
  return useMemo(() => {
    let n = 0;
    for (const [, atts] of attemptsByQuestion) if (isMastered(atts)) n++;
    return n;
  }, [attemptsByQuestion]);
}

export function ensureNotebook(
  notebook: Record<string, NotebookEntry>,
  questionId: string,
): NotebookEntry {
  return notebook[questionId] ?? emptyEntry(questionId);
}
