import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateSequence } from '../range'
import { runTransform } from '../transform'
import { VAR_NAMES, type SelectionSnapshot } from '../transform/vars'

// Everything the README states in a table, checked by reading that table.
//
// The hand-written half of this lives in `docs.test.ts` and covers prose claims. This
// file covers the tables, and does it by *parsing* them: a hand-copied list of rows
// silently stops covering a table the moment someone adds a row to it, and most of the
// rows in "What `start` can be" had never been run when this was written.

const repoRoot = process.cwd()
const README = readFileSync(join(repoRoot, 'README.md'), 'utf8')
const MANIFEST = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8'),
) as {
  contributes: {
    configuration: {
      properties: Record<string, { default: unknown }>
    }
  }
}

/** Every backticked token in `cell`, in order. */
function codes(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] as string)
}

/**
 * The rows of the markdown table that follows `heading`.
 *
 * The header row and the `---` separator are dropped by requiring a backtick somewhere
 * in the row, which every data row in every table here has and no header does.
 */
function tableUnder(heading: string): string[][] {
  const start = README.indexOf(heading)
  expect(start).toBeGreaterThanOrEqual(0)

  const rows: string[][] = []
  let started = false
  for (const line of README.slice(start).split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      if (started) {
        break
      }
      continue
    }
    started = true
    const cells = line
      .trim()
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    if (cells.some((cell) => cell.includes('`'))) {
      rows.push(cells)
    }
  }

  expect(rows.length).toBeGreaterThan(0)
  return rows
}

/** Alternatives a cell offers, e.g. "`a:e` or `A:E`". */
function variants(cell: string): string[] {
  return cell.split(' or ')
}

/**
 * A cell read as a list of expected values, or `null` when it is prose.
 *
 * The test is that nothing but backticked tokens and an `…` is left once they are
 * removed, so `` `1` `3` `5` `` is a list while "also `.` `/` `,` separators" is not.
 */
