import { describe, expect, it } from 'bun:test'
import { isBlankExpression, runTransform } from '../../transform'
import type { SelectionSnapshot } from '../../transform/vars'

/** Builds a snapshot as if each string were selected on its own consecutive line. */
function snapshotOf(
  texts: string[],
  options: { firstLine?: number; wholeLines?: string[] } = {},
): SelectionSnapshot {
  const firstLine = options.firstLine ?? 0
  return {
    texts,
    wholeLines: options.wholeLines ?? texts,
    startLines: texts.map((_, index) => firstLine + index),
  }
}

/** Runs a transform and returns the resulting strings, throwing on a compile error. */
function transform(texts: string[], code: string): (string | null)[] {
  const result = runTransform(snapshotOf(texts), code)
  if (!result.ok) {
    throw new Error(`expected ${code} to compile: ${result.message}`)
  }
  return result.items.map((item) => (item.ok ? item.text : null))
}

describe('runTransform', () => {
  it('evaluates a plain expression once per selection', () => {
    expect(transform(['1', '2', '3'], 'n * 3')).toEqual(['3', '6', '9'])
  })

  it('reports a syntax error instead of failing each selection', () => {
    const result = runTransform(snapshotOf(['a']), 'n *')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('returns no items for no selections', () => {
    const result = runTransform(snapshotOf([]), 'n')
    expect(result).toEqual({ ok: true, items: [] })
  })

  describe('variables', () => {
    it('exposes the selected text and its numeric reading', () => {
      expect(transform(['abc123def'], 's')).toEqual(['abc123def'])
      expect(transform(['abc123def'], 'n')).toEqual(['123'])
      expect(transform(['nope'], 'n')).toEqual(['NaN'])
    })

    it('numbers selections in document order', () => {
      expect(transform(['a', 'b', 'c'], 'i')).toEqual(['1', '2', '3'])
      expect(transform(['a', 'b', 'c'], 'i0')).toEqual(['0', '1', '2'])
      expect(transform(['a', 'b', 'c'], 'l')).toEqual(['3', '3', '3'])
    })

    it('exposes every selection through ss', () => {
      expect(
        transform(['1', '2', '3'], 'ss.map(number).reduce((a,b)=>a+b,0)'),
      ).toEqual(['6', '6', '6'])
    })

    it('reports lines relative to the first selection and to the file', () => {
      const snapshot = snapshotOf(['a', 'b'], { firstLine: 10 })
      const relative = runTransform(snapshot, 'li')
      const absolute = runTransform(snapshot, 'fli')
      expect(relative.ok && relative.items.map((i) => i.ok && i.text)).toEqual([
        '1',
        '2',
      ])
      expect(absolute.ok && absolute.items.map((i) => i.ok && i.text)).toEqual([
        '11',
        '12',
      ])
    })

    it('exposes the whole line, length and word count', () => {
      const snapshot = snapshotOf(['world'], {
        wholeLines: ['hello world again'],
      })
      const whole = runTransform(snapshot, 'wl')
      expect(whole.ok && whole.items[0].ok && whole.items[0].text).toBe(
        'hello world again',
      )
      expect(transform(['hello'], 'len')).toEqual(['5'])
      expect(transform(['你好'], 'len')).toEqual(['2'])
      expect(transform(['hello there world'], 'wc')).toEqual(['3'])
      expect(transform([''], 'wc')).toEqual(['0'])
    })

    it('reads the selection in whatever numeral system it is written in', () => {
      // `n` strips everything that is not a digit; `cn` asks convnum what the text is.
      expect(transform(['IV', 'XIV'], 'cn')).toEqual(['4', '14'])
      expect(transform(['十二'], 'cn')).toEqual(['12'])
      expect(transform(['0xff'], 'cn')).toEqual(['255'])
      expect(transform(['Wednesday'], 'cn')).toEqual(['3'])
      expect(transform(['one hundred'], 'cn')).toEqual(['100'])
      expect(transform(['IV'], 'cn * 2')).toEqual(['8'])
    })

    it('gives NaN rather than throwing for text it cannot read', () => {
      // One selection nothing recognises must not take the rest of the batch with it.
      expect(transform(['nope'], 'cn')).toEqual(['NaN'])
      expect(transform(['IV', 'nope', 'XIV'], 'cn')).toEqual(['4', 'NaN', '14'])
    })

    it('differs from n where the text is not written in digits', () => {
      expect(transform(['IV'], 'n')).toEqual(['NaN'])
      expect(transform(['IV'], 'cn')).toEqual(['4'])
      // And agrees where it is.
      expect(transform(['42'], 'n')).toEqual(['42'])
      expect(transform(['42'], 'cn')).toEqual(['42'])
    })

    it('exposes convnum', () => {
      expect(transform(['4'], 'convnum.toRoman(n)')).toEqual(['IV'])
      expect(transform(['42'], 'convnum.toEnglishWords(n)')).toEqual([
        'forty-two',
      ])
      expect(transform(['123'], 'convnum.toChineseWords(n)')).toEqual([
        '一百二十三',
      ])
    })
  })

  describe('shorthand', () => {
    it('binds a leading arithmetic operator to n', () => {
      expect(transform(['2', '3'], '*3')).toEqual(['6', '9'])
      expect(transform(['5'], '+1')).toEqual(['6'])
      expect(transform(['5'], '-1')).toEqual(['4'])
      expect(transform(['8'], '/2')).toEqual(['4'])
      expect(transform(['7'], '%3')).toEqual(['1'])
      expect(transform(['3'], '**2')).toEqual(['9'])
    })

    it('binds a leading member access to s', () => {
      expect(transform(['  padded  '], '.trim()')).toEqual(['padded'])
      expect(transform(['abc'], '.toUpperCase()')).toEqual(['ABC'])
    })

    it('leaves a complete expression alone', () => {
      expect(transform(['abc'], "s.replace('*', 'x')")).toEqual(['abc'])
      expect(transform(['2'], 'n*3')).toEqual(['6'])
    })
  })

  describe('bare functions', () => {
    it('applies a string helper to s', () => {
      expect(transform(['hello'], 'upper')).toEqual(['HELLO'])
      expect(transform(['HELLO'], 'lower')).toEqual(['hello'])
    })

    it('applies a number helper to n', () => {
      expect(transform(['1', '2'], 'letter')).toEqual(['A', 'B'])
      expect(transform(['3'], 'lowerletter')).toEqual(['c'])
    })

    it('applies a bare convnum converter', () => {
      expect(transform(['4'], 'convnum.toRoman')).toEqual(['IV'])
      expect(transform(['IV'], 'convnum.fromRoman')).toEqual(['4'])
    })

    it('leaves a function the user wrote inline uncalled', () => {
      // Visible feedback that a call is missing, rather than a guess about which
      // variable it wanted.
      const [only] = transform(['abc'], '(x) => x')
      expect(only).toContain('[Function')
    })
  })

  describe('per-selection failures', () => {
    it('fails only the selections whose evaluation threw', () => {
      const result = runTransform(
        snapshotOf(['a', 'b']),
        'i0 === 0 ? s : null.x',
      )
      expect(result.ok).toBe(true)
      if (!result.ok) {
        return
      }
      expect(result.items[0]).toEqual({ ok: true, text: 'a' })
      expect(result.items[1].ok).toBe(false)
    })

    it('reports a helper that throws once applied', () => {
      const result = runTransform(snapshotOf(['0']), 'convnum.toRoman')
      expect(result.ok).toBe(true)
      if (!result.ok) {
        return
      }
      // convnum rejects 0; the failure has to surface as a failed item, not a crash.
      expect(result.items[0].ok).toBe(false)
    })
  })

  describe('result conversion', () => {
    it('renders undefined and null as empty text', () => {
      expect(transform(['a'], 'undefined')).toEqual([''])
      expect(transform(['a'], 'null')).toEqual([''])
    })

    it('renders a Date as YYYY-MM-DD', () => {
      expect(transform(['a'], "new Date('2024-12-25')")).toEqual(['2024-12-25'])
    })

    it('renders structured values as JavaScript literals', () => {
      expect(transform(['a'], '[1, 2, 3]')).toEqual(['[1,2,3]'])
      expect(transform(['a'], '({ x: 1 })')).toEqual(['{x: 1}'])
    })
  })

  describe('multi-statement code', () => {
    it('returns the value of the last statement', () => {
      expect(transform(['2'], 'const doubled = n * 2\ndoubled + 1')).toEqual([
        '5',
      ])
    })

    it('honours an explicit return', () => {
      expect(
        transform(['2'], 'if (n > 1) { return "big" }\nreturn "small"'),
      ).toEqual(['big'])
    })

    it('refuses to blank a selection when the code produced no value', () => {
      // Each of these is a well-formed statement list whose value-bearing line is not
      // the last one. They all used to succeed with the empty string, so every selection
      // was replaced with nothing and no warning was shown.
      const silentlyEmpty = [
        'if (len > 3) {\n  s.toUpperCase()\n} else {\n  s\n}',
        "switch (i) { case 1: 'a'; break; default: 'b' }",
        "try { s } catch (e) { '' }",
        'const tidy = function () { return upper(s) }',
      ]
      for (const code of silentlyEmpty) {
        const result = runTransform(snapshotOf(['hello']), code)
        expect(result.ok).toBe(true)
        if (!result.ok) {
          continue
        }
        expect(result.items[0]?.ok).toBe(false)
        expect(
          result.items[0]?.ok === false && result.items[0].message,
        ).toMatch(/no value/i)
      }
    })

    it('still clears the selection when an expression evaluates to nothing', () => {
      expect(transform(['a'], 'undefined')).toEqual([''])
      expect(transform(['a'], 'void 0')).toEqual([''])
      expect(transform(['a'], '')).toEqual([''])
      expect(transform(['a'], '// only a comment')).toEqual([''])
    })

    it('ignores comments, including a triple-slash reference', () => {
      const code = [
        '/// <reference path="/tmp/rt.d.ts" />',
        '// a comment mentioning upper and n*3',
        '/* and a block one */',
        'upper(s)',
      ].join('\n')
      expect(transform(['abc'], code)).toEqual(['ABC'])
    })
  })

  describe('ss is a copy, not the live selection list', () => {
    // The snapshot outlives the transform: the same object is reused for every debounced
    // preview and for the final apply. Handing user code the array itself meant one
    // `ss.reverse()` scrambled the source data for every later run.
    it('reads the same order for every selection', () => {
      // `["y", "y"]` was the old answer: the first selection reversed the array, so the
      // second one indexed into the reversed copy.
      expect(transform(['x', 'y'], '[...ss].reverse()[i0]')).toEqual(['y', 'x'])
    })

    it('gives consecutive runs the same answer', () => {
      // The preview and the apply are two runs over one snapshot. They used to
      // alternate between the reversed and the original order.
      const snapshot = snapshotOf(['a', 'b', 'c'])
      const runs = [0, 1, 2].map(() =>
        runTransform(snapshot, '[...ss].reverse()[i0]'),
      )
      for (const run of runs) {
        expect(run.ok && run.items.map((item) => item.ok && item.text)).toEqual(
          ['c', 'b', 'a'],
        )
      }
    })

    it('leaves the snapshot untouched for the next expression', () => {
      const snapshot = snapshotOf(['c', 'a', 'b'])
      runTransform(snapshot, 'ss.sort()[i0]')
      const after = runTransform(snapshot, 's')
      expect(
        after.ok && after.items.map((item) => item.ok && item.text),
      ).toEqual(['c', 'a', 'b'])
      expect(snapshot.texts).toEqual(['c', 'a', 'b'])
    })

    it('reports a mutation instead of quietly applying it', () => {
      // Frozen, so a mutating method throws on the selection that tried it rather than
      // silently changing what every later selection sees.
      const result = runTransform(snapshotOf(['x', 'y']), 'ss.reverse()[i0]')
      expect(result.ok).toBe(true)
      expect(result.ok && result.items.every((item) => !item.ok)).toBe(true)
    })

    it('still allows every read-only use of ss', () => {
      expect(transform(['1', '2', '3'], 'ss.length')).toEqual(['3', '3', '3'])
      expect(transform(['a', 'b'], 'ss.join("-")')).toEqual(['a-b', 'a-b'])
      expect(transform(['a', 'b'], '[...ss].reverse().join("")')).toEqual([
        'ba',
        'ba',
      ])
    })
  })

  describe('code that never finishes', () => {
    it('stops a selection count that user code tries to extend', () => {
      // The loop used to re-read `snapshot.texts.length` every iteration, so `ss.push`
      // grew the very list it was walking and the transform never returned.
      const result = runTransform(snapshotOf(['a', 'b']), 'ss.push(s), s')
      expect(result.ok).toBe(true)
      expect(result.ok && result.items.length).toBe(2)
    })

    it('stops an endless loop instead of freezing the extension host', () => {
      const result = runTransform(
        snapshotOf(['64']),
        'let x = n\nwhile (x > 1) {\n}\nx',
      )
      expect(result.ok).toBe(false)
      expect(result.ok === false && result.message).toMatch(/stopped after/i)
    })
  })
})

describe('regressions', () => {
  it('never writes the word return into a multi-line template literal', () => {
    // Prefixing the last physical line put `return ` inside the string the user was
    // building, and the result still parsed, so nothing caught it.
    expect(
      transform(
        ['ab'],
        'const label = upper(s);\n`Line 1: ${label}\nLine 2: ${i}`',
      ),
    ).toEqual(['Line 1: AB\nLine 2: 1'])
    expect(
      transform(
        ['ab'],
        'const label = upper(s);\nreturn `Line 1: ${label}\nLine 2: ${i}`',
      ),
    ).toEqual(['Line 1: AB\nLine 2: 1'])
  })

  it('honours a return from inside a block', () => {
    expect(
      transform(['ab'], 'try {\n  return upper(s)\n} finally {\n}'),
    ).toEqual(['AB'])
  })

  it('lets an explicit return of undefined insert nothing', () => {
    // `return m?.[0]` meaning "nothing when there is no match" is a reasonable thing to
    // write, and the no-value guard used to reject it while telling the user to add the
    // return they had already written.
    expect(transform(['a'], 'const m = s.match(/z/)\nreturn m?.[0]')).toEqual([
      '',
    ])
    expect(transform(['a'], 'return undefined')).toEqual([''])
  })

  it('still refuses a return that belongs to a nested function', () => {
    const result = runTransform(
      snapshotOf(['hello']),
      'const tidy = function () { return upper(s) }',
    )
    expect(result.ok).toBe(true)
    expect(result.ok && result.items[0]?.ok).toBe(false)
  })

  it('points a multi-line syntax error at the real mistake', () => {
    // The expression candidate dies on the first statement keyword whatever is wrong
    // further down, so its complaint is useless for a script.
    const result = runTransform(
      snapshotOf(['a']),
      'const parts = s.split("-"\nparts.join()',
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).not.toMatch(/'const'/)
  })
})

describe('isBlankExpression', () => {
  it('treats whitespace and comments as blank', () => {
    expect(isBlankExpression('')).toBe(true)
    expect(isBlankExpression('   \n\t  ')).toBe(true)
    expect(isBlankExpression('// nothing here')).toBe(true)
    expect(isBlankExpression('/* nothing */')).toBe(true)
    expect(
      isBlankExpression('/// <reference path="x" />\n// docs\n\n/* more */\n'),
    ).toBe(true)
  })

  it('treats any code at all as non-blank', () => {
    expect(isBlankExpression('s')).toBe(false)
    expect(isBlankExpression('// comment\nn * 3')).toBe(false)
    // Errs towards non-blank when a string literal contains a comment marker, which is
    // the safe direction: the expression gets evaluated rather than silently discarded.
    expect(isBlankExpression("s.replace('//', '')")).toBe(false)
  })
})
