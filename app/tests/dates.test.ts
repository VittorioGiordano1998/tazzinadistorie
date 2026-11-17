import { describe, expect, it } from 'vitest'

import { defaultStoryTitle, formatDuration, formatLongDate, todayIso } from '../src/core/dates'

describe('todayIso', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayIso(new Date(2026, 10, 17))).toBe('2026-11-17')
  })
})

describe('formatLongDate', () => {
  it('writes the date in Italian', () => {
    expect(formatLongDate('2026-11-17')).toBe('17 novembre 2026')
    expect(formatLongDate('2026-03-01')).toBe('1 marzo 2026')
  })

  it('returns malformed input untouched', () => {
    expect(formatLongDate('boh')).toBe('boh')
  })
})

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65.9)).toBe('1:05')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('adds hours from one hour', () => {
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('treats unknown values as zero', () => {
    expect(formatDuration(null)).toBe('0:00')
    expect(formatDuration(undefined)).toBe('0:00')
    expect(formatDuration(Infinity)).toBe('0:00')
    expect(formatDuration(-3)).toBe('0:00')
  })
})

describe('defaultStoryTitle', () => {
  it('uses the long date', () => {
    expect(defaultStoryTitle('2026-11-17')).toBe('Storia del 17 novembre 2026')
  })
})
