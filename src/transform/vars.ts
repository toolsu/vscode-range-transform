import * as convnumNamespace from 'convnum'
import { registerConvnum } from './argKind'
import {
  letter,
  lower,
  lowerletter,
  number,
  upper,
  upperletter,
} from './helpers'

// Lets a bare `convnum.toRoman` be applied automatically to the right variable:
// convnum's `to…`/`format…` functions take a number, the rest take a string.
registerConvnum(convnumNamespace)

/**
 * Everything a transform needs to know about the editor, as plain data.
 *
 * Deliberately not a `vscode.TextEditor`: keeping this module free of `vscode` is what
 * lets the whole transform pipeline be unit-tested under `bun test` in milliseconds.
 * All three arrays are in document order and have the same length.
 */
export interface SelectionSnapshot {
  /** The selected text of each selection, untrimmed. Empty string for a bare cursor. */
  readonly texts: readonly string[]
  /** The full text of the line each selection starts on. */
  readonly wholeLines: readonly string[]
  /** The 0-based line each selection starts on, absolute within the file. */
  readonly startLines: readonly number[]
}

/**
 * The variables and functions a user expression can reference.
 *
 * Kept in lockstep with `src/usertypes/rt.d.ts`, which is what users actually see when
 * they hover a name in the advanced editor. `src/usertypes/assert.ts` fails to compile
 * if the two ever disagree.
 */
export interface TransformVars {
  readonly s: string
  readonly n: number
  readonly cn: number
  readonly i: number
  readonly i0: number
  readonly l: number
  readonly ss: readonly string[]
  readonly li: number
  readonly li0: number
  readonly fli: number
  readonly fli0: number
  readonly wl: string
  readonly len: number
  readonly wc: number
  readonly number: typeof number
  readonly letter: typeof letter
  readonly upperletter: typeof upperletter
  readonly lowerletter: typeof lowerletter
  readonly upper: typeof upper
  readonly lower: typeof lower
  readonly convnum: typeof convnumNamespace
}

/**
 * The names bound in a user expression, in a fixed order.
 *
 * Expressions are compiled once into a `Function` whose parameters are these names, so
 * the order has to match the order `buildVars` returns them in. `Object.keys` order is
 * relied on nowhere.
 */
export const VAR_NAMES = [
  's',
  'n',
  'cn',
  'i',
  'i0',
  'l',
  'ss',
  'li',
  'li0',
  'fli',
  'fli0',
  'wl',
  'len',
  'wc',
  'number',
  'letter',
  'upperletter',
  'lowerletter',
  'upper',
  'lower',
  'convnum',
] as const satisfies readonly (keyof TransformVars)[]

/**
 * Reads the selection as a number in whatever numeral system it turns out to be.
 *
 * Where `n` strips everything that is not a digit, this asks convnum what the text
 * actually is — `IV`, `十二`, `0xff`, `Wednesday` — and converts it. Unreadable text
 * gives `NaN`, matching `n`, rather than throwing: one selection the extension cannot
 * make sense of must not take the others down with it.
 */
function anyNumber(text: string): number {
  try {
    return convnumNamespace.anyToNumber(text)
  } catch {
    return Number.NaN
  }
}

/** Counts whitespace-separated words. */
function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

/**
 * The array handed to user code as `ss`: a frozen copy of the selected texts.
 *
 * A copy because the snapshot outlives the transform — the same object is reused for
 * every debounced preview and for the final apply — so `ss.reverse()` in a user
 * expression used to scramble the source data for every later run, making the preview
 * and the apply disagree. Frozen because a mutation is nearly always a mistake, and a
 * `TypeError` on the offending selection says so, where a silently different `ss` for
 * the rest of the batch does not.
 *
 * Call this once per transform, not once per selection: the copy is O(selections), so
 * doing it inside the loop would be quadratic.
 */
export function selectionTexts(snapshot: SelectionSnapshot): readonly string[] {
  return Object.freeze(snapshot.texts.slice())
}

/**
 * Builds the variable bag for one selection. `index` is 0-based, in document order.
 *
 * `texts` is passed in rather than derived because it must be shared by every selection
 * in the batch — see {@link selectionTexts}.
 */
export function buildVars(
  snapshot: SelectionSnapshot,
  index: number,
  texts: readonly string[],
): TransformVars {
  const s = texts[index] ?? ''
  const startLine = snapshot.startLines[index] ?? 0
  const firstLine = snapshot.startLines[0] ?? 0

  return {
    s,
    n: number(s),
    cn: anyNumber(s),
    i: index + 1,
    i0: index,
    l: texts.length,
    ss: texts,
    li: startLine - firstLine + 1,
    li0: startLine - firstLine,
    fli: startLine + 1,
    fli0: startLine,
    wl: snapshot.wholeLines[index] ?? '',
    len: s.length,
    wc: wordCount(s),
    number,
    letter,
    upperletter,
    lowerletter,
    upper,
    lower,
    convnum: convnumNamespace,
  }
}

/** The variable values for one selection, ordered to match {@link VAR_NAMES}. */
export function varValues(vars: TransformVars): unknown[] {
  return VAR_NAMES.map((name) => vars[name])
}
