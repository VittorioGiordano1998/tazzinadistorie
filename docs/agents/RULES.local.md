# Project rules — Una tazzina di storie

Companion to `RULES.md`, with the same authority. `RULES.md` is company-wide and replaced by
every scaffold update; **this file is yours** — the scaffold creates it once and never
writes to it again. Everything true only of this project goes here.

## Naming

- Plain `PascalCase` for types and React components; `camelCase` for functions and variables.
  No project type prefix: the code base is TypeScript only.
- No namespaces: imports are path-based under `app/src/`.

## Layers

The client is a static web app (`app/`); the backend is Supabase (`supabase/`).
Allowed dependency direction in `app/src/`:

```
Views -> Features (providers/hooks) -> Core
```

- `ui/` and the page/component files under `features/<feature>/` are **Views**: no Supabase
  calls, no fetching; data comes through providers/hooks.
- `features/<feature>/` providers and hooks are the **state** layer and the only layer that
  talks to Supabase.
- `core/` is the **foundation**: env access, the single Supabase client, the audio storage
  interface and its implementation, pure utilities. It imports nothing from `features/` or `ui/`.
- `app/` (router, guards, shell) wires Views to state and holds no data logic.

The database schema has a single source of truth: `supabase/migrations/*.sql`. Every schema
change lands there, never only in the dashboard.

## Commit scopes

| Scope | Covers |
| --- | --- |
| `app` | the React web app (`app/`) |
| `supabase` | migrations and Edge Functions (`supabase/`) |
| `docs` | documentation and records |
| `repo` | repository-wide chores |

## Project conventions

- **No git pipeline.** By explicit owner request: no CI/CD, no GitHub Actions, no
  `.github/workflows`, no `.gitlab-ci.yml` or similar. Checks run locally
  (`npm run build|lint|test` in `app/`, `sh tools/scaffold.sh records check`).
- **Audio is the product.** Text, transcription and translation are optional extras. Never make
  a story depend on a transcript.
- **External services sit behind an interface** (`core/`): audio storage now, transcription
  in step 3. Selected through configuration, never hard-coded.
- **Data stays exportable.** A story is audio (original format + mime type), text, per-sentence
  timestamps and metadata, stored in plain columns and plain files. No fine-tuning is
  implemented; the layout only has to keep that door open.
- **Nothing sensitive in tracked files.** No keys, project refs, real emails or family names in
  code, tests, records, docs or commit messages; fixtures use invented data. The Supabase URL
  and anon key live in `app/.env.local` (git-ignored), read only through `app/src/core/env.ts`;
  a missing value shows an in-app setup screen instead of crashing.
- UI language is Italian; code, comments, docs and records are English.
- Colors, fonts and shadows come only from the tokens in `app/src/index.css`.
- On this machine npm runs through `cmd /c` (PowerShell execution policy blocks the shims).
- Reference project (read-only, never edit): `Nido`.
- The owner pushes; agents commit locally and never push.

## Addons installed

| Addon | Why this project needs it |
| --- | --- |
| `core` | base scaffold: rules, records, agent wiring |
