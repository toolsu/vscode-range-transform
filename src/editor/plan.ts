/** A span of the document, in character offsets. */
export interface OffsetRange {
  readonly start: number
  readonly end: number
}

/**
 * Rewrites every line ending in `text` to `eol`.
 *
 * VS Code does this to any text handed to an edit whose line endings differ from the
 * document's (`PieceTreeTextBuffer.applyEdits` runs `text.replace(/\r\n|\r|\n/g, eol)`),
 * so a replacement built from user code with `\n` in it occupies *two* characters per
 * line break once it lands in a CRLF document. Measuring the raw string would leave
 * every following selection short, and `positionAt` clamps rather than complains, so the
 * damage is silent. Normalising here — with the same pattern VS Code uses — lets the
 * caller insert and measure the identical string, so the two cannot drift apart.
 */
export function normalizeEol(text: string, eol: string): string {
  return text.replace(/\r\n|\r|\n/g, eol)
}

/**
 * Computes where each replacement ends up once all of them have been applied.
 *
 * `TextEditorEdit` resolves every replacement against the *original* document, so the
 * ranges handed to it need no adjustment — but the ranges the user is left selecting
 * afterwards do. Walking a running delta in offset space is what handles the case the
 * previous implementation got wrong: with two or more selections on the same line,
 * adding the replacement's length to the original position put every selection after
 * the first in the wrong place.
 *
 * `originals` must be in document order and non-overlapping. A `null` replacement means
 * that selection is left alone, so its original text is what occupies the space.
 * `replacements` must already carry the document's line endings — see `normalizeEol` —
 * because the arithmetic here is a plain character count.
 *
 * Kept free of `vscode` so the arithmetic — the part that was wrong — can be tested
 * without an extension host.
 */
export function planRanges(
  originals: readonly OffsetRange[],
  replacements: readonly (string | null | undefined)[],
  originalTexts: readonly string[],
): OffsetRange[] {
  const planned: OffsetRange[] = []
  let delta = 0

  for (let index = 0; index < originals.length; index += 1) {
    const original = originals[index]
    const replacement = replacements[index] ?? originalTexts[index] ?? ''
    const start = original.start + delta
    const end = start + replacement.length
    delta += replacement.length - (original.end - original.start)
    planned.push({ start, end })
  }

  return planned
}
