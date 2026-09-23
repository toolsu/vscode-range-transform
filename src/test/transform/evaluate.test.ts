import { describe, expect, it } from 'bun:test'
import {
  compile,
  EVALUATION_TIMEOUT_MS,
  type CompiledExpression,
  type EvalOutcome,
} from '../../transform/evaluate'

/** Compiles, throwing the compile message so a test failure names the real problem. */
function compiled(
  code: string,
  names: readonly string[] = [],
): CompiledExpression {
  const result = compile(code, names)
  if (!result.ok) {
    throw new Error(result.message)
  }
  return result.compiled
}

/** Runs a single row, reporting a batch failure the same way as a per-row one. */
function runOne(
  expression: CompiledExpression,
  values: readonly unknown[],
): EvalOutcome {
  const batch = expression.runAll([values])
  if (!batch.ok) {
    return { ok: false, message: batch.message }
  }
  return batch.outcomes[0] ?? { ok: false, message: 'no outcome' }
}

/** Compiles and runs in one go, reporting a compile failure the same way as a run one. */
function outcome(
  code: string,
  names: readonly string[] = [],
  values: readonly unknown[] = [],
): EvalOutcome {
  const result = compile(code, names)
  return result.ok
    ? runOne(result.compiled, values)
    : { ok: false, message: result.message }
}

/** The value of an expression that is expected to work. */
function value(
  code: string,
  names: readonly string[] = [],
  values: readonly unknown[] = [],
): unknown {
  const result = outcome(code, names, values)
  if (!result.ok) {
    throw new Error(`expected success, got: ${result.message}`)
  }
  return result.value
}

/** The message of an expression that is expected to fail. */
function failure(
  code: string,
  names: readonly string[] = [],
  values: readonly unknown[] = [],
): string {
  const result = outcome(code, names, values)
  if (result.ok) {
    throw new Error(`expected failure, got: ${String(result.value)}`)
  }
  return result.message
}

