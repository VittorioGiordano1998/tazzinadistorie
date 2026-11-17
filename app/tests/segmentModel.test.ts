import { describe, expect, it } from 'vitest'

import {
  activeSegmentIndex,
  newSegment,
  roundTime,
  rowToSegment,
  segmentsEqual,
  segmentsFromTranscript,
  sortSegments,
  toRpcPayload,
} from '../src/features/stories/segmentModel'
import type { Segment } from '../src/features/stories/segmentModel'

function seg(start: number, dialect = '', italian = '', source: Segment['source'] = 'manual', key = String(start)): Segment {
  return { key, start, textDialect: dialect, textItalian: italian, source }
}

describe('roundTime', () => {
  it('keeps a tenth of a second and never goes negative', () => {
    expect(roundTime(12.34)).toBe(12.3)
    expect(roundTime(12.36)).toBe(12.4)
    expect(roundTime(-2)).toBe(0)
  })
})

describe('rowToSegment', () => {
  it('reads numeric strings and null texts', () => {
    expect(
      rowToSegment({
        id: 'a',
        story_id: 's',
        start_seconds: '41.26',
        end_seconds: null,
        text_dialect: null,
        text_italian: 'ciao',
        source: 'draft',
      }),
    ).toEqual({ key: 'a', start: 41.3, textDialect: '', textItalian: 'ciao', source: 'draft' })
  })
})

describe('sortSegments', () => {
  it('orders by start and keeps ties in their original order', () => {
    const sorted = sortSegments([seg(5, 'c'), seg(1, 'a'), seg(5, 'd', '', 'manual', 'x')])
    expect(sorted.map((s) => s.textDialect)).toEqual(['a', 'c', 'd'])
  })
})

describe('newSegment', () => {
  it('starts empty and manual at a rounded time', () => {
    expect(newSegment(7.04, 'k')).toEqual({ key: 'k', start: 7, textDialect: '', textItalian: '', source: 'manual' })
  })
})

describe('activeSegmentIndex', () => {
  const list = [seg(0), seg(10), seg(20)]
  it('finds the sentence being played', () => {
    expect(activeSegmentIndex(list, 0)).toBe(0)
    expect(activeSegmentIndex(list, 9.9)).toBe(0)
    expect(activeSegmentIndex(list, 10)).toBe(1)
    expect(activeSegmentIndex(list, 999)).toBe(2)
  })
  it('tolerates a seek that lands a hair early', () => {
    expect(activeSegmentIndex(list, 9.97)).toBe(1)
  })
  it('is -1 before the first sentence and for an empty list', () => {
    expect(activeSegmentIndex([seg(5)], 1)).toBe(-1)
    expect(activeSegmentIndex([], 3)).toBe(-1)
  })
})

describe('segmentsFromTranscript', () => {
  it('makes sorted draft sentences with the text in the dialect field', () => {
    let n = 0
    const out = segmentsFromTranscript(
      [
        { start: 6, end: 9, text: 'seconda' },
        { start: 0.04, end: 6, text: 'prima' },
      ],
      () => `k${(n += 1)}`,
    )
    expect(out).toEqual([
      { key: 'k2', start: 0, textDialect: 'prima', textItalian: '', source: 'draft' },
      { key: 'k1', start: 6, textDialect: 'seconda', textItalian: '', source: 'draft' },
    ])
  })
})

describe('segmentsEqual', () => {
  it('ignores what the database would not keep', () => {
    expect(segmentsEqual([seg(0, 'ciao ')], [seg(0, 'ciao')])).toBe(true)
  })
  it('sees changes in time, text, source and length', () => {
    expect(segmentsEqual([seg(0, 'a')], [seg(1, 'a')])).toBe(false)
    expect(segmentsEqual([seg(0, 'a')], [seg(0, 'b')])).toBe(false)
    expect(segmentsEqual([seg(0, 'a', '', 'draft')], [seg(0, 'a')])).toBe(false)
    expect(segmentsEqual([seg(0)], [seg(0), seg(3)])).toBe(false)
  })
})

describe('toRpcPayload', () => {
  it('sorts, nulls empty texts and keeps the source', () => {
    expect(toRpcPayload([seg(8, '', 'ciao', 'draft'), seg(2, 'uè  ', '')])).toEqual([
      { start_seconds: 2, text_dialect: 'uè', text_italian: null, source: 'manual' },
      { start_seconds: 8, text_dialect: null, text_italian: 'ciao', source: 'draft' },
    ])
  })
})
