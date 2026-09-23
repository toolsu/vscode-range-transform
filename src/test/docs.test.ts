import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PREVIEW_SYMBOLS } from '../const/visual'
import { generateSequence } from '../range'
import { runTransform } from '../transform'
import {
  EVALUATION_TIMEOUT_CEILING_MS,
  timeoutFor,
} from '../transform/evaluate'
import { buildScratchContent } from '../transform/scratch'
import type { SelectionSnapshot } from '../transform/vars'

// Guards the three places this extension documents itself: README.md, the `rt.d.ts`
// hover documentation copied into the scratch directory, and the comment header of the
// scratch file. Every example below is both quoted from the file it appears in and
// executed, so neither the prose nor the behaviour can drift without this failing.
// Several of these examples were wrong at some point — a documented example that has
// never been run is a bug report waiting to be filed.

// `process.cwd()` rather than `import.meta.dir`: the same sources are compiled to
// CommonJS for the extension-host build, where `import.meta` is a syntax error. Unit
// tests always run as `bun test src/test` from the repository root.
const repoRoot = process.cwd()

function read(relative: string): string {
  return readFileSync(join(repoRoot, relative), 'utf8')
}

const README = read('README.md')
const RT_DTS = read('src/usertypes/rt.d.ts')
const SCRATCH_HEADER = buildScratchContent({
  globalsPath: '/scratch/rt.d.ts',
  selectionCount: 3,
  documentName: 'example.txt',
})

function snapshotOf(texts: string[]): SelectionSnapshot {
  return {
    texts,
    wholeLines: texts,
    startLines: texts.map((_, index) => index),
  }
}

/** Evaluates `code` over `texts`, rendering a per-selection failure as `<error: …>`. */
function transform(texts: string[], code: string): string[] {
  const result = runTransform(snapshotOf(texts), code)
  if (!result.ok) {
    throw new Error(`expected ${code} to compile: ${result.message}`)
  }
  return result.items.map((item) =>
    item.ok ? item.text : `<error: ${item.message}>`,
  )
}

describe('README: Insert Sequence from Range', () => {
  it('documents a mismatched range that really produces nothing', () => {
    expect(README).toContain(
      '**`start` and `stop` must be the same kind.** `Mon:5`',
    )
    expect(generateSequence('Mon:5', 100)).toEqual([])
  })

  it('documents a hexadecimal step that really steps by sixteen', () => {
    expect(README).toContain('`0x0A::0x10` steps by sixteen')
    expect(generateSequence('0x0A::0x10', 3)).toEqual(['0x0A', '0x1A', '0x2A'])
  })

  it('warns that `1:a` is a hexadecimal range rather than a mismatch', () => {
    expect(README).toContain('`1:a` counts')
    expect(generateSequence('1:a', 100)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
    ])
  })

  it('preserves the style of `start`, as the notes claim', () => {
    expect(generateSequence('MON:FRI', 100)).toEqual([
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
    ])
    expect(generateSequence('0XA:0XF', 100)).toEqual([
      '0XA',
      '0XB',
      '0XC',
      '0XD',
      '0XE',
      '0XF',
    ])
    // `10:1` counts down without a negative step, and `fri::2` wraps into next week.
    expect(generateSequence('10:1', 100)).toEqual([
      '10',
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
    ])
    expect(generateSequence('fri::2', 4)).toEqual(['fri', 'sun', 'tue', 'thu'])
  })

  it('rejects the non-canonical Chinese forms the notes call out', () => {
    expect(README).toContain('A bare `万` is neither')
    expect(generateSequence('万', 100)).toEqual([])
    expect(generateSequence('一十', 100)).toEqual([])
    expect(generateSequence('一万', 2)).toEqual(['一万', '一万零一'])
    expect(generateSequence('壹万', 2)).toEqual(['壹万', '壹万零壹'])
    expect(generateSequence('十', 2)).toEqual(['十', '十一'])
  })

  it('counts the East Asian date layouts it documents', () => {
    expect(README).toContain('East Asian date')
    expect(generateSequence('2023年12月25日:2023年12月27日', 100)).toEqual([
      '2023年12月25日',
      '2023年12月26日',
      '2023年12月27日',
    ])
    expect(generateSequence('2023年12月:2024年2月', 100)).toEqual([
      '2023年12月',
      '2024年1月',
      '2024年2月',
    ])
    expect(generateSequence('2023년 12월 25일:2023년 12월 27일', 100)).toEqual([
      '2023년 12월 25일',
      '2023년 12월 26일',
      '2023년 12월 27일',
    ])
  })

  it('reads a lone `I` as a letter and `I:XX` as a Roman numeral', () => {
    expect(generateSequence('V:X', 100)).toEqual(['V', 'W', 'X'])
    expect(generateSequence('I:XX', 3)).toEqual(['I', 'II', 'III'])
  })
})

