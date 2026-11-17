---
id: TASK-APP-VITTORIOGIORDANOYBQ-002
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

# Task: Story text fields with audio player

## Task Description

Step 2 of the agreed order of work: every story gets two optional text fields, "Testo in dialetto" (written as it sounds) and "Traduzione in italiano", edited on a story page with the audio player always at hand.

## Desired Outcome

- A story page (`/storia/:id`) reachable from the list: player on top (stays visible while typing) and the two text fields.
- Both fields optional; empty means null. Dialect field without spellcheck (`lang="nap"`), Italian field with it.
- Explicit save, unsaved-changes warning on leaving, and no silent overwrite when the story was changed elsewhere.
- Only the owner edits; other members read.
- The list shows which texts a story has.

## Proposed Implementation

- `supabase/migrations/*_tazzina_story_texts.sql`: `text_dialect`, `text_italian` on `stories`.
- `app/src/features/stories/`: shared `storyModel.ts`, `useStory.ts`, `StoryPage.tsx`, `storyText.ts` (pure helpers + test); list cards link to the page.
- Out of scope: automatic transcription and per-sentence timestamps (step 3).

## Relevant Files

[List of files to read in order to acquire context.]

## Verification Procedure

- `npm run build`, `lint`, `test` in `app/`; `records check`.
- Manual: write both texts, save, reload, see them; open the same story in two tabs and check the conflict message.

## Notes

[Optional constraints, dependencies, references or risks.]

## Touch History

- 2026-11-17 — VITTORIOGIORDANOYBQ — created
- 2026-11-17 — status Proposed → In Progress
- 2026-11-17 — status In Progress → Done

## Resolution

Delivered: story page (`/storia/:id`) with the player pinned on top and the two optional
text fields ("Testo in dialetto", no spellcheck, `lang="nap"`; "Traduzione in italiano"),
explicit save with unsaved-changes warning, optimistic lock on `updated_at` (a change made
elsewhere is never overwritten), owner-only editing, text badges on the list, and
`supabase/migrations/20261117150000_tazzina_story_texts.sql`.

Verified: `npm run build`, `lint` (warnings only), `test` (18 tests) and `records check`
pass; the owner ran the app locally against Supabase and confirmed it works.

Not done on purpose: title/date editing (not requested). Texts are two columns on `stories`;
step 3 will likely move to per-sentence segments and migrate the existing text.
