"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionPlayer } from "@/components/questions/QuestionPlayer";
import { Button } from "@/components/ui/button";
import { sessionReport } from "@/services/studySessionService";
import { useApp } from "@/store/app-store";

export default function ActiveSessionPage() {
  const { activeSession, updateSession, endSession, clearSession, questions } =
    useApp();
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);

  if (!activeSession) {
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Nenhuma sessão ativa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monte uma sessão de estudo ou um simulado para começar.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild>
            <Link href="/sessions">Nova sessão</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/exams">Simulado</Link>
          </Button>
        </div>
      </div>
    );
  }

  const finished = !!activeSession.finishedAt || showReport;
  const report = finished ? sessionReport(activeSession, questions) : null;

  if (finished && report) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 animate-rise">
        <header>
          <h1 className="font-display text-2xl font-semibold">Relatório da sessão</h1>
          <p className="text-sm text-muted-foreground">
            {activeSession.config.title ?? "Sessão"} ·{" "}
            {activeSession.config.kind === "exam" ? "Simulado" : "Estudo"}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Questões" value={report.total} />
          <Metric label="Acertos" value={report.correct} />
          <Metric label="Erros" value={report.wrong} />
          <Metric label="Aproveitamento" value={`${Math.round(report.rate * 100)}%`} />
          <Metric label="Tempo" value={fmt(report.seconds)} />
          <Metric label="XP" value={`+${report.xp}`} />
        </div>

        <div className="panel p-4">
          <h2 className="mb-2 font-display text-sm font-semibold">Por assunto</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(report.byTopic).map(([t, v]) => (
              <li key={t} className="flex justify-between">
                <span>{t}</span>
                <span className="tabular text-muted-foreground">
                  {v.correct}/{v.total} ({Math.round((v.correct / v.total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-4">
          <h2 className="mb-2 font-display text-sm font-semibold">Recomendações</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {report.weak.length > 0 ? (
              report.weak.map((w) => (
                <li key={w}>→ Revisar {w} (aproveitamento baixo)</li>
              ))
            ) : (
              <li>→ Bom desempenho geral. Mantenha revisões espaçadas.</li>
            )}
            {report.lowConf.length > 0 && (
              <li>
                → {report.lowConf.length} acerto(s) com baixa confiança. Vale revisar com o tutor.
              </li>
            )}
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearSession();
              router.push("/sessions");
            }}
          >
            Nova sessão
          </Button>
          <Button
            type="button"
            onClick={() => {
              clearSession();
              router.push("/");
            }}
          >
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-semibold">
            {activeSession.config.title ?? "Sessão de estudo"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {activeSession.questionIds.length} questões · +{activeSession.xpEarned} XP
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            endSession();
            setShowReport(true);
          }}
        >
          Encerrar e ver relatório
        </Button>
      </div>

      <QuestionPlayer
        questionIds={activeSession.questionIds}
        index={activeSession.index}
        sessionId={activeSession.id}
        onIndexChange={(i) => updateSession((s) => ({ ...s, index: i }))}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold tabular">{value}</p>
    </div>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