describe('README: Transform Selections', () => {
  it('runs every expression in the opening example block', () => {
    expect(transform(['1', '2', '3'], 'n * 3')).toEqual(['3', '6', '9'])
    expect(transform(['a', 'b', 'c'], 'upper(s)')).toEqual(['A', 'B', 'C'])
    expect(transform(['a', 'b', 'c'], '`${i}. ${s}`')).toEqual([
      '1. a',
      '2. b',
      '3. c',
    ])
    expect(transform(['a', 'b', 'c'], "s + '_' + i")).toEqual([
      'a_1',
      'b_2',
      'c_3',
    ])
    expect(transform(['a', 'b', 'c'], "i.toString().padStart(3, '0')")).toEqual(
      ['001', '002', '003'],
    )
    expect(transform(['x', 'y'], 'i % 2 ? upper(s) : s')).toEqual(['X', 'y'])
    expect(transform(['hello'], "[...s].reverse().join('')")).toEqual(['olleh'])
    expect(
      transform(['10', '20', '30'], 'ss.map(number).reduce((a, b) => a + b)'),
    ).toEqual(['60', '60', '60'])
    expect(transform(['4', '9'], 'convnum.toRoman(n)')).toEqual(['IV', 'IX'])
  })

  it('documents `(-1)`, not `-1 + 0`, as the way to write the constant', () => {
    expect(README).toContain('For the constant `-1`, write `(-1)`')
    expect(README).not.toContain('`-1 + 0`')
    // `-1 + 0` is why: the leading `-` still binds to `n`.
    expect(transform(['5'], '-1 + 0')).toEqual(['4'])
    expect(transform(['5'], '(-1)')).toEqual(['-1'])
  })

  it('names the convnum converters that cannot be written bare', () => {
    for (const name of [
      'toBase',
      'convertTo',
      'formatDayString',
      'toJulianDay',
    ]) {
      expect(README).toContain(`convnum.${name}`)
      expect(transform(['5'], `convnum.${name}`)).toEqual([
        `[Function: ${name}]`,
      ])
    }
    // Single-argument converters do work bare, which is what makes the rest exceptions.
    expect(transform(['5'], 'convnum.toRoman')).toEqual(['V'])
    expect(transform(['V'], 'convnum.fromRoman')).toEqual(['5'])
  })

  it('renders an un-called function with its name, or as anonymous', () => {
    expect(README).toContain('[Function: toBase]')
    expect(README).toContain('[Function (anonymous)]')
    expect(README).not.toContain('`[Function]`')
    expect(transform(['5'], '(x) => x')).toEqual(['[Function (anonymous)]'])
  })

  it('turns values into text the way "What gets inserted" says', () => {
    expect(transform(['a'], '[1,2,3]')).toEqual(['[1,2,3]'])
    expect(transform(['a'], "({name: 'John', age: 30})")).toEqual([
      '{name: "John", age: 30}',
    ])
    expect(transform(['a'], '/ab+c/g')).toEqual(['/ab+c/g'])
    expect(transform(['a'], "new Date('2025-01-01')")).toEqual(['2025-01-01'])
    expect(transform(['a'], 'null')).toEqual([''])
    expect(transform(['a'], 'undefined')).toEqual([''])
  })

  it('describes the variables correctly', () => {
    expect(transform(['item 42'], 'n')).toEqual(['42'])
    expect(transform(['😀'], 'len')).toEqual(['2'])
    expect(transform(['😀'], '[...s].length')).toEqual(['1'])
    expect(transform(['hello there world'], 'wc')).toEqual(['3'])
  })

  it('documents `cn` with examples that hold', () => {
    expect(README).toContain('`cn`')
    expect(RT_DTS).toContain('declare const cn: number')
    expect(transform(['IV'], 'cn')).toEqual(['4'])
    expect(transform(['十二'], 'cn')).toEqual(['12'])
    expect(transform(['0xff'], 'cn')).toEqual(['255'])
    expect(transform(['Wednesday'], 'cn')).toEqual(['3'])
    expect(transform(['XIV'], 'cn + 1')).toEqual(['15'])
    expect(transform(['not a number'], 'cn')).toEqual(['NaN'])
  })

  it('counts month and weekday names in the languages it claims', () => {
    expect(README).toContain('about forty languages')
    for (const [spec, expected] of [
      ['janvier:mars', ['janvier', 'février', 'mars']],
      ['Januar:März', ['Januar', 'Februar', 'März']],
      ['1月:3月', ['1月', '2月', '3月']],
      ['星期一:星期三', ['星期一', '星期二', '星期三']],
      ['mars:juin', ['mars', 'avril', 'mai', 'juin']],
      ['mars:maj', ['mars', 'april', 'maj']],
    ] as [string, string[]][]) {
      expect(README).toContain(spec.split(':')[0] as string)
      expect(generateSequence(spec, 100)).toEqual(expected)
    }
  })

  it('bounds the budget the README promises', () => {
    // Asserting the shape of the message is not enough: it would still pass if the
    // budget were raised to a minute. `editor.multiCursorLimit` defaults to 10 000 and
    // the preview runs on every keystroke, so the ceiling is what stops a runaway from
    // freezing the editor for ten seconds at a time.
    //
    // Checked as arithmetic rather than by running one: terminating a `vm` script
    // repeatedly in a single process crashes Bun (the extension host is Node, where it
    // is fine), so the suite triggers a real timeout exactly once — in the test above.
    expect(EVALUATION_TIMEOUT_CEILING_MS).toBeLessThanOrEqual(2000)
    expect(timeoutFor(1)).toBeLessThanOrEqual(EVALUATION_TIMEOUT_CEILING_MS)
    expect(timeoutFor(100)).toBeLessThanOrEqual(EVALUATION_TIMEOUT_CEILING_MS)
    expect(timeoutFor(10000)).toBe(EVALUATION_TIMEOUT_CEILING_MS)
    expect(timeoutFor(1000000)).toBe(EVALUATION_TIMEOUT_CEILING_MS)
    // And it still grows with the work before it hits the ceiling.
    expect(timeoutFor(100)).toBeGreaterThan(timeoutFor(1))
  })

  it('runs every convnum call the Functions table lists', () => {
    expect(transform(['IV'], 'convnum.toRoman(cn)')).toEqual(['IV'])
    expect(transform(['42'], 'convnum.toEnglishWords(n)')).toEqual([
      'forty-two',
    ])
    expect(transform(['十二'], 'convnum.toChineseWords(cn)')).toEqual(['十二'])
    expect(transform(['255'], 'convnum.toHex(n)')).toEqual(['ff'])
    expect(transform(['3'], 'convnum.toMonth(cn)')).toEqual(['March'])
    expect(transform(['IV'], 'convnum.fromRoman(s)')).toEqual(['4'])
    expect(transform(['XIV'], 'convnum.anyToNumber(s)')).toEqual(['14'])

    // And each of them is quoted in the table, so neither half can drift.
    for (const call of [
      'convnum.toRoman(cn)',
      'convnum.toEnglishWords(n)',
      'convnum.toChineseWords(cn)',
      'convnum.toHex(n)',
      'convnum.toMonth(cn)',
      'convnum.fromRoman(s)',
      'convnum.anyToNumber(s)',
    ]) {
      expect(README).toContain(call)
    }
  })

  it('offers the standard globals it says it does', () => {
    expect(README).toContain('`Math`, `Date`, `JSON`')
    expect(transform(['a'], 'typeof Math')).toEqual(['object'])
    expect(transform(['a'], 'typeof Date')).toEqual(['function'])
    expect(transform(['a'], 'typeof JSON')).toEqual(['object'])
    expect(transform(['a'], '((x) => x * 2)(21)')).toEqual(['42'])
  })

  it('reports the two whole-expression failures "When something goes wrong" names', () => {
    expect(PREVIEW_SYMBOLS.error).toBe('⚠')
    expect(README).toContain(PREVIEW_SYMBOLS.error)

    // Code that ends without a value fails for every selection, so nothing is applied —
    // which is what the README now says, having previously claimed it "lets the rest
    // through" like an ordinary per-selection error.
    expect(README).toContain('ends without producing a value')
    expect(README).toContain('nothing is applied')
    expect(transform(['a'], 'let out = upper(s)')[0]).toMatch(
      /^<error: The code ran but produced no value/,
    )

    // A runaway expression is stopped for the whole batch, the way a syntax error is.
    expect(README).toContain(
      'a quarter of a second, plus a millisecond per selection',
    )
    expect(README).toContain('up to two seconds')
    const runaway = runTransform(snapshotOf(['a']), 'while (true) {}')
    expect(runaway.ok).toBe(false)
    expect(runaway.ok === false && runaway.message).toMatch(
      /^Stopped after \d+ ms/,
    )
  })
})

