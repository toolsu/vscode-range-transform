import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { PREVIEW_SYMBOLS } from '../../const/visual'

// `preview.ts` imports `vscode`, which only exists inside the extension host. Only
// `sanitizePreviewText` is tested here — it is pure — so a stub is enough to let the
// module load; `renderPreview` and the decoration type belong to the e2e suite.
mock.module('vscode', () => ({
  window: { createTextEditorDecorationType: () => ({}) },
  ThemeColor: class {},
  DecorationRangeBehavior: { ClosedClosed: 0 },
}))

// Imported after the stub is registered, which a static import would defeat: those are
// hoisted above everything else in the module.
let sanitizePreviewText: typeof import('../../editor/preview').sanitizePreviewText

beforeAll(async () => {
  ;({ sanitizePreviewText } = await import('../../editor/preview.js'))
})

/** Counts code points, which is what the truncation limit is expressed in. */
function points(text: string): number {
  return [...text].length
}

/** 'e' plus a combining acute accent: one grapheme, two code points. */
const COMBINED_E = 'é'

describe('sanitizePreviewText', () => {
  it('leaves plain text alone', () => {
    expect(sanitizePreviewText('abc', 10)).toBe('abc')
  })

  it('passes an empty string through', () => {
    expect(sanitizePreviewText('', 10)).toBe('')
  })

  it('shows every kind of line ending as one symbol', () => {
    expect(sanitizePreviewText('a\nb', 10)).toBe(`a${PREVIEW_SYMBOLS.newline}b`)
    expect(sanitizePreviewText('a\rb', 10)).toBe(`a${PREVIEW_SYMBOLS.newline}b`)
    // CRLF is one line break, so it must not become two symbols — otherwise the
    // preview looks like it inserts a blank line that it does not insert.
    expect(sanitizePreviewText('a\r\nb', 10)).toBe(
      `a${PREVIEW_SYMBOLS.newline}b`,
    )
  })

  it('shows tabs', () => {
    expect(sanitizePreviewText('a\t\tb', 10)).toBe(
      `a${PREVIEW_SYMBOLS.tab}${PREVIEW_SYMBOLS.tab}b`,
    )
  })

  it('keeps a run of spaces visible', () => {
    // CSS `white-space: nowrap` collapses runs of real spaces, so each one has to be
    // substituted rather than passed through.
    const result = sanitizePreviewText('a   b', 10)
    expect(result).toBe(`a${PREVIEW_SYMBOLS.space.repeat(3)}b`)
    expect(result).not.toContain(' ')
  })

  it('leaves no whitespace that a CSS content string would eat', () => {
    const result = sanitizePreviewText('a \t\r\n  b', 40)
    expect(/[ \t\r\n]/.test(result)).toBe(false)
  })

  it('counts a substituted character as one, not as its source', () => {
    // '\r\n' is two characters of input but one symbol, so this fits in three.
    expect(sanitizePreviewText('a\r\nb', 3)).toBe(
      `a${PREVIEW_SYMBOLS.newline}b`,
    )
  })

  it('truncates past the limit and marks it', () => {
    expect(sanitizePreviewText('abcdef', 3)).toBe(
      `abc${PREVIEW_SYMBOLS.ellipsis}`,
    )
  })

  it('leaves text of exactly the limit untouched', () => {
    expect(sanitizePreviewText('abc', 3)).toBe('abc')
  })

  it('truncates to nothing but the marker at a zero limit', () => {
    expect(sanitizePreviewText('abc', 0)).toBe(PREVIEW_SYMBOLS.ellipsis)
    expect(sanitizePreviewText('', 0)).toBe('')
  })

  it('never splits a surrogate pair', () => {
    // Slicing by UTF-16 units would cut the emoji in half and render a stray glyph.
    const result = sanitizePreviewText('\u{1F600}\u{1F600}\u{1F600}', 2)
    expect(result).toBe(`\u{1F600}\u{1F600}${PREVIEW_SYMBOLS.ellipsis}`)
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(result)).toBe(false)
    expect(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(result)).toBe(false)
  })

  it('measures astral characters as one each', () => {
    expect(sanitizePreviewText('\u{1F600}\u{1F600}', 2)).toBe(
      '\u{1F600}\u{1F600}',
    )
    expect(points(sanitizePreviewText('\u{1F600}'.repeat(4), 3))).toBe(4)
  })

  it('keeps a combining mark with its base when the cut falls after it', () => {
    expect(sanitizePreviewText(`${COMBINED_E}x`, 2)).toBe(
      `${COMBINED_E}${PREVIEW_SYMBOLS.ellipsis}`,
    )
  })

  it('counts a combining mark as its own character', () => {
    // Known limitation: the limit is in code points, not grapheme clusters, so a cut
    // can land between a base and its mark. Truncating display text is cosmetic — what
    // gets inserted is untouched — so grapheme segmentation is not worth the weight.
    expect(sanitizePreviewText(`${COMBINED_E}x`, 1)).toBe(
      `e${PREVIEW_SYMBOLS.ellipsis}`,
    )
  })

  it('never exceeds the limit by more than the marker', () => {
    const inputs = [
      '',
      'a',
      'a\nb\tc  d',
      '\u{1F600}'.repeat(30),
      'x'.repeat(200),
    ]
    for (const input of inputs) {
      for (const limit of [0, 1, 5, 40]) {
        expect(points(sanitizePreviewText(input, limit))).toBeLessThanOrEqual(
          limit + 1,
        )
      }
    }
  })
})
