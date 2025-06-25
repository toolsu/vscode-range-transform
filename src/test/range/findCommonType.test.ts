import { findCommonType } from '@/utils/range/findCommonType'
import * as assert from 'assert'
import type { NumType } from 'convnum'

suite('findCommonType function', () => {
  suite('Basic functionality', () => {
    test('should return highest priority common type', () => {
      const startTypes: NumType[] = ['binary', 'decimal', 'roman']
      const stopTypes: NumType[] = ['decimal', 'roman', 'octal']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'decimal',
        'Should return decimal as highest priority',
      )
    })

    test('should return single common type', () => {
      const startTypes: NumType[] = ['roman']
      const stopTypes: NumType[] = ['roman']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'roman')
    })

    test('should return null when no common types exist', () => {
      const startTypes: NumType[] = ['roman']
      const stopTypes: NumType[] = ['binary']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, null)
    })
  })

  suite('Priority ordering', () => {
    test('should prefer decimal over other types', () => {
      const startTypes: NumType[] = ['roman', 'decimal', 'binary']
      const stopTypes: NumType[] = ['binary', 'decimal', 'octal']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'decimal')
    })

    test('should prefer roman over binary when decimal not available', () => {
      const startTypes: NumType[] = ['roman', 'binary']
      const stopTypes: NumType[] = ['binary', 'roman']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'roman')
    })

    test('should follow TYPE_PRIORITY order strictly', () => {
      const startTypes: NumType[] = [
        'cyrillic_letter',
        'greek_letter',
        'latin_letter',
      ]
      const stopTypes: NumType[] = [
        'latin_letter',
        'greek_letter',
        'cyrillic_letter',
      ]
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'latin_letter',
        'Should return latin_letter as it has higher priority',
      )
    })
  })

  suite('Edge cases', () => {
    test('should use startTypes when stopTypes is empty array', () => {
      const startTypes: NumType[] = ['roman', 'decimal']
      const stopTypes: NumType[] = []
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'decimal',
        'Should return highest priority from startTypes when stopTypes is empty',
      )
    })

    test('should use startTypes when stopTypes is empty array (a-f)', () => {
      const startTypes: NumType[] = ['hexadecimal', 'latin_letter']
      const stopTypes: NumType[] = []
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'latin_letter',
        'Should return highest priority from startTypes when stopTypes is empty',
      )
    })

    test('should return null when startTypes is empty array', () => {
      const startTypes: NumType[] = []
      const stopTypes: NumType[] = ['decimal', 'roman']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, null, 'Empty startTypes should result in null')
    })

    test('should return null when both arrays are empty', () => {
      const startTypes: NumType[] = []
      const stopTypes: NumType[] = []
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        null,
        'Both empty arrays should result in null',
      )
    })

    test('should handle single element arrays', () => {
      const startTypes: NumType[] = ['decimal']
      const stopTypes: NumType[] = ['decimal']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'decimal')
    })

    test('should handle large arrays with many common types', () => {
      const startTypes: NumType[] = [
        'decimal',
        'binary',
        'octal',
        'hexadecimal',
        'roman',
      ]
      const stopTypes: NumType[] = [
        'roman',
        'hexadecimal',
        'octal',
        'binary',
        'decimal',
      ]
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'decimal',
        'Should still return highest priority type',
      )
    })
  })

  suite('Type combinations', () => {
    test('should handle numeric types correctly', () => {
      const startTypes: NumType[] = ['binary', 'octal', 'hexadecimal']
      const stopTypes: NumType[] = ['hexadecimal', 'decimal']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'hexadecimal')
    })

    test('should handle letter types correctly', () => {
      const startTypes: NumType[] = ['latin_letter', 'greek_letter']
      const stopTypes: NumType[] = ['greek_letter', 'cyrillic_letter']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'greek_letter')
    })

    test('should handle word types correctly', () => {
      const startTypes: NumType[] = ['english_words', 'french_words']
      const stopTypes: NumType[] = ['french_words', 'chinese_words']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'french_words')
    })

    test('should handle date/time types correctly', () => {
      const startTypes: NumType[] = ['month_name', 'day_of_week']
      const stopTypes: NumType[] = ['day_of_week', 'astrological_sign']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'day_of_week')
    })
  })

  suite('Real-world scenarios', () => {
    test('should handle "1" and "5" (both detected as decimal)', () => {
      const startTypes: NumType[] = ['decimal']
      const stopTypes: NumType[] = ['decimal']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'decimal')
    })

    test('should handle "a" and "z" (both detected as latin_letter)', () => {
      const startTypes: NumType[] = ['latin_letter']
      const stopTypes: NumType[] = ['latin_letter']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(result, 'latin_letter')
    })

    test('should handle "I" and "V" (both detected as latin_letter)', () => {
      const startTypes: NumType[] = ['roman', 'latin_letter']
      const stopTypes: NumType[] = ['roman', 'latin_letter']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'latin_letter',
        'Should prefer latin_letter over roman for single letter Roman numerals',
      )
    })

    test('should handle incompatible types like "1" and "a"', () => {
      const startTypes: NumType[] = ['decimal']
      const stopTypes: NumType[] = ['latin_letter']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        null,
        'Decimal and latin_letter should have no common types',
      )
    })

    test('should handle ambiguous values with multiple type matches', () => {
      // Example: "C" could be hexadecimal, roman numeral, or latin letter
      const startTypes: NumType[] = ['hexadecimal', 'roman', 'latin_letter']
      const stopTypes: NumType[] = ['roman', 'latin_letter']
      const result = findCommonType(startTypes, stopTypes)
      assert.strictEqual(
        result,
        'latin_letter',
        'Should prefer latin_letter over roman',
      )
    })
  })
})
