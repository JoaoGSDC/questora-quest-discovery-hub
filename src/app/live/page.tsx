"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Maximize,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { AltKey, Confidence, Vote } from "@/lib/types";
import { ALT_KEYS } from "@/lib/types";
import {
  DEFAULT_LIVE_STATE,
  type LiveHostAnswer,
  type LiveLayoutMode,
  type LiveSessionState,
} from "@/lib/live-session";
import {
  applyVote,
  parseCommand,
  startSimulatedChat,
  tallyVotes,
} from "@/services/twitchService";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LiveClassroomPage() {
  const {
    questions,
    lists,
    drafts,
    setDraft,
    twitch,
    setTwitch,
    viewers,
    setViewers,
    recordAnswer,
    hydrated,
  } = useApp();

  const [ready, setReady] = useState(false);
  const [listId, setListId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [layout, setLayout] = useState<LiveLayoutMode>("split");
  const [votes, setVotes] = useState<Vote[]>([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(0);
  const [feed, setFeed] = useState<{ user: string; msg: string; at: string }[]>(
    [],
  );
  const [configOpen, setConfigOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [ircOnline, setIrcOnline] = useState(false);
  const [hostAnswers, setHostAnswers] = useState<
    Record<string, LiveHostAnswer>
  >({});
  const [confidence, setConfidence] = useState<Confidence>("doubt");
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [questionStarted, setQuestionStarted] = useState(() => Date.now());
  const stopChat = useRef<(() => void) | null>(null);
  const votingOpenRef = useRef(votingOpen);
  votingOpenRef.current = votingOpen;
  const skipPersist = useRef(true);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoredQuestions = useRef<Set<string>>(new Set());

  const pool = useMemo(() => {
    if (!listId) return questions;
    const list = lists.find((l) => l.id === listId);
    if (!list) return questions;
    const map = new Map(questions.map((q) => [q.id, q]));
    return list.questionIds
      .map((id) => map.get(id))
      .filter((q): q is (typeof questions)[number] => !!q);
  }, [questions, lists, listId]);

  const q = pool[index];
  const host = q ? hostAnswers[q.id] : undefined;
  const selected = host?.selected ?? null;
  const confirmed = !!host?.confirmed;
  const answerLocked = confirmed && !editingAnswer;

  const keys = useMemo(() => {
    if (!q) return [] as AltKey[];
    return (Object.keys(q.alternatives) as AltKey[]).filter((k) =>
      ALT_KEYS.includes(k),
    );
  }, [q]);

  const tally = tallyVotes(votes, keys.length ? keys : ALT_KEYS);
  const strokes = q ? (drafts[q.id] ?? []) : [];

  const patchHost = useCallback(
    (questionId: string, patch: Partial<LiveHostAnswer>) => {
      setHostAnswers((prev) => {
        const cur = prev[questionId] ?? {
          selected: null,
          confirmed: false,
          confidence: "doubt" as Confidence,
        };
        return { ...prev, [questionId]: { ...cur, ...patch } };
      });
    },
    [],
  );

  // Restore persisted live session
  useEffect(() => {
    if (!hydrated) return;
    void fetch("/api/live/state")
      .then((r) => r.json())
      .then((data: LiveSessionState) => {
        const s = data ?? DEFAULT_LIVE_STATE;
        setListId(s.listId);
        setIndex(s.index);
        setActive(s.active);
        setPaused(s.paused);
        setLayout(s.layout);
        setShowResults(s.showResults);
        setRevealed(s.revealed);
        setShowExplanation(s.showExplanation);
        setDemoMode(s.demoMode);
        setHostAnswers(s.hostAnswers ?? {});
        setReady(true);
        skipPersist.current = false;
      })
      .catch(() => {
        setReady(true);
        skipPersist.current = false;
      });
  }, [hydrated]);

  // Persist live UI state (debounced)
  useEffect(() => {
    if (!ready || skipPersist.current) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const body: LiveSessionState = {
        listId,
        index,
        active,
        paused,
        layout,
        showResults,
        revealed,
        showExplanation,
        demoMode,
        hostAnswers,
        updatedAt: new Date().toISOString(),
      };
      void fetch("/api/live/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(console.error);
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [
    ready,
    listId,
    index,
    active,
    paused,
    layout,
    showResults,
    revealed,
    showExplanation,
    demoMode,
    hostAnswers,
  ]);

  // Clamp index when pool changes
  useEffect(() => {
    if (!ready) return;
    if (pool.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= pool.length) setIndex(pool.length - 1);
  }, [pool.length, index, ready]);

  // Restore per-question host UI when navigating
  useEffect(() => {
    if (!q) return;
    const saved = hostAnswers[q.id];
    setConfidence(saved?.confidence ?? "doubt");
    setEditingAnswer(false);
    setQuestionStarted(Date.now());
  }, [q?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real Twitch via SSE
  useEffect(() => {
    const es = new EventSource("/api/twitch/stream");
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as {
          type: string;
          payload: unknown;
        };
        if (data.type === "hello") {
          const p = data.payload as {
            runtime?: { ircConnected?: boolean };
            votes?: Vote[];
          };
          setIrcOnline(!!p.runtime?.ircConnected);
          if (p.votes?.length) setVotes(p.votes);
        }
        if (data.type === "status") {
          const p = data.payload as { connected?: boolean };
          setIrcOnline(!!p.connected);
          setTwitch({ connected: !!p.connected });
        }
        if (data.type === "chat") {
          const p = data.payload as { user: string; message: string };
          setFeed((f) =>
            [
              { user: p.user, msg: p.message, at: new Date().toISOString() },
              ...f,
            ].slice(0, 40),
          );
        }
        if (data.type === "vote" && votingOpenRef.current && twitch.chatEnabled) {
          const vote = data.payload as Vote;
          setVotes((v) => applyVote(v, vote.user, vote.alt));
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [setTwitch, twitch.chatEnabled]);

  // Demo simulation
  useEffect(() => {
    if (!demoMode || ircOnline) {
      stopChat.current?.();
      stopChat.current = null;
      return;
    }
    if (!votingOpen || !twitch.chatEnabled || !q || paused) {
      stopChat.current?.();
      stopChat.current = null;
      return;
    }
    stopChat.current = startSimulatedChat(
      keys,
      q.correctAnswer,
      (user, msg) => {
        const alt = parseCommand(msg, twitch.commandPrefix);
        if (!alt) return;
        setVotes((v) => applyVote(v, user, alt));
        setFeed((f) =>
          [{ user, msg, at: new Date().toISOString() }, ...f].slice(0, 40),
        );
      },
      twitch.commandPrefix,
    );
    return () => {
      stopChat.current?.();
      stopChat.current = null;
    };
  }, [
    demoMode,
    ircOnline,
    votingOpen,
    twitch.chatEnabled,
    twitch.commandPrefix,
    q,
    keys,
    paused,
  ]);

  useEffect(() => {
    if (!votingOpen || paused) return;
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          setVotingOpen(false);
          setShowResults(true);
          toast.message("Votação encerrada");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [votingOpen, paused]);

  const clearChatVotes = () => {
    setVotes([]);
    void fetch("/api/twitch/votes", { method: "DELETE" });
  };

  const go = (i: number) => {
    if (pool.length === 0) return;
    const next = Math.max(0, Math.min(pool.length - 1, i));
    setIndex(next);
    clearChatVotes();
    setVotingOpen(false);
    setRevealed(false);
    setShowExplanation(false);
    setShowResults(false);
    setFeed([]);
  };

  const changeList = (id: string | null) => {
    setListId(id);
    setIndex(0);
    clearChatVotes();
    setVotingOpen(false);
    setRevealed(false);
    setShowExplanation(false);
    setShowResults(false);
    setFeed([]);
    toast.message(
      id
        ? `Lista: ${lists.find((l) => l.id === id)?.name ?? "selecionada"}`
        : "Todas as questões",
    );
  };

  const openVote = () => {
    clearChatVotes();
    setShowResults(false);
    setRevealed(false);
    setVotingOpen(true);
    setTimer(twitch.voteSeconds);
    toast.success(
      ircOnline
        ? "Votação aberta (chat Twitch, !A…!E)"
        : demoMode
          ? "Votação aberta (votos locais)"
          : "Votação aberta. Conecte a Twitch ou ative votos locais.",
    );
  };

  const closeVote = () => {
    setVotingOpen(false);
    setShowResults(true);
  };

  const toggleReveal = () => {
    setRevealed((v) => {
      const next = !v;
      if (next) {
        setVotingOpen(false);
        scoreVoters();
      }
      return next;
    });
  };

  const scoreVoters = () => {
    if (!q || !votes.length) return;
    if (scoredQuestions.current.has(q.id)) return;
    scoredQuestions.current.add(q.id);
    setViewers((prev) => {
      const known = new Set(prev.map((v) => v.name));
      const updated = prev.map((v) => {
        const vote = votes.find((x) => x.user === v.name);
        if (!vote) return v;
        const hit = vote.alt === q.correctAnswer;
        return {
          ...v,
          answered: v.answered + 1,
          correct: v.correct + (hit ? 1 : 0),
          score:
            v.score +
            twitch.pointsParticipation +
            (hit ? twitch.pointsCorrect : 0),
        };
      });
      const extras = votes
        .filter((v) => !known.has(v.user))
        .map((v) => ({
          name: v.user,
          answered: 1,
          correct: v.alt === q.correctAnswer ? 1 : 0,
          score:
            twitch.pointsParticipation +
            (v.alt === q.correctAnswer ? twitch.pointsCorrect : 0),
        }));
      return extras.length ? [...updated, ...extras] : updated;
    });
  };

  const confirmHost = () => {
    if (!q || !selected) return;
    if (confirmed && !editingAnswer) return;
    const timeSpent = Math.max(
      1,
      Math.round((Date.now() - questionStarted) / 1000),
    );
    const { xp, reasons } = recordAnswer({
      questionId: q.id,
      selected,
      confidence,
      timeSpent,
      sessionId: `live-${listId ?? "all"}`,
    });
    patchHost(q.id, {
      selected,
      confirmed: true,
      confidence,
      lockedSelected: selected,
      lockedConfidence: confidence,
    });
    setEditingAnswer(false);
    toast.success(`+${xp} XP`, {
      description: editingAnswer
        ? `Nova resposta · ${reasons.join(" · ")}`
        : reasons.join(" · "),
    });
  };

  const beginEditAnswer = () => {
    if (!q || !confirmed) return;
    setEditingAnswer(true);
    setConfidence(host?.confidence ?? "doubt");
  };

  const cancelEditAnswer = () => {
    if (!q || !host) return;
    const lockedSel = host.lockedSelected ?? host.selected;
    const lockedConf = host.lockedConfidence ?? host.confidence;
    patchHost(q.id, {
      selected: lockedSel ?? null,
      confidence: lockedConf ?? "doubt",
      confirmed: true,
    });
    setConfidence(lockedConf ?? "doubt");
    setEditingAnswer(false);
    toast.message("Confirmação mantida");
  };

  const resetAlternatives = () => {
    if (!q) return;
    patchHost(q.id, {
      selected: null,
      confirmed: false,
      lockedSelected: null,
      confidence: "doubt",
    });
    setConfidence("doubt");
    setEditingAnswer(false);
    scoredQuestions.current.delete(q.id);
    clearChatVotes();
    setShowResults(false);
    setRevealed(false);
    setVotingOpen(false);
    toast.message("Alternativas e votos resetados");
  };

  const resetBoard = () => {
    if (!q) return;
    setDraft(q.id, []);
    toast.message("Quadro limpo");
  };

  const ranking = [...viewers].sort((a, b) => b.score - a.score);
  const showQ = layout !== "board-only";
  const showB = layout !== "question-only";
  const selectedList = listId ? lists.find((l) => l.id === listId) : null;

  if (!hydrated || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando Live…</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-muted-foreground">Sem questões no banco.</p>
        <Button asChild>
          <Link href="/questions/import">Importar PDF</Link>
        </Button>
      </div>
    );
  }

  if (!pool.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-muted-foreground">
          A lista selecionada não tem questões válidas.
        </p>
        <Button type="button" onClick={() => changeList(null)}>
          Usar todas as questões
        </Button>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Questão não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-sidebar px-3 py-2">
        <Radio className="size-4 text-twitch" />
        <span className="font-display text-sm font-semibold">Live Classroom</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            active
              ? paused
                ? "bg-warning/20 text-warning"
                : "bg-destructive/20 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          {active ? (paused ? "PAUSADO" : "AO VIVO") : "STANDBY"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {selectedList?.name ?? "Todas"} · #{twitch.channel}
          {ircOnline
            ? " · IRC online"
            : demoMode
              ? " · votos locais"
              : " · IRC offline"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {(
            [
              ["split", "Lado a lado"],
              ["question-focus", "Questão+"],
              ["board-focus", "Quadro+"],
              ["question-only", "Só questão"],
              ["board-only", "Só quadro"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setLayout(k)}
              className={cn(
                "rounded px-2 py-1 text-[10px]",
                layout === k
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setConfigOpen((v) => !v)}
          >
            Config
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => void document.documentElement.requestFullscreen?.()}
            title="Tela cheia"
          >
            <Maximize className="size-3.5" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-7">
            <Link href="/" title="Sair">
              <X className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-surface px-3 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              Lista
              <select
                className="h-7 max-w-[180px] rounded-md border border-border bg-background px-2 text-xs text-foreground"
                value={listId ?? ""}
                onChange={(e) =>
                  changeList(e.target.value ? e.target.value : null)
                }
              >
                <option value="">Todas as questões</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.questionIds.length})
                  </option>
                ))}
              </select>
            </label>

            {!active ? (
              <Btn
                onClick={() => {
                  setActive(true);
                  setPaused(false);
                  toast.success("Sessão iniciada");
                }}
              >
                <Play className="size-3.5" /> Iniciar
              </Btn>
            ) : (
              <>
                <Btn onClick={() => setPaused((p) => !p)}>
                  {paused ? (
                    <Play className="size-3.5" />
                  ) : (
                    <Pause className="size-3.5" />
                  )}
                  {paused ? "Retomar" : "Pausar"}
                </Btn>
                <Btn
                  onClick={() => {
                    setActive(false);
                    setVotingOpen(false);
                    toast.message("Sessão encerrada");
                  }}
                >
                  <Square className="size-3.5" /> Encerrar
                </Btn>
              </>
            )}

            <Btn onClick={() => go(index - 1)} disabled={index === 0}>
              <ChevronLeft className="size-3.5" />
            </Btn>
            <select
              className="h-7 max-w-[220px] rounded-md border border-border bg-background px-2 text-xs"
              value={index}
              onChange={(e) => go(Number(e.target.value))}
            >
              {pool.map((qq, i) => (
                <option key={qq.id} value={i}>
                  {i + 1}. {qq.topic}
                </option>
              ))}
            </select>
            <Btn
              onClick={() => go(index + 1)}
              disabled={index >= pool.length - 1}
            >
              <ChevronRight className="size-3.5" />
            </Btn>

            <Btn onClick={openVote} disabled={votingOpen}>
              Abrir votação
            </Btn>
            <Btn onClick={closeVote} disabled={!votingOpen}>
              Encerrar votação
            </Btn>

            <ToggleBtn active={showResults} onClick={() => setShowResults((v) => !v)}>
              Resultados
            </ToggleBtn>
            <ToggleBtn active={revealed} onClick={toggleReveal}>
              Revelar resposta
            </ToggleBtn>
            <ToggleBtn
              active={showExplanation}
              onClick={() => setShowExplanation((v) => !v)}
            >
              Explicação
            </ToggleBtn>

            <Btn onClick={resetAlternatives} title="Resetar seleção e votos">
              <RotateCcw className="size-3.5" /> Alt.
            </Btn>
            <Btn onClick={resetBoard} title="Limpar quadro">
              <Eraser className="size-3.5" /> Quadro
            </Btn>
            <Btn onClick={clearChatVotes} title="Zerar votos do chat">
              <Trash2 className="size-3.5" /> Votos
            </Btn>

            {votingOpen && (
              <span className="ml-2 font-display text-lg tabular text-warning">
                {timer}s
              </span>
            )}
          </div>

          <div
            className={cn(
              "grid min-h-0 flex-1 gap-2 p-2",
              layout === "split" && "grid-cols-2",
              layout === "question-focus" && "grid-cols-[1.4fr_1fr]",
              layout === "board-focus" && "grid-cols-[1fr_1.4fr]",
              (layout === "question-only" || layout === "board-only") &&
                "grid-cols-1",
            )}
          >
            {showQ && (
              <div className="panel flex flex-col overflow-auto p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {q.subject}
                  </span>
                  <span>
                    Questão {index + 1}/{pool.length}
                  </span>
                  {votingOpen && (
                    <span className="text-twitch">
                      Votação aberta · {tally.total} participantes
                    </span>
                  )}
                  {confirmed && (
                    <span className="text-success">Sua resposta salva</span>
                  )}
                </div>
                <p className="font-display text-2xl leading-snug tracking-tight md:text-3xl">
                  {q.statement}
                </p>
                <div className="mt-6 space-y-3">
                  {keys.map((k) => {
                    const text = q.alternatives[k];
                    if (!text) return null;
                    const pct = tally.pct(k);
                    const isSel = selected === k;
                    const isCorrect = revealed && k === q.correctAnswer;
                    const isWrong =
                      revealed && isSel && k !== q.correctAnswer;
                    const isTop = showResults && tally.top === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={answerLocked}
                        onClick={() => {
                          if (answerLocked) return;
                          patchHost(q.id, { selected: k, confidence });
                        }}
                        className={cn(
                          "relative w-full overflow-hidden rounded-md border px-4 py-3 text-left text-lg transition-colors",
                          isSel && !revealed && "border-primary bg-primary/10",
                          isCorrect && "border-success bg-success/10",
                          isWrong && "border-destructive bg-destructive/10",
                          isTop && !revealed && "border-twitch/50",
                          !isSel &&
                            !isCorrect &&
                            !isWrong &&
                            "border-border hover:border-primary/40",
                          answerLocked && "cursor-default",
                        )}
                      >
                        {showResults && (
                          <div
                            className="absolute inset-y-0 left-0 bg-primary/15"
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <div className="relative flex items-start gap-3">
                          <span className="font-display text-xl font-bold">
                            {k}
                          </span>
                          <span className="flex-1">{text}</span>
                          {showResults && (
                            <span className="tabular text-sm text-muted-foreground">
                              {pct}% · {tally.counts[k]}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {(
                    [
                      ["sure", "Certeza"],
                      ["doubt", "Dúvida"],
                      ["guess", "Chute"],
                    ] as const
                  ).map(([c, label]) => (
                    <button
                      key={c}
                      type="button"
                      disabled={answerLocked}
                      onClick={() => {
                        if (answerLocked) return;
                        setConfidence(c);
                        if (selected) patchHost(q.id, { confidence: c });
                      }}
                      className={cn(
                        "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
                        confidence === c
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                        answerLocked && "opacity-60",
                      )}
                    >
                      {label}
                    </button>
                  ))}

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {answerLocked && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9"
                          onClick={beginEditAnswer}
                        >
                          Alterar resposta
                        </Button>
                        <span className="rounded-md bg-success/15 px-3 py-2 text-sm font-medium text-success">
                          Confirmada
                        </span>
                      </>
                    )}
                    {editingAnswer && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9"
                          onClick={cancelEditAnswer}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="lg"
                          className="h-9 px-6 text-sm font-semibold"
                          disabled={!selected}
                          onClick={confirmHost}
                        >
                          Confirmar nova
                        </Button>
                      </>
                    )}
                    {!confirmed && !editingAnswer && (
                      <Button
                        type="button"
                        size="lg"
                        className="h-9 px-6 text-sm font-semibold"
                        disabled={!selected}
                        onClick={confirmHost}
                      >
                        Confirmar
                      </Button>
                    )}
                  </div>
                </div>

                {showExplanation && q.explanation && (
                  <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-base text-muted-foreground">
                    {q.explanation}
                  </p>
                )}
              </div>
            )}

            {showB && (
              <Whiteboard
                strokes={strokes}
                onChange={(s) => setDraft(q.id, s)}
                className="min-h-0"
              />
            )}
          </div>
        </div>

        <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-sidebar">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chat / votos
            </p>
          </div>
          <div className="max-h-48 flex-1 overflow-y-auto px-2 py-2 text-xs">
            {feed.map((f, i) => (
              <div key={i} className="flex justify-between gap-2 py-0.5">
                <span className="truncate text-twitch">{f.user}</span>
                <span className="font-mono">{f.msg}</span>
              </div>
            ))}
            {!feed.length && (
              <p className="text-muted-foreground">Aguardando votos…</p>
            )}
          </div>

          {showResults && (
            <div className="border-t border-border p-3">
              <p className="mb-1 text-xs text-muted-foreground">
                Mais votada:{" "}
                <span className="font-semibold text-foreground">
                  {tally.top ?? "-"}
                </span>{" "}
                · {tally.total} votos
              </p>
            </div>
          )}

          <div className="border-t border-border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ranking
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-sidebar text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Nome</th>
                  <th className="px-2 py-1">Pts</th>
                  <th className="px-2 py-1">%</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 15).map((v, i) => (
                  <tr key={v.name} className="border-t border-border/50">
                    <td className="px-2 py-1 tabular">{i + 1}</td>
                    <td className="max-w-[90px] truncate px-2 py-1">{v.name}</td>
                    <td className="px-2 py-1 tabular">{v.score}</td>
                    <td className="px-2 py-1 tabular">
                      {v.answered
                        ? Math.round((v.correct / v.answered) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>

        {configOpen && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-border bg-surface p-4">
            <h3 className="mb-3 font-display text-sm font-semibold">
              Configuração da transmissão
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <Label>Canal</Label>
                <Input
                  className="mt-1"
                  value={twitch.channel}
                  onChange={(e) => setTwitch({ channel: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                IRC:{" "}
                <span className={ircOnline ? "text-success" : "text-warning"}>
                  {ircOnline ? "online" : "offline"}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void fetch("/api/twitch/connect", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ channel: twitch.channel }),
                    })
                      .then(async (r) => {
                        const d = (await r.json()) as {
                          ok: boolean;
                          error?: string;
                        };
                        if (!d.ok) throw new Error(d.error || "falha");
                        toast.success("IRC conectado");
                      })
                      .catch((e) => toast.error((e as Error).message))
                  }
                >
                  Conectar IRC
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void fetch("/api/twitch/disconnect", {
                      method: "POST",
                    }).then(() => toast.message("IRC desconectado"))
                  }
                >
                  Desconectar
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Label>Votos locais (sem Twitch)</Label>
                <Switch checked={demoMode} onCheckedChange={setDemoMode} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Chat ativo</Label>
                <Switch
                  checked={twitch.chatEnabled}
                  onCheckedChange={(v) => setTwitch({ chatEnabled: v })}
                />
              </div>
              <div>
                <Label>Prefixo</Label>
                <Input
                  className="mt-1"
                  value={twitch.commandPrefix}
                  onChange={(e) =>
                    setTwitch({ commandPrefix: e.target.value || "!" })
                  }
                />
              </div>
              <div>
                <Label>Tempo votação (s)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={twitch.voteSeconds}
                  onChange={(e) =>
                    setTwitch({ voteSeconds: Number(e.target.value) || 30 })
                  }
                />
              </div>
              <div>
                <Label>Pts acerto / participação</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    type="number"
                    value={twitch.pointsCorrect}
                    onChange={(e) =>
                      setTwitch({ pointsCorrect: Number(e.target.value) || 0 })
                    }
                  />
                  <Input
                    type="number"
                    value={twitch.pointsParticipation}
                    onChange={(e) =>
                      setTwitch({
                        pointsParticipation: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Comandos: {twitch.commandPrefix}A … {twitch.commandPrefix}E
              </p>
              {!lists.length && (
                <p className="rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                  Crie uma lista em Questões (selecione + Lista) para usar como
                  módulo na Live.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium hover:bg-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ToggleBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
