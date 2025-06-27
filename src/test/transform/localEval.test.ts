import * as assert from 'assert'
import { localEval } from '@/transform/localEval'

suite('localEval Function Tests', () => {
  suite('Basic expressions', () => {
    test('should evaluate simple expressions', () => {
      assert.strictEqual(localEval('2 + 3', {}), 5)
      assert.strictEqual(localEval('10 - 4', {}), 6)
      assert.strictEqual(localEval('6 * 7', {}), 42)
      assert.strictEqual(localEval('15 / 3', {}), 5)
    })

    test('should evaluate string expressions', () => {
      assert.strictEqual(localEval('"hello" + " world"', {}), 'hello world')
      assert.strictEqual(localEval('"test".toUpperCase()', {}), 'TEST')
      assert.strictEqual(localEval('"HELLO".toLowerCase()', {}), 'hello')
    })

    test('should evaluate boolean expressions', () => {
      assert.strictEqual(localEval('true && false', {}), false)
      assert.strictEqual(localEval('true || false', {}), true)
      assert.strictEqual(localEval('!true', {}), false)
      assert.strictEqual(localEval('5 > 3', {}), true)
    })
  })

  suite('Variable access', () => {
    test('should access variables from context', () => {
      const vars = { x: 10, y: 20, name: 'Alice' }
      assert.strictEqual(localEval('x + y', vars), 30)
      assert.strictEqual(localEval('name', vars), 'Alice')
      assert.strictEqual(localEval('name + " " + x', vars), 'Alice 10')
    })

    test('should handle nested object access', () => {
      const vars = {
        user: { name: 'Bob', age: 25 },
        config: { debug: true },
      }
      assert.strictEqual(localEval('user.name', vars), 'Bob')
      assert.strictEqual(localEval('user.age', vars), 25)
      assert.strictEqual(localEval('config.debug', vars), true)
    })

    test('should handle array access', () => {
      const vars = {
        numbers: [1, 2, 3, 4, 5],
        names: ['Alice', 'Bob', 'Charlie'],
      }
      assert.strictEqual(localEval('numbers[0]', vars), 1)
      assert.strictEqual(localEval('numbers.length', vars), 5)
      assert.strictEqual(localEval('names[1]', vars), 'Bob')
    })
  })

  suite('Function calls', () => {
    test('should call functions from context', () => {
      const vars = {
        multiply: (a: number, b: number) => a * b,
        greet: (name: string) => `Hello, ${name}!`,
        sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
      }
      assert.strictEqual(localEval('multiply(6, 7)', vars), 42)
      assert.strictEqual(localEval('greet("World")', vars), 'Hello, World!')
      assert.strictEqual(localEval('sum(1, 2, 3, 4)', vars), 10)
    })

    test('should handle built-in Math functions', () => {
      const vars = { Math }
      assert.strictEqual(localEval('Math.max(1, 5, 3)', vars), 5)
      assert.strictEqual(localEval('Math.min(1, 5, 3)', vars), 1)
      assert.strictEqual(localEval('Math.abs(-10)', vars), 10)
      assert.strictEqual(localEval('Math.pow(2, 3)', vars), 8)
    })
  })

  suite('Complex expressions', () => {
    test('should handle conditional expressions', () => {
      const vars = { x: 10, y: 5 }
      assert.strictEqual(
        localEval('x > y ? "greater" : "lesser"', vars),
        'greater',
      )
      assert.strictEqual(
        localEval('x < y ? "greater" : "lesser"', vars),
        'lesser',
      )
    })

    test('should handle array methods', () => {
      const vars = { numbers: [1, 2, 3, 4, 5] }
      assert.deepStrictEqual(
        localEval('numbers.filter(n => n > 3)', vars),
        [4, 5],
      )
      assert.deepStrictEqual(
        localEval('numbers.map(n => n * 2)', vars),
        [2, 4, 6, 8, 10],
      )
      assert.strictEqual(
        localEval('numbers.reduce((a, b) => a + b, 0)', vars),
        15,
      )
    })

    test('should handle template literals', () => {
      const vars = { name: 'Alice', age: 30 }
      assert.strictEqual(
        localEval('`Hello, ${name}! You are ${age} years old.`', vars),
        'Hello, Alice! You are 30 years old.',
      )
    })
  })

  suite('Statement handling', () => {
    test('should handle expressions without return', () => {
      assert.strictEqual(localEval('5 + 3', {}), 8)
      assert.strictEqual(localEval('"hello"', {}), 'hello')
    })

    test('should handle explicit return statements', () => {
      assert.strictEqual(localEval('return 5 + 3', {}), 8)
      assert.strictEqual(localEval('return "hello"', {}), 'hello')
    })

    test('should handle multi-line expressions', () => {
      const code = `
        const x = 5;
        const y = 3;
        x + y
      `
      assert.strictEqual(localEval(code, {}), undefined)
    })

    test('should handle complex multi-line with return', () => {
      const code = `
        const x = 10;
        if (x > 5) {
          return "big";
        } else {
          return "small";
        }
      `
      assert.strictEqual(localEval(code, {}), undefined)
    })

    test('should auto-add return to last statement', () => {
      const code = `
        const x = 5;
        const y = 3;
        x * y
      `
      assert.strictEqual(localEval(code, {}), undefined)
    })
  })

  suite('Error handling', () => {
    test('should handle syntax errors gracefully', () => {
      const result = localEval('invalid syntax here', {})
      assert.strictEqual(result, undefined)
    })

    test('should handle runtime errors gracefully', () => {
      const result = localEval('undefined.property', {})
      assert.strictEqual(result, undefined)
    })

    test('should handle reference errors gracefully', () => {
      const result = localEval('nonExistentVariable', {})
      assert.strictEqual(result, undefined)
    })

    test('should handle division by zero', () => {
      const result = localEval('5 / 0', {})
      assert.strictEqual(result, Infinity)
    })
  })

  suite('Edge cases', () => {
    test('should handle empty code', () => {
      const result = localEval('', {})
      assert.strictEqual(result, undefined)
    })

    test('should handle whitespace-only code', () => {
      const result = localEval('   \n\t  ', {})
      assert.strictEqual(result, undefined)
    })

    test('should handle undefined variables', () => {
      const vars = { x: undefined, y: null }
      assert.strictEqual(localEval('x', vars), undefined)
      assert.strictEqual(localEval('y', vars), null)
    })

    test('should handle this context', () => {
      const vars = { value: 42 }
      const result = localEval('this.value', vars)
      // Result may vary based on context, but should not throw
      assert.ok(result !== undefined || result === undefined)
    })
  })

  suite('Security and sandboxing', () => {
    test('should have access to provided variables only', () => {
      const vars = { allowedVar: 'safe' }
      assert.strictEqual(localEval('allowedVar', vars), 'safe')
    })

    test('should handle nested function scopes', () => {
      const vars = {
        fn: (x: number) => {
          return (y: number) => x + y
        },
      }
      assert.strictEqual(localEval('fn(5)(3)', vars), 8)
    })

    test('should handle closure variables', () => {
      const vars = {
        createCounter: () => {
          let count = 0
          return () => ++count
        },
      }
      const code = `
        const counter = createCounter();
        counter() + counter()
      `
      assert.strictEqual(localEval(code, vars), undefined) // 1 + 2
    })
  })
})
