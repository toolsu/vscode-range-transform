import { describe, expect, it } from 'bun:test'
import { createContext, Script } from 'node:vm'
import { literal, toStr } from '../../transform/toStr'

describe('toStr', () => {
  it('handles null and undefined', () => {
    expect(toStr(null)).toBe('')
    expect(toStr(undefined)).toBe('')
  })

  it('handles string primitives', () => {
    expect(toStr('hello')).toBe('hello')
    expect(toStr('world')).toBe('world')
    expect(toStr('')).toBe('')
    expect(toStr('123')).toBe('123')
    expect(toStr('Hello World')).toBe('Hello World')
    expect(toStr('   ')).toBe('   ')
    expect(toStr('!@#$%')).toBe('!@#$%')
  })

  it('formats Date as YYYY-MM-DD', () => {
    expect(toStr(new Date('2025-01-01'))).toBe('2025-01-01')
    expect(toStr(new Date('2024-12-25'))).toBe('2024-12-25')
    expect(toStr(new Date('2023-03-08'))).toBe('2023-03-08')
    expect(toStr(new Date('2022-11-30'))).toBe('2022-11-30')
    expect(toStr(new Date('2024-05-09'))).toBe('2024-05-09')
    expect(toStr(new Date('2024-09-05'))).toBe('2024-09-05')
  })

  it('unwraps String objects', () => {
    expect(toStr(new String('hello'))).toBe('hello')
    expect(toStr(new String('world'))).toBe('world')
    expect(toStr(new String(''))).toBe('')
    expect(toStr(new String('123'))).toBe('123')
    expect(toStr(new String('Hello World'))).toBe('Hello World')
    expect(toStr(new String('   '))).toBe('   ')
    expect(toStr(new String('!@#$%'))).toBe('!@#$%')
  })

  it('unwraps Number objects', () => {
    expect(toStr(new Number(123))).toBe('123')
    expect(toStr(new Number(-456))).toBe('-456')
    expect(toStr(new Number(0))).toBe('0')
    expect(toStr(new Number(3.14))).toBe('3.14')
    expect(toStr(new Number(-2.718))).toBe('-2.718')
    expect(toStr(new Number(Infinity))).toBe('Infinity')
    expect(toStr(new Number(-Infinity))).toBe('-Infinity')
    expect(toStr(new Number(NaN))).toBe('NaN')
  })

  it('unwraps Boolean objects', () => {
    expect(toStr(new Boolean(true))).toBe('true')
    expect(toStr(new Boolean(false))).toBe('false')
  })

  it('serialises everything else as a JS literal', () => {
    expect(toStr(123)).toBe('123')
    expect(toStr(-456)).toBe('-456')
    expect(toStr(0)).toBe('0')
    expect(toStr(3.14)).toBe('3.14')
    expect(toStr(-2.718)).toBe('-2.718')
    expect(toStr(Infinity)).toBe('Infinity')
    expect(toStr(-Infinity)).toBe('-Infinity')
    expect(toStr(NaN)).toBe('NaN')
    expect(toStr(true)).toBe('true')
    expect(toStr(false)).toBe('false')
    expect(toStr([])).toBe('[]')
    expect(toStr([1, 2, 3])).toBe('[1,2,3]')
    expect(toStr(['a', 'b', 'c'])).toBe('["a","b","c"]')
    expect(toStr([1, 'hello', true])).toBe('[1,"hello",true]')
    expect(
      toStr([
        [1, 2],
        [3, 4],
      ]),
    ).toBe('[[1,2],[3,4]]')
    expect(toStr({ name: 'John', age: 30 })).toBe('{name: "John", age: 30}')
    expect(toStr(/test/)).toBe('/test/')
    expect(toStr(/hello/g)).toBe('/hello/g')
    expect(toStr(new RegExp('test'))).toBe('/test/')
  })

  it('handles nested objects and arrays', () => {
    expect(
      toStr({
        name: 'John',
        age: new Number(30),
        isActive: new Boolean(true),
        birthDate: new Date('1994-01-15'),
        tags: new String('developer,engineer'),
        scores: [85, 92, 78],
      }),
    ).toBe(
      '{name: "John", age: new Number(30), isActive: new Boolean(true), birthDate: new Date("1994-01-15T00:00:00.000Z"), tags: new String("developer,engineer"), scores: [85,92,78]}',
    )
  })

  it('reads dates in UTC whatever the machine timezone is', () => {
    // These two pin the behaviour for every possible host offset: the first breaks
    // under any negative offset, the second under any positive one. Together they are
    // the regression test for the old local-getter implementation, which turned
    // `new Date('2025-01-01')` into `2024-12-31` west of Greenwich.
    expect(toStr(new Date('2025-06-15T00:00:00.000Z'))).toBe('2025-06-15')
    expect(toStr(new Date('2025-06-15T23:59:59.999Z'))).toBe('2025-06-15')
  })

  it('renders an Invalid Date as nothing', () => {
    expect(toStr(new Date('not a date'))).toBe('')
    expect(toStr(new Date(NaN))).toBe('')
  })

  it('handles bigints', () => {
    expect(toStr(10n)).toBe('10')
    expect(toStr(-9007199254740993n)).toBe('-9007199254740993')
    expect(toStr([1n, 2n])).toBe('[1,2]')
  })

  it('handles symbols', () => {
    expect(toStr(Symbol('tag'))).toBe('Symbol(tag)')
    expect(toStr(Symbol())).toBe('Symbol()')
    expect(toStr({ key: Symbol('tag') })).toBe('{key: Symbol(tag)}')
  })

  it('handles functions', () => {
    expect(toStr(function named() {})).toBe('[Function: named]')
    expect(toStr(function () {})).toBe('[Function (anonymous)]')
    expect(toStr(() => 1)).toBe('[Function (anonymous)]')
    expect(toStr(Math.max)).toBe('[Function: max]')
    expect(toStr({ run: function go() {} })).toBe('{run: [Function: go]}')
  })

  it('handles Map', () => {
    expect(
      toStr(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
      ),
    ).toBe('new Map([["a",1],["b",2]])')
    expect(toStr(new Map())).toBe('new Map([])')
    expect(toStr(new Map<unknown, unknown>([[1, { x: 1 }]]))).toBe(
      'new Map([[1,{x: 1}]])',
    )
  })

  it('handles Set', () => {
    expect(toStr(new Set([1, 'a', true]))).toBe('new Set([1,"a",true])')
    expect(toStr(new Set())).toBe('new Set([])')
    expect(toStr(new Set([[1, 2]]))).toBe('new Set([[1,2]])')
  })

  it('reports circular references without recursing forever', () => {
    const self: Record<string, unknown> = { name: 'loop' }
    self.self = self
    expect(toStr(self)).toBe('{name: "loop", self: [Circular]}')

    const arr: unknown[] = [1]
    arr.push(arr)
    expect(toStr(arr)).toBe('[1,[Circular]]')

    const parent: Record<string, unknown> = {}
    const child = { parent }
    parent.child = child
    expect(toStr(parent)).toBe('{child: {parent: [Circular]}}')

    const map = new Map<string, unknown>()
    map.set('me', map)
    expect(toStr(map)).toBe('new Map([["me",[Circular]]])')
  })

  it('does not mistake a repeated sibling for a cycle', () => {
    const shared = { x: 1 }
    expect(toStr([shared, shared])).toBe('[{x: 1},{x: 1}]')
    expect(toStr({ a: shared, b: shared })).toBe('{a: {x: 1}, b: {x: 1}}')
    expect(toStr(new Set([shared]).add(shared))).toBe('new Set([{x: 1}])')
    expect(toStr([[shared], [shared]])).toBe('[[{x: 1}],[{x: 1}]]')
  })

  it('handles objects with no or unusual keys', () => {
    expect(toStr({})).toBe('{}')
    expect(toStr({ 'foo-bar': 1 })).toBe('{"foo-bar": 1}')
    // Integer-like keys come first in `Object.keys` order, whatever the source order.
    expect(toStr({ 'foo-bar': 1, 2: 3, b: 2 })).toBe(
      '{"2": 3, "foo-bar": 1, b: 2}',
    )
    expect(toStr({ $a: 1, _b: 2, C3: 3 })).toBe('{$a: 1, _b: 2, C3: 3}')
    expect(toStr({ 'with space': 1, 'quote"': 2 })).toBe(
      '{"with space": 1, "quote\\"": 2}',
    )
    expect(toStr({ [Symbol('hidden')]: 1, shown: 2 })).toBe('{shown: 2}')
  })

  it('handles a null-prototype object', () => {
    const bare = Object.create(null) as Record<string, unknown>
    expect(toStr(bare)).toBe('{}')
    bare.a = 1
    bare.b = 'two'
    expect(toStr(bare)).toBe('{a: 1, b: "two"}')
  })

  it('handles class instances like plain objects', () => {
    class Point {
      constructor(
        readonly x: number,
        readonly y: number,
      ) {}
    }
    expect(toStr(new Point(1, 2))).toBe('{x: 1, y: 2}')
  })

  it('never throws on a getter that throws', () => {
    const trap = {
      ok: 1,
      get boom(): number {
        throw new Error('nope')
      },
      after: 2,
    }
    expect(toStr(trap)).toBe('{ok: 1, boom: [Unreadable], after: 2}')
    expect(toStr([trap])).toBe('[{ok: 1, boom: [Unreadable], after: 2}]')
  })

  it('handles null and undefined nested in arrays and objects', () => {
    expect(toStr([null, undefined, [null, undefined]])).toBe(
      '[null,undefined,[null,undefined]]',
    )
    expect(toStr({ a: null, b: undefined })).toBe('{a: null, b: undefined}')
  })

  it('escapes strings it quotes', () => {
    expect(toStr(['a"b'])).toBe('["a\\"b"]')
    expect(toStr(['line\nbreak'])).toBe('["line\\nbreak"]')
    expect(toStr(['tab\there'])).toBe('["tab\\there"]')
  })
})

