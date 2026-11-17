# Una tazzina di storie

Diario privato, con login, delle storie che la nonna racconta davanti al caffè (italiano e
dialetto napoletano). Il contenuto principale è l'**audio**; il testo è un di più, mai un obbligo.

Web app per telefono: Vite + React + TypeScript + Tailwind, backend Supabase. Stack ripreso
dal progetto Nido.

## Struttura

| Cartella | Contenuto |
| --- | --- |
| `app/` | Client web |
| `supabase/` | Migrazioni SQL (schema, RLS, bucket audio) |
| `docs/` | Regole per gli agenti, record (task, ADR, …) |
| `tools/` | Scaffold di progetto |

## Primo avvio

1. **Supabase**: crea un progetto nuovo. In *Authentication → Providers → Email* lascia attivo
   l'accesso con email e password e **disattiva "Allow new users to sign up"**: il diario è
   privato, gli account li crei tu in *Authentication → Users → Add user*.
2. **Database**: incolla `supabase/migrations/20261117120000_tazzina_diary_and_stories.sql` nel
   *SQL Editor* ed eseguilo (oppure `supabase link` + `supabase db push`). Crea le tabelle, le
   policy RLS e il bucket privato `story-audio`.
3. **Variabili**: `cd app`, copia `.env.example` in `.env.local` e incolla URL e anon key
   (*Project Settings → API*). `.env.local` è ignorato da git.
4. **Avvio**: `npm install` e `npm run dev`. Al primo accesso l'app chiede di dare un nome al diario.

Su questa macchina `npm` va lanciato via `cmd /c` (PowerShell blocca gli shim `.ps1`).

```sh
npm run dev      # dev server
npm run build    # tsc + vite build
npm run lint     # oxlint
npm run test     # vitest
```

### Provare la registrazione dal telefono

Il microfono funziona solo in contesto sicuro: `http://localhost` sul PC va bene, ma dal telefono
serve **HTTPS**. Il modo più semplice è un deploy (es. Vercel, con **Root Directory = `app`**: lo
rewrite SPA e la CSP con `microphone=(self)` sono in `app/vercel.json`) con le stesse due variabili
d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Dati

Una storia è l'audio **così come registrato** (formato e mime type originali, nessuna
ricodifica) più metadati in colonne semplici. L'audio sta nel bucket privato `story-audio`, nel
percorso `<id diario>/<id storia>.<estensione>`, dietro l'interfaccia `AudioStorage`
(`app/src/core/audioStorage.ts`): cambiare servizio vuol dire cambiare solo quell'implementazione.

## Convenzioni

Vedi `docs/agents/RULES.md` e `docs/agents/RULES.local.md`. Nessuna pipeline git, per scelta.
