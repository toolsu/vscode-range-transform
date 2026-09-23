import { describe, expect, it } from 'bun:test'
import * as convnum from 'convnum'
import {
  argKindOf,
  registerArgKind,
  registerConvnum,
} from '../../transform/argKind'

describe('registerArgKind', () => {
  it('returns the very same function, so it can wrap a declaration', () => {
    const fn = (text: string): string => text
    expect(registerArgKind(fn, 's')).toBe(fn)
  })

  it('records the kind without touching the function object', () => {
    const fn = (num: number): number => num
    registerArgKind(fn, 'n')
    expect(argKindOf(fn)).toBe('n')
    expect(Object.keys(fn)).toEqual([])
    expect(Object.getOwnPropertySymbols(fn)).toEqual([])
  })

  it('lets a later registration win', () => {
    const fn = (value: string): string => value
    registerArgKind(fn, 'n')
    registerArgKind(fn, 's')
    expect(argKindOf(fn)).toBe('s')
  })

  it('works on a frozen function', () => {
    const fn = Object.freeze((text: string): string => text)
    expect(() => registerArgKind(fn, 's')).not.toThrow()
    expect(argKindOf(fn)).toBe('s')
  })
})

describe('argKindOf', () => {
  it('is undefined for an unregistered function', () => {
    expect(argKindOf(() => 1)).toBeUndefined()
  })

  it('is undefined for non-functions', () => {
    expect(argKindOf(undefined)).toBeUndefined()
    expect(argKindOf(null)).toBeUndefined()
    expect(argKindOf('upper')).toBeUndefined()
    expect(argKindOf(42)).toBeUndefined()
    expect(argKindOf({})).toBeUndefined()
    expect(argKindOf([])).toBeUndefined()
  })
})

describe('registerConvnum', () => {
  it('classifies by name, not by position in the namespace', () => {
    const toFoo = (num: number): string => String(num)
    const formatBar = (num: number): string => String(num)
    const fromFoo = (text: string): number => text.length
    const total = (text: string): number => text.length
    const t2s = (text: string): string => text
    registerConvnum({ toFoo, formatBar, fromFoo, total, t2s, VERSION: '1.0.0' })

    expect(argKindOf(toFoo)).toBe('n')
    expect(argKindOf(formatBar)).toBe('n')
    expect(argKindOf(fromFoo)).toBe('s')
    // `to`/`format` must be followed by an uppercase letter, or `total` would be a
    // number-taking function.
    expect(argKindOf(total)).toBe('s')
    expect(argKindOf(t2s)).toBe('s')
  })

  it('ignores non-function members', () => {
    expect(() =>
      registerConvnum({ MONTH_NAMES: {}, version: '1.0.0', nothing: null }),
    ).not.toThrow()
  })

  it('tags the number-taking convnum converters with n', () => {
    registerConvnum(convnum)
    expect(argKindOf(convnum.toRoman)).toBe('n')
    expect(argKindOf(convnum.toEnglishWords)).toBe('n')
    expect(argKindOf(convnum.toChineseWords)).toBe('n')
    expect(argKindOf(convnum.toLatinLetter)).toBe('n')
    expect(argKindOf(convnum.toHex)).toBe('n')
    expect(argKindOf(convnum.toMonth)).toBe('n')
    expect(argKindOf(convnum.toDayOfWeek)).toBe('n')
  })

  it('tags the string-taking convnum readers with s', () => {
    registerConvnum(convnum)
    expect(argKindOf(convnum.fromRoman)).toBe('s')
    expect(argKindOf(convnum.fromEnglishWords)).toBe('s')
    expect(argKindOf(convnum.validateEnglishWords)).toBe('s')
    expect(argKindOf(convnum.getTypes)).toBe('s')
    expect(argKindOf(convnum.parseDateString)).toBe('s')
    expect(argKindOf(convnum.anyToNumber)).toBe('s')
    expect(argKindOf(convnum.s2t)).toBe('s')
    expect(argKindOf(convnum.t2s)).toBe('s')
  })

  it('leaves functions that need a second argument untagged', () => {
    // Auto-calling passes exactly one value, so tagging these could only produce a
    // confusing runtime error. Untagged means the expression's value stays a function
    // and the user sees `[Function: …]`, which reads as "you forgot to call this".
    registerConvnum(convnum)
    expect(argKindOf(convnum.toBase)).toBeUndefined()
    expect(argKindOf(convnum.fromBase)).toBeUndefined()
    expect(argKindOf(convnum.toBasicRange)).toBeUndefined()
    expect(argKindOf(convnum.formatDayString)).toBeUndefined()
    expect(argKindOf(convnum.formatDateString)).toBeUndefined()
    expect(argKindOf(convnum.formatMonthString)).toBeUndefined()
    expect(argKindOf(convnum.convertFrom)).toBeUndefined()
    expect(argKindOf(convnum.convertTo)).toBeUndefined()
    expect(argKindOf(convnum.hasType)).toBeUndefined()
    expect(argKindOf(convnum.isZh)).toBeUndefined()
    expect(argKindOf(convnum.findCommonType)).toBeUndefined()
  })

  it('applies the overrides the naming convention gets wrong', () => {
    registerConvnum(convnum)
    // Reads a Julian day *number*, so `from…` points the wrong way.
    expect(argKindOf(convnum.fromJulianDay)).toBe('n')
    // Takes a Date, which is neither `s` nor `n`.
    expect(argKindOf(convnum.toJulianDay)).toBeUndefined()
    // Three declared parameters, two of them optional — usable bare despite its arity.
    expect(argKindOf(convnum.toChineseSolarTerm)).toBe('n')
  })

  it('tags every convnum function that can be applied to one value', () => {
    registerConvnum(convnum)

    const untagged = Object.entries(convnum)
      .filter(
        ([, value]) =>
          typeof value === 'function' && argKindOf(value) === undefined,
      )
      .map(([name]) => name)
      .sort()

    // Every one of these genuinely needs more than the single value auto-calling can
    // supply — a target base, a format string, a TypeInfo, a second operand — or a Date.
    expect(untagged).toEqual([
      'compareDateFormatOrder',
      'compareNumTypeOrder',
      'convertFrom',
      'convertTo',
      'findCommonDateFormat',
      'findCommonType',
      'formatDateString',
      'formatDayString',
      'formatMonthString',
      'fromBase',
      'hasType',
      'isZh',
      'matchLocalisedName',
      'toBase',
      'toBasicRange',
      'toJulianDay',
    ])
  })
})
