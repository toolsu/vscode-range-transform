import { findCommonDateFormat } from '@/range/findCommonDateFormat'
import {
  compareDateFormatOrder,
  parseDateString,
  type DateInterpretation,
} from 'convnum'
import * as assert from 'assert'

suite('findCommonDateFormat function', () => {
  suite('Basic functionality', () => {
    test('should return highest priority common format between start and stop', () => {
      // Both dates can be interpreted as Y-M-D with different padding
      const startResult = parseDateString('2023-01-01')
      const stopResult = parseDateString('2023-01-05')

      const result = findCommonDateFormat(startResult, stopResult)

      // Should prefer Y-M2-D2 (highest priority Y-M-D format)
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should return format when start and stop have single common format', () => {
      const startResult = parseDateString('25.12.2023')
      const stopResult = parseDateString('28.12.2023')

      const result = findCommonDateFormat(startResult, stopResult)

      // Should return the D.M.Y format (only unambiguous interpretation)
      assert.strictEqual(result, 'D2.M2.Y')
    })

    test('should fall back to start format when no common formats exist', () => {
      const startResult = parseDateString('2023-01-01') // Y-M-D formats
      const stopResult = parseDateString('01.01.2023') // D.M.Y and M.D.Y formats

      const result = findCommonDateFormat(startResult, stopResult)

      // Different separators, no common formats - should fall back to start's highest priority
      assert.strictEqual(result, 'Y-M2-D2')
    })
  })

  suite('Priority ordering', () => {
    test('should prefer Y-M2-D2 over Y-M1-D1', () => {
      // Create mock results that have both formats
      const startResult = [
        { format: 'Y-M1-D1', timestamp: 1, days: 1, months: undefined },
        { format: 'Y-M2-D2', timestamp: 1, days: 1, months: undefined },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))
      const stopResult = [
        { format: 'Y-M2-D2', timestamp: 5, days: 5, months: undefined },
        { format: 'Y-M1-D1', timestamp: 5, days: 5, months: undefined },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should prefer D2.M2.Y over D1.M1.Y', () => {
      const startResult = [
        { format: 'D1.M1.Y', timestamp: 1, days: 1, months: undefined },
        { format: 'D2.M2.Y', timestamp: 1, days: 1, months: undefined },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))
      const stopResult = [
        { format: 'D2.M2.Y', timestamp: 5, days: 5, months: undefined },
        { format: 'D1.M1.Y', timestamp: 5, days: 5, months: undefined },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, 'D2.M2.Y')
    })

    test('should prefer Y-M-D over D-M-Y formats', () => {
      // Create ambiguous date that could be either Y-M-D or D-M-Y
      const startResult = [
        { format: 'Y-M2-D2', timestamp: 1, days: 1, months: undefined },
        { format: 'D2-M2-Y', timestamp: 1, days: 1, months: undefined },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))
      const stopResult = [
        { format: 'D2-M2-Y', timestamp: 5, days: 5, months: undefined },
        { format: 'Y-M2-D2', timestamp: 5, days: 5, months: undefined },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))

      const result = findCommonDateFormat(startResult, stopResult)

      // Y-M2-D2 should have higher priority than D2-M2-Y
      assert.strictEqual(result, 'Y-M2-D2')
    })
  })

  suite('Single date handling (no stop)', () => {
    test('should return highest priority format from start when no stop', () => {
      const startResult = parseDateString('2023-01-12') // Ambiguous, could be Y-M-D or Y-D-M

      const result = findCommonDateFormat(startResult, null)

      // Should prefer Y-M2-D2 format
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should return highest priority format from start when stop is undefined', () => {
      const startResult = parseDateString('01.12.2023')

      const result = findCommonDateFormat(startResult, undefined)

      // Should prefer D2.M2.Y format
      assert.strictEqual(result, 'D2.M2.Y')
    })

    test('should return first format when not found in priority list', () => {
      // Create a mock result with a unknown format
      const startResult: DateInterpretation[] = [
        { format: 'CUSTOM-FORMAT', timestamp: 1, days: 1 },
      ]

      const result = findCommonDateFormat(startResult, null)

      assert.strictEqual(result, 'CUSTOM-FORMAT')
    })
  })

  suite('Edge cases', () => {
    test('should return null when start result is empty', () => {
      const startResult: DateInterpretation[] = []
      const stopResult = parseDateString('2023-01-01')

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, null)
    })

    test('should return null when both results are empty', () => {
      const startResult: DateInterpretation[] = []
      const stopResult: DateInterpretation[] = []

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, null)
    })

    test('should handle stop result being empty array', () => {
      const startResult = parseDateString('2023-01-01')
      const stopResult: DateInterpretation[] = []

      const result = findCommonDateFormat(startResult, stopResult)

      // Should treat as no stop and return highest priority from start
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should fallback to first common format when none in priority list', () => {
      // Create mock results with formats not in priority list
      const startResult: DateInterpretation[] = [
        { format: 'CUSTOM-A', timestamp: 1, days: 1 },
        { format: 'CUSTOM-B', timestamp: 1, days: 1 },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))
      const stopResult: DateInterpretation[] = [
        { format: 'CUSTOM-B', timestamp: 5, days: 5 },
        { format: 'CUSTOM-C', timestamp: 5, days: 5 },
      ].sort((a, b) => compareDateFormatOrder(a.format, b.format))

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, 'CUSTOM-B')
    })
  })

  suite('Real-world date scenarios', () => {
    test('should handle year-month dates correctly', () => {
      const startResult = parseDateString('2023-01')
      const stopResult = parseDateString('2023-04')

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, 'Y-M2')
    })

    test('should handle month-day dates correctly', () => {
      const startResult = parseDateString('01-15')
      const stopResult = parseDateString('01-20')

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, 'M2-D2')
    })

    test('should handle different separator incompatibility', () => {
      const startResult = parseDateString('2023-01-01') // dash separator
      const stopResult = parseDateString('05.01.2023') // dot separator

      const result = findCommonDateFormat(startResult, stopResult)

      // Different separators, no common formats - should fall back to start's highest priority
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should handle slash vs dash incompatibility', () => {
      const startResult = parseDateString('2023-01-01') // dash separator
      const stopResult = parseDateString('01/05/2023') // slash separator

      const result = findCommonDateFormat(startResult, stopResult)

      // Different separators, no common formats - should fall back to start's highest priority
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should prefer padded formats in mixed scenarios', () => {
      // Dates that could have both padded and unpadded interpretations
      const startResult = parseDateString('2023-1-1')
      const stopResult = parseDateString('2023-1-5')

      const result = findCommonDateFormat(startResult, stopResult)

      // Should prefer the most padded format available
      assert.strictEqual(result, 'Y-M1-D1')
    })

    test('should handle ambiguous dates with multiple valid interpretations', () => {
      // Date that could be interpreted multiple ways
      const startResult = parseDateString('01/02/2023')
      const stopResult = parseDateString('01/05/2023')

      const result = findCommonDateFormat(startResult, stopResult)

      // Should return highest priority common format
      assert.ok(result !== null)
      assert.ok(typeof result === 'string')
    })
  })

  suite('Format compatibility validation', () => {
    test('should ensure both dates use same separator', () => {
      const startResult = parseDateString('2023-01-01')
      const stopResult = parseDateString('2023.01.05')

      const result = findCommonDateFormat(startResult, stopResult)

      // Different separators, no common formats - should fall back to start's highest priority
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should ensure both dates use same component ordering', () => {
      const startResult = parseDateString('2023-01-01') // Y-M-D
      const stopResult = parseDateString('01-01-2023') // M-D-Y or D-M-Y

      const result = findCommonDateFormat(startResult, stopResult)

      // Different ordering, no common formats - should fall back to start's highest priority
      assert.strictEqual(result, 'Y-M2-D2')
    })

    test('should handle identical formats correctly', () => {
      const startResult = parseDateString('2023-01-01')
      const stopResult = parseDateString('2023-01-01')

      const result = findCommonDateFormat(startResult, stopResult)

      assert.strictEqual(result, 'Y-M2-D2')
    })
  })
})
