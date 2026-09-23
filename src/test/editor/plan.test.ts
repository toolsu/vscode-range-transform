import { describe, expect, it } from 'bun:test'
import { normalizeEol, planRanges, type OffsetRange } from '../../editor/plan'

/** Builds the arguments `planRanges` takes from a document and its selections. */
function plan(
  document: string,
  spans: readonly [number, number][],
  replacements: readonly (string | null)[],
  eol?: string,
): OffsetRange[] {
  const originals = spans.map(([start, end]) => ({ start, end }))
  const originalTexts = spans.map(([start, end]) => document.slice(start, end))
  return planRanges(originals, toInserted(replacements, eol), originalTexts)
}

/** What `applyReplacements` hands the editor: line endings already the document's. */
function toInserted(
  replacements: readonly (string | null)[],
  eol?: string,
): (string | null)[] {
  return replacements.map((replacement) =>
    replacement === null || eol === undefined
      ? replacement
      : normalizeEol(replacement, eol),
  )
}

/**
 * Applies the replacements the way `TextEditorEdit` does, for cross-checking.
 *
 * `eol` mirrors the rewrite VS Code performs on any text handed to an edit.
 */
function applied(
  document: string,
  spans: readonly [number, number][],
  replacements: readonly (string | null)[],
  eol?: string,
): string {
  const inserted = toInserted(replacements, eol)
  let result = ''
  let cursor = 0
  spans.forEach(([start, end], index) => {
    result += document.slice(cursor, start)
    result += inserted[index] ?? document.slice(start, end)
    cursor = end
  })
  return result + document.slice(cursor)
}

