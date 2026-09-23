/**
 * Which single variable a bare function should be applied to.
 *
 * `'n'` means the function's first parameter is a number, so the auto-call rule feeds
 * it `n`; `'s'` means it takes the selected text, so it gets `s`.
 */
export type ArgKind = 'n' | 's'

/**
 * The registry behind {@link argKindOf}.
 *
 * A `WeakMap` rather than a property on the functions themselves: `convnum`'s exports
 * are shared module state that other code (and other copies of this extension) may see,
 * and an ES module namespace object can be frozen, which would make an assignment throw.
 * Keying off the function identity keeps the tag entirely on our side and lets it be
 * collected with the function.
 */
const kinds = new WeakMap<object, ArgKind>()

/**
 * Tags `fn` and returns it unchanged, so it can wrap a `const` declaration in place
 * instead of forcing a separate registration statement that could drift out of sync.
 */
export function registerArgKind<F extends (...args: never[]) => unknown>(
  fn: F,
  kind: ArgKind,
): F {
  kinds.set(fn, kind)
  return fn
}

/**
 * The tag of `value`, or `undefined` when it is not a function we know about.
 *
 * `undefined` means "do not auto-call". A function the user wrote inline has no tag, so
 * it is left alone and surfaces as `[Function: …]` — visible feedback that they probably
 * meant to call it, rather than a guess about which variable to feed it.
 */
export function argKindOf(value: unknown): ArgKind | undefined {
  if (typeof value !== 'function') {
    return undefined
  }
  return kinds.get(value)
}

/**
 * Names of number-taking convnum functions, by convention.
 *
 * convnum is consistent: `toRoman`, `toEnglishWords`, `toChineseWords`, `formatDayString`
 * … convert *from* a number, and everything else (`fromRoman`, `validateEnglishWords`,
 * `getTypes`, `parseDateString`, `anyToNumber`, `s2t`, `isZh` …) reads a string. The
 * trailing `[A-Z]` keeps `t2s`/`total`-style names out.
 */
const NUMBER_TAKING = /^(?:to|format)[A-Z]/

/**
 * The handful of convnum functions the naming convention gets wrong.
 *
 * `null` means "never auto-call": `toJulianDay` takes a `Date`, which is neither `s` nor
 * `n`, so applying it bare could only ever produce nonsense.
 */
const CONVNUM_OVERRIDES: Readonly<Record<string, ArgKind | null>> = {
  // Reads a Julian day number, so the `from…` convention points the wrong way.
  fromJulianDay: 'n',
  // Takes a `Date`, which is neither `s` nor `n`.
  toJulianDay: null,
  // Declares three parameters but the last two are optional, so the arity rule below
  // would exclude it even though a bare mention is perfectly usable.
  toChineseSolarTerm: 'n',
}

/**
 * Tags convnum's single-argument functions so `convnum.toRoman` works bare.
 *
 * Two rules, both needed:
 *
 * - Only functions with exactly one required parameter are registered. Auto-calling
 *   passes one value, so anything needing a second argument — `convertTo(num, typeInfo)`,
 *   `toBase(num, base)`, `findCommonType(a, b)` — could not work bare and is better left
 *   showing `[Function: …]` than silently throwing.
 * - Among those, the name decides the kind. convnum is consistent: `toRoman`,
 *   `toEnglishWords`, `formatDayString` and friends convert *from* a number, while
 *   `fromRoman`, `validateEnglishWords`, `getTypes`, `parseDateString`, `anyToNumber`,
 *   `s2t` and `isZh` read a string. The trailing `[A-Z]` keeps `t2s`-style names out.
 *
 * Verified against convnum 1.0.0, where the convention is right for 74 of 78 exported
 * functions; the arity rule and {@link CONVNUM_OVERRIDES} cover the rest. Doing this by
 * convention rather than by hand matters because convnum gains converters regularly and
 * a hand-written list would quietly fall behind.
 */
export function registerConvnum(namespace: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(namespace)) {
    if (typeof value !== 'function') {
      continue
    }

    const override = CONVNUM_OVERRIDES[name]
    if (override !== undefined) {
      if (override !== null) {
        kinds.set(value, override)
      }
      continue
    }

    if (value.length !== 1) {
      continue
    }
    kinds.set(value, NUMBER_TAKING.test(name) ? 'n' : 's')
  }
}
