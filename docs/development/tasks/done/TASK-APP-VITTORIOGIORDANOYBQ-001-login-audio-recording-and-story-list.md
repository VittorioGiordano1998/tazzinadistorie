---
id: TASK-APP-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Feature
status: Done
area: app
severity: Medium
opened: 2026-11-17
done: 2026-11-17
next: null
related: []
superseded_by: null
---

# Task: Login, audio recording and story list

## Task Description

"Una tazzina di storie" is a private diary of the stories a grandmother tells (Italian and
Neapolitan dialect). Audio is the primary content; text is optional. Step 1 of the agreed
order of work: private login, in-browser audio recording (or file upload) and the list of
stories.

## Desired Outcome

- Email/password login; public sign-up disabled; every route behind auth.
- A diary with members and roles (`owner`, `viewer`, `contributor`), enforced by RLS from the
  start so invitations (step 4) need no schema rewrite.
- A big "Registra" button that records from the phone browser (Android Chrome), with the
  screen kept awake and the chunks buffered in IndexedDB so an interruption loses nothing;
  or upload of an existing audio file.
- A story = audio + title + date (tag and photo come in later steps). Audio lives in a
  private Supabase bucket behind a storage interface, in the original recorded format with
  its mime type.
- The story list, newest first, with an audio player on each story.

## Proposed Implementation

- `app/`: Vite + React + TypeScript + Tailwind, layered Views -> Features -> Core as in Nido.
- `app/src/core/`: env, single Supabase client, `audioStorage` interface (+ Supabase
  implementation), recorder utilities, pure helpers.
- `app/src/features/{auth,diary,stories}`: providers/hooks (the only layer touching Supabase)
  and pages.
- `supabase/migrations/`: `diaries`, `diary_members`, `stories`, private `story-audio`
  bucket and policies, idempotent.
- Out of scope here: text fields, transcription, glossary, tags, photos, invitations, PDF.

## Relevant Files

- `docs/agents/RULES.md`, `docs/agents/RULES.local.md`
- Reference project (read-only): `Nido` — `app/src/core/*`, `features/auth`, `features/memories`,
  `supabase/migrations/*`

## Verification Procedure

- `npm run build`, `npm run lint`, `npm run test` in `app/` pass.
- `sh tools/scaffold.sh records check` passes.
- Manual, on a real Supabase project: log in, record ~1 min, save, see it in the list and play
  it back; upload a file; verify that a second user without membership sees nothing.

## Notes

- No git pipeline (no CI/CD files) by explicit request.
- Supabase project and `app/.env.local` are created by the owner; no keys in tracked files.
- Android only target for recording; the recorder uses `MediaRecorder` with the first
  supported mime type.

## Touch History

- 2026-11-17 — VITTORIOGIORDANOYBQ — created
- 2026-11-17 — status Proposed → In Progress
- 2026-11-17 — status In Progress → Done

## Resolution

Delivered: email/password login (no public sign-up), diary with members and roles enforced by
RLS, in-browser recording (Wake Lock, IndexedDB chunk buffer with recovery, upload retries),
upload of an audio file, story list with a lazy-loading player, private `story-audio` bucket
behind the `AudioStorage` interface, `supabase/migrations/20261117120000_tazzina_diary_and_stories.sql`.

Verified: `npm run build`, `npm run lint` (warnings only), `npm run test` (14 tests) and
`records check` pass; the owner confirmed the flow end to end on a real Supabase project.

Known limitation (carried to step 2): recorded WebM has no duration in its header, so
seeking to an arbitrary point may be unreliable; the player falls back to the stored duration.
PWA (item 10) is not assigned to any step yet and was not done.
