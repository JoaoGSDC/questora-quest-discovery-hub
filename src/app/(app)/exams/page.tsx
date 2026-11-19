"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionConfig } from "@/lib/types";
import { SUBJECTS } from "@/data/questions";
import { newSession, pickQuestions } from "@/services/studySessionService";
import { useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
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

export default function ExamsPage() {
  const { questions, attempts, flags, startSession } = useApp();
  const router = useRouter();
  const [subject, setSubject] = useState<string>("all");
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(60);

  const start = () => {
    const config: SessionConfig = {
      count,
      filter: "all",
      shuffle: true,
      kind: "exam",
      timeLimitMin: minutes,
      title: subject === "all" ? "Simulado geral" : `Simulado · ${subject}`,
    };
    if (subject !== "all") config.subject = subject;
    const ids = pickQuestions(questions, attempts, flags, config);
    if (!ids.length) {
      toast.error("Sem questões para o simulado");
      return;
    }
    startSession(newSession({ ...config, count: ids.length }, ids));
    toast.message(`Tempo sugerido: ${minutes} min`);
    router.push("/sessions/active");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold">Simulados</h1>
        <p className="text-sm text-muted-foreground">
          Prova cronometrada com relatório ao final
        </p>
      </header>

      <div className="panel space-y-4 p-5">
        <div>
          <Label>Disciplina</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas (misto)</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantidade de questões</Label>
          <Input
            className="mt-1"
            type="number"
            min={5}
            max={60}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 5)}
          />
        </div>
        <div>
          <Label>Tempo (minutos)</Label>
          <Input
            className="mt-1"
            type="number"
            min={5}
            max={240}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value) || 5)}
          />
        </div>
        <Button type="button" className="w-full" onClick={start}>
          Iniciar simulado
        </Button>
      </div>
    </div>
  );
}
