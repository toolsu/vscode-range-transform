import { describe, expect, it } from 'bun:test'
import { argKindOf } from '../../transform/argKind'
import {
  letter,
  lower,
  lowerletter,
  number,
  upper,
  upperletter,
} from '../../transform/helpers'

describe('number', () => {
  it('extracts numbers from simple strings', () => {
    expect(number('123')).toBe(123)
    expect(number('456.789')).toBe(456.789)
    expect(number('-42')).toBe(-42)
    expect(number('-3.14')).toBe(-3.14)
  })

  it('extracts numbers from strings with non-numeric characters', () => {
    expect(number('abc123def')).toBe(123)
    expect(number('price: $19.99')).toBe(19.99)
    expect(number('temp: -5°C')).toBe(-5)
    expect(number('weight: 2.5kg')).toBe(2.5)
  })

  it('gives NaN when the leftovers are not a single number', () => {
    expect(number('12.34.56')).toBeNaN()
    expect(number('1-2-3')).toBeNaN()
    expect(number('10 + 20')).toBe(1020)
  })

  it('returns NaN for non-numeric strings', () => {
    expect(number('hello')).toBeNaN()
    expect(number('abc')).toBeNaN()
    expect(number('')).toBeNaN()
    expect(number('   ')).toBeNaN()
  })

  it('handles zero and redundant digits', () => {
    expect(number('0')).toBe(0)
    expect(number('-0')).toBe(-0)
    expect(number('000123')).toBe(123)
    expect(number('123.000')).toBe(123)
  })

  it('handles decimal edge cases', () => {
    expect(number('.5')).toBe(0.5)
    expect(number('-.25')).toBe(-0.25)
    expect(number('123.')).toBe(123)
  })

  it('coerces a non-string argument instead of throwing', () => {
    expect(number(42 as unknown as string)).toBe(42)
    expect(number(null as unknown as string)).toBeNaN()
    expect(number(undefined as unknown as string)).toBeNaN()
  })
})

describe('letter', () => {
  it('converts numbers to uppercase letters', () => {
    expect(letter(1)).toBe('A')
    expect(letter(2)).toBe('B')
    expect(letter(3)).toBe('C')
    expect(letter(26)).toBe('Z')
  })

  it('returns an empty string for out-of-range numbers', () => {
    expect(letter(0)).toBe('')
    expect(letter(-1)).toBe('')
    expect(letter(27)).toBe('')
    expect(letter(100)).toBe('')
  })

  it('truncates non-integers and rejects non-finite input', () => {
    expect(letter(1.5)).toBe('A')
    expect(letter(NaN)).toBe('')
    expect(letter(Infinity)).toBe('')
    expect(letter(-Infinity)).toBe('')
  })

  it('coerces a non-number argument instead of throwing', () => {
    expect(letter('3' as unknown as number)).toBe('C')
    expect(letter('abc' as unknown as number)).toBe('')
    expect(letter(undefined as unknown as number)).toBe('')
  })
})

describe('upperletter', () => {
  it('is an alias for letter', () => {
    expect(upperletter(1)).toBe(letter(1))
    expect(upperletter(5)).toBe(letter(5))
    expect(upperletter(26)).toBe(letter(26))
    expect(upperletter(0)).toBe(letter(0))
    expect(upperletter(27)).toBe(letter(27))
  })

  it('converts numbers to uppercase letters', () => {
    expect(upperletter(1)).toBe('A')
    expect(upperletter(8)).toBe('H')
    expect(upperletter(26)).toBe('Z')
  })
})

