# Questora

Estudos para concurso: importar PDF, resolver com quadro, live Twitch, tutor Gemini e revisão no Turso/SQLite.

## Stack

- Next.js 15 (App Router, runtime Node)
- Turso / libSQL (Drizzle)
- Gemini (`GEMINI_API_KEY`)
- Twitch IRC (`tmi.js` + OAuth `chat:read`)

## Setup

```bash
bun install
cp .env.example .env.local
# preencha GEMINI_API_KEY, TWITCH_* e (para nuvem) TURSO_*
bun run dev
```

App: [http://localhost:3000](http://localhost:3000)

### Banco (Turso)

1. Crie um banco em [turso.tech](https://turso.tech) (CLI ou dashboard)
2. Copie a URL (`libsql://...`) e o auth token
3. Coloque em `.env.local`:

```env
TURSO_DATABASE_URL=libsql://seu-db-org.turso.io
TURSO_AUTH_TOKEN=...
```

4. Na Vercel, configure as mesmas variáveis de ambiente

Sem `TURSO_DATABASE_URL`, o app usa arquivo local `file:./data/questora.db` (só no seu PC).

O schema é criado automaticamente na primeira request.

### Twitch

1. App em [dev.twitch.tv](https://dev.twitch.tv/console)
2. Redirect: `http://localhost:3000/api/twitch/callback` (e a URL da Vercel em produção)
3. Cole Client ID/Secret no `.env.local`
4. Configurações → Autorizar Twitch → Conectar IRC

### Gemini

`GEMINI_API_KEY` no Google AI Studio. Sem key, o tutor usa só o gabarito local.

### PDF

Questões → Importar: PDF Limeira/Avança SP (A–E + gabarito) ou JSON Questora v1.

## Scripts

| Comando | Descrição |
|---|---|
| `bun run dev` | desenvolvimento |
| `bun run build` | build |
| `bun run start` | servir build |
| `bun run db:seed` | limpa o banco |

## Estrutura

- `src/app`: rotas e APIs
- `src/db`: schema, repository (Turso/libSQL)
- `src/services`: PDF, Gemini, Twitch
- `src/server/twitch-irc.ts`: cliente IRC
