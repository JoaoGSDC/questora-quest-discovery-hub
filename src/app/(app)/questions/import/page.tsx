"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileJson, FileText, Loader2 } from "lucide-react";
import {
  SAMPLE_JSON,
  downloadJson,
  parseImport,
  type ImportResult,
} from "@/services/importService";
import { DiffBadge } from "@/components/questions/StatusBadge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ImportPage() {
  const { questions, upsertQuestions } = useApp();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJson = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const ids = new Set(questions.map((q) => q.id));
    setResult(parseImport(text, ids));
  };

  const handlePdf = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import/pdf", { method: "POST", body: fd });
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (!data.ok) toast.error("Falha na importação do PDF");
      else toast.success(`${data.questions.length} questões identificadas`);
    } catch (e) {
      toast.error((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
      await handlePdf(file);
    } else {
      await handleJson(file);
    }
  };

  const confirm = () => {
    if (!result?.ok) return;
    upsertQuestions(result.questions);
    toast.success(`${result.questions.length} questões importadas no SQLite`);
    setResult(null);
    setFileName(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/questions">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-semibold">Importar questões</h1>
        <p className="text-sm text-muted-foreground">
          PDF do simulado (gabarito comentado) ou JSON Questora.
        </p>
      </header>

      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadJson(SAMPLE_JSON, "exemplo-questora.json")}
          >
            <Download className="size-4" /> Baixar JSON de exemplo
          </Button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-2/40 px-6 py-10 transition-colors hover:border-primary/40">
          {loading ? (
            <Loader2 className="size-8 animate-spin text-primary" />
          ) : (
            <FileText className="size-8 text-primary" />
          )}
          <span className="text-sm font-medium">
            {fileName ?? "Selecionar PDF ou JSON"}
          </span>
          <span className="text-xs text-muted-foreground">
            PDF Limeira/Avança SP · ou Questora JSON v1
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf,application/json,.json"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileJson className="size-3.5" /> JSON continua disponível para bancos
          já estruturados.
        </p>
      </div>

      {result && (
        <div className="space-y-4 animate-rise">
          <div className="panel p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  result.ok
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {result.ok ? "Válido" : "Inválido"}
              </span>
              {result.format && (
                <span className="text-xs text-muted-foreground">{result.format}</span>
              )}
            </div>
            {result.title && (
              <p className="font-display text-lg font-semibold">{result.title}</p>
            )}
            {result.description && (
              <p className="text-sm text-muted-foreground">{result.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{result.questions.length} questões</span>
              <span>Disciplinas: {result.subjects.join(", ") || "-"}</span>
              <span>Assuntos: {result.topics.slice(0, 6).join(", ") || "-"}</span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="panel border-destructive/40 p-4">
              <p className="mb-2 text-sm font-medium text-destructive">Erros</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="panel border-warning/40 p-4">
              <p className="mb-2 text-sm font-medium text-warning">Avisos</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                {result.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.questions.length > 0 && (
            <div className="panel p-4">
              <p className="mb-3 text-sm font-medium">Pré-visualização</p>
              <ul className="max-h-72 space-y-3 overflow-y-auto">
                {result.questions.map((q) => (
                  <li
                    key={q.id}
                    className="border-b border-border/60 pb-3 last:border-0"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {q.id}
                      </span>
                      <DiffBadge difficulty={q.difficulty} />
                      <span className="text-xs text-muted-foreground">
                        {q.subject} · {q.topic}
                      </span>
                    </div>
                    <p className="text-sm">{q.statement}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Correta: {q.correctAnswer}
                      {!q.explanation && " · sem explicação"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResult(null);
                setFileName(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={!result.ok} onClick={confirm}>
              Confirmar importação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
