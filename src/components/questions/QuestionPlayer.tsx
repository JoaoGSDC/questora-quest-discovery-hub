"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  PanelRightOpen,
  SkipForward,
} from "lucide-react";
import type { AltKey, Confidence } from "@/lib/types";
import { ALT_KEYS } from "@/lib/types";
import { CONF_LABEL } from "@/services/questionService";
import { useApp } from "@/store/app-store";
import { DiffBadge, StatusBadge } from "@/components/questions/StatusBadge";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  questionIds: string[];
  index: number;
  onIndexChange: (i: number) => void;
  sessionId?: string;
  onAnswered?: () => void;
  showProgress?: boolean;
}

export function QuestionPlayer({
  questionIds,
  index,
  onIndexChange,
  sessionId,
  onAnswered,
  showProgress = true,
}: Props) {
  const {
    questionMap,
    flags,
    setFlag,
    drafts,
    setDraft,
    notes,
    setPersonalNote,
    recordAnswer,
    statusOf,
  } = useApp();

  const q = questionMap.get(questionIds[index] ?? "");
  const [selected, setSelected] = useState<AltKey | null>(null);
  const [confidence, setConfidence] = useState<Confidence>("doubt");
  const [revealed, setRevealed] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [questionStarted, setQuestionStarted] = useState(Date.now());
  const [boardOpen, setBoardOpen] = useState(true);
  const [boardFull, setBoardFull] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [note, setNote] = useState("");

  const [localAnswers, setLocalAnswers] = useState<
    Record<string, { selected: AltKey | null; revealed: boolean; confidence: Confidence }>
  >({});

  useEffect(() => {
    if (!q) return;
    const saved = localAnswers[q.id];
    setSelected(saved?.selected ?? null);
    setRevealed(saved?.revealed ?? false);
    setConfidence(saved?.confidence ?? "doubt");
    setNote(notes[q.id] ?? "");
    setQuestionStarted(Date.now());
  }, [q?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const strokes = q ? (drafts[q.id] ?? []) : [];
  const progress = questionIds.length
    ? ((index + 1) / questionIds.length) * 100
    : 0;

  const keys = useMemo(
    () =>
      q
        ? (Object.keys(q.alternatives) as AltKey[]).filter((k) =>
            ALT_KEYS.includes(k),
          )
        : [],
    [q],
  );

  if (!q) {
    return (
      <div className="panel p-8 text-center text-muted-foreground">
        Nenhuma questão nesta sessão.
      </div>
    );
  }

  const persistLocal = (patch: Partial<(typeof localAnswers)[string]>) => {
    setLocalAnswers((m) => ({
      ...m,
      [q.id]: {
        selected,
        revealed,
        confidence,
        ...patch,
      },
    }));
  };

  const confirm = () => {
    if (!selected || revealed) return;
    const timeSpent = Math.round((Date.now() - questionStarted) / 1000);
    const payload: {
      questionId: string;
      selected: AltKey;
      confidence: Confidence;
      timeSpent: number;
      sessionId?: string;
    } = {
      questionId: q.id,
      selected,
      confidence,
      timeSpent: Math.max(timeSpent, 1),
    };
    if (sessionId) payload.sessionId = sessionId;
    const { xp, reasons } = recordAnswer(payload);
    setRevealed(true);
    persistLocal({ selected, revealed: true, confidence });
    toast.success(`+${xp} XP`, { description: reasons.join(" · ") });
    onAnswered?.();
  };

  const skip = () => {
    if (index < questionIds.length - 1) onIndexChange(index + 1);
  };

  return (
    <div className={cn("flex h-full min-h-[70vh] gap-0", tutorOpen && "pr-0")}>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {showProgress && (
          <div className="flex items-center gap-3">
            <span className="text-xs tabular text-muted-foreground">
              {index + 1}/{questionIds.length}
            </span>
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">
              {Math.round((Date.now() - startedAt) / 60000)} min
            </span>
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <div className="panel flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-primary">{q.subject}</span>
              <span className="text-xs text-muted-foreground">· {q.topic}</span>
              {q.subtopic && (
                <span className="text-xs text-muted-foreground">· {q.subtopic}</span>
              )}
              <DiffBadge difficulty={q.difficulty} />
              <StatusBadge status={statusOf(q.id)} />
            </div>

            <p className="font-display text-lg leading-relaxed text-foreground">
              {q.statement}
            </p>

            <div className="space-y-2">
              {keys.map((k) => {
                const text = q.alternatives[k];
                if (!text) return null;
                const isSel = selected === k;
                const isCorrect = revealed && k === q.correctAnswer;
                const isWrong = revealed && isSel && k !== q.correctAnswer;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={revealed}
                    onClick={() => {
                      setSelected(k);
                      persistLocal({ selected: k });
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                      isSel && !revealed && "border-primary bg-primary/10",
                      isCorrect && "border-success bg-success/10",
                      isWrong && "border-destructive bg-destructive/10",
                      !isSel && !isCorrect && "border-border hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold",
                        isCorrect && "border-success text-success",
                        isWrong && "border-destructive text-destructive",
                      )}
                    >
                      {k}
                    </span>
                    <span>{text}</span>
                  </button>
                );
              })}
            </div>

            {!revealed ? (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Nível de confiança</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CONF_LABEL) as Confidence[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setConfidence(c);
                        persistLocal({ confidence: c });
                      }}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs transition-colors",
                        confidence === c
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {CONF_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-md border px-4 py-3 text-sm animate-rise",
                  selected === q.correctAnswer
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}
              >
                {selected === q.correctAnswer
                  ? "Resposta correta!"
                  : "Resposta incorreta."}
                {q.explanation && (
                  <p className="mt-2 text-foreground/80">{q.explanation}</p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setTutorOpen(true)}
                >
                  <PanelRightOpen className="size-3.5" /> Explicar resolução
                </Button>
              </div>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFlag(q.id, { favorite: !flags[q.id]?.favorite })}
              >
                <Heart
                  className={cn(
                    "size-4",
                    flags[q.id]?.favorite && "fill-destructive text-destructive",
                  )}
                />
                Favorita
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFlag(q.id, { review: !flags[q.id]?.review })}
              >
                <Flag
                  className={cn("size-4", flags[q.id]?.review && "text-warning")}
                />
                Revisão
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={skip}>
                <SkipForward className="size-4" /> Pular
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBoardOpen((v) => !v)}
              >
                <Bookmark className="size-4" />
                {boardOpen ? "Ocultar quadro" : "Quadro"}
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onIndexChange(index - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {!revealed ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selected}
                    onClick={confirm}
                  >
                    Confirmar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={index >= questionIds.length - 1}
                    onClick={() => onIndexChange(index + 1)}
                  >
                    Próxima <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {revealed && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Observação pessoal
                </p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => setPersonalNote(q.id, note)}
                  placeholder="Anote algo sobre esta questão…"
                  className="min-h-[60px]"
                />
              </div>
            )}
          </div>

          {boardOpen && (
            <Whiteboard
              strokes={strokes}
              onChange={(s) => setDraft(q.id, s)}
              expanded={boardFull}
              onToggleExpand={() => setBoardFull((v) => !v)}
              className="min-h-[420px]"
            />
          )}
        </div>
      </div>

      {tutorOpen && (
        <div className="w-full max-w-md shrink-0">
          <TutorPanel
            question={q}
            open={tutorOpen}
            onClose={() => setTutorOpen(false)}
            className="h-full min-h-[70vh] border-l-0 sm:border-l"
          />
        </div>
      )}
    </div>
  );
}
