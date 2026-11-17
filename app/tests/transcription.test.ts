import { describe, expect, it } from 'vitest'

import { mixToMono } from '../src/core/audioDecode'
import { formatTimestamp } from '../src/core/dates'
import { isAbortError, abortError, segmentsFromChunks } from '../src/core/transcription'

describe('segmentsFromChunks', () => {
  it('trims text, drops empty chunks, keeps open ends and sorts by start', () => {
    expect(
      segmentsFromChunks([
        { timestamp: [10, null], text: '  ultima   frase ' },
        { timestamp: [0, 4.5], text: ' Prima\nfrase ' },
        { timestamp: [4.5, 6], text: '   ' },
      ]),
    ).toEqual([
      { start: 0, end: 4.5, text: 'Prima frase' },
      { start: 10, end: null, text: 'ultima frase' },
    ])
  })
})

describe('abort errors', () => {
  it('are recognised', () => {
    expect(isAbortError(abortError())).toBe(true)
    expect(isAbortError(new Error('x'))).toBe(false)
  })
})

describe('mixToMono', () => {
  it('returns a copy for one channel and averages several', () => {
    const left = Float32Array.from([1, 0, -1])
    const mono = mixToMono([left])
    expect(Array.from(mono)).toEqual([1, 0, -1])
    expect(mono).not.toBe(left)
    expect(Array.from(mixToMono([Float32Array.from([1, 1]), Float32Array.from([0, 0.5])]))).toEqual([0.5, 0.75])
    expect(mixToMono([]).length).toBe(0)
  })
})

describe('formatTimestamp', () => {
  it('shows minutes, seconds and tenths', () => {
    expect(formatTimestamp(0)).toBe('0:00.0')
    expect(formatTimestamp(65.9)).toBe('1:05.9')
    expect(formatTimestamp(600)).toBe('10:00.0')
    expect(formatTimestamp(null)).toBe('0:00.0')
  })
})
