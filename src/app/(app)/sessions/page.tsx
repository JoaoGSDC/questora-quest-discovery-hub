"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Difficulty, SessionConfig } from "@/lib/types";
import { SUBJECTS } from "@/data/questions";
import { DIFF_LABEL } from "@/services/questionService";
import { newSession, pickQuestions } from "@/services/studySessionService";
import { useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function SessionsPage() {
  const { questions, attempts, flags, lists, removeList, startSession } = useApp();
  const router = useRouter();
  const [config, setConfig] = useState<SessionConfig>({
    count: 10,
    filter: "all",
    shuffle: true,
    kind: "study",
    difficulty: "any",
  });

  const topics = useMemo(() => {
    const pool = config.subject
      ? questions.filter((q) => q.subject === config.subject)
      : questions;
    return [...new Set(pool.map((q) => q.topic))].sort();
  }, [questions, config.subject]);

  const preview = pickQuestions(questions, attempts, flags, config);

  const start = (override?: Partial<SessionConfig> & { ids?: string[]; title?: string }) => {
    const cfg = { ...config, ...override };
    const ids =
      override?.ids ??
      pickQuestions(questions, attempts, flags, cfg);
    if (!ids.length) {
      toast.error("Nenhuma questão encontrada com esses filtros");
      return;
    }
    startSession(newSession({ ...cfg, count: ids.length, title: override?.title ?? cfg.title }, ids));
    router.push("/sessions/active");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Sessões de estudo</h1>
          <p className="text-sm text-muted-foreground">
            Monte um bloco personalizado e continue de onde parou
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/sessions/active">Sessão ativa</Link>
        </Button>
      </header>

      <div className="panel grid gap-4 p-5 md:grid-cols-2">
        <Field label="Disciplina">
          <Select
            value={config.subject ?? "all"}
            onValueChange={(v) =>
              setConfig((c) => {
                const next = { ...c };
                delete next.topic;
                if (v === "all") delete next.subject;
                else next.subject = v;
                return next;
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
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
        </Field>
        <Field label="Assunto">
          <Select
            value={config.topic ?? "all"}
            onValueChange={(v) =>
              setConfig((c) => {
                const next = { ...c };
                if (v === "all") delete next.topic;
                else next.topic = v;
                return next;
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Quantidade">
          <Input
            type="number"
            min={1}
            max={50}
            value={config.count}
            onChange={(e) =>
              setConfig((c) => ({ ...c, count: Number(e.target.value) || 1 }))
            }
          />
        </Field>
        <Field label="Dificuldade">
          <Select
            value={config.difficulty ?? "any"}
            onValueChange={(v) =>
              setConfig((c) => ({
                ...c,
                difficulty: v as Difficulty | "any",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer</SelectItem>
              {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => (
                <SelectItem key={d} value={d}>
                  {DIFF_LABEL[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Filtro">
          <Select
            value={config.filter}
            onValueChange={(v) =>
              setConfig((c) => ({
                ...c,
                filter: v as SessionConfig["filter"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unanswered">Não resolvidas</SelectItem>
              <SelectItem value="wrong">Erradas</SelectItem>
              <SelectItem value="review">Marcadas para revisão</SelectItem>
              <SelectItem value="favorites">Favoritas</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox
            id="shuffle"
            checked={config.shuffle}
            onCheckedChange={(v) =>
              setConfig((c) => ({ ...c, shuffle: !!v }))
            }
          />
          <Label htmlFor="shuffle">Embaralhar questões</Label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Prévia: <span className="tabular text-foreground">{preview.length}</span> questões
          disponíveis
        </p>
        <Button type="button" onClick={() => start({ title: "Sessão de estudo" })}>
          Iniciar sessão
        </Button>
      </div>

      <div className="panel p-4">
        <h2 className="mb-3 font-display text-sm font-semibold">Listas personalizadas</h2>
        {lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma lista. Selecione questões em Questões para criar.
          </p>
        ) : (
          <ul className="space-y-2">
            {lists.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.questionIds.length} questões
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeList(l.id)}
                  >
                    Remover
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      start({
                        ids: l.questionIds,
                        kind: "list",
                        title: l.name,
                        filter: "all",
                        shuffle: false,
                      })
                    }
                  >
                    Estudar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
