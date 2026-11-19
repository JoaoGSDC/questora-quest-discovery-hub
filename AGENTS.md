# Questora

Plataforma pessoal de estudos (PDF, sessão, Live Twitch, tutor Gemini, Turso/libSQL).

- Não force-push nem reescreva histórico já publicado sem pedido explícito.
- Não coloque secrets no repositório; use `.env.local` / env da Vercel.
- Banco: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (local sem URL = `file:./data/questora.db`).
- Schema: `src/db/migrate.ts` + `src/db/schema.ts`.
