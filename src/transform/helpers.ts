import { registerArgKind } from './argKind'

/**
 * The helpers a user expression can call, tagged with the variable the auto-call rule
 * should feed them when they are written bare (`upper` instead of `upper(s)`).
 *
 * Every one of them coerces its argument. A user expression is free to hand these
 * anything — `upper(n)`, `letter(s)` — and the auto-call rule itself passes `s` to any
 * function it cannot classify, so throwing a `TypeError` on a wrong-typed argument would
 * turn a harmless typo into a failed selection. The user-facing documentation for these
 * lives in `src/usertypes/rt.d.ts`, which is what hover shows.
 */

/**
 * Reads the number out of arbitrary text: `'price: $19.99'` gives `19.99`.
 *
 * Strips every character that cannot appear in a JS number literal instead of matching
 * the first number, so `'temp: -5°C'` keeps its sign. Ambiguous leftovers such as
 * `'1-2-3'` are `NaN` rather than a guess.
 */
export const number = registerArgKind((text: string): number => {
  const digits = String(text).replace(/[^0-9.-]/g, '')
  return digits ? Number(digits) : NaN
}, 's')

/**
 * `1` -> `'A'` … `26` -> `'Z'`; anything else is `''`.
 *
 * Out-of-range input gives an empty string rather than an error so that a transform over
 * a long selection list degrades gracefully instead of failing wholesale at item 27.
 */
export const letter = registerArgKind((num: number): string => {
  const value = Number(num)
  if (!Number.isFinite(value) || value < 1 || value > 26) {
    return ''
  }
  return String.fromCharCode(64 + value)
}, 'n')

/** Alias of {@link letter}, for symmetry with {@link lowerletter} at the call site. */
export const upperletter = registerArgKind((num: number): string => {
  return letter(num)
}, 'n')

/** `1` -> `'a'` … `26` -> `'z'`; anything else is `''`. See {@link letter}. */
export const lowerletter = registerArgKind((num: number): string => {
  const value = Number(num)
  if (!Number.isFinite(value) || value < 1 || value > 26) {
    return ''
  }
  return String.fromCharCode(96 + value)
}, 'n')

/** Uppercases the text, locale-independently (`toUpperCase`, not `toLocaleUpperCase`). */
export const upper = registerArgKind((text: string): string => {
  return String(text).toUpperCase()
}, 's')

/** Lowercases the text, locale-independently (`toLowerCase`, not `toLocaleLowerCase`). */
export const lower = registerArgKind((text: string): string => {
  return String(text).toLowerCase()
}, 's')
