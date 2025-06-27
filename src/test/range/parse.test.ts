import * as assert from 'assert'

import { parse } from '@/range/parse'

suite('parse function', () => {
  test('should parse simple start value', () => {
    const result = parse('5')
    assert.deepStrictEqual(result, {
      start: '5',
      stop: undefined,
      step: undefined,
    })
  })

  test('should parse start:stop format', () => {
    const result = parse('1:5')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: '5',
      step: undefined,
    })
  })

  test('should parse start:stop:step format', () => {
    const result = parse('1:10:2')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: '10',
      step: '2',
    })
  })

  test('should parse start::step format (empty stop)', () => {
    const result = parse('1::2')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: undefined,
      step: '2',
    })
  })

  test('should parse start: format (empty stop)', () => {
    const result = parse('1:')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: undefined,
      step: undefined,
    })
  })

  test('should parse start:: format (empty stop and step)', () => {
    const result = parse('1::')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: undefined,
      step: undefined,
    })
  })

  test('should parse decimal numbers', () => {
    const result = parse('1.5:5.5:0.5')
    assert.deepStrictEqual(result, {
      start: '1.5',
      stop: '5.5',
      step: '0.5',
    })
  })

  test('should parse negative numbers', () => {
    const result = parse('-3:3:1')
    assert.deepStrictEqual(result, {
      start: '-3',
      stop: '3',
      step: '1',
    })
  })

  test('should parse scientific notation', () => {
    const result = parse('1e0:1e1:1')
    assert.deepStrictEqual(result, {
      start: '1e0',
      stop: '1e1',
      step: '1',
    })
  })

  test('should handle newlines in valid format', () => {
    const result = parse('1\n:5')
    assert.strictEqual(result, null)
  })

  test('should return null for invalid format with multiple colons', () => {
    const result = parse('1:::5')
    assert.strictEqual(result, null)
  })

  test('should return null for empty string', () => {
    const result = parse('')
    assert.strictEqual(result, null)
  })

  test('should parse string with only colons', () => {
    const result = parse('::')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: undefined,
      step: undefined,
    })
  })

  test('should parse complex expressions', () => {
    const result = parse('1+2hs)g:n_(_3t$*v4):_(5-2$).')
    assert.deepStrictEqual(result, {
      start: '1+2hs)g',
      stop: 'n_(_3t$*v4)',
      step: '_(5-2$).',
    })
  })

  // New tests for empty start cases
  test('should parse empty start with stop', () => {
    const result = parse(':5')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: '5',
      step: undefined,
    })
  })

  test('should parse empty start with stop and step', () => {
    const result = parse(':5:2')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: '5',
      step: '2',
    })
  })

  test('should parse empty start and stop with step', () => {
    const result = parse('::2')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: undefined,
      step: '2',
    })
  })

  test('should parse empty start and step with stop', () => {
    const result = parse(':5:')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: '5',
      step: undefined,
    })
  })

  test('should handle whitespace trimming', () => {
    const result = parse('  1  :  5  :  2  ')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: '5',
      step: '2',
    })
  })

  test('should handle whitespace and newlines', () => {
    const result = parse('  1\n  :  5\n  :  2\n  ')
    assert.strictEqual(result, null)
  })

  test('should handle empty parts with whitespace', () => {
    const result = parse('  :  5  :  2  ')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: '5',
      step: '2',
    })
  })

  test('should handle all empty parts with whitespace', () => {
    const result = parse('  :  :  ')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: undefined,
      step: undefined,
    })
  })

  test('should handle single colon with whitespace', () => {
    const result = parse('  :  ')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: undefined,
      step: undefined,
    })
  })

  test('should handle empty start with whitespace', () => {
    const result = parse('  :5')
    assert.deepStrictEqual(result, {
      start: undefined,
      stop: '5',
      step: undefined,
    })
  })

  test('should handle empty stop with whitespace', () => {
    const result = parse('1:  ')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: undefined,
      step: undefined,
    })
  })

  test('should handle empty step with whitespace', () => {
    const result = parse('1:5:  ')
    assert.deepStrictEqual(result, {
      start: '1',
      stop: '5',
      step: undefined,
    })
  })

  test('should return null for input with newlines', () => {
    const result = parse('1\n:5')
    assert.strictEqual(result, null)
  })

  test('should return null for input with whitespace and newlines', () => {
    const result = parse('  1\n  :  5\n  :  2\n  ')
    assert.strictEqual(result, null)
  })
})
