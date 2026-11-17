/** Today as `YYYY-MM-DD` in the local time zone (what a date input and a `date` column use). */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** `2026-11-17` -> `17 novembre 2026`. */
export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  )
}

/** Seconds -> `m:ss` (or `h:mm:ss` from one hour). Unknown values read `0:00`. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const whole = Math.floor(totalSeconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const seconds = String(whole % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** Default title for a story that was not given one. */
export function defaultStoryTitle(iso: string): string {
  return `Storia del ${formatLongDate(iso)}`
}

/** Seconds -> `m:ss.d` (a tenth of a second), for sentence start times. */
export function formatTimestamp(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00.0'
  const tenths = Math.floor(totalSeconds * 10 + 1e-9)
  const whole = Math.floor(tenths / 10)
  const minutes = Math.floor(whole / 60)
  const seconds = String(whole % 60).padStart(2, '0')
  return `${minutes}:${seconds}.${tenths % 10}`
}
