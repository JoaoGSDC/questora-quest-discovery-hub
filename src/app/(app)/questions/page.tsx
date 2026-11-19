"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { AltKey, Difficulty, Question } from "@/lib/types";
import { ALT_KEYS } from "@/lib/types";
import {
  DIFF_LABEL,
  STATUS_LABEL,
  filterQuestions,
  type QuestionFilter,
} from "@/services/questionService";
import { DiffBadge, StatusBadge } from "@/components/questions/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUBJECTS } from "@/data/questions";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";

export default function QuestionsPage() {
  const {
    questions,
    statusOf,
    deleteQuestions,
    updateQuestion,
    addList,
  } = useApp();
  const [filter, setFilter] = useState<QuestionFilter>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Question | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listName, setListName] = useState("");

  const topics = useMemo(() => {
    const s = filter.subject
      ? questions.filter((q) => q.subject === filter.subject)
      : questions;
    return [...new Set(s.map((q) => q.topic))].sort();
  }, [questions, filter.subject]);

  const filtered = useMemo(
    () => filterQuestions(questions, filter, statusOf),
    [questions, filter, statusOf],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((q) => q.id)));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Questões</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {questions.length} questões
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/questions/import">
              <Upload className="size-4" /> Importar JSON
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!selected.size}
            onClick={() => setListOpen(true)}
          >
            <Plus className="size-4" /> Lista ({selected.size})
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!selected.size}
            onClick={() => {
              deleteQuestions([...selected]);
              setSelected(new Set());
              toast.success("Questões excluídas");
            }}
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        </div>
      </header>

      <div className="panel grid gap-3 p-4 md:grid-cols-5">
        <Input
          placeholder="Pesquisar…"
          value={filter.text ?? ""}
          onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))}
        />
        <Select
          value={filter.subject ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => {
              const next = { ...f };
              delete next.topic;
              if (v === "all") delete next.subject;
              else next.subject = v;
              return next;
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas disciplinas</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.topic ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => {
              const next = { ...f };
              if (v === "all") delete next.topic;
              else next.topic = v;
              return next;
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Assunto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos assuntos</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.difficulty ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => {
              const next = { ...f };
              if (v === "all") delete next.difficulty;
              else next.difficulty = v;
              return next;
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer</SelectItem>
            {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => (
              <SelectItem key={d} value={d}>
                {DIFF_LABEL[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.status ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => {
              const next = { ...f };
              if (v === "all") delete next.status;
              else next.status = v;
              return next;
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground">
          <Checkbox
            checked={filtered.length > 0 && selected.size === filtered.length}
            onCheckedChange={toggleAll}
          />
          <span className="w-20">ID</span>
          <span className="flex-1">Enunciado</span>
          <span className="w-36">Disciplina</span>
          <span className="w-24">Dificuldade</span>
          <span className="w-28">Status</span>
          <span className="w-10" />
        </div>
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {filtered.map((q) => (
            <li
              key={q.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40"
            >
              <Checkbox
                checked={selected.has(q.id)}
                onCheckedChange={() => toggle(q.id)}
              />
              <span className="w-20 truncate font-mono text-xs text-muted-foreground">
                {q.id}
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:text-primary"
                onClick={() => setEditing({ ...q })}
              >
                {q.statement}
              </button>
              <span className="w-36 truncate text-xs text-muted-foreground">
                {q.subject}
              </span>
              <span className="w-24">
                <DiffBadge difficulty={q.difficulty} />
              </span>
              <span className="w-28">
                <StatusBadge status={statusOf(q.id)} />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditing({ ...q })}
              >
                <Pencil className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar questão</DialogTitle>
          </DialogHeader>
          {editing && (
            <QuestionEditor
              value={editing}
              onChange={setEditing}
              onSave={() => {
                updateQuestion(editing);
                setEditing(null);
                toast.success("Questão atualizada");
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova lista personalizada</DialogTitle>
          </DialogHeader>
          <Label>Nome</Label>
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Ex.: Revisão de crase"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setListOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!listName.trim() || !selected.size}
              onClick={() => {
                addList(listName.trim(), [...selected]);
                setListName("");
                setListOpen(false);
                setSelected(new Set());
                toast.success("Lista criada");
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionEditor({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: Question;
  onChange: (q: Question) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const setAlt = (k: AltKey, text: string) =>
    onChange({ ...value, alternatives: { ...value.alternatives, [k]: text } });

  return (
    <div className="space-y-3">
      <div>
        <Label>Enunciado</Label>
        <Textarea
          value={value.statement}
          onChange={(e) => onChange({ ...value, statement: e.target.value })}
          className="mt-1 min-h-[80px]"
        />
      </div>
      {ALT_KEYS.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-6 font-semibold">{k}</span>
          <Input
            value={value.alternatives[k] ?? ""}
            onChange={(e) => setAlt(k, e.target.value)}
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Resposta correta</Label>
          <Select
            value={value.correctAnswer}
            onValueChange={(v) =>
              onChange({ ...value, correctAnswer: v as AltKey })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dificuldade</Label>
          <Select
            value={value.difficulty}
            onValueChange={(v) =>
              onChange({ ...value, difficulty: v as Difficulty })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => (
                <SelectItem key={d} value={d}>
                  {DIFF_LABEL[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Disciplina</Label>
          <Input
            className="mt-1"
            value={value.subject}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
          />
        </div>
        <div>
          <Label>Assunto</Label>
          <Input
            className="mt-1"
            value={value.topic}
            onChange={(e) => onChange({ ...value, topic: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Explicação</Label>
        <Textarea
          className="mt-1"
          value={value.explanation ?? ""}
          onChange={(e) =>
            onChange({ ...value, explanation: e.target.value || undefined })
          }
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={onSave}>
          Salvar
        </Button>
      </DialogFooter>
    </div>
  );
}
