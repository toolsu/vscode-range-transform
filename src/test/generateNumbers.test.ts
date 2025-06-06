import * as assert from 'assert'

import { generateNumbers } from '../utils/range/generateNumbers'

suite('generateNumbers function', () => {
  suite('normal cases', () => {
    test('should generate ascending sequence with positive step', () => {
      assert.deepStrictEqual(generateNumbers(1, 2, 5), [1, 3, 5, 7, 9])
    })

    test('should generate descending sequence with negative step', () => {
      assert.deepStrictEqual(generateNumbers(10, -1, 4), [10, 9, 8, 7])
    })

    test('should generate constant sequence with zero step', () => {
      assert.deepStrictEqual(generateNumbers(5, 0, 3), [5, 5, 5])
    })

    test('should generate single element sequence', () => {
      assert.deepStrictEqual(generateNumbers(42, 1, 1), [42])
    })

    test('should generate sequence with decimal step', () => {
      assert.deepStrictEqual(generateNumbers(0, 0.5, 4), [0, 0.5, 1, 1.5])
    })

    test('should generate sequence with negative start', () => {
      assert.deepStrictEqual(generateNumbers(-5, 2, 3), [-5, -3, -1])
    })

    test('should generate sequence with large numbers', () => {
      assert.deepStrictEqual(generateNumbers(1000, 100, 3), [1000, 1100, 1200])
    })
  })

  suite('edge cases', () => {
    test('should handle zero length', () => {
      assert.deepStrictEqual(generateNumbers(1, 1, 0), [])
    })

    test('should handle negative length', () => {
      assert.deepStrictEqual(generateNumbers(1, 1, -1), [])
    })

    test('should handle non-integer length', () => {
      assert.deepStrictEqual(generateNumbers(1, 1, 3.5), [])
    })

    test('should handle very large length', () => {
      const result = generateNumbers(0, 1, 1000)
      assert.strictEqual(result.length, 1000)
      assert.strictEqual(result[0], 0)
      assert.strictEqual(result[999], 999)
    })

    test('should handle very small step', () => {
      assert.deepStrictEqual(generateNumbers(0, 0.001, 3), [0, 0.001, 0.002])
    })

    test('should handle very large step', () => {
      assert.deepStrictEqual(
        generateNumbers(0, 1000000, 3),
        [0, 1000000, 2000000],
      )
    })
  })

  suite('non-finite values', () => {
    test('should return empty array for NaN start', () => {
      assert.deepStrictEqual(generateNumbers(NaN, 1, 5), [])
    })

    test('should return empty array for NaN step', () => {
      assert.deepStrictEqual(generateNumbers(1, NaN, 5), [])
    })

    test('should return empty array for NaN length', () => {
      assert.deepStrictEqual(generateNumbers(1, 1, NaN), [])
    })

    test('should return empty array for Infinity start', () => {
      assert.deepStrictEqual(generateNumbers(Infinity, 1, 5), [])
    })

    test('should return empty array for -Infinity start', () => {
      assert.deepStrictEqual(generateNumbers(-Infinity, 1, 5), [])
    })

    test('should return empty array for Infinity step', () => {
      assert.deepStrictEqual(generateNumbers(1, Infinity, 5), [])
    })

    test('should return empty array for -Infinity step', () => {
      assert.deepStrictEqual(generateNumbers(1, -Infinity, 5), [])
    })

    test('should return empty array for Infinity length', () => {
      assert.deepStrictEqual(generateNumbers(1, 1, Infinity), [])
    })

    test('should return empty array for -Infinity length', () => {
      assert.deepStrictEqual(generateNumbers(1, 1, -Infinity), [])
    })

    test('should return empty array when multiple parameters are non-finite', () => {
      assert.deepStrictEqual(generateNumbers(NaN, Infinity, -Infinity), [])
    })
  })

  suite('floating point precision', () => {
    test('should handle floating point arithmetic correctly', () => {
      const result = generateNumbers(0.1, 0.1, 3)
      assert.deepStrictEqual(result, [0.1, 0.2, 0.30000000000000004])
    })

    test('should handle negative floating point numbers', () => {
      assert.deepStrictEqual(
        generateNumbers(-0.1, -0.1, 3),
        [-0.1, -0.2, -0.30000000000000004],
      )
    })
  })

  suite('integration with normalize function output', () => {
    test('should work with typical normalize output', () => {
      // Simulating output from normalize function
      const normalized = { start: 1, step: 1, length: 5 }
      assert.deepStrictEqual(
        generateNumbers(normalized.start, normalized.step, normalized.length),
        [1, 2, 3, 4, 5],
      )
    })

    test('should work with zero step from normalize', () => {
      // Simulating output from normalize when start equals stop
      const normalized = { start: 5, step: 0, length: 3 }
      assert.deepStrictEqual(
        generateNumbers(normalized.start, normalized.step, normalized.length),
        [5, 5, 5],
      )
    })

    test('should work with negative step from normalize', () => {
      // Simulating output from normalize with descending sequence
      const normalized = { start: 10, step: -2, length: 4 }
      assert.deepStrictEqual(
        generateNumbers(normalized.start, normalized.step, normalized.length),
        [10, 8, 6, 4],
      )
    })
  })
})
