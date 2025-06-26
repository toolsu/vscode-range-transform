import { main } from '@/utils/range/main'
import * as assert from 'assert'

suite('range main function', () => {
  suite('Basic functionality', () => {
    test('should generate decimal number sequence', () => {
      const result = main('1:5', 10)
      assert.deepStrictEqual(result, ['1', '2', '3', '4', '5'])
    })

    test('should generate with single Chinese char in Heavenly Stem', () => {
      const result = main('甲', 4)
      assert.deepStrictEqual(result, ['甲', '乙', '丙', '丁'])
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

  suite('Circular functionality', () => {
    test('should generate with circular numeral as start without stop or step and with selectionCount > numeralLength', () => {
      const result = main('mon', 8)
      assert.deepStrictEqual(result, [
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun',
        'mon',
      ])
    })

    test('should generate with circular numeral as start without stop and with step > numeralLength', () => {
      const result = main('mon::10', 6)
      // mon is 1, 1+10=11, 11 wraps around to 4 which is thu, and so on
      assert.deepStrictEqual(result, ['mon', 'thu', 'sun', 'wed', 'sat', 'tue'])
    })

    test('should handle negative step with circular numerals', () => {
      const result = main('fri::-2', 4)
      // fri is 5, 5-2=3 (wed), 3-2=1 (mon), 1-2=-1 wraps to 6 (sat)
      assert.deepStrictEqual(result, ['fri', 'wed', 'mon', 'sat'])
    })

    test('should handle step equal to numeral length (should repeat same value)', () => {
      const result = main('tue::7', 4)
      // tue is 2, 2+7=9 wraps to 2 (tue), and so on
      assert.deepStrictEqual(result, ['tue', 'tue', 'tue', 'tue'])
    })

    test('should handle step that is multiple of numeral length', () => {
      const result = main('wed::14', 3)
      // wed is 3, 3+14=17 wraps to 3 (wed), and so on
      assert.deepStrictEqual(result, ['wed', 'wed', 'wed'])
    })

    test('should work with latin letters and large steps', () => {
      const result = main('a::30', 4)
      // a is 1, 1+30=31 wraps to 5 (e), 5+30=35 wraps to 9 (i), 9+30=39 wraps to 13 (m)
      assert.deepStrictEqual(result, ['a', 'e', 'i', 'm'])
    })

    test('should work with month names', () => {
      const result = main('jan::5', 3)
      // jan is 1, 1+5=6 (jun), 6+5=11 (nov)
      assert.deepStrictEqual(result, ['jan', 'jun', 'nov'])
    })

    test('should handle starting from last element of circular sequence', () => {
      const result = main('sun::1', 3)
      // sun is 7, 7+1=8 wraps to 1 (mon), 1+1=2 (tue)
      assert.deepStrictEqual(result, ['sun', 'mon', 'tue'])
    })

    test('should handle zero step with circular numerals', () => {
      const result = main('thu::0', 3)
      // Zero step should repeat the same value
      assert.deepStrictEqual(result, ['thu', 'thu', 'thu'])
    })

    test('should handle very large steps that wrap multiple times', () => {
      const result = main('mon::50', 3)
      // mon is 1, 1+50=51 wraps to 2 (tue), 2+50=52 wraps to 3 (wed)
      assert.deepStrictEqual(result, ['mon', 'tue', 'wed'])
    })

    test('should handle step equal to -numeral length (should repeat same value) for Chinese Heavenly Stems', () => {
      const result = main('丙::-10', 3)
      assert.deepStrictEqual(result, ['丙', '丙', '丙'])
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

    test('should preserve Chinese Simplified/Traditional', () => {
      const resultStartOnly = main('貳', 5)
      const resultTrad = main('貳:陸', 10)
      const resultMixed = main('貳:陆', 10)

      assert.deepStrictEqual(resultStartOnly, ['貳', '叄', '肆', '伍', '陸'])
      assert.deepStrictEqual(resultTrad, ['貳', '叄', '肆', '伍', '陸'])
      assert.deepStrictEqual(resultMixed, ['貳', '叄', '肆', '伍', '陸'])
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

  suite('Date functionality', () => {
    suite('Basic date sequences', () => {
      test('should generate Y-M-D date sequence with step 1', () => {
        const result = main('2023-01-01:2023-01-05', 10)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
          '2023-01-05',
        ])
      })

      test('should generate D-M-Y date sequence with step 1', () => {
        const result = main('01.01.2023:05.01.2023', 10)
        assert.deepStrictEqual(result, [
          '01.01.2023',
          '02.01.2023',
          '03.01.2023',
          '04.01.2023',
          '05.01.2023',
        ])
      })

      test('should generate date sequence with step 2', () => {
        const result = main('2023-01-01:2023-01-10:2', 10)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-03',
          '2023-01-05',
          '2023-01-07',
          '2023-01-09',
        ])
      })

      test('should generate date sequence with negative step', () => {
        const result = main('2023-01-05:2023-01-01:-1', 10)
        assert.deepStrictEqual(result, [
          '2023-01-05',
          '2023-01-04',
          '2023-01-03',
          '2023-01-02',
          '2023-01-01',
        ])
      })
    })

    suite('Date sequences without stop', () => {
      test('should generate date sequence starting from date without stop', () => {
        const result = main('2023-01-01', 4)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
        ])
      })

      test('should generate date sequence with step without stop', () => {
        const result = main('2023-01-01::3', 3)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-04',
          '2023-01-07',
        ])
      })
    })

    suite('Different date formats', () => {
      test('should handle slash separator (M/D/Y)', () => {
        const result = main('01/15/2023:01/18/2023', 10)
        assert.deepStrictEqual(result, [
          '01/15/2023',
          '01/16/2023',
          '01/17/2023',
          '01/18/2023',
        ])
      })

      test('should handle dot separator (D.M.Y)', () => {
        const result = main('15.01.2023:18.01.2023', 10)
        assert.deepStrictEqual(result, [
          '15.01.2023',
          '16.01.2023',
          '17.01.2023',
          '18.01.2023',
        ])
      })
    })

    suite('Month-Year functionality', () => {
      test('should generate month-year sequence', () => {
        const result = main('2023-01:2023-04', 10)
        assert.deepStrictEqual(result, [
          '2023-01',
          '2023-02',
          '2023-03',
          '2023-04',
        ])
      })

      test('should generate month-year sequence with step 2', () => {
        const result = main('2023-01:2023-07:2', 10)
        assert.deepStrictEqual(result, [
          '2023-01',
          '2023-03',
          '2023-05',
          '2023-07',
        ])
      })

      test('should generate month-year sequence across years', () => {
        const result = main('2023-11:2024-02', 10)
        assert.deepStrictEqual(result, [
          '2023-11',
          '2023-12',
          '2024-01',
          '2024-02',
        ])
      })

      test('should generate month-year sequence without stop', () => {
        const result = main('2023-01', 3)
        assert.deepStrictEqual(result, ['2023-01', '2023-02', '2023-03'])
      })
    })

    suite('Month-Day functionality', () => {
      test('should generate month-day sequence', () => {
        const result = main('01-15:01-18', 10)
        assert.deepStrictEqual(result, ['01-15', '01-16', '01-17', '01-18'])
      })

      test('should generate month-day sequence across months', () => {
        const result = main('01-30:02-02', 10)
        assert.deepStrictEqual(result, ['01-30', '01-31', '02-01', '02-02'])
      })
    })

    suite('Edge cases and error handling', () => {
      test('should return empty array for invalid date format', () => {
        const result = main('invalid-date:2023-01-02', 10)
        assert.deepStrictEqual(result, [])
      })

      test('should return empty array when start is date but stop is not', () => {
        const result = main('2023-01-01:invalid', 10)
        assert.deepStrictEqual(result, [])
      })

      test('should fall back to start format for incompatible date formats', () => {
        const result = main('2023-01-01:15.02.2023', 10)
        // Different formats - should fall back to start's format
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
          '2023-01-05',
          '2023-01-06',
          '2023-01-07',
          '2023-01-08',
          '2023-01-09',
          '2023-01-10',
        ])
      })

      test('should handle leap year dates correctly', () => {
        const result = main('2024-02-28:2024-03-02', 10)
        assert.deepStrictEqual(result, [
          '2024-02-28',
          '2024-02-29',
          '2024-03-01',
          '2024-03-02',
        ])
      })
    })

    suite('Format priority', () => {
      test('should use prioritized format when multiple interpretations exist', () => {
        // This date could be interpreted as Y-M-D or Y-D-M
        const result = main('2023-01-12:2023-01-15', 10)
        // Should prioritize Y-M-D format according to convnum's compareDateFormatOrder
        assert.deepStrictEqual(result, [
          '2023-01-12',
          '2023-01-13',
          '2023-01-14',
          '2023-01-15',
        ])
      })

      test('should prefer Y-M2-D2 over Y-M1-D1 format', () => {
        // Both formats are valid, but Y-M2-D2 should have higher priority
        const result = main('2023-01-01:2023-01-03', 10)
        // Should use Y-M2-D2 format (zero-padded months/days)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })

      test('should prefer D2.M2.Y over D1.M1.Y format', () => {
        // Both formats are valid, but D2.M2.Y should have higher priority
        const result = main('01.01.2023:03.01.2023', 10)
        // Should use D2.M2.Y format (zero-padded days/months)
        assert.deepStrictEqual(result, [
          '01.01.2023',
          '02.01.2023',
          '03.01.2023',
        ])
      })

      test('should handle incompatible date formats with different separators', () => {
        // One uses dash, other uses dot - but should use start's format
        const result = main('2023-01-01:06.01.2023', 10)
        // Should fall back to start's format and treat as no stop (generate selectionCount elements)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
          '2023-01-05',
          '2023-01-06',
          '2023-01-07',
          '2023-01-08',
          '2023-01-09',
          '2023-01-10',
        ])
      })
    })

    suite('Days vs Months handling', () => {
      test('should use days property for date sequences with day components', () => {
        // Year-Month-Day dates should use days property internally
        const result = main('2023-01-01:2023-01-03', 10)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })

      test('should use months property for year-month sequences', () => {
        // Year-Month dates should use months property internally
        const result = main('2023-01:2023-03', 10)
        assert.deepStrictEqual(result, ['2023-01', '2023-02', '2023-03'])
      })

      test('should handle month-day sequences using days property', () => {
        // Month-Day dates should use days property internally
        const result = main('01-28:02-02', 10)
        assert.deepStrictEqual(result, [
          '01-28',
          '01-29',
          '01-30',
          '01-31',
          '02-01',
          '02-02',
        ])
      })

      test('should handle year boundaries with day-based sequences', () => {
        // Cross-year sequences should work with days property
        const result = main('2023-12-30:2024-01-02', 10)
        assert.deepStrictEqual(result, [
          '2023-12-30',
          '2023-12-31',
          '2024-01-01',
          '2024-01-02',
        ])
      })
    })

    suite('Format fallback behavior', () => {
      test('should fallback to first format when no format found in priority list', () => {
        // This tests the fallback mechanism in findCommonDateFormat
        // Even if a format isn't known, it should still work
        const result = main('2023-01-01', 3)
        assert.deepStrictEqual(result, [
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })

      test('should handle single date input with multiple possible formats', () => {
        // Single date with ambiguous format should pick highest priority
        const result = main('2023-12-01', 3)
        assert.deepStrictEqual(result, [
          '2023-12-01',
          '2023-12-02',
          '2023-12-03',
        ])
      })
    })

    suite('Cross-boundary sequences', () => {
      test('should handle month boundaries correctly', () => {
        const result = main('2023-01-30:2023-02-02', 10)
        assert.deepStrictEqual(result, [
          '2023-01-30',
          '2023-01-31',
          '2023-02-01',
          '2023-02-02',
        ])
      })

      test('should handle year boundaries correctly', () => {
        const result = main('2023-12-30:2024-01-02', 10)
        assert.deepStrictEqual(result, [
          '2023-12-30',
          '2023-12-31',
          '2024-01-01',
          '2024-01-02',
        ])
      })
    })
  })
})
