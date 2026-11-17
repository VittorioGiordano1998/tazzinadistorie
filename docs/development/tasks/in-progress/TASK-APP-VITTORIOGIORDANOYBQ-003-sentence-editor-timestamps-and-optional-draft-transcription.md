---
id: TASK-APP-VITTORIOGIORDANOYBQ-003
owner: VITTORIOGIORDANOYBQ
type: Feature
status: In Progress
area: app
severity: Medium
opened: 2026-11-17
done: null
next: null
related: []
superseded_by: null
---

# Task: Sentence editor, timestamps and optional draft transcription

## Task Description

Step 3 of the agreed order of work: correcting a story sentence by sentence next to the audio, with a timestamp per sentence (click a sentence to hear that point), and an OPTIONAL automatic draft of the transcription that can be replaced or switched off. The draft must be free and private: no paid service, no audio leaving the device.

## Desired Outcome

- A `story_segments` table (start, derived end, dialect text, Italian text, source manual|draft) is the source of truth; the story-level texts are derived from it by one atomic RPC with the same `updated_at` lock as step 2. Existing step-2 texts migrate to a first sentence at 0:00.
- Story page: sentence list with a time chip (click = seek and play), the two texts per sentence, "new sentence here" at the current playback point, "set start here", delete, active sentence highlighted while playing.
- Transcription behind a `TranscriptionProvider` interface, selected by configuration: `off` (default), `mock` (UI testing) and `browser-whisper` (transformers.js in a Web Worker, nothing leaves the device).
- A "Trascrivi" button on listed stories without text, with progress and cancel; the job survives page navigation, runs one at a time, and never overwrites a story that gained sentences meanwhile.
- Seeking works on recorded WebM (duration repair for files with no duration header).

## Proposed Implementation

- `supabase/migrations/*_tazzina_story_segments.sql`: table, RLS, `replace_story_segments` RPC, migration of existing texts.
- `app/src/core/`: `transcription.ts` (interface, mock, selection), `transcriptionBrowser.ts` + `transcriptionWorker.ts`, `audioDecode.ts`, `AudioStorage.download`.
- `app/src/features/stories/`: `segmentModel.ts` (+tests), `useStory` (segments), `StoryPage` (editor), `StoriesPage` (button). `app/src/features/transcription/`: job provider.
- `app/src/ui/AudioPlayer.tsx`: imperative seek/play handle, duration repair.
- CSP and `.env.example` for the model download.

## Relevant Files

[List of files to read in order to acquire context.]

## Verification Procedure

- `npm run build`, `lint`, `test`; `records check`.
- Manual with `VITE_TRANSCRIPTION=mock`: button, progress, draft sentences, save, conflict.
- Manual with `browser-whisper` on a real recording: model download, quality, speed on PC.

## Notes

[Optional constraints, dependencies, references or risks.]

## Touch History

- 2026-11-17 — VITTORIOGIORDANOYBQ — created
- 2026-11-17 — status Proposed → In Progress

## Resolution

[When completed, describe what has been done, how it was verified and any remaining limitations.]
