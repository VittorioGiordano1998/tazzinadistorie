import { describe, expect, it } from 'vitest'

import {
  audioPathFor,
  baseMime,
  extensionForMime,
  pickRecorderMime,
  RECORDER_MIME_CANDIDATES,
} from '../src/core/audioFormat'

describe('pickRecorderMime', () => {
  it('prefers opus in webm when supported', () => {
    expect(pickRecorderMime(() => true)).toBe('audio/webm;codecs=opus')
  })

  it('falls through the candidates in order', () => {
    expect(pickRecorderMime((mime) => mime.startsWith('audio/mp4'))).toBe('audio/mp4;codecs=mp4a.40.2')
    expect(pickRecorderMime((mime) => mime === 'audio/mp4')).toBe('audio/mp4')
  })

  it('returns null when nothing is supported', () => {
    expect(pickRecorderMime(() => false)).toBeNull()
    expect(RECORDER_MIME_CANDIDATES.length).toBeGreaterThan(0)
  })
})

describe('baseMime', () => {
  it('drops codec parameters and normalises case', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(baseMime(' Audio/MP4 ; codecs=mp4a.40.2')).toBe('audio/mp4')
    expect(baseMime('')).toBe('')
  })
})

describe('extensionForMime', () => {
  it('maps known types', () => {
    expect(extensionForMime('audio/webm;codecs=opus')).toBe('webm')
    expect(extensionForMime('audio/mp4')).toBe('m4a')
    expect(extensionForMime('audio/mpeg')).toBe('mp3')
  })

  it('falls back to the file name extension, sanitised', () => {
    expect(extensionForMime('audio/x-unknown', 'Voce Nonna.AMR')).toBe('amr')
    expect(extensionForMime('audio/x-unknown', 'noextension')).toBe('bin')
    expect(extensionForMime('', undefined)).toBe('bin')
  })
})

describe('audioPathFor', () => {
  it('puts the diary id first, as the storage policies expect', () => {
    const diary = '11111111-2222-3333-4444-555555555555'
    const story = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(audioPathFor(diary, story, 'audio/webm;codecs=opus')).toBe(`${diary}/${story}.webm`)
  })
})
