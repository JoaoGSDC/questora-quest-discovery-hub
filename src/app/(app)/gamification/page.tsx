"use client";

import {
  BookOpen,
  Crown,
  Flame,
  Footprints,
  Sigma,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  computeAchievements,
  levelFromXp,
  levelTitle,
  streakDays,
  totalXp,
} from "@/services/gamificationService";
import { useApp, useMasteredCount } from "@/store/app-store";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  Target,
  Trophy,
  Flame,
  Sigma,
  BookOpen,
  TrendingUp,
  Crown,
};

export default function GamificationPage() {
  const { xp, attempts, questions } = useApp();
  const mastered = useMasteredCount();
  const total = totalXp(xp);
  const lvl = levelFromXp(total);
  const streak = streakDays(attempts);
  const achievements = computeAchievements(attempts, questions, mastered);
  const solved = new Set(attempts.map((a) => a.questionId)).size;
  const correct = attempts.filter((a) => a.correct).length;
  const rate = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;

  const bySubject = (() => {
    const map = new Map<string, number>();
    for (const a of attempts.filter((x) => x.correct)) {
      const q = questions.find((qq) => qq.id === a.questionId);
      if (q) map.set(q.subject, (map.get(q.subject) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Gamificação</h1>
        <p className="text-sm text-muted-foreground">
          Progressão por qualidade de estudo, não só volume
        </p>
      </header>

      <div className="panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Nível atual</p>
            <p className="font-display text-3xl font-semibold">
              {lvl.level}{" "}
              <span className="text-lg text-muted-foreground">
                · {levelTitle(lvl.level)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold tabular text-xp">
              {total} XP
            </p>
            <p className="text-xs text-muted-foreground">
              {lvl.current}/{lvl.needed} para o próximo
            </p>
          </div>
        </div>
        <Progress value={lvl.progress * 100} className="mt-4 h-2" />
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flame className="size-4 text-warning" /> {streak} dias seguidos
          </span>
          <span>{solved} questões distintas</span>
          <span>{rate}% de acerto</span>
          <span>{mastered} dominadas</span>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold">Conquistas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a) => {
            const Icon = ICONS[a.icon] ?? Trophy;
            return (
              <div
                key={a.id}
                className={cn(
                  "panel p-4",
                  a.unlocked ? "border-primary/40" : "opacity-70",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md",
                      a.unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <p className="font-display text-sm font-semibold">{a.title}</p>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{a.description}</p>
                <Progress value={a.progress * 100} className="h-1.5" />
                <p className="mt-1 text-[10px] tabular text-muted-foreground">
                  {Math.round(a.progress * 100)}%
                  {a.unlocked && " · desbloqueada"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">XP recente</h2>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {[...xp]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 20)
              .map((e) => (
                <li key={e.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("pt-BR")} · {e.reason}
                  </span>
                  <span className="tabular text-xp">+{e.amount}</span>
                </li>
              ))}
          </ul>
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Acertos por disciplina</h2>
          <ul className="space-y-2">
            {bySubject.map(([name, n]) => (
              <li key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="tabular text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
