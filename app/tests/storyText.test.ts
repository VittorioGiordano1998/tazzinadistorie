import { describe, expect, it } from 'vitest'

import { sameStoredText, toStoredText } from '../src/features/stories/storyText'

describe('toStoredText', () => {
  it('stores null for empty or whitespace-only text', () => {
    expect(toStoredText('')).toBeNull()
    expect(toStoredText('  \n\t ')).toBeNull()
  })

  it('drops trailing whitespace but keeps the rest as typed', () => {
    expect(toStoredText('  Ncoppa â muntagna  \n\n')).toBe('  Ncoppa â muntagna')
  })

  it('normalises line endings to \\n', () => {
    expect(toStoredText('uno\r\ndue\rtre')).toBe('uno\ndue\ntre')
  })
})

describe('sameStoredText', () => {
  it('ignores differences the database would not keep', () => {
    expect(sameStoredText('ciao ', 'ciao')).toBe(true)
    expect(sameStoredText('', '   ')).toBe(true)
    expect(sameStoredText('ciao', 'ciao!')).toBe(false)
  })
})
