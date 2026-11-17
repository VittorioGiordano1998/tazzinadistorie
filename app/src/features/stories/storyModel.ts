/** The shape of a story as the app uses it, and its mapping from the database row. */

export interface Story {
  id: string
  diaryId: string
  title: string
  toldOn: string
  audioPath: string
  audioMime: string
  audioBytes: number | null
  durationSeconds: number | null
  source: 'recorded' | 'uploaded'
  language: string
  /** The story written as it sounds (Neapolitan); empty when not written yet. */
  textDialect: string
  /** The Italian translation; empty when not written yet. */
  textItalian: string
  createdAt: string
  updatedAt: string
}

export interface StoryRow {
  id: string
  diary_id: string
  title: string
  told_on: string
  audio_path: string
  audio_mime: string
  audio_bytes: number | null
  duration_seconds: number | null
  source: 'recorded' | 'uploaded'
  language: string
  text_dialect: string | null
  text_italian: string | null
  created_at: string
  updated_at: string
}

export const STORY_COLUMNS =
  'id, diary_id, title, told_on, audio_path, audio_mime, audio_bytes, duration_seconds, source, language, text_dialect, text_italian, created_at, updated_at'

export function rowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    diaryId: row.diary_id,
    title: row.title,
    toldOn: row.told_on,
    audioPath: row.audio_path,
    audioMime: row.audio_mime,
    audioBytes: row.audio_bytes,
    // numeric columns can come back as strings
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    source: row.source,
    language: row.language,
    textDialect: row.text_dialect ?? '',
    textItalian: row.text_italian ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
