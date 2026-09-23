import { describe, expect, it } from 'bun:test'
import { expandShorthand } from '../../transform/shorthand'

describe('expandShorthand — arithmetic prefixes bind to n', () => {
  it('expands the multiplicative operators', () => {
    expect(expandShorthand('*3')).toBe('n*3')
    expect(expandShorthand('/2')).toBe('n/2')
    expect(expandShorthand('%7')).toBe('n%7')
    expect(expandShorthand('**2')).toBe('n**2')
  })

  it('expands the additive operators, reading them as arithmetic', () => {
    expect(expandShorthand('+1')).toBe('n+1')
    expect(expandShorthand('-1')).toBe('n-1')
  })

  it('expands whatever follows the operator, spaces and all', () => {
    expect(expandShorthand('* 3 + 1')).toBe('n* 3 + 1')
    expect(expandShorthand('- 1')).toBe('n- 1')
    expect(expandShorthand('+ i * 2')).toBe('n+ i * 2')
  })

  it('expands an expression that continues past the first operand', () => {
    expect(expandShorthand('-1 + n')).toBe('n-1 + n')
  })
})

describe('expandShorthand — member prefixes bind to s', () => {
  it('expands a leading dot', () => {
    expect(expandShorthand('.trim()')).toBe('s.trim()')
    expect(expandShorthand(".padStart(3,'0')")).toBe("s.padStart(3,'0')")
    expect(expandShorthand('.length')).toBe('s.length')
  })

  it('expands optional chaining', () => {
    expect(expandShorthand('?.length')).toBe('s?.length')
    expect(expandShorthand('?.trim()')).toBe('s?.trim()')
  })

  it('leaves a leading bracket alone', () => {
    // Indexing and array literals both start with `[`, and the literal wins on real
    // usage: `[...s].length` is the documented way to count characters rather than
    // UTF-16 code units, and rewriting it to `s[...s].length` would break it.
    expect(expandShorthand('[...s].length')).toBe('[...s].length')
    expect(expandShorthand('[0]')).toBe('[0]')
    expect(expandShorthand('[1, 2, 3].join(s)')).toBe('[1, 2, 3].join(s)')
    expect(expandShorthand('[...s].reverse().join("")')).toBe(
      '[...s].reverse().join("")',
    )
  })

  it('leaves a number literal starting with a dot alone', () => {
    expect(expandShorthand('.5')).toBe('.5')
    expect(expandShorthand('.0')).toBe('.0')
    expect(expandShorthand('.9 * n')).toBe('.9 * n')
  })
})

describe('expandShorthand — leading slash', () => {
  it('treats a closed slash pair as a regex literal', () => {
    expect(expandShorthand('/a/.test(s)')).toBe('/a/.test(s)')
    expect(expandShorthand('/[aeiou]/g')).toBe('/[aeiou]/g')
    expect(expandShorthand("s.replace(/x/, 'y')")).toBe("s.replace(/x/, 'y')")
    expect(expandShorthand('/[^/]+$/.exec(s)')).toBe('/[^/]+$/.exec(s)')
    expect(expandShorthand('/\\//.test(s)')).toBe('/\\//.test(s)')
  })

  it('treats an unclosed slash as division', () => {
    expect(expandShorthand('/2')).toBe('n/2')
    expect(expandShorthand('/ 100')).toBe('n/ 100')
    expect(expandShorthand('/2 + 1')).toBe('n/2 + 1')
  })

  it('leaves a leading comment alone', () => {
    expect(expandShorthand('// just a comment')).toBe('// just a comment')
    expect(expandShorthand('/* note */ s')).toBe('/* note */ s')
  })
})

describe('expandShorthand — inputs that must pass through untouched', () => {
  it('leaves complete expressions alone', () => {
    const untouched = [
      's',
      'n*3',
      'n - 1',
      'upper(s)',
      'letter(i)',
      'convnum.toRoman(n)',
      's.trim()',
      's[0]',
      '(1+2)*3',
      '([1, 2, 3])[i0]',
      '{ a: 1 }',
      'i > 1 ? s : upper(s)',
      '`item ${i}`',
    ]
    for (const code of untouched) {
      expect(expandShorthand(code)).toBe(code)
    }
  })

  it('never rewrites operators or helper names inside string literals', () => {
    expect(expandShorthand("s.replace('upper', 'x')")).toBe(
      "s.replace('upper', 'x')",
    )
    expect(expandShorthand("s.replace('*', 'x')")).toBe("s.replace('*', 'x')")
    expect(expandShorthand('"*3"')).toBe('"*3"')
    expect(expandShorthand("'-1' + s")).toBe("'-1' + s")
    expect(expandShorthand('s + ".trim()"')).toBe('s + ".trim()"')
  })
})

describe('expandShorthand — whitespace and multi-line', () => {
  it('trims the source before testing the prefix', () => {
    expect(expandShorthand('  *3')).toBe('n*3')
    expect(expandShorthand('\t.trim()  ')).toBe('s.trim()')
  })

  it('returns the trimmed form of an expression it does not expand', () => {
    expect(expandShorthand('  upper(s)  ')).toBe('upper(s)')
  })

  it('returns an empty string for empty or blank input', () => {
    expect(expandShorthand('')).toBe('')
    expect(expandShorthand('   ')).toBe('')
    expect(expandShorthand('\n\n')).toBe('')
  })

  it('never expands multi-line source', () => {
    const advanced = '// header\nconst x = 1\nx + s'
    expect(expandShorthand(advanced)).toBe(advanced)
    expect(expandShorthand('*3\n*4')).toBe('*3\n*4')
    expect(expandShorthand('.trim()\r\n.toUpperCase()')).toBe(
      '.trim()\r\n.toUpperCase()',
    )
  })
})
