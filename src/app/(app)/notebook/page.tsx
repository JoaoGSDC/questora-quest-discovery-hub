"use client";

import { useMemo, useState } from "react";
import { SUBJECTS } from "@/data/questions";
import { searchNotebook } from "@/services/knowledgeService";
import { useApp } from "@/store/app-store";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotebookPage() {
  const { notebook, questionMap, notes } = useApp();
  const [subject, setSubject] = useState<string>("all");
  const [text, setText] = useState("");

  const entries = useMemo(() => {
    const list = Object.values(notebook);
    // include personal notes-only as lightweight entries
    const withNotes = new Set(list.map((e) => e.questionId));
    for (const [qid, note] of Object.entries(notes)) {
      if (!note.trim() || withNotes.has(qid)) continue;
      list.push({
        questionId: qid,
        chat: [],
        formulas: [],
        concepts: [],
        personalNotes: note,
        updatedAt: new Date().toISOString(),
      });
    }
    const filters: { subject?: string; text?: string } = {};
    if (subject !== "all") filters.subject = subject;
    if (text) filters.text = text;
    return searchNotebook(list, questionMap, filters);
  }, [notebook, notes, questionMap, subject, text]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const q = questionMap.get(e.questionId);
      if (q) set.add(q.topic);
    }
    return [...set];
  }, [entries, questionMap]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">Caderno de Estudos</h1>
        <p className="text-sm text-muted-foreground">
          Resoluções, chats do tutor, fórmulas e anotações por questão
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar no caderno…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {entries.length} entradas · assuntos: {topics.slice(0, 6).join(", ") || "-"}
      </p>

      <div className="space-y-3">
        {entries.map((e) => {
          const q = questionMap.get(e.questionId);
          if (!q) return null;
          return (
            <article key={e.questionId} className="panel space-y-2 p-4 animate-rise">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{e.questionId}</span>
                <span>{q.subject}</span>
                <span>· {q.topic}</span>
                <span className="ml-auto">
                  {new Date(e.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="text-sm font-medium">{q.statement}</p>
              {e.personalNotes && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/90">
                  {e.personalNotes}
                </p>
              )}
              {e.concepts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {e.concepts.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {e.formulas.length > 0 && (
                <ul className="font-mono text-xs text-primary">
                  {e.formulas.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
              {e.chat.length > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  {e.chat.slice(0, 4).map((m) => (
                    <p key={m.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {m.role === "user" ? "Você" : "Tutor"}:
                      </span>{" "}
                      {m.content}
                    </p>
                  ))}
                </div>
              )}
              {e.explanation && (
                <p className="text-xs text-muted-foreground">
                  Explicação: {e.explanation.summary.slice(0, 160)}…
                </p>
              )}
            </article>
          );
        })}
        {!entries.length && (
          <p className="text-sm text-muted-foreground">
            Nada encontrado. Use o tutor ao resolver questões para popular o caderno.
          </p>
        )}
      </div>
    </div>
  );
}
