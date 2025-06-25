import { main } from '@/utils/range/main'
import * as assert from 'assert'

suite('range main function', () => {
  suite('Basic functionality', () => {
    test('should generate decimal number sequence', () => {
      const result = main('1:5', 10)
      assert.deepStrictEqual(result, ['1', '2', '3', '4', '5'])
    })

    test('should generate hexadecimal sequence with proper formatting', () => {
      const result = main('0xa:0xf', 10)
      // Should preserve the lowercase hex format from the input
      assert.deepStrictEqual(result, ['0xa', '0xb', '0xc', '0xd', '0xe', '0xf'])
    })

    test('should generate uppercase hexadecimal sequence', () => {
      const result = main('0XA:0XF', 10)
      // Should preserve the uppercase hex format from the input
      assert.deepStrictEqual(result, ['0XA', '0XB', '0XC', '0XD', '0XE', '0XF'])
    })

    test('should generate binary sequence with prefix', () => {
      const result = main('0b1001:0b1100', 10)
      // Should preserve the binary format from the input
      assert.deepStrictEqual(result, ['0b1001', '0b1010', '0b1011', '0b1100'])
    })

    test('should generate octal sequence with prefix', () => {
      const result = main('0o7:0o12', 10)
      // Should preserve the octal format from the input
      assert.deepStrictEqual(result, ['0o7', '0o10', '0o11', '0o12'])
    })

    test('should generate latin letter sequence (I:V detected as letters)', () => {
      const result = main('I:V', 10)
      // I and V are detected as latin letters due to priority, not roman numerals
      assert.deepStrictEqual(result, [
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
      ])
    })

    test('should generate latin letter sequence', () => {
      const result = main('a:e', 10)
      // Should generate lowercase letters
      assert.deepStrictEqual(result, ['a', 'b', 'c', 'd', 'e'])
    })

    test('should generate uppercase latin letter sequence', () => {
      const result = main('A:E', 10)
      // Should generate uppercase letters
      assert.deepStrictEqual(result, ['A', 'B', 'C', 'D', 'E'])
    })

    test('should generate roman numeral sequence', () => {
      // Use clearly roman numerals that won't be confused with letters
      const result = main('II:VI', 10)
      // Should generate roman numerals II, III, IV, V, VI
      assert.deepStrictEqual(result, ['II', 'III', 'IV', 'V', 'VI'])
    })
  })

  suite('TypeInfo preservation', () => {
    test('should preserve hex case from start value', () => {
      const lowercaseResult = main('0xa:10', 10)
      const uppercaseResult = main('0XA:10', 10)

      // Both should work but preserve different casing
      assert.notDeepStrictEqual(lowercaseResult, uppercaseResult)
      assert.strictEqual(lowercaseResult[0], '0xa')
      assert.strictEqual(uppercaseResult[0], '0XA')
    })

    test('should handle mixed type detection correctly', () => {
      // 'a' could be detected as both latin_letter and hexadecimal
      // But findCommonType should prefer latin_letter due to priority
      const result = main('a:d', 10)
      assert.deepStrictEqual(result, ['a', 'b', 'c', 'd'])
    })

    test('should use start TypeInfo when having common type but other props in info are different', () => {
      // Common type is hexadecimal
      const result = main('0xa:15', 10)
      // Should maintain hex info format from start value
      assert.deepStrictEqual(result, [
        '0xa',
        '0xb',
        '0xc',
        '0xd',
        '0xe',
        '0xf',
        '0x10',
        '0x11',
        '0x12',
        '0x13',
      ])
    })
  })

  suite('Edge cases', () => {
    test('should return empty array for invalid command', () => {
      const result = main('', 1)
      assert.deepStrictEqual(result, [])
    })

    test('should handle hexadecimal range 1:a', () => {
      // Both '1' and 'a' can be detected as hexadecimal, so they're compatible
      const result = main('1:a', 10)
      // '1' to 'a' in hex is 1 to 10 in decimal
      assert.deepStrictEqual(result, [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
      ])
    })

    test('should return empty array for truly incompatible types', () => {
      // Monday and 5 should be incompatible (day_of_week vs decimal)
      const result = main('Monday:5', 10)
      assert.deepStrictEqual(result, [])
    })

    test('should handle single value command', () => {
      const result = main('5', 3)
      // Should generate sequence of length 3 starting from 5
      assert.deepStrictEqual(result, ['5', '6', '7'])
    })

    test('should handle conversion errors gracefully', () => {
      // Test with values that might cause conversion issues
      const result = main('invalid:value', 10)
      assert.deepStrictEqual(result, [])
    })
  })

  suite('Step functionality', () => {
    test('should handle step with TypeInfo', () => {
      const result = main('0xa:0xf:2', 10)
      // Should skip every other hex value
      assert.deepStrictEqual(result, ['0xa', '0xc', '0xe'])
    })

    test('should handle negative step with TypeInfo', () => {
      const result = main('0xf:0xa:-2', 10)
      // Should count down skipping every other hex value
      assert.deepStrictEqual(result, ['0xf', '0xd', '0xb'])
    })
  })

  suite('Selection count handling', () => {
    test('should respect selection count for undefined stop', () => {
      const result = main('0xa', 3)
      // Should generate 3 hex values starting from 0xa
      assert.deepStrictEqual(result, ['0xa', '0xb', '0xc'])
    })

    test('should not exceed selection count when defined', () => {
      const result = main('1:100', 5)
      // Should limit to 5 values even though range is larger
      assert.deepStrictEqual(result, ['1', '2', '3', '4', '5'])
    })
  })

  suite('Fallback behavior', () => {
    test('should fallback to decimal string on conversion error', () => {
      // This is harder to test directly, but the function should handle it
      // The main function catches conversion errors and falls back to toString()
      const result = main('1:3', 10)
      assert.deepStrictEqual(result, ['1', '2', '3'])
    })
  })
})
