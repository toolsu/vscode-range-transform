import * as assert from 'assert'
import { sprintf } from '@/utils/sprintf'

suite('sprintf Utility Tests', () => {
  suite('String formatting (%s)', () => {
    test('should format string arguments', () => {
      const result = sprintf('Hello %s', 'world')
      assert.strictEqual(result, 'Hello world')
    })

    test('should format multiple string arguments', () => {
      const result = sprintf('Hello %s, welcome to %s!', 'Alice', 'Paris')
      assert.strictEqual(result, 'Hello Alice, welcome to Paris!')
    })

    test('should convert numbers to strings with %s', () => {
      const result = sprintf('Age: %s', 25)
      assert.strictEqual(result, 'Age: 25')
    })

    test('should handle empty strings', () => {
      const result = sprintf('Value: "%s"', '')
      assert.strictEqual(result, 'Value: ""')
    })
  })

  suite('Integer formatting (%d)', () => {
    test('should format integer arguments', () => {
      const result = sprintf('Count: %d', 42)
      assert.strictEqual(result, 'Count: 42')
    })

    test('should format negative integers', () => {
      const result = sprintf('Temperature: %d°C', -5)
      assert.strictEqual(result, 'Temperature: -5°C')
    })

    test('should parse string numbers to integers', () => {
      const result = sprintf('Parsed: %d', '123')
      assert.strictEqual(result, 'Parsed: 123')
    })

    test('should handle decimal strings by truncating', () => {
      const result = sprintf('Truncated: %d', '123.456')
      assert.strictEqual(result, 'Truncated: 123')
    })

    test('should handle non-numeric strings', () => {
      const result = sprintf('Invalid: %d', 'abc')
      assert.strictEqual(result, 'Invalid: NaN')
    })

    test('should handle zero', () => {
      const result = sprintf('Zero: %d', 0)
      assert.strictEqual(result, 'Zero: 0')
    })
  })

  suite('Float formatting (%f)', () => {
    test('should format float arguments', () => {
      const result = sprintf('Price: $%f', 19.99)
      assert.strictEqual(result, 'Price: $19.99')
    })

    test('should format negative floats', () => {
      const result = sprintf('Loss: %f', -12.34)
      assert.strictEqual(result, 'Loss: -12.34')
    })

    test('should parse string numbers to floats', () => {
      const result = sprintf('Parsed: %f', '456.789')
      assert.strictEqual(result, 'Parsed: 456.789')
    })

    test('should handle integers with %f', () => {
      const result = sprintf('Integer as float: %f', 100)
      assert.strictEqual(result, 'Integer as float: 100')
    })

    test('should handle non-numeric strings', () => {
      const result = sprintf('Invalid: %f', 'xyz')
      assert.strictEqual(result, 'Invalid: NaN')
    })

    test('should handle scientific notation', () => {
      const result = sprintf('Scientific: %f', '1.23e-4')
      assert.strictEqual(result, 'Scientific: 0.000123')
    })
  })

  suite('Mixed formatting', () => {
    test('should handle mixed format specifiers', () => {
      const result = sprintf(
        '%s has %d items costing $%f each',
        'Alice',
        5,
        12.5,
      )
      assert.strictEqual(result, 'Alice has 5 items costing $12.5 each')
    })

    test('should format complex messages', () => {
      const result = sprintf(
        'User: %s, Age: %d, Balance: $%f, Active: %s',
        'Bob',
        30,
        1234.56,
        'true',
      )
      assert.strictEqual(
        result,
        'User: Bob, Age: 30, Balance: $1234.56, Active: true',
      )
    })
  })

  suite('Edge cases', () => {
    test('should handle no arguments', () => {
      const result = sprintf('Hello world')
      assert.strictEqual(result, 'Hello world')
    })

    test('should handle no format specifiers', () => {
      const result = sprintf('Static text', 'ignored', 'args')
      assert.strictEqual(result, 'Static text')
    })

    test('should handle insufficient arguments', () => {
      const result = sprintf('Hello %s, you have %d items', 'Alice')
      assert.strictEqual(result, 'Hello Alice, you have %d items')
    })

    test('should handle extra arguments', () => {
      const result = sprintf('Hello %s', 'Alice', 'extra', 'args')
      assert.strictEqual(result, 'Hello Alice')
    })

    test('should handle invalid format specifiers', () => {
      const result = sprintf('Invalid %x format', 42)
      assert.strictEqual(result, 'Invalid %x format')
    })

    test('should handle escaped percent signs', () => {
      const result = sprintf('Progress: 50%% complete')
      assert.strictEqual(result, 'Progress: 50%% complete')
    })

    test('should handle empty format string', () => {
      const result = sprintf('', 'arg1', 'arg2')
      assert.strictEqual(result, '')
    })

    test('should handle multiple consecutive format specifiers', () => {
      const result = sprintf('%s%d%f', 'test', 123, 45.6)
      assert.strictEqual(result, 'test12345.6')
    })

    test('should preserve spacing and special characters', () => {
      const result = sprintf(
        'Result:\t%s\n%d items\r\n$%f total',
        'success',
        5,
        123.45,
      )
      assert.strictEqual(result, 'Result:\tsuccess\n5 items\r\n$123.45 total')
    })
  })

  suite('Type coercion', () => {
    test('should handle null and undefined', () => {
      const result1 = sprintf('Value: %s', null as any)
      const result2 = sprintf('Value: %s', undefined as any)
      assert.strictEqual(result1, 'Value: null')
      assert.strictEqual(result2, 'Value: undefined')
    })

    test('should handle boolean values', () => {
      const result = sprintf('Flag: %s, Count: %d', true as any, false as any)
      assert.strictEqual(result, 'Flag: true, Count: NaN')
    })

    test('should handle objects', () => {
      const obj = { toString: () => 'custom' }
      const result = sprintf('Object: %s', obj as any)
      assert.strictEqual(result, 'Object: custom')
    })
  })
})
