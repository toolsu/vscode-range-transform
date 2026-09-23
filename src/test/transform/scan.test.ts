import { describe, expect, it } from 'bun:test'
import { scan } from '../../transform/scan'

/** The text of the last top-level statement, which is what the caller prefixes. */
function last(code: string): string | null {
  const { lastStatementStart } = scan(code)
  return lastStatementStart < 0 ? null : code.slice(lastStatementStart)
}

function returns(code: string): boolean {
  return scan(code).hasReturn
}

describe('scan — last top-level statement', () => {
  it('finds the only statement', () => {
    expect(last('s')).toBe('s')
    expect(last('n * 3')).toBe('n * 3')
  })

  it('reports nothing for a source with no code', () => {
    expect(last('')).toBeNull()
    expect(last('   \n\t ')).toBeNull()
    expect(last('// just a comment')).toBeNull()
    expect(last('/* nothing\n   here */')).toBeNull()
    expect(
      last('/// <reference path="/x/rt.d.ts" />\n// and more\n'),
    ).toBeNull()
  })

  it('splits on a newline at top level', () => {
    expect(last('const a = 1\na + 1')).toBe('a + 1')
    expect(last('let x = n\nx * 2')).toBe('x * 2')
  })

  it('splits on a semicolon at top level', () => {
    expect(last('const a = 1; a + 1')).toBe('a + 1')
  })

  it('skips leading comments and blank lines', () => {
    expect(last('const a = 1\n\n// why\nupper(s)')).toBe('upper(s)')
    expect(last('const a = 1\n/* block */ upper(s)')).toBe('upper(s)')
  })

  it('ignores a trailing comment', () => {
    expect(last('const a = 1\nupper(s)\n// done')).toBe('upper(s)\n// done')
  })

  describe('literals are not statement boundaries', () => {
    it('a multi-line template literal stays whole', () => {
      // The defect this module exists for: prefixing the last *line* here would put the
      // word `return ` inside the string the user is building, and the result still
      // parses, so nothing catches it.
      const code = 'const label = upper(s)\n`Line 1: ${label}\nLine 2: ${i}`'
      expect(last(code)).toBe('`Line 1: ${label}\nLine 2: ${i}`')
    })

    it('handles a substitution containing braces and newlines', () => {
      const code = 'const a = 1\n`x ${ { k: [1,\n2] } } y\nz`'
      expect(last(code)).toBe('`x ${ { k: [1,\n2] } } y\nz`')
    })

    it('handles nested templates', () => {
      const code = 'const a = 1\n`outer ${`inner\nline`} end`'
      expect(last(code)).toBe('`outer ${`inner\nline`} end`')
    })

    it('handles escaped backticks and dollars', () => {
      const code = 'const a = 1\n`a \\` b \\${ c`'
      expect(last(code)).toBe('`a \\` b \\${ c`')
    })

    it('a semicolon inside a string is not a boundary', () => {
      expect(last('s.replace(";", "!")')).toBe('s.replace(";", "!")')
      expect(last("s.split(';')")).toBe("s.split(';')")
    })

    it('a comment marker inside a string is not a comment', () => {
      expect(last('const a = 1\ns.replace("//", "") + "/* x */"')).toBe(
        's.replace("//", "") + "/* x */"',
      )
    })
  })

  describe('brackets are not statement boundaries', () => {
    it('a newline inside an argument list', () => {
      expect(last('const a = 1\nupper(\n  s\n)')).toBe('upper(\n  s\n)')
    })

    it('a newline inside a block', () => {
      const code = 'if (n > 1) {\n  upper(s)\n}'
      // The whole `if` is one top-level statement, so the caller ends up prefixing `if`,
      // which fails to parse and falls through to running the source as-is.
      expect(last(code)).toBe(code)
    })

    it('a newline inside an object literal', () => {
      expect(last('const a = 1\n({\n  k: s,\n})')).toBe('({\n  k: s,\n})')
    })
  })

  describe('regular expressions', () => {
    it('a slash after an operator opens a regex', () => {
      expect(last('const a = 1\ns.replace(/;/g, "")')).toBe(
        's.replace(/;/g, "")',
      )
    })

    it('a newline inside a character class is not a boundary', () => {
      expect(last('const a = 1\ns.replace(/[;\\n]/g, "")')).toBe(
        's.replace(/[;\\n]/g, "")',
      )
    })

    it('division is not a regex', () => {
      expect(last('const a = 4\na / 2')).toBe('a / 2')
    })
  })

  it('handles CRLF sources', () => {
    expect(last('const a = 1\r\na + 1')).toBe('a + 1')
  })
})

describe('scan — top-level return', () => {
  it('finds a return at the top level', () => {
    expect(returns('return s')).toBe(true)
    expect(returns('const a = 1\nreturn a')).toBe(true)
    expect(returns('return undefined')).toBe(true)
  })

  it('ignores a return inside a nested function', () => {
    // Counting this one would let `const tidy = function () { … }` erase every
    // selection in silence, which is the bug the value guard exists to catch.
    expect(returns('const tidy = function () { return upper(s) }')).toBe(false)
    expect(returns('const f = () => { return s }')).toBe(false)
  })

  it('ignores a return inside a string, template or comment', () => {
    expect(returns('"return s"')).toBe(false)
    expect(returns('`return ${s}`')).toBe(false)
    expect(returns('// return s')).toBe(false)
    expect(returns('/* return s */')).toBe(false)
  })

  it('does not match a longer identifier', () => {
    expect(returns('returnValue')).toBe(false)
    expect(returns('const myreturn = 1\nmyreturn')).toBe(false)
  })

  it('reports no return when there is none', () => {
    expect(returns('n * 3')).toBe(false)
    expect(returns('if (n > 1) {\n  upper(s)\n}')).toBe(false)
  })
})