describe('README: Transform Selections (Advanced)', () => {
  // The blank line before the template literal is load-bearing, and not for any reason
  // this extension controls: run together, the backtick is JavaScript's tagged-template
  // syntax, so the string returned by `.join(' ')` would be used as the tag function.
  // The README shipped it that way once and every selection reported
  // "Cannot access 'label' before initialization".
  const example = [
    "const parts = s.split('-')",
    "const label = parts.map(upper).join(' ')",
    '',
    '`${convnum.toRoman(i)}. ${label}`',
  ].join('\n')

  it('is quoted in the README exactly as it is written here', () => {
    expect(README).toContain(example)
    // Prettier formats fenced code blocks, and it would collapse those two lines back
    // into the tagged template this example exists to avoid.
    expect(README).toContain(`<!-- prettier-ignore -->\n\`\`\`ts\n${example}`)
  })

  it('produces the result the README promises', () => {
    expect(transform(['hello-world'], example)).toEqual(['I. HELLO WORLD'])
  })

  it('fails when the last two lines are run together', () => {
    const joined = example.replace(/\)\n\n`/, ')`')
    // The exact wording is the engine's, so match only the part every engine agrees on.
    expect(transform(['hello-world'], joined)[0]).toMatch(
      /^<error: Cannot access 'label' before initialization/,
    )
    expect(README).toContain("Cannot access 'label' before initialization")
  })

  it('does not expand the one-line shorthand, as the README now warns', () => {
    expect(README).toContain('**No shorthand.**')
    const multiline = `// a comment\n*3`
    expect(runTransform(snapshotOf(['5']), multiline).ok).toBe(false)
    // A bare helper still works, because that rule acts on the value, not the source.
    expect(transform(['ab'], '// a comment\nupper')).toEqual(['AB'])
  })
})

