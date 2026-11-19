"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CONF_LABEL } from "@/services/questionService";
import { reviewPriority } from "@/services/questionService";
import { newSession } from "@/services/studySessionService";
import { useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/questions/StatusBadge";

export default function HistoryPage() {
  const {
    attempts,
    questionMap,
    flags,
    attemptsByQuestion,
    questions,
    startSession,
    statusOf,
  } = useApp();
  const router = useRouter();

  const sorted = useMemo(
    () => [...attempts].sort((a, b) => b.date.localeCompare(a.date)),
    [attempts],
  );

  const reviewQueue = useMemo(() => {
    return questions
      .map((q) => ({
        q,
        score: reviewPriority(attemptsByQuestion.get(q.id) ?? [], flags[q.id]),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [questions, attemptsByQuestion, flags]);

  const startReview = () => {
    const ids = reviewQueue.map((x) => x.q.id).slice(0, 10);
    if (!ids.length) return;
    startSession(
      newSession(
        {
          count: ids.length,
          filter: "review",
          shuffle: false,
          kind: "review",
          title: "Revisão",
        },
        ids,
      ),
    );
    router.push("/sessions/active");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Histórico</h1>
          <p className="text-sm text-muted-foreground">
            {attempts.length} tentativas registradas
          </p>
        </div>
        <Button type="button" onClick={startReview} disabled={!reviewQueue.length}>
          Iniciar revisão
        </Button>
      </header>

      <div className="panel p-4">
        <h2 className="mb-2 font-display text-sm font-semibold">Fila de revisão</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Prioridade: erradas → baixa confiança → marcadas → antigas
        </p>
        <ul className="space-y-2">
          {reviewQueue.slice(0, 8).map(({ q, score }) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{q.statement}</p>
                <p className="text-xs text-muted-foreground">
                  {q.subject} · {q.topic} · prioridade {score}
                </p>
              </div>
              <StatusBadge status={statusOf(q.id)} />
            </li>
          ))}
          {!reviewQueue.length && (
            <p className="text-sm text-muted-foreground">Nada na fila agora.</p>
          )}
        </ul>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          Tentativas recentes
        </div>
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
          {sorted.slice(0, 80).map((a) => {
            const q = questionMap.get(a.questionId);
            return (
              <li key={a.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{q?.statement ?? a.questionId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.date).toLocaleString("pt-BR")} · {q?.subject}
                  </p>
                </div>
                <span className="tabular text-xs">
                  {a.selected} {a.correct ? "✓" : "✗"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CONF_LABEL[a.confidence]}
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {a.timeSpent}s
                </span>
                {a.hasDraft && (
                  <span className="text-[10px] text-primary">rascunho</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
