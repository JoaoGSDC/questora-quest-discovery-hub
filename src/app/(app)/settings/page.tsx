"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SettingsPage() {
  const { twitch, setTwitch, resetDemo } = useApp();
  const params = useSearchParams();
  const [gemini, setGemini] = useState<{ gemini: boolean; model: string } | null>(
    null,
  );
  const [twitchAuth, setTwitchAuth] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/tutor/status")
      .then((r) => r.json())
      .then(setGemini)
      .catch(() => setGemini({ gemini: false, model: "-" }));
    void fetch("/api/twitch/settings")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => setTwitchAuth(!!d.authenticated))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = params.get("twitch");
    if (t === "connected") toast.success("Twitch autorizada");
    if (t === "error" || t === "token_error") toast.error("Falha na autorização Twitch");
    if (t === "missing_env") toast.error("Configure TWITCH_CLIENT_ID/SECRET no .env.local");
  }, [params]);

  const connectIrc = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/twitch/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: twitch.channel }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "Falha ao conectar IRC");
      setTwitch({ connected: true });
      toast.success(`IRC conectado a #${twitch.channel}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnectIrc = async () => {
    setBusy(true);
    try {
      await fetch("/api/twitch/disconnect", { method: "POST" });
      setTwitch({ connected: false });
      toast.message("IRC desconectado");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gemini, Twitch e dados persistidos em SQLite
        </p>
      </header>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-sm font-semibold">Tutor Gemini</h2>
        <p className="text-xs text-muted-foreground">
          Defina <code className="text-primary">GEMINI_API_KEY</code> em{" "}
          <code>.env.local</code>. Sem a key, o tutor responde só com o gabarito
          local.
        </p>
        <p className="text-sm">
          Status:{" "}
          <span className={gemini?.gemini ? "text-success" : "text-warning"}>
            {gemini == null
              ? "..."
              : gemini.gemini
                ? `conectado (${gemini.model})`
                : "sem API key"}
          </span>
        </p>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold">Transmissão Twitch</h2>
        <p className="text-xs text-muted-foreground">
          1) Crie um app em dev.twitch.tv · 2) Autorize com OAuth · 3) Conecte o IRC
          na live. Redirect:{" "}
          <code className="text-[11px]">http://localhost:3000/api/twitch/callback</code>
        </p>
        <div>
          <Label>Canal</Label>
          <Input
            className="mt-1"
            value={twitch.channel}
            onChange={(e) => setTwitch({ channel: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" asChild variant="secondary">
            <a href="/api/twitch/oauth">Autorizar Twitch</a>
          </Button>
          <Button type="button" disabled={busy || !twitchAuth} onClick={connectIrc}>
            Conectar IRC
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={disconnectIrc}
          >
            Desconectar IRC
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          OAuth:{" "}
          <span className={twitchAuth ? "text-success" : "text-warning"}>
            {twitchAuth ? "autorizado" : "pendente"}
          </span>
          {" · "}
          IRC:{" "}
          <span className={twitch.connected ? "text-success" : "text-muted-foreground"}>
            {twitch.connected ? "conectado" : "offline"}
          </span>
        </p>
        <div className="flex items-center justify-between">
          <Label>Participação do chat</Label>
          <Switch
            checked={twitch.chatEnabled}
            onCheckedChange={(v) => setTwitch({ chatEnabled: v })}
          />
        </div>
        <div>
          <Label>Prefixo dos comandos</Label>
          <Input
            className="mt-1 max-w-[6rem]"
            value={twitch.commandPrefix}
            onChange={(e) => setTwitch({ commandPrefix: e.target.value || "!" })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Pontos por acerto</Label>
            <Input
              className="mt-1"
              type="number"
              value={twitch.pointsCorrect}
              onChange={(e) =>
                setTwitch({ pointsCorrect: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Pontos participação</Label>
            <Input
              className="mt-1"
              type="number"
              value={twitch.pointsParticipation}
              onChange={(e) =>
                setTwitch({ pointsParticipation: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Tempo de votação (s)</Label>
            <Input
              className="mt-1"
              type="number"
              value={twitch.voteSeconds}
              onChange={(e) =>
                setTwitch({ voteSeconds: Number(e.target.value) || 30 })
              }
            />
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-sm font-semibold">Dados</h2>
        <p className="text-xs text-muted-foreground">
          Apaga questões, tentativas, listas e rascunhos do SQLite.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            if (confirm("Apagar todos os dados do SQLite?")) {
              resetDemo();
              toast.success("Dados apagados");
            }
          }}
        >
          Limpar dados
        </Button>
      </section>
    </div>
  );
}