function valueList(
  cell: string,
): { values: string[]; truncated: boolean } | null {
  const values = codes(cell)
  if (values.length === 0) {
    return null
  }
  const leftover = cell
    .replace(/`[^`]+`/g, '')
    .replace(/…/g, '')
    .trim()
  return leftover === '' ? { values, truncated: cell.includes('…') } : null
}

function snapshotOf(texts: string[]): SelectionSnapshot {
  return {
    texts,
    wholeLines: texts,
    startLines: texts.map((_, index) => index),
  }
}

/** Evaluates `code`, failing the test if it does not compile. */
function transform(texts: string[], code: string): string[] {
  const result = runTransform(snapshotOf(texts), code)
  if (!result.ok) {
    throw new Error(`expected ${code} to compile: ${result.message}`)
  }
  return result.items.map((item) =>
    item.ok ? item.text : `<error: ${item.message}>`,
  )
}

describe('README table: What `start` can be', () => {
  const rows = tableUnder('### What `start` can be')

  it('covers every kind of sequence the extension can produce', () => {
    // A row per numeral system, plus four date rows. If this drops, a system lost its
    // documentation rather than the table losing a row of noise.
    expect(rows.length).toBeGreaterThanOrEqual(28)
  })

  for (const [kind, exampleCell, resultCell] of rows) {
    const exampleVariants = variants(exampleCell as string)
    const resultVariants = variants(resultCell as string)
    const pairwise =
      exampleVariants.length === resultVariants.length &&
      resultVariants.every((variant) => valueList(variant) !== null)

    it(`${kind}: ${exampleCell}`, () => {
      if (pairwise) {
        exampleVariants.forEach((exampleVariant, index) => {
          const expected = valueList(resultVariants[index] as string)
          expect(expected).not.toBeNull()
          for (const spec of codes(exampleVariant)) {
            const actual = generateSequence(spec, 100)
            if (expected?.truncated) {
              expect(actual.slice(0, expected.values.length)).toEqual(
                expected.values,
              )
              expect(actual.length).toBeGreaterThan(expected.values.length)
            } else {
              expect(actual).toEqual(expected?.values ?? [])
            }
          }
        })
        return
      }

      // The result column is prose — "prefix and case preserved", "steps by month" —
      // so all that can be checked mechanically is that the example produces something.
      for (const spec of codes(exampleCell as string)) {
        expect(generateSequence(spec, 100).length).toBeGreaterThan(0)
      }
    })
  }
})

describe('README table: Shorthand', () => {
  const rows = tableUnder('### Shorthand')
  const texts = ['4', 'hello']

  for (const [typedCell, runsCell] of rows) {
    const typed = codes(typedCell as string)
    const runs = codes(runsCell as string)

    it(`${typedCell} runs as ${runsCell}`, () => {
      // Where the table spells out what a shorthand expands to, the two must produce
      // exactly the same text; the row is allowed to stop early with `…`.
      runs.forEach((expansion, index) => {
        const shorthand = typed[index]
        expect(shorthand).toBeDefined()
        expect(transform(texts, shorthand as string)).toEqual(
          transform(texts, expansion),
        )
      })

      // The ones the row does not spell out at least have to be accepted and evaluate.
      for (const shorthand of typed) {
        const result = runTransform(snapshotOf(texts), shorthand)
        expect(result.ok).toBe(true)
      }
    })
  }
})

describe('README table: Variables', () => {
  const rows = tableUnder('### Variables')

  it('names only variables that exist', () => {
    const documented = rows.flatMap((row) => codes(row[0] as string))
    expect(documented.length).toBeGreaterThanOrEqual(13)
    for (const name of documented) {
      expect(VAR_NAMES).toContain(name as (typeof VAR_NAMES)[number])
    }
  })

  it('documents every variable there is', () => {
    const documented = new Set(rows.flatMap((row) => codes(row[0] as string)))
    const functions = new Set([
      'number',
      'letter',
      'upperletter',
      'lowerletter',
      'upper',
      'lower',
      'convnum',
    ])
    for (const name of VAR_NAMES) {
      if (functions.has(name)) {
        continue
      }
      expect(documented).toContain(name)
    }
  })

  it('evaluates each of them', () => {
    for (const row of rows) {
      for (const name of codes(row[0] as string)) {
        const result = runTransform(snapshotOf(['ab']), name)
        expect(result.ok).toBe(true)
        expect(result.ok && result.items[0]?.ok).toBe(true)
      }
    }
  })
})

describe('README table: Functions', () => {
  const rows = tableUnder('### Functions')

  /** `letter(num)` and `convnum` alike reduce to the name bound in an expression. */
  const documented = rows.flatMap((row) =>
    codes(row[0] as string).map((entry) => entry.replace(/\(.*$/, '')),
  )

  it('names only functions that exist, and all of them', () => {
    expect(documented.length).toBeGreaterThanOrEqual(7)
    for (const name of documented) {
      expect(VAR_NAMES).toContain(name as (typeof VAR_NAMES)[number])
    }
    for (const name of [
      'number',
      'letter',
      'upperletter',
      'lowerletter',
      'upper',
      'lower',
      'convnum',
    ]) {
      expect(documented).toContain(name)
    }
  })

  it('calls each of them', () => {
    expect(transform(['abc'], 'number("abc123")')).toEqual(['123'])
    expect(transform(['abc'], 'letter(1)')).toEqual(['A'])
    expect(transform(['abc'], 'upperletter(26)')).toEqual(['Z'])
    expect(transform(['abc'], 'lowerletter(1)')).toEqual(['a'])
    expect(transform(['abc'], 'upper("hello")')).toEqual(['HELLO'])
    expect(transform(['abc'], 'lower("HELLO")')).toEqual(['hello'])
    expect(transform(['abc'], 'convnum.toDayOfWeek(1)')).toEqual(['Monday'])
  })

  it('maps 1–26 to A–Z as the row says', () => {
    expect(transform(['1'], 'letter')).toEqual(['A'])
    expect(transform(['26'], 'letter')).toEqual(['Z'])
    expect(transform(['27'], 'letter')).toEqual([''])
    expect(transform(['0'], 'letter')).toEqual([''])
  })
})

describe('README table: Settings', () => {
  const rows = tableUnder('## Settings')

  it('lists every setting the manifest declares, with its real default', () => {
    const declared = MANIFEST.contributes.configuration.properties
    const documented = new Map<string, string>()

    for (const [nameCell, defaultCell] of rows) {
      const name = codes(nameCell as string)[0]
      const value = codes(defaultCell as string)[0]
      expect(name).toBeDefined()
      expect(value).toBeDefined()
      documented.set(name as string, value as string)
    }

    expect([...documented.keys()].sort()).toEqual(Object.keys(declared).sort())
    for (const [name, value] of documented) {
      expect(String(declared[name]?.default)).toBe(value)
    }
  })
})
