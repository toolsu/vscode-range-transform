import { SCRATCH } from '../const/const'

export interface ScratchTemplateOptions {
  /** Absolute filesystem path of the `rt.d.ts` sitting next to the scratch file. */
  readonly globalsPath: string
  readonly selectionCount: number
  /** File name the selections came from, shown in the header. */
  readonly documentName: string
}

/**
 * Normalises a path for a triple-slash reference.
 *
 * TypeScript resolves the reference by `combinePaths` + `normalizePath`, which rewrites
 * backslashes anyway, so emitting forward slashes is both correct on Windows and the
 * form the compiler would produce itself. What it will *not* accept is a URI, a
 * percent-encoded path, or a relative path — all three silently fail to resolve, so
 * always pass `uri.fsPath`, never `uri.toString()`.
 */
export function referencePath(fsPath: string): string {
  return fsPath.replace(/\\/g, '/')
}

/**
 * Builds the initial contents of an advanced-transform scratch file.
 *
 * The whole file is evaluated as JavaScript, comments included — so the header needs no
 * stripping and a user's own comments, string literals and regular expressions survive
 * untouched. The previous implementation ran a regex over the file to remove comments
 * before evaluating, which corrupted anything containing `//`.
 *
 * The header stays short on purpose: every name is documented in `rt.d.ts`, so hovering
 * is more informative than any comment block could be.
 */
export function buildScratchContent(options: ScratchTemplateOptions): string {
  const { globalsPath, selectionCount, documentName } = options
  const plural = selectionCount === 1 ? 'selection' : 'selections'

  return `/// <reference path="${referencePath(globalsPath)}" />
// Range & Transform — Advanced
//
// Runs once for each of the ${selectionCount} ${plural} in ${documentName}.
// The value of the last expression replaces the selected text.
// Hover any name below for its documentation.
//
//   s    selected text          n    s read as a number
//   i    index, 1-based         i0   index, 0-based       l   selection count
//   ss   every selection        wl   the whole line       len length
//   wc   word count             fli  line in the file     li  line, from the first
//
//   number()  letter()  upperletter()  lowerletter()  upper()  lower()
//   convnum.toRoman(n)  convnum.toEnglishWords(n)  convnum.toChineseWords(n)
//   convnum.toHex(n)  convnum.toMonth(n, 'en-US', 'short')
//
// Close this tab to apply. Clear the file and close it to cancel.

${SCRATCH.placeholder}
`
}