describe('planRanges', () => {
  it('returns an empty plan for no selections', () => {
    expect(planRanges([], [], [])).toEqual([])
  })

  it('leaves a same-length replacement in place', () => {
    expect(plan('abcdef', [[2, 4]], ['XY'])).toEqual([{ start: 2, end: 4 }])
  })

  it('shifts a later selection when an earlier one grows', () => {
    expect(
      plan(
        'a b c',
        [
          [0, 1],
          [2, 3],
        ],
        ['aaa', 'bbb'],
      ),
    ).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ])
  })

  it('shifts a later selection when an earlier one shrinks', () => {
    expect(
      plan(
        'aaa bbb',
        [
          [0, 3],
          [4, 7],
        ],
        ['a', 'b'],
      ),
    ).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
    ])
  })

  it('handles several selections on the same line', () => {
    // The case the previous implementation got wrong: every selection after the first
    // was offset by the growth of the ones before it.
    const document = '1, 2, 3'
    const spans: [number, number][] = [
      [0, 1],
      [3, 4],
      [6, 7],
    ]
    const ranges = plan(document, spans, ['one', 'two', 'three'])

    expect(ranges).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 8 },
      { start: 10, end: 15 },
    ])

    const result = applied(document, spans, ['one', 'two', 'three'])
    expect(result).toBe('one, two, three')
    ranges.forEach((range, index) => {
      expect(result.slice(range.start, range.end)).toBe(
        ['one', 'two', 'three'][index],
      )
    })
  })

  it('accounts for a skipped selection using its original text', () => {
    const document = 'aa bb cc'
    const spans: [number, number][] = [
      [0, 2],
      [3, 5],
      [6, 8],
    ]
    const replacements = ['XXXX', null, 'Y']
    const ranges = plan(document, spans, replacements)
    const result = applied(document, spans, replacements)

    expect(result).toBe('XXXX bb Y')
    ranges.forEach((range, index) => {
      const expected = replacements[index] ?? document.slice(...spans[index])
      expect(result.slice(range.start, range.end)).toBe(expected)
    })
  })

  it('handles insertion at bare cursors', () => {
    const document = 'ab'
    const spans: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
    ]
    const ranges = plan(document, spans, ['1', '2', '3'])
    expect(ranges).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 5 },
    ])

    const result = applied(document, spans, ['1', '2', '3'])
    expect(result).toBe('1a2b3')
    ranges.forEach((range, index) => {
      expect(result.slice(range.start, range.end)).toBe(['1', '2', '3'][index])
    })
  })

  it('handles multi-line replacements', () => {
    const document = 'x y'
    const spans: [number, number][] = [
      [0, 1],
      [2, 3],
    ]
    const replacements = ['1\n2\n3', 'z']
    const ranges = plan(document, spans, replacements)
    const result = applied(document, spans, replacements)

    expect(result).toBe('1\n2\n3 z')
    expect(result.slice(ranges[0].start, ranges[0].end)).toBe('1\n2\n3')
    expect(result.slice(ranges[1].start, ranges[1].end)).toBe('z')
  })

  it('treats an empty replacement as a deletion', () => {
    const document = 'aa bb'
    const spans: [number, number][] = [
      [0, 2],
      [3, 5],
    ]
    const ranges = plan(document, spans, ['', 'Z'])
    expect(ranges).toEqual([
      { start: 0, end: 0 },
      { start: 1, end: 2 },
    ])
    expect(applied(document, spans, ['', 'Z'])).toBe(' Z')
  })

  it('measures what a CRLF document actually stores', () => {
    // The defect: `\n` from an expression becomes `\r\n` on the way in, so every
    // selection after the first sat two characters short per line break. `positionAt`
    // clamps, so nothing complained — the selections just covered the wrong text.
    const document = 'ab\r\ncd'
    const spans: [number, number][] = [
      [0, 2],
      [4, 6],
    ]
    const replacements = ['ab\nab', 'cd\ncd']

    const ranges = plan(document, spans, replacements, '\r\n')
    expect(ranges).toEqual([
      { start: 0, end: 6 },
      { start: 8, end: 14 },
    ])

    const result = applied(document, spans, replacements, '\r\n')
    expect(result).toBe('ab\r\nab\r\ncd\r\ncd')
    ranges.forEach((range, index) => {
      expect(result.slice(range.start, range.end)).toBe(
        normalizeEol(replacements[index], '\r\n'),
      )
    })
  })

  it('measures a CRLF replacement in an LF document', () => {
    // The mirror image: text pasted from Windows shrinks on the way into an LF file.
    const document = 'ab\ncd'
    const spans: [number, number][] = [
      [0, 2],
      [3, 5],
    ]
    const replacements = ['ab\r\nab', 'cd\r\ncd']

    const ranges = plan(document, spans, replacements, '\n')
    const result = applied(document, spans, replacements, '\n')

    expect(result).toBe('ab\nab\ncd\ncd')
    ranges.forEach((range, index) => {
      expect(result.slice(range.start, range.end)).toBe(
        normalizeEol(replacements[index], '\n'),
      )
    })
  })

  it('keeps a skipped selection in a CRLF document aligned', () => {
    const document = 'aa\r\nbb\r\ncc'
    const spans: [number, number][] = [
      [0, 2],
      [4, 6],
      [8, 10],
    ]
    const replacements = ['x\ny', null, 'z\nz']

    const ranges = plan(document, spans, replacements, '\r\n')
    const result = applied(document, spans, replacements, '\r\n')

    expect(result).toBe('x\r\ny\r\nbb\r\nz\r\nz')
    ranges.forEach((range, index) => {
      const expected =
        replacements[index] === null
          ? document.slice(...spans[index])
          : normalizeEol(replacements[index] as string, '\r\n')
      expect(result.slice(range.start, range.end)).toBe(expected)
    })
  })

  it('stays consistent for a long run of growing selections', () => {
    const document = Array.from({ length: 20 }, () => 'x').join(' ')
    const spans: [number, number][] = Array.from({ length: 20 }, (_, i) => [
      i * 2,
      i * 2 + 1,
    ])
    const replacements = spans.map((_, i) => `item${i}`)
    const ranges = plan(document, spans, replacements)
    const result = applied(document, spans, replacements)

    ranges.forEach((range, index) => {
      expect(result.slice(range.start, range.end)).toBe(replacements[index])
    })
  })
})

describe('normalizeEol', () => {
  it('rewrites every line ending kind to CRLF', () => {
    expect(normalizeEol('a\nb\rc\r\nd', '\r\n')).toBe('a\r\nb\r\nc\r\nd')
  })

  it('rewrites every line ending kind to LF', () => {
    expect(normalizeEol('a\nb\rc\r\nd', '\n')).toBe('a\nb\nc\nd')
  })

  it('is idempotent, so a CRLF pair is never doubled', () => {
    const once = normalizeEol('a\nb', '\r\n')
    expect(normalizeEol(once, '\r\n')).toBe(once)
  })

  it('leaves text without line endings alone', () => {
    expect(normalizeEol('', '\r\n')).toBe('')
    expect(normalizeEol('abc', '\r\n')).toBe('abc')
  })
})
