"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Question } from "@/lib/types";
import { buildHierarchy } from "@/services/questionService";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";

export default function SubjectsPage() {
  const { questions, attempts, questionMap } = useApp();
  const tree = useMemo(() => buildHierarchy(questions), [questions]);

  const accuracy = useMemo(() => {
    const map = new Map<string, { t: number; c: number }>();
    for (const a of attempts) {
      const q = questionMap.get(a.questionId);
      if (!q) continue;
      for (const key of [q.subject, `${q.subject}|${q.topic}`]) {
        const row = map.get(key) ?? { t: 0, c: 0 };
        row.t++;
        if (a.correct) row.c++;
        map.set(key, row);
      }
    }
    return map;
  }, [attempts, questionMap]);

  const rate = (key: string) => {
    const r = accuracy.get(key);
    if (!r?.t) return null;
    return Math.round((r.c / r.t) * 100);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">Disciplinas</h1>
        <p className="text-sm text-muted-foreground">
          Organização: disciplina → assunto → subassunto → questões
        </p>
      </header>

      <div className="space-y-3">
        {Object.entries(tree).map(([subject, topics]) => {
          const count = Object.values(topics).reduce(
            (s, subs) => s + Object.values(subs).reduce((a, qs) => a + qs.length, 0),
            0,
          );
          return (
            <SubjectBlock
              key={subject}
              subject={subject}
              count={count}
              acc={rate(subject)}
              topics={topics}
              rate={rate}
            />
          );
        })}
      </div>
    </div>
  );
}

function SubjectBlock({
  subject,
  count,
  acc,
  topics,
  rate,
}: {
  subject: string;
  count: number;
  acc: number | null;
  topics: Record<string, Record<string, Question[]>>;
  rate: (key: string) => number | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/30"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <span className="font-display font-semibold">{subject}</span>
        <span className="text-xs text-muted-foreground">{count} questões</span>
        {acc !== null && (
          <span className="ml-auto text-xs tabular text-primary">{acc}% acerto</span>
        )}
      </button>
      {open && (
        <div className="space-y-1 border-t border-border px-4 py-3">
          {Object.entries(topics).map(([topic, subs]) => (
            <TopicBlock
              key={topic}
              subject={subject}
              topic={topic}
              subs={subs}
              rate={rate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicBlock({
  subject,
  topic,
  subs,
  rate,
}: {
  subject: string;
  topic: string;
  subs: Record<string, Question[]>;
  rate: (key: string) => number | null;
}) {
  const [open, setOpen] = useState(false);
  const count = Object.values(subs).reduce((a, qs) => a + qs.length, 0);
  const acc = rate(`${subject}|${topic}`);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <span>{topic}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
        {acc !== null && (
          <span className={cn("ml-auto text-xs tabular", acc < 60 ? "text-warning" : "text-muted-foreground")}>
            {acc}%
          </span>
        )}
      </button>
      {open && (
        <ul className="ml-6 space-y-2 border-l border-border py-1 pl-3">
          {Object.entries(subs).map(([sub, qs]) => (
            <li key={sub}>
              <p className="text-xs font-medium text-muted-foreground">
                {sub} · {qs.length}
              </p>
              <ul className="mt-1 space-y-1">
                {qs.map((q) => (
                  <li key={q.id} className="truncate text-xs text-foreground/80">
                    <span className="font-mono text-muted-foreground">{q.id}</span>{" "}
                    {q.statement}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