describe('lowerletter', () => {
  it('converts numbers to lowercase letters', () => {
    expect(lowerletter(1)).toBe('a')
    expect(lowerletter(2)).toBe('b')
    expect(lowerletter(3)).toBe('c')
    expect(lowerletter(26)).toBe('z')
  })

  it('returns an empty string for out-of-range numbers', () => {
    expect(lowerletter(0)).toBe('')
    expect(lowerletter(-1)).toBe('')
    expect(lowerletter(27)).toBe('')
    expect(lowerletter(100)).toBe('')
  })

  it('truncates non-integers and rejects non-finite input', () => {
    expect(lowerletter(1.5)).toBe('a')
    expect(lowerletter(NaN)).toBe('')
    expect(lowerletter(Infinity)).toBe('')
    expect(lowerletter(-Infinity)).toBe('')
  })
})

describe('upper', () => {
  it('converts strings to uppercase', () => {
    expect(upper('hello')).toBe('HELLO')
    expect(upper('world')).toBe('WORLD')
    expect(upper('Hello World')).toBe('HELLO WORLD')
  })

  it('leaves already uppercase strings alone', () => {
    expect(upper('HELLO')).toBe('HELLO')
    expect(upper('WORLD')).toBe('WORLD')
  })

  it('handles mixed case strings', () => {
    expect(upper('HeLLo')).toBe('HELLO')
    expect(upper('WoRlD')).toBe('WORLD')
  })

  it('handles empty, blank and non-alphabetic input', () => {
    expect(upper('')).toBe('')
    expect(upper('   ')).toBe('   ')
    expect(upper('123')).toBe('123')
    expect(upper('!@#$%')).toBe('!@#$%')
  })

  it('handles unicode characters', () => {
    expect(upper('café')).toBe('CAFÉ')
    expect(upper('naïve')).toBe('NAÏVE')
    expect(upper('résumé')).toBe('RÉSUMÉ')
  })

  it('coerces a non-string argument instead of throwing', () => {
    expect(upper(12 as unknown as string)).toBe('12')
    expect(upper(null as unknown as string)).toBe('NULL')
  })
})

describe('lower', () => {
  it('converts strings to lowercase', () => {
    expect(lower('HELLO')).toBe('hello')
    expect(lower('WORLD')).toBe('world')
    expect(lower('HELLO WORLD')).toBe('hello world')
  })

  it('leaves already lowercase strings alone', () => {
    expect(lower('hello')).toBe('hello')
    expect(lower('world')).toBe('world')
  })

  it('handles mixed case strings', () => {
    expect(lower('HeLLo')).toBe('hello')
    expect(lower('WoRlD')).toBe('world')
  })

  it('handles empty, blank and non-alphabetic input', () => {
    expect(lower('')).toBe('')
    expect(lower('   ')).toBe('   ')
    expect(lower('123')).toBe('123')
    expect(lower('!@#$%')).toBe('!@#$%')
  })

  it('handles unicode characters', () => {
    expect(lower('CAFÉ')).toBe('café')
    expect(lower('NAÏVE')).toBe('naïve')
    expect(lower('RÉSUMÉ')).toBe('résumé')
  })

  it('coerces a non-string argument instead of throwing', () => {
    expect(lower(12 as unknown as string)).toBe('12')
    expect(lower(true as unknown as string)).toBe('true')
  })
})

describe('arg kind tags', () => {
  it('tags the number-taking helpers with n', () => {
    expect(argKindOf(letter)).toBe('n')
    expect(argKindOf(upperletter)).toBe('n')
    expect(argKindOf(lowerletter)).toBe('n')
  })

  it('tags the string-taking helpers with s', () => {
    expect(argKindOf(number)).toBe('s')
    expect(argKindOf(upper)).toBe('s')
    expect(argKindOf(lower)).toBe('s')
  })
})

describe('helpers used together', () => {
  it('composes in the common scenarios', () => {
    expect(letter(number('item5'))).toBe('E')
    expect(upper('hello world')).toBe('HELLO WORLD')
    expect(upper(letter(number('3')))).toBe('C')
  })

  it('degrades to an empty result rather than throwing', () => {
    expect(number('')).toBeNaN()
    expect(letter(0)).toBe('')
    expect(upper('')).toBe('')
    expect(lower('')).toBe('')
  })
})