describe('literal', () => {
  it('quotes strings and names the empty values', () => {
    expect(literal('hello')).toBe('"hello"')
    expect(literal('')).toBe('""')
    expect(literal(null)).toBe('null')
    expect(literal(undefined)).toBe('undefined')
  })

  it('writes numbers, bigints and booleans verbatim', () => {
    expect(literal(30)).toBe('30')
    expect(literal(-2.718)).toBe('-2.718')
    expect(literal(NaN)).toBe('NaN')
    expect(literal(Infinity)).toBe('Infinity')
    expect(literal(-Infinity)).toBe('-Infinity')
    expect(literal(42n)).toBe('42')
    expect(literal(true)).toBe('true')
    expect(literal(false)).toBe('false')
  })

  it('keeps boxed primitives boxed', () => {
    expect(literal(new String('x'))).toBe('new String("x")')
    expect(literal(new Number(30))).toBe('new Number(30)')
    expect(literal(new Number(NaN))).toBe('new Number(NaN)')
    expect(literal(new Boolean(true))).toBe('new Boolean(true)')
    expect(literal(new Boolean(false))).toBe('new Boolean(false)')
  })

  it('writes dates as constructor calls', () => {
    expect(literal(new Date('1994-01-15'))).toBe(
      'new Date("1994-01-15T00:00:00.000Z")',
    )
    expect(literal(new Date('2025-06-15T12:30:45.678Z'))).toBe(
      'new Date("2025-06-15T12:30:45.678Z")',
    )
    expect(literal(new Date('not a date'))).toBe('new Date(NaN)')
    expect(literal({ d: new Date(NaN) })).toBe('{d: new Date(NaN)}')
  })

  it('writes regular expressions in source form', () => {
    expect(literal(/test/)).toBe('/test/')
    expect(literal(/hello/gi)).toBe('/hello/gi')
    expect(literal(new RegExp('a\\d+', 'u'))).toBe('/a\\d+/u')
  })
})

