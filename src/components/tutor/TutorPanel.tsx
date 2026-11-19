"use client";

import { useState } from "react";
import { BookOpen, Loader2, Send } from "lucide-react";
import type { ChatMessage, Question, TutorExplanation } from "@/lib/types";
import { SUGGESTED_QUESTIONS } from "@/services/aiTutorService";
import { ensureNotebook, useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  question: Question;
  open: boolean;
  onClose?: () => void;
  className?: string;
}

export function TutorPanel({ question, open, onClose, className }: Props) {
  const { notebook, upsertNotebook, notes, setPersonalNote } = useApp();
  const entry = ensureNotebook(notebook, question.id);
  const [explanation, setExplanation] = useState<TutorExplanation | undefined>(
    entry.explanation,
  );
  const [chat, setChat] = useState<ChatMessage[]>(entry.chat);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [input, setInput] = useState("");
  const [localNote, setLocalNote] = useState(
    notes[question.id] ?? entry.personalNotes ?? "",
  );

  if (!open) return null;

  const persist = (patch: Partial<typeof entry>) => {
    const next = {
      ...entry,
      ...patch,
      explanation: patch.explanation ?? explanation,
      chat: patch.chat ?? chat,
      personalNotes: patch.personalNotes ?? localNote,
      updatedAt: new Date().toISOString(),
    };
    upsertNotebook(next);
  };

  const loadExplain = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tutor/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id }),
      });
      const data = (await res.json()) as {
        explanation: TutorExplanation;
        entry: typeof entry;
      };
      setExplanation(data.explanation);
      upsertNotebook(data.entry);
    } finally {
      setLoading(false);
    }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    const userMsg: ChatMessage = {
      id: `c-${Date.now()}`,
      role: "user",
      content: q,
      date: new Date().toISOString(),
    };
    const nextChat = [...chat, userMsg];
    setChat(nextChat);
    setInput("");
    setAsking(true);
    try {
      const res = await fetch("/api/tutor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          message: q,
          history: chat,
        }),
      });
      const data = (await res.json()) as {
        chat: ChatMessage[];
        entry: typeof entry;
      };
      setChat(data.chat);
      upsertNotebook(data.entry);
    } finally {
      setAsking(false);
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-l border-border bg-surface",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Tutor IA</h3>
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4 text-sm">
          {!explanation ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <p className="mb-3 text-muted-foreground">
                Gere uma explicação contextual para esta questão.
              </p>
              <Button type="button" onClick={loadExplain} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BookOpen className="size-4" />
                )}
                Explicar resolução
              </Button>
            </div>
          ) : (
            <div className="space-y-3 animate-rise">
              <Section title="Resumo">{explanation.summary}</Section>
              <Section title="Conceito">{explanation.concept}</Section>
              <Section title="Passo a passo">
                <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                  {explanation.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </Section>
              <Section title="Como chegar à resposta">{explanation.howToReach}</Section>
              <Section title="Alternativas">
                <ul className="space-y-1.5">
                  {Object.entries(explanation.alternatives).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-medium text-foreground">{k}.</span>{" "}
                      <span className="text-muted-foreground">{v}</span>
                    </li>
                  ))}
                </ul>
              </Section>
              {explanation.formulas.length > 0 && (
                <Section title="Fórmulas">
                  <ul className="space-y-1 font-mono text-xs text-primary">
                    {explanation.formulas.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </Section>
              )}
              <Section title="Dicas">
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {explanation.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </Section>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chat contextual
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {chat.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-6 bg-primary/15 text-foreground"
                      : "mr-4 bg-muted text-muted-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {asking && (
                <div className="mr-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Pensando…
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre a resolução…"
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                disabled={asking || !input.trim()}
                onClick={() => ask(input)}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Anotação pessoal
            </p>
            <Textarea
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              onBlur={() => {
                setPersonalNote(question.id, localNote);
                persist({ personalNotes: localNote });
              }}
              placeholder="Anote algo no caderno..."
              className="min-h-[80px]"
            />
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}
