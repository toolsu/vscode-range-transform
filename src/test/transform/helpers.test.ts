import * as assert from 'assert'
import {
  number,
  letter,
  upperletter,
  lowerletter,
  upper,
  lower,
} from '@/transform/helpers'

suite('Transform Helpers Tests', () => {
  suite('number() function', () => {
    test('should extract numbers from simple strings', () => {
      assert.strictEqual(number('123'), 123)
      assert.strictEqual(number('456.789'), 456.789)
      assert.strictEqual(number('-42'), -42)
      assert.strictEqual(number('-3.14'), -3.14)
    })

    test('should extract numbers from strings with non-numeric characters', () => {
      assert.strictEqual(number('abc123def'), 123)
      assert.strictEqual(number('price: $19.99'), 19.99)
      assert.strictEqual(number('temp: -5°C'), -5)
      assert.strictEqual(number('weight: 2.5kg'), 2.5)
    })

    test('should handle multiple numbers by taking first', () => {
      assert.ok(Number.isNaN(number('12.34.56')))
      assert.ok(Number.isNaN(number('1-2-3')))
      assert.strictEqual(number('10 + 20'), 1020)
    })

    test('should return NaN for non-numeric strings', () => {
      assert.ok(Number.isNaN(number('hello')))
      assert.ok(Number.isNaN(number('abc')))
      assert.ok(Number.isNaN(number('')))
      assert.ok(Number.isNaN(number('   ')))
    })

    test('should handle edge cases', () => {
      assert.strictEqual(number('0'), 0)
      assert.strictEqual(number('-0'), -0)
      assert.strictEqual(number('000123'), 123)
      assert.strictEqual(number('123.000'), 123)
    })

    test('should handle decimal edge cases', () => {
      assert.strictEqual(number('.5'), 0.5)
      assert.strictEqual(number('-.25'), -0.25)
      assert.strictEqual(number('123.'), 123)
    })
  })

  suite('letter() function', () => {
    test('should convert numbers to uppercase letters', () => {
      assert.strictEqual(letter(1), 'A')
      assert.strictEqual(letter(2), 'B')
      assert.strictEqual(letter(3), 'C')
      assert.strictEqual(letter(26), 'Z')
    })

    test('should return empty string for out-of-range numbers', () => {
      assert.strictEqual(letter(0), '')
      assert.strictEqual(letter(-1), '')
      assert.strictEqual(letter(27), '')
      assert.strictEqual(letter(100), '')
    })

    test('should handle edge cases', () => {
      assert.strictEqual(letter(1.5), 'A') // Non-integer
      assert.strictEqual(letter(NaN), '\x00')
      assert.strictEqual(letter(Infinity), '')
      assert.strictEqual(letter(-Infinity), '')
    })
  })

  suite('upperletter() function', () => {
    test('should be an alias for letter()', () => {
      assert.strictEqual(upperletter(1), letter(1))
      assert.strictEqual(upperletter(5), letter(5))
      assert.strictEqual(upperletter(26), letter(26))
      assert.strictEqual(upperletter(0), letter(0))
      assert.strictEqual(upperletter(27), letter(27))
    })

    test('should convert numbers to uppercase letters', () => {
      assert.strictEqual(upperletter(1), 'A')
      assert.strictEqual(upperletter(8), 'H')
      assert.strictEqual(upperletter(26), 'Z')
    })
  })

  suite('lowerletter() function', () => {
    test('should convert numbers to lowercase letters', () => {
      assert.strictEqual(lowerletter(1), 'a')
      assert.strictEqual(lowerletter(2), 'b')
      assert.strictEqual(lowerletter(3), 'c')
      assert.strictEqual(lowerletter(26), 'z')
    })

    test('should return empty string for out-of-range numbers', () => {
      assert.strictEqual(lowerletter(0), '')
      assert.strictEqual(lowerletter(-1), '')
      assert.strictEqual(lowerletter(27), '')
      assert.strictEqual(lowerletter(100), '')
    })

    test('should handle edge cases', () => {
      assert.strictEqual(lowerletter(1.5), 'a') // Non-integer
      assert.strictEqual(lowerletter(NaN), '\x00')
      assert.strictEqual(lowerletter(Infinity), '')
      assert.strictEqual(lowerletter(-Infinity), '')
    })
  })

  suite('upper() function', () => {
    test('should convert strings to uppercase', () => {
      assert.strictEqual(upper('hello'), 'HELLO')
      assert.strictEqual(upper('world'), 'WORLD')
      assert.strictEqual(upper('Hello World'), 'HELLO WORLD')
    })

    test('should handle already uppercase strings', () => {
      assert.strictEqual(upper('HELLO'), 'HELLO')
      assert.strictEqual(upper('WORLD'), 'WORLD')
    })

    test('should handle mixed case strings', () => {
      assert.strictEqual(upper('HeLLo'), 'HELLO')
      assert.strictEqual(upper('WoRlD'), 'WORLD')
    })

    test('should handle edge cases', () => {
      assert.strictEqual(upper(''), '')
      assert.strictEqual(upper('   '), '   ')
      assert.strictEqual(upper('123'), '123')
      assert.strictEqual(upper('!@#$%'), '!@#$%')
    })

    test('should handle unicode characters', () => {
      assert.strictEqual(upper('café'), 'CAFÉ')
      assert.strictEqual(upper('naïve'), 'NAÏVE')
      assert.strictEqual(upper('résumé'), 'RÉSUMÉ')
    })
  })

  suite('lower() function', () => {
    test('should convert strings to lowercase', () => {
      assert.strictEqual(lower('HELLO'), 'hello')
      assert.strictEqual(lower('WORLD'), 'world')
      assert.strictEqual(lower('HELLO WORLD'), 'hello world')
    })

    test('should handle already lowercase strings', () => {
      assert.strictEqual(lower('hello'), 'hello')
      assert.strictEqual(lower('world'), 'world')
    })

    test('should handle mixed case strings', () => {
      assert.strictEqual(lower('HeLLo'), 'hello')
      assert.strictEqual(lower('WoRlD'), 'world')
    })

    test('should handle edge cases', () => {
      assert.strictEqual(lower(''), '')
      assert.strictEqual(lower('   '), '   ')
      assert.strictEqual(lower('123'), '123')
      assert.strictEqual(lower('!@#$%'), '!@#$%')
    })

    test('should handle unicode characters', () => {
      assert.strictEqual(lower('CAFÉ'), 'café')
      assert.strictEqual(lower('NAÏVE'), 'naïve')
      assert.strictEqual(lower('RÉSUMÉ'), 'résumé')
    })
  })

  suite('Integration tests', () => {
    test('should work together in common scenarios', () => {
      // Convert number from string, then to letter
      const numberFromString = number('item5')
      const letterResult = letter(numberFromString)
      assert.strictEqual(letterResult, 'E')

      // Convert string to uppercase
      const upperResult = upper('hello world')
      assert.strictEqual(upperResult, 'HELLO WORLD')

      // Chain operations
      const chainResult = upper(letter(number('3')))
      assert.strictEqual(chainResult, 'C')
    })

    test('should handle null-like inputs gracefully', () => {
      assert.ok(Number.isNaN(number('')))
      assert.strictEqual(letter(0), '')
      assert.strictEqual(upper(''), '')
      assert.strictEqual(lower(''), '')
    })
  })
})