describe('values from another realm', () => {
  // User expressions run inside a `node:vm` context, which has its own `Date`, `Map`,
  // `RegExp` and so on. `instanceof` is false for every one of them, so a `toStr` written
  // around `instanceof` rendered `new Date('2025-01-01')` as `{}` and `new Map([[1,2]])`
  // as `{}` — silently, in the user's document. Everything below is built inside the
  // sandbox exactly as a transform would build it.
  const context = createContext({})

  /** Evaluates `code` inside a separate realm and returns the value it produced. */
  function inSandbox(code: string): unknown {
    return new Script(`(${code})`).runInContext(context)
  }

  it('formats a sandbox Date', () => {
    expect(toStr(inSandbox('new Date("2024-12-25")'))).toBe('2024-12-25')
    expect(toStr(inSandbox('new Date("not a date")'))).toBe('')
    expect(literal(inSandbox('new Date("1994-01-15")'))).toBe(
      'new Date("1994-01-15T00:00:00.000Z")',
    )
    expect(literal(inSandbox('new Date(NaN)'))).toBe('new Date(NaN)')
  })

  it('formats a sandbox RegExp', () => {
    expect(toStr(inSandbox('/test/'))).toBe('/test/')
    expect(toStr(inSandbox('/hello/gi'))).toBe('/hello/gi')
    expect(literal(inSandbox('new RegExp("a\\\\d+", "u")'))).toBe('/a\\d+/u')
  })

  it('formats a sandbox Map and Set', () => {
    expect(toStr(inSandbox('new Map([["a", 1], ["b", 2]])'))).toBe(
      'new Map([["a",1],["b",2]])',
    )
    expect(toStr(inSandbox('new Map()'))).toBe('new Map([])')
    expect(toStr(inSandbox('new Set([1, "a", true])'))).toBe(
      'new Set([1,"a",true])',
    )
    expect(toStr(inSandbox('new Set()'))).toBe('new Set([])')
  })

  it('unwraps a sandbox boxed primitive', () => {
    expect(toStr(inSandbox('new String("hello")'))).toBe('hello')
    expect(toStr(inSandbox('new Number(3.14)'))).toBe('3.14')
    expect(toStr(inSandbox('new Boolean(false)'))).toBe('false')
    expect(literal(inSandbox('new String("x")'))).toBe('new String("x")')
    expect(literal(inSandbox('new Number(30)'))).toBe('new Number(30)')
    expect(literal(inSandbox('new Boolean(true)'))).toBe('new Boolean(true)')
  })

  it('formats a sandbox array and plain object', () => {
    expect(toStr(inSandbox('[1, "a", true]'))).toBe('[1,"a",true]')
    expect(toStr(inSandbox('({ name: "John", age: 30 })'))).toBe(
      '{name: "John", age: 30}',
    )
  })

  it('formats a sandbox structure with every kind nested inside it', () => {
    const nested = inSandbox(`({
      when: new Date("1994-01-15"),
      what: /x/g,
      counts: new Map([["a", 1]]),
      tags: new Set(["t"]),
      boxed: new Number(7),
      list: [new Date("2020-02-02")],
    })`)
    expect(toStr(nested)).toBe(
      '{when: new Date("1994-01-15T00:00:00.000Z"), what: /x/g, counts: new Map([["a",1]]), tags: new Set(["t"]), boxed: new Number(7), list: [new Date("2020-02-02T00:00:00.000Z")]}',
    )
  })

  it('still detects a cycle built in the sandbox', () => {
    expect(
      toStr(inSandbox('(() => { const a = {n: 1}; a.self = a; return a })()')),
    ).toBe('{n: 1, self: [Circular]}')
  })

  it('is not fooled by a faked Symbol.toStringTag', () => {
    // The internal slot is what is probed, not the tag, so an object claiming to be a
    // Date renders as the plain object it is instead of throwing on `getTime`.
    expect(toStr({ [Symbol.toStringTag]: 'Date', a: 1 })).toBe('{a: 1}')
    expect(toStr({ [Symbol.toStringTag]: 'Map', a: 1 })).toBe('{a: 1}')
    expect(literal({ [Symbol.toStringTag]: 'RegExp', a: 1 })).toBe('{a: 1}')
  })
})
