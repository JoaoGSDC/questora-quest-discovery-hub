"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileUp,
  Flame,
  Radio,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DiffBadge, StatusBadge } from "@/components/questions/StatusBadge";
import { Button } from "@/components/ui/button";
import { useApp, useMasteredCount } from "@/store/app-store";
import {
  levelFromXp,
  streakDays,
  totalXp,
} from "@/services/gamificationService";
import { reviewPriority } from "@/services/questionService";
import { newSession, pickQuestions } from "@/services/studySessionService";

export default function DashboardPage() {
  const store = useApp();
  const router = useRouter();
  const {
    questions,
    attempts,
    xp,
    flags,
    statusOf,
    attemptsByQuestion,
    startSession,
  } = store;
  const mastered = useMasteredCount();
  const total = totalXp(xp);
  const lvl = levelFromXp(total);
  const streak = streakDays(attempts);
  const solved = new Set(attempts.map((a) => a.questionId)).size;
  const pending = questions.length - solved;
  const correct = attempts.filter((a) => a.correct).length;
  const rate = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const studySeconds = attempts.reduce((s, a) => s + a.timeSpent, 0);

  const byDay = (() => {
    const map = new Map<string, { day: string; acertos: number; erros: number }>();
    for (const a of attempts) {
      const day = a.date.slice(5, 10);
      const row = map.get(day) ?? { day, acertos: 0, erros: 0 };
      if (a.correct) row.acertos++;
      else row.erros++;
      map.set(day, row);
    }
    return [...map.values()].slice(-14);
  })();

  const bySubject = (() => {
    const map = new Map<string, { name: string; total: number; correct: number }>();
    for (const a of attempts) {
      const q = store.questionMap.get(a.questionId);
      if (!q) continue;
      const row = map.get(q.subject) ?? { name: q.subject, total: 0, correct: 0 };
      row.total++;
      if (a.correct) row.correct++;
      map.set(q.subject, row);
    }
    return [...map.values()].map((r) => ({
      name: r.name.replace("Conhecimentos Específicos", "C. Específicos").replace("Língua Portuguesa", "Português").replace("Raciocínio Lógico", "R. Lógico"),
      taxa: r.total ? Math.round((r.correct / r.total) * 100) : 0,
    }));
  })();

  const recent = [...attempts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const attention = questions
    .map((q) => ({
      q,
      score: reviewPriority(attemptsByQuestion.get(q.id) ?? [], flags[q.id]),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const recommendations = [
    pending > 0 && `${pending} questões ainda sem resposta.`,
    bySubject.some((s) => s.taxa < 60) &&
      `Priorize ${bySubject.filter((s) => s.taxa < 60).map((s) => s.name).join(", ")} (taxa abaixo de 60%).`,
    attention.length > 0 &&
      `Revise ${attention[0]!.q.topic}: há itens com prioridade alta.`,
    streak >= 3 && `Sequência de ${streak} dias ativa.`,
  ].filter(Boolean) as string[];

  const continueStudy = () => {
    const ids = pickQuestions(questions, attempts, flags, {
      count: 10,
      filter: "all",
      shuffle: true,
      kind: "study",
      title: "Continuar estudando",
    });
    if (!ids.length) return;
    startSession(
      newSession(
        {
          count: ids.length,
          filter: "all",
          shuffle: true,
          kind: "study",
          title: "Continuar estudando",
        },
        ids,
      ),
    );
    router.push("/sessions/active");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nível {lvl.level} · {total} XP · {questions.length} questões no SQLite
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button asChild className="h-auto flex-col items-start gap-1 px-4 py-4">
          <Link href="/questions/import">
            <span className="inline-flex items-center gap-2 font-display text-base">
              <FileUp className="size-4" /> Importar PDF
            </span>
            <span className="text-xs font-normal text-primary-foreground/80">
              Seu simulado com gabarito comentado
            </span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-auto flex-col items-start gap-1 px-4 py-4"
          onClick={continueStudy}
        >
          <span className="inline-flex items-center gap-2 font-display text-base">
            Continuar estudando <ArrowRight className="size-4" />
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Sessão rápida a partir do banco
          </span>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col items-start gap-1 px-4 py-4">
          <Link href="/live">
            <span className="inline-flex items-center gap-2 font-display text-base">
              <Radio className="size-4" /> Abrir Live
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Resolver com votação Twitch
            </span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={BookOpen} label="Cadastradas" value={questions.length} />
        <Stat icon={Target} label="Resolvidas" value={solved} hint={`${pending} pendentes`} />
        <Stat icon={Trophy} label="Taxa de acertos" value={`${rate}%`} hint={`${correct}/${attempts.length}`} />
        <Stat icon={Zap} label="XP / Nível" value={total} hint={`Nív. ${lvl.level}`} />
        <Stat icon={Flame} label="Sequência" value={`${streak} dias`} />
        <Stat icon={Timer} label="Tempo de estudo" value={fmtTime(studySeconds)} />
        <Stat icon={Trophy} label="Dominadas" value={mastered} />
        <Stat icon={BookOpen} label="Para revisão" value={attention.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="panel col-span-3 p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Desempenho (14 dias)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byDay}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Area type="monotone" dataKey="acertos" stroke="var(--color-success)" fill="url(#gA)" strokeWidth={2} />
                <Area type="monotone" dataKey="erros" stroke="var(--color-destructive)" fill="transparent" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel col-span-2 p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Por disciplina</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySubject} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="taxa" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Últimas questões</h2>
          <ul className="space-y-2">
            {recent.map((a) => {
              const q = store.questionMap.get(a.questionId);
              if (!q) return null;
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{q.statement}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.subject} · {new Date(a.date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <StatusBadge status={statusOf(q.id)} />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Precisam de atenção</h2>
          <ul className="space-y-2">
            {attention.map(({ q }) => (
              <li key={q.id} className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm">{q.topic}</p>
                  <p className="truncate text-xs text-muted-foreground">{q.statement}</p>
                </div>
                <DiffBadge difficulty={q.difficulty} />
              </li>
            ))}
            {!attention.length && (
              <p className="text-sm text-muted-foreground">Nada urgente no momento.</p>
            )}
          </ul>
        </div>
      </div>

      <div className="panel p-4">
        <h2 className="mb-2 font-display text-sm font-semibold">Recomendações</h2>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {recommendations.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">→</span> {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="panel flex items-start gap-3 p-4">
      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold tabular">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} min`;
}
