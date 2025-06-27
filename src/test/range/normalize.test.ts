import * as assert from 'assert'

import { normalize } from '@/range/normalize'
import { FALLBACK_SEQUENCE_LENGTH } from '@/const/const'

suite('normalize function', () => {
  test('should normalize ascending sequence with positive step', () => {
    const result = normalize(1, 10, 2, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 2,
      length: 5, // (10-1)/2 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should normalize descending sequence with negative step', () => {
    const result = normalize(10, 1, -2, 5)
    assert.deepStrictEqual(result, {
      start: 10,
      step: -2,
      length: 5, // (1-10)/(-2) + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should normalize ascending sequence with negative step (auto-correct)', () => {
    const result = normalize(1, 10, -2, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 2, // corrected to positive since direction is positive
      length: 5, // (10-1)/2 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should normalize descending sequence with positive step (auto-correct)', () => {
    const result = normalize(10, 1, 2, 5)
    assert.deepStrictEqual(result, {
      start: 10,
      step: -2, // corrected to negative since direction is negative
      length: 5, // (1-10)/(-2) + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle undefined stop with single line selection', () => {
    const result = normalize(5, undefined, 2, 1)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 2,
      length: FALLBACK_SEQUENCE_LENGTH, // defaults to 10 when selectionCount <= 1
    })
  })

  test('should handle undefined stop with multi-line selection', () => {
    const result = normalize(5, undefined, 2, 7)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 2,
      length: 7, // uses selectionCount when > 1
    })
  })

  test('should handle undefined step (default to 1)', () => {
    const result = normalize(1, 10, undefined, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (10-1)/1 + 1 = 10, but capped to selectionCount since > 1
    })
  })

  test('should handle zero step in ascending sequence', () => {
    const result = normalize(1, 10, 0, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 0,
      length: 5, // uses selectionCount when step is 0
    })
  })

  test('should handle zero step in descending sequence', () => {
    const result = normalize(10, 1, 0, 5)
    assert.deepStrictEqual(result, {
      start: 10,
      step: 0,
      length: 5, // uses selectionCount when step is 0
    })
  })

  test('should handle equal start and stop (step becomes 0)', () => {
    const result = normalize(5, 5, 2, 5)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 0, // direction is 0, so step becomes 0
      length: 5, // uses selectionCount when step is 0
    })
  })

  test('should handle negative start and positive stop', () => {
    const result = normalize(-5, 5, 2, 5)
    assert.deepStrictEqual(result, {
      start: -5,
      step: 2,
      length: 5, // (5-(-5))/2 + 1 = 6, but capped to selectionCount since > 1
    })
  })

  test('should handle positive start and negative stop', () => {
    const result = normalize(5, -5, 2, 5)
    assert.deepStrictEqual(result, {
      start: 5,
      step: -2, // corrected to negative since direction is negative
      length: 5, // (-5-5)/(-2) + 1 = 6, but capped to selectionCount since > 1
    })
  })

  test('should handle negative start and negative stop (ascending)', () => {
    const result = normalize(-10, -1, 2, 5)
    assert.deepStrictEqual(result, {
      start: -10,
      step: 2,
      length: 5, // (-1-(-10))/2 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle negative start and negative stop (descending)', () => {
    const result = normalize(-1, -10, 2, 5)
    assert.deepStrictEqual(result, {
      start: -1,
      step: -2, // corrected to negative since direction is negative
      length: 5, // (-10-(-1))/(-2) + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle large numbers', () => {
    const result = normalize(1000000, 2000000, 100000, 5)
    assert.deepStrictEqual(result, {
      start: 1000000,
      step: 100000,
      length: 5, // (2000000-1000000)/100000 + 1 = 11, but capped to selectionCount since > 1
    })
  })

  test('should handle decimal step values', () => {
    const result = normalize(1, 5, 0.5, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 0.5,
      length: 5, // (5-1)/0.5 + 1 = 9, but capped to selectionCount since > 1
    })
  })

  test('should handle very small step values', () => {
    const result = normalize(0, 1, 0.001, 5)
    assert.deepStrictEqual(result, {
      start: 0,
      step: 0.001,
      length: 5, // (1-0)/0.001 + 1 = 1001, but capped to selectionCount since > 1
    })
  })

  test('should handle undefined stop with negative step', () => {
    const result = normalize(10, undefined, -2, 5)
    assert.deepStrictEqual(result, {
      start: 10,
      step: -2,
      length: 5, // uses selectionCount when stop is undefined
    })
  })

  test('should handle undefined stop with zero step', () => {
    const result = normalize(5, undefined, 0, 5)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 0,
      length: 5, // uses selectionCount when stop is undefined
    })
  })

  test('should handle edge case with maximum safe integer', () => {
    const result = normalize(
      Number.MAX_SAFE_INTEGER - 10,
      Number.MAX_SAFE_INTEGER,
      1,
      5,
    )
    assert.deepStrictEqual(result, {
      start: Number.MAX_SAFE_INTEGER - 10,
      step: 1,
      length: 5, // (MAX_SAFE_INTEGER - (MAX_SAFE_INTEGER-10))/1 + 1 = 11, but capped to selectionCount since > 1
    })
  })

  test('should handle edge case with minimum safe integer', () => {
    const result = normalize(
      Number.MIN_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER + 10,
      1,
      5,
    )
    assert.deepStrictEqual(result, {
      start: Number.MIN_SAFE_INTEGER,
      step: 1,
      length: 5, // ((MIN_SAFE_INTEGER+10) - MIN_SAFE_INTEGER)/1 + 1 = 11, but capped to selectionCount since > 1
    })
  })

  test('should handle undefined start (converted to 1)', () => {
    const result = normalize(undefined, 10, 2, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 2,
      length: 5, // (10-1)/2 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle undefined start and stop (start=1, stop=undefined)', () => {
    const result = normalize(undefined, undefined, 2, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 2,
      length: 5, // uses selectionCount when stop is undefined
    })
  })

  test('should handle undefined start, stop, and step (all defaults)', () => {
    const result = normalize(undefined, undefined, undefined, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // uses selectionCount when stop is undefined
    })
  })

  test('should handle undefined stop with selection length 0', () => {
    const result = normalize(5, undefined, 2, 0)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 2,
      length: FALLBACK_SEQUENCE_LENGTH, // defaults to 10 when selectionCount <= 1
    })
  })

  test('should handle undefined stop with selection length 1', () => {
    const result = normalize(5, undefined, 2, 1)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 2,
      length: FALLBACK_SEQUENCE_LENGTH, // defaults to 10 when selectionCount <= 1
    })
  })

  test('should handle undefined stop with selection length 2', () => {
    const result = normalize(5, undefined, 2, 2)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 2,
      length: 2, // uses selectionCount when > 1
    })
  })

  test('should handle very large selection length', () => {
    const result = normalize(1, undefined, 1, 1000)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 1000, // uses selectionCount when > 1
    })
  })

  test('should handle step that would cause overflow', () => {
    const result = normalize(1, 10, 1000000, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1000000,
      length: 1, // (10-1)/1000000 + 1 = 1 (Math.floor(9/1000000) + 1 = 1)
    })
  })

  test('should handle step that would cause underflow', () => {
    const result = normalize(10, 1, -1000000, 5)
    assert.deepStrictEqual(result, {
      start: 10,
      step: -1000000,
      length: 1, // (1-10)/(-1000000) + 1 = 1 (Math.floor(9/1000000) + 1 = 1)
    })
  })

  test('should handle NaN start value (converted to 1)', () => {
    const result = normalize(NaN, 5, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle Infinity start value (converted to 1)', () => {
    const result = normalize(Infinity, 5, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle -Infinity start value (converted to 1)', () => {
    const result = normalize(-Infinity, 5, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle NaN stop value (converted to undefined)', () => {
    const result = normalize(1, NaN, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // uses selectionCount when stop is NaN (converted to undefined)
    })
  })

  test('should handle Infinity stop value (converted to undefined)', () => {
    const result = normalize(1, Infinity, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // uses selectionCount when stop is Infinity (converted to undefined)
    })
  })

  test('should handle -Infinity stop value (converted to undefined)', () => {
    const result = normalize(1, -Infinity, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // uses selectionCount when stop is -Infinity (converted to undefined)
    })
  })

  test('should handle NaN step value (converted to 1)', () => {
    const result = normalize(1, 5, NaN, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle Infinity step value (converted to 1)', () => {
    const result = normalize(1, 5, Infinity, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle -Infinity step value (converted to 1)', () => {
    const result = normalize(1, 5, -Infinity, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle all NaN/Infinity values', () => {
    const result = normalize(NaN, Infinity, -Infinity, 5)
    assert.deepStrictEqual(result, {
      start: 1, // NaN converted to 1
      step: 1, // -Infinity converted to 1
      length: 5, // Infinity converted to undefined, uses selectionCount
    })
  })

  test('should handle zero step with undefined stop', () => {
    const result = normalize(5, undefined, 0, 5)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 0,
      length: 5, // uses selectionCount when stop is undefined
    })
  })

  test('should handle zero step with defined stop', () => {
    const result = normalize(5, 10, 0, 5)
    assert.deepStrictEqual(result, {
      start: 5,
      step: 0, // direction is 5, but step remains 0 for constant sequence
      length: 5, // uses selectionCount when step is 0
    })
  })

  test('should handle very small positive step', () => {
    const result = normalize(0, 0.1, 0.01, 5)
    assert.deepStrictEqual(result, {
      start: 0,
      step: 0.01,
      length: 5, // (0.1-0)/0.01 + 1 = 11, but capped to selectionCount since > 1
    })
  })

  test('should handle very small negative step', () => {
    const result = normalize(0.1, 0, -0.01, 5)
    assert.deepStrictEqual(result, {
      start: 0.1,
      step: -0.01,
      length: 5, // (0-0.1)/(-0.01) + 1 = 11, but capped to selectionCount since > 1
    })
  })

  test('should handle large step that exceeds range', () => {
    const result = normalize(1, 10, 20, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 20,
      length: 1, // (10-1)/20 + 1 = 1 (Math.floor(9/20) + 1 = 1)
    })
  })

  test('should handle negative step that exceeds range', () => {
    const result = normalize(10, 1, -20, 5)
    assert.deepStrictEqual(result, {
      start: 10,
      step: -20,
      length: 1, // (1-10)/(-20) + 1 = 1 (Math.floor(9/20) + 1 = 1)
    })
  })

  test('should handle step exactly equal to range', () => {
    const result = normalize(1, 10, 9, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 9,
      length: 2, // (10-1)/9 + 1 = 2
    })
  })

  test('should handle step larger than range', () => {
    const result = normalize(1, 10, 10, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 10,
      length: 1, // (10-1)/10 + 1 = 1 (Math.floor(9/10) + 1 = 1)
    })
  })

  test('should handle decimal start and stop with integer step', () => {
    const result = normalize(1.5, 5.5, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1.5,
      step: 1,
      length: 5, // (5.5-1.5)/1 + 1 = 5, but capped by selectionCount since > 1
    })
  })

  test('should handle integer start and stop with decimal step', () => {
    const result = normalize(1, 5, 0.5, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 0.5,
      length: 5, // (5-1)/0.5 + 1 = 9, but capped to selectionCount since > 1
    })
  })

  test('should handle all decimal values', () => {
    const result = normalize(1.1, 5.5, 0.3, 5)
    assert.deepStrictEqual(result, {
      start: 1.1,
      step: 0.3,
      length: 5, // (5.5-1.1)/0.3 + 1 = 15, but capped to selectionCount since > 1
    })
  })

  test('should handle negative decimals', () => {
    const result = normalize(-1.5, -5.5, -0.5, 5)
    assert.deepStrictEqual(result, {
      start: -1.5,
      step: -0.5,
      length: 5, // (-5.5-(-1.5))/(-0.5) + 1 = 9, but capped to selectionCount since > 1
    })
  })

  test('should handle mixed positive and negative', () => {
    const result = normalize(-1.5, 5.5, 0.5, 5)
    assert.deepStrictEqual(result, {
      start: -1.5,
      step: 0.5,
      length: 5, // (5.5-(-1.5))/0.5 + 1 = 15, but capped to selectionCount since > 1
    })
  })

  // Additional tests for length capping behavior
  test('should cap length when calculated length exceeds selectionCount and selectionCount > 1', () => {
    const result = normalize(1, 20, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (20-1)/1 + 1 = 20, but capped to selectionCount since > 1
    })
  })

  test('should not cap length when calculated length is less than selectionCount', () => {
    const result = normalize(1, 3, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 3, // (3-1)/1 + 1 = 3, not capped since < selectionCount
    })
  })

  test('should not cap length when selectionCount <= 1', () => {
    const result = normalize(1, 20, 1, 1)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 20, // (20-1)/1 + 1 = 20, not capped since selectionCount <= 1
    })
  })

  test('should cap length when calculated length equals selectionCount', () => {
    const result = normalize(1, 5, 1, 5)
    assert.deepStrictEqual(result, {
      start: 1,
      step: 1,
      length: 5, // (5-1)/1 + 1 = 5, equals selectionCount so no capping needed
    })
  })
})