describe('evaluate', () => {
  describe('basic expressions', () => {
    it('evaluates arithmetic', () => {
      expect(value('2 + 3')).toBe(5)
      expect(value('10 - 4')).toBe(6)
      expect(value('6 * 7')).toBe(42)
      expect(value('15 / 3')).toBe(5)
    })

    it('evaluates division by zero to Infinity rather than failing', () => {
      expect(value('5 / 0')).toBe(Infinity)
    })

    it('evaluates string expressions', () => {
      expect(value('"hello" + " world"')).toBe('hello world')
      expect(value('"test".toUpperCase()')).toBe('TEST')
      expect(value('"HELLO".toLowerCase()')).toBe('hello')
    })

    it('evaluates boolean expressions', () => {
      expect(value('true && false')).toBe(false)
      expect(value('true || false')).toBe(true)
      expect(value('!true')).toBe(false)
      expect(value('5 > 3')).toBe(true)
    })

    it('evaluates conditional expressions', () => {
      const names = ['x', 'y']
      expect(value('x > y ? "greater" : "lesser"', names, [10, 5])).toBe(
        'greater',
      )
      expect(value('x > y ? "greater" : "lesser"', names, [5, 10])).toBe(
        'lesser',
      )
    })

    it('evaluates template literals', () => {
      expect(
        value(
          '`Hello, ${name}! You are ${age}.`',
          ['name', 'age'],
          ['Alice', 30],
        ),
      ).toBe('Hello, Alice! You are 30.')
    })

    it('treats a top-level object literal as an object, not a block', () => {
      expect(value('{a: 1}')).toEqual({ a: 1 })
      expect(value('{a: 1, b: {c: 2}}')).toEqual({ a: 1, b: { c: 2 } })
    })
  })

  describe('variable binding', () => {
    it('binds values positionally to names', () => {
      const names = ['x', 'y', 'name']
      const values = [10, 20, 'Alice']
      expect(value('x + y', names, values)).toBe(30)
      expect(value('name', names, values)).toBe('Alice')
      expect(value('name + " " + x', names, values)).toBe('Alice 10')
    })

    it('reads nested objects and arrays', () => {
      const names = ['user', 'numbers']
      const values = [{ name: 'Bob', age: 25 }, [1, 2, 3, 4, 5]]
      expect(value('user.name', names, values)).toBe('Bob')
      expect(value('user.age', names, values)).toBe(25)
      expect(value('numbers[0]', names, values)).toBe(1)
      expect(value('numbers.length', names, values)).toBe(5)
    })

    it('passes undefined and null through unchanged', () => {
      const names = ['x', 'y']
      expect(value('x', names, [undefined, null])).toBeUndefined()
      expect(value('y', names, [undefined, null])).toBeNull()
    })

    it('leaves names undefined when fewer values are supplied', () => {
      expect(value('typeof y', ['x', 'y'], [1])).toBe('undefined')
    })

    it('compiles once and runs with different values', () => {
      const expression = compiled('s.toUpperCase()', ['s'])
      expect(runOne(expression, ['ab'])).toEqual({ ok: true, value: 'AB' })
      expect(runOne(expression, ['cd'])).toEqual({ ok: true, value: 'CD' })
    })

    it('evaluates every row of a batch in order', () => {
      const batch = compiled('s.toUpperCase()', ['s']).runAll([
        ['ab'],
        ['cd'],
        ['ef'],
      ])
      expect(batch.ok && batch.outcomes).toEqual([
        { ok: true, value: 'AB' },
        { ok: true, value: 'CD' },
        { ok: true, value: 'EF' },
      ])
    })

    it('calls functions taken from the bag', () => {
      const names = ['multiply', 'greet', 'sum']
      const values = [
        (a: number, b: number) => a * b,
        (name: string) => `Hello, ${name}!`,
        (...args: number[]) => args.reduce((a, b) => a + b, 0),
      ]
      expect(value('multiply(6, 7)', names, values)).toBe(42)
      expect(value('greet("World")', names, values)).toBe('Hello, World!')
      expect(value('sum(1, 2, 3, 4)', names, values)).toBe(10)
    })

    it('handles curried functions', () => {
      const fn = (x: number) => (y: number) => x + y
      expect(value('fn(5)(3)', ['fn'], [fn])).toBe(8)
    })

    it('runs array methods with arrow callbacks', () => {
      const names = ['numbers']
      const values = [[1, 2, 3, 4, 5]]
      expect(value('numbers.filter(n => n > 3)', names, values)).toEqual([4, 5])
      expect(value('numbers.map(n => n * 2)', names, values)).toEqual([
        2, 4, 6, 8, 10,
      ])
      expect(value('numbers.reduce((a, b) => a + b, 0)', names, values)).toBe(
        15,
      )
    })
  })

  describe('ambient environment', () => {
    it('reaches the standard globals', () => {
      expect(value('Math.max(1, 5, 3)')).toBe(5)
      expect(value('Math.abs(-10)')).toBe(10)
      expect(value('JSON.stringify({a: 1})')).toBe('{"a":1}')
      expect(value('new Date("2025-01-02T00:00:00Z").getUTCFullYear()')).toBe(
        2025,
      )
    })

    it('has no `this`, because the body is strict mode', () => {
      expect(value('this')).toBeUndefined()
      expect(failure('this.value')).toMatch(/undefined|null/i)
    })

    it('keeps the host realm out of reach', () => {
      // A side effect of running in a sandbox rather than through `new Function`: an
      // expression can no longer touch the extension host's own environment.
      expect(value('typeof process')).toBe('undefined')
      expect(value('typeof require')).toBe('undefined')
    })
  })

  describe('shape', () => {
    /** The shape `compile` settled on for `code`. */
    function shapeOf(code: string, names: readonly string[] = []): string {
      return compiled(code, names).shape
    }

    it('names the shape it managed to build', () => {
      expect(shapeOf('n * 2', ['n'])).toBe('expression')
      expect(shapeOf('const x = 1\nx + 1')).toBe('lastStatement')
      expect(shapeOf('return 1')).toBe('statements')
      expect(shapeOf('// nothing')).toBe('empty')
      expect(shapeOf('/* nothing\n   here */')).toBe('empty')
    })
  })

  describe('body shapes', () => {
    it('accepts a bare expression', () => {
      expect(value('5 + 3')).toBe(8)
      expect(value('"hello"')).toBe('hello')
    })

    it('accepts an explicit return', () => {
      expect(value('return 5 + 3')).toBe(8)
      expect(value('return "hello"')).toBe('hello')
    })

    it('returns the last statement of a multi-line body', () => {
      const code = ['const x = 5;', 'const y = 3;', 'x + y'].join('\n')
      expect(value(code)).toBe(8)
    })

    it('ignores trailing blank and comment lines when finding the result', () => {
      const code = [
        'const x = 5',
        'x * 2',
        '',
        '// the answer above',
        '  ',
      ].join('\n')
      expect(value(code)).toBe(10)
    })

    it('adds `return` to an indented final line', () => {
      const code = ['const parts = s.split(",")', '  parts.length'].join('\n')
      expect(value(code, ['s'], ['a,b'])).toBe(2)
    })

    it('accepts a body whose branches all return', () => {
      const code = [
        'const x = 10;',
        'if (x > 5) {',
        '  return "big";',
        '} else {',
        '  return "small";',
        '}',
      ].join('\n')
      expect(value(code)).toBe('big')
    })

    it('accepts a trailing line comment after the expression', () => {
      expect(value('s // keep this', ['s'], ['x'])).toBe('x')
      expect(value('s.trim() // strip', ['s'], [' x '])).toBe('x')
    })

    it('accepts a trailing line comment on a multi-statement body', () => {
      const code = ['const t = s.trim() // strip', 't.length'].join('\n')
      expect(value(code, ['s'], ['  ab  '])).toBe(2)
    })

    it('accepts the advanced editor header verbatim', () => {
      const code = [
        '/// <reference path="/tmp/rt/rt.d.ts" />',
        '// Range & Transform — Advanced',
        '// Applies to 3 selection(s). The value of the last expression is inserted.',
        '//',
        '//  s   selected text        n   s as a number',
        '',
        's.toUpperCase()',
      ].join('\n')
      expect(value(code, ['s'], ['ab'])).toBe('AB')
    })

    it('accepts a header followed by several statements', () => {
      const code = [
        '/// <reference path="/tmp/rt/rt.d.ts" />',
        '// header',
        '',
        'const parts = s.split(",")',
        'parts.length',
      ].join('\n')
      expect(value(code, ['s'], ['a,b,c'])).toBe(3)
    })

    it('handles CRLF sources', () => {
      const code = 'const a = 1;\r\nconst b = 2;\r\na + b'
      expect(value(code)).toBe(3)
    })

    it('preserves the contents of a multi-line template literal', () => {
      // A template literal keeps its own line breaks (normalised to \n by the language
      // itself), so rewriting the last line must not disturb the earlier ones.
      const code = 'const t = `a\r\nb`;\r\nt + s'
      expect(value(code, ['s'], ['!'])).toBe('a\nb!')
    })
  })

  describe('statement lists that produce no value', () => {
    // Each of these parses as a statement list whose value-bearing line is not the last
    // physical one, so the `return`-on-the-last-line shape fails to construct and the
    // raw source is used as the body. Every one of them used to evaluate to `undefined`,
    // which became the empty string: the selection was replaced with nothing and
    // reported as a success.
    const silentlyEmpty = [
      'if (len > 3) {\n  s.toUpperCase()\n} else {\n  s\n}',
      "switch (i) { case 1: 'a'; break; default: 'b' }",
      "try { s } catch (e) { '' }",
      'const tidy = function () { return upper(s) }',
      'const x = upper(s)\nlet y = x',
    ]
    const names = ['s', 'n', 'i', 'len', 'upper']
    const values = ['hello', NaN, 1, 5, (text: string) => text.toUpperCase()]

    it('reports them as failures rather than as nothing', () => {
      for (const code of silentlyEmpty) {
        const result = outcome(code, names, values)
        expect(result.ok).toBe(false)
        expect(result.ok === false && result.message).toMatch(/no value/i)
      }
    })

    it('says how to fix it', () => {
      const message = failure(silentlyEmpty[0] ?? '', names, values)
      expect(message).toMatch(/last line|end it with/i)
      expect(message).toMatch(/return/i)
    })

    it('still lets an expression evaluate to undefined', () => {
      // The whole point of tracking the shape: `undefined` from a single expression is
      // an answer the user asked for, and clearing the selection is the right response.
      expect(value('undefined')).toBeUndefined()
      expect(value('void 0')).toBeUndefined()
      expect(value('nothing()', ['nothing'], [() => undefined])).toBeUndefined()
      expect(value('s === "x" ? undefined : undefined', ['s'], ['y'])).toBe(
        undefined,
      )
    })

    it('still lets a statement list that ends in a value through', () => {
      expect(value('const x = 5\nx * 2')).toBe(10)
      expect(value('if (1) { return "big" }\nreturn "small"')).toBe('big')
    })
  })

  describe('empty sources', () => {
    it('compiles empty code to undefined', () => {
      expect(value('')).toBeUndefined()
    })

    it('compiles whitespace-only code to undefined', () => {
      expect(value('   \n\t  ')).toBeUndefined()
    })

    it('compiles comment-only code to undefined', () => {
      expect(value('// nothing here')).toBeUndefined()
      expect(value('/// <reference path="/tmp/rt/rt.d.ts" />')).toBeUndefined()
      expect(value('/* nothing\n   here */')).toBeUndefined()
      expect(value(['// one', '', '// two', ''].join('\n'))).toBeUndefined()
    })
  })

  describe('single execution', () => {
    it('runs code that produces undefined exactly once', () => {
      let calls = 0
      const bump = () => {
        calls += 1
      }
      expect(value('bump()', ['bump'], [bump])).toBeUndefined()
      expect(calls).toBe(1)
    })

    it('runs a multi-statement body exactly once', () => {
      let calls = 0
      const bump = () => {
        calls += 1
        return calls
      }
      const code = ['const first = bump()', 'first'].join('\n')
      expect(value(code, ['bump'], [bump])).toBe(1)
      expect(calls).toBe(1)
    })

    it('sees the effects of earlier statements in the result', () => {
      const createCounter = () => {
        let count = 0
        return () => (count += 1)
      }
      const code = [
        'const counter = createCounter();',
        'counter() + counter()',
      ].join('\n')
      expect(value(code, ['createCounter'], [createCounter])).toBe(3)
    })
  })

  describe('exotic values', () => {
    it('returns functions', () => {
      const result = value('() => 41 + 1')
      expect(typeof result).toBe('function')
      expect((result as () => number)()).toBe(42)
    })

    it('returns promises', () => {
      // Not `toBeInstanceOf`: user code runs in its own realm, so the promise it builds
      // is an instance of *that* realm's `Promise`. The internal-slot tag is the check
      // that survives the boundary — the same reason `toStr` no longer uses
      // `instanceof`.
      const promise = value('Promise.resolve(1)')
      expect(Object.prototype.toString.call(promise)).toBe('[object Promise]')
    })

    it('returns symbols', () => {
      expect(typeof value('Symbol("x")')).toBe('symbol')
    })

    it('returns an explicit undefined', () => {
      expect(value('undefined')).toBeUndefined()
      expect(value('void 0')).toBeUndefined()
    })
  })

  describe('compile failures', () => {
    it('reports a syntax error instead of throwing', () => {
      const result = compile('invalid syntax here', [])
      expect(result.ok).toBe(false)
      expect(result.ok === false && result.message.length > 0).toBe(true)
    })

    it('reports an unbalanced expression', () => {
      expect(compile('2 +', []).ok).toBe(false)
      expect(compile('(', []).ok).toBe(false)
      expect(compile('{', []).ok).toBe(false)
    })

    it('never throws, whatever the source', () => {
      const sources = [
        '(',
        '"',
        '`',
        '/*',
        '}',
        'return return',
        'const const = 1',
        ' ',
        'function (',
      ]
      for (const source of sources) {
        expect(() => compile(source, ['s'])).not.toThrow()
      }
    })
  })

  describe('runtime failures', () => {
    it('reports a reference to a name that was not bound', () => {
      const result = outcome('nosuch + 1', ['s'], ['x'])
      expect(result.ok).toBe(false)
      expect(result.ok === false && result.message).toMatch(/nosuch/)
    })

    it('reports a property read on null or undefined', () => {
      expect(compile('null.x', []).ok).toBe(true)
      expect(failure('null.x')).toMatch(/null/i)
      expect(failure('undefined.property')).toMatch(/undefined/i)
    })

    it('reports a thrown non-Error', () => {
      expect(failure('(() => { throw "oops" })()')).toBe('oops')
      expect(failure('(() => { throw 42 })()')).toBe('42')
    })

    it('survives a thrown object whose stringification throws', () => {
      const code = '(() => { throw {toString() { throw new Error("x") }} })()'
      expect(failure(code)).toBe('Unknown error')
    })

    it('leaves an earlier failure behind on the next run', () => {
      const expression = compiled('s.toUpperCase()', ['s'])
      expect(runOne(expression, [null]).ok).toBe(false)
      expect(runOne(expression, ['ok'])).toEqual({ ok: true, value: 'OK' })
    })

    it('fails only the rows that threw', () => {
      const batch = compiled('s.toUpperCase()', ['s']).runAll([
        ['ab'],
        [null],
        ['cd'],
      ])
      expect(batch.ok && batch.outcomes.map((one) => one.ok)).toEqual([
        true,
        false,
        true,
      ])
    })
  })

  describe('name validation', () => {
    it('rejects names that are not identifiers', () => {
      for (const name of ['a-b', '2x', '', 'a b', 'a.b', 's;n']) {
        const result = compile('1', [name])
        expect(result.ok).toBe(false)
        expect(result.ok === false && result.message).toMatch(
          /not a valid variable name/i,
        )
      }
    })

    it('rejects reserved words, duplicates and eval/arguments', () => {
      for (const names of [
        ['if'],
        ['class'],
        ['s', 's'],
        ['eval'],
        ['arguments'],
      ]) {
        expect(compile('1', names).ok).toBe(false)
      }
    })

    it('accepts ordinary identifiers, including unicode ones', () => {
      expect(value('$ + _ + é', ['$', '_', 'é'], [1, 2, 3])).toBe(6)
      expect(value('i0 + fli0', ['i0', 'fli0'], [1, 2])).toBe(3)
    })

    it('accepts an empty name list', () => {
      expect(value('1 + 1', [])).toBe(2)
    })
  })

  describe('runaway code', () => {
    // These run for real: the point is that they *stop*. Without the sandbox's timeout
    // the extension host's only thread spins forever and nothing short of "Developer:
    // Restart Extension Host" recovers it. The interrupt is V8's, and it works the same
    // under Bun (this suite) and under Node (the extension host) — both were checked,
    // so no assertion here is skipped on either.
    it('interrupts an endless loop', () => {
      const started = Date.now()
      const batch = compiled('let x = n\nwhile (x > 1) {\n}\nx', ['n']).runAll([
        [64],
      ])
      expect(batch.ok).toBe(false)
      expect(Date.now() - started).toBeLessThan(EVALUATION_TIMEOUT_MS * 10)
    })

    it('says why it stopped', () => {
      const batch = compiled('while (true) {}\n1').runAll([[]])
      expect(batch.ok === false && batch.message).toMatch(/stopped after/i)
      expect(batch.ok === false && batch.message).toMatch(/loop|recursion/i)
    })

    it('interrupts unbounded recursion that never overflows the stack', () => {
      // Trampolined recursion grows no stack, so `RangeError` never rescues this one.
      const code = 'let go = () => { while (true) { go = go } }\ngo()\n1'
      expect(compiled(code).runAll([[]]).ok).toBe(false)
    })

    it('fails the batch rather than every selection separately', () => {
      // One message the user can act on, not one per selection.
      const batch = compiled('i0 === 3 ? (() => { while (true) {} })() : s', [
        's',
        'i0',
      ]).runAll([
        ['a', 0],
        ['b', 1],
        ['c', 2],
        ['d', 3],
      ])
      expect(batch.ok).toBe(false)
    })

    it('interrupts a body that closes the wrapper and loops at compile time', () => {
      // The body is spliced into a function expression, so a body that closes that
      // expression itself runs *while compiling*, before there is anything to call.
      // Compiling is on the clock for exactly this: it ends in a reported failure
      // instead of a dead extension host.
      const started = Date.now()
      const result = compile('}); while (true) {}; (function () {', ['s'])
      expect(result.ok).toBe(false)
      expect(Date.now() - started).toBeLessThan(EVALUATION_TIMEOUT_MS * 10)
    })

    it('leaves a well-behaved expression well alone', () => {
      const rows = Array.from({ length: 500 }, (_, index) => [String(index)])
      const batch = compiled('s.toUpperCase()', ['s']).runAll(rows)
      expect(batch.ok && batch.outcomes.length).toBe(500)
      expect(batch.ok && batch.outcomes.every((one) => one.ok)).toBe(true)
    })
  })

  describe('values built inside the sandbox', () => {
    // User code runs in its own realm, so `instanceof` says no to everything it builds.
    // These pin the tags the rest of the pipeline recognises it by instead.
    function tagOf(code: string): string {
      return Object.prototype.toString.call(value(code))
    }

    it('keeps its objects recognisable across the realm boundary', () => {
      expect(tagOf('new Date(0)')).toBe('[object Date]')
      expect(tagOf('/ab/g')).toBe('[object RegExp]')
      expect(tagOf('new Map()')).toBe('[object Map]')
      expect(tagOf('new Set()')).toBe('[object Set]')
      expect(tagOf('new String("x")')).toBe('[object String]')
      expect(tagOf('new Number(1)')).toBe('[object Number]')
      expect(tagOf('new Boolean(true)')).toBe('[object Boolean]')
      expect(Array.isArray(value('[1, 2]'))).toBe(true)
    })

    it('reports the message of an error it throws, not its class', () => {
      // `messageOf` cannot use `instanceof Error` for the same reason; without the
      // fallback this would read "TypeError: nope".
      expect(failure('(() => { throw new TypeError("nope") })()')).toBe('nope')
      expect(failure('(() => { throw new RangeError("out") })()')).toBe('out')
    })
  })
})
