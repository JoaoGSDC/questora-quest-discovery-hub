"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  ClipboardList,
  Flame,
  GraduationCap,
  History,
  LayoutDashboard,
  Library,
  Radio,
  Settings,
  Target,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, useMasteredCount } from "@/store/app-store";
import {
  levelFromXp,
  levelTitle,
  streakDays,
  totalXp,
} from "@/services/gamificationService";
import { Progress } from "@/components/ui/progress";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/questions", label: "Questões", icon: BookOpen },
  { to: "/subjects", label: "Disciplinas", icon: Library },
  { to: "/sessions", label: "Sessões", icon: Target },
  { to: "/exams", label: "Simulados", icon: ClipboardList },
  { to: "/notebook", label: "Caderno", icon: BookMarked },
  { to: "/gamification", label: "Gamificação", icon: Trophy },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/live", label: "Live Classroom", icon: Radio },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { xp, attempts, questions } = useApp();
  const mastered = useMasteredCount();
  const total = totalXp(xp);
  const lvl = levelFromXp(total);
  const streak = streakDays(attempts);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold tracking-tight">
              Questora
            </p>
            <p className="text-[11px] text-muted-foreground">
              Estudos · Quiz · Live
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Nív. {lvl.level} · {levelTitle(lvl.level)}
            </span>
            <span className="tabular text-muted-foreground">{total} XP</span>
          </div>
          <Progress value={lvl.progress * 100} className="h-1.5" />
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3 text-warning" /> {streak} dias
            </span>
            <span>
              {questions.length} q · {mastered} dominadas
            </span>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-6 animate-rise">{children}</div>
      </main>
    </div>
  );
}