describe('rt.d.ts and the scratch header', () => {
  it('documents `toHex` by its real signature, where the second argument is a prefix', () => {
    for (const source of [RT_DTS, SCRATCH_HEADER]) {
      expect(source).toContain('convnum.toHex(n)')
      expect(source).not.toContain("convnum.toHex(n, 'upper')")
    }
    expect(transform(['255'], 'convnum.toHex(n)')).toEqual(['ff'])
    expect(transform(['255'], "convnum.toHex(n, 'lower')")).toEqual(['0xff'])
    expect(transform(['255'], "convnum.toHex(n, 'upper')")).toEqual(['0XFF'])
  })

  it('runs every other convnum example both files show', () => {
    const examples: [string, string, string][] = [
      ['convnum.toRoman(n)', '4', 'IV'],
      ['convnum.toEnglishWords(n)', '42', 'forty-two'],
      ['convnum.toChineseWords(n)', '123', '一百二十三'],
      ["convnum.toMonth(n, 'en-US', 'short')", '1', 'Jan'],
    ]
    for (const [code, input, expected] of examples) {
      expect(RT_DTS).toContain(code)
      expect(SCRATCH_HEADER).toContain(code)
      expect(transform([input], code)).toEqual([expected])
    }
  })

  it('runs the helper examples in rt.d.ts', () => {
    const examples: [string, string][] = [
      ["number('abc123')", '123'],
      ['letter(1)', 'A'],
      ['lowerletter(1)', 'a'],
      ["upper('hello')", 'HELLO'],
      ["lower('HELLO')", 'hello'],
      ['ss.map(number).reduce((a, b) => a + b, 0)', '42'],
    ]
    for (const [code] of examples) {
      expect(RT_DTS).toContain(code)
    }
    for (const [code, expected] of examples.slice(0, -1)) {
      expect(transform(['x'], code)).toEqual([expected])
    }
    expect(transform(['20', '22'], examples[5]?.[0] ?? '')).toEqual([
      '42',
      '42',
    ])
  })

  it('measures `len` the way rt.d.ts says it does', () => {
    expect(RT_DTS).toContain('`"😀"` counts as 2 and `"👨‍👩‍👧‍👦"` as 11')
    expect(transform(['😀'], 'len')).toEqual(['2'])
    expect(transform(['👨‍👩‍👧‍👦'], 'len')).toEqual(['11'])
    expect(transform(['👨‍👩‍👧‍👦'], '[...s].length')).toEqual(['7'])
    expect(
      transform(['👨‍👩‍👧‍👦'], '[...new Intl.Segmenter().segment(s)].length'),
    ).toEqual(['1'])
  })

  it('derives `n` from `s` as rt.d.ts describes', () => {
    expect(RT_DTS).toContain('`"abc123def"` gives')
    expect(transform(['abc123def'], 'n')).toEqual(['123'])
    expect(transform(['$1.50'], 'n')).toEqual(['1.5'])
    expect(transform(['item 42'], 'n * 2')).toEqual(['84'])
    expect(transform(['nothing numeric'], 'n')).toEqual(['NaN'])
  })
})

describe('README: keyboard shortcuts', () => {
  it('states the one keybinding the extension really claims', () => {
    const manifest = JSON.parse(read('package.json')) as {
      contributes: { keybindings?: { key: string; when: string }[] }
    }
    const bindings = manifest.contributes.keybindings ?? []
    expect(bindings.length).toBeGreaterThan(0)
    // The README's claim is that nothing can be taken from a normal editor, which holds
    // only while every binding is gated on the scratch file being focused.
    for (const binding of bindings) {
      expect(binding.when).toContain('rangeTransform.scratchOpen')
      expect(binding.when).toContain('resourceFilename')
    }
    expect(bindings.some((binding) => binding.key === 'ctrl+enter')).toBe(true)
    expect(README).toContain('One shortcut is claimed by default')
    expect(README).not.toContain('No shortcuts are claimed by default')
  })

  it('gets the AltGr warning the right way round', () => {
    expect(README).toContain('Windows reports')
    expect(README).not.toContain('layouts without a dedicated')
  })
})
