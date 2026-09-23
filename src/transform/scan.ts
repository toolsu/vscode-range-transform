/**
 * A single-pass lexical scan, just deep enough to answer two questions about a user's
 * script: where its last top-level statement begins, and whether it returns anywhere.
 *
 * Both used to be answered by looking at physical lines, which is wrong in exactly the
 * case the advanced editor exists for. `return ` prefixed to the last *line* of
 *
 *     const label = upper(s)
 *     `Line 1: ${label}
 *     Line 2: ${i}`
 *
 * lands inside the template literal, and the result still parses — so the usual safety
 * net of "a bad guess fails to construct and we fall through" never fires, and the word
 * `return ` is written into the user's document. Knowing where strings, templates,
 * comments and regular expressions are is the only way to avoid that.
 *
 * This is not a parser and does not need to be. It tracks literal boundaries and bracket
 * nesting, nothing else; when it guesses a statement boundary wrongly the resulting body
 * fails to parse and the caller falls through to the next shape, which is the behaviour
 * the line-based version was supposed to have.
 */

/** Characters after which a `/` opens a regular expression rather than dividing. */
const BEFORE_REGEX = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '^',
  '~',
  '<',
  '>',
])

/** Keywords after which a `/` opens a regular expression. */
const KEYWORDS_BEFORE_REGEX = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'do',
  'else',
  'yield',
  'await',
  'case',
])

/** Where the scanner currently is. */
type Mode =
  | { kind: 'code'; depth: number }
  | { kind: 'template' }
  | { kind: 'string'; quote: string }

function isIdentifierChar(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char)
}

/**
 * Whether a `/` at `index` opens a regular expression.
 *
 * Decided from the last significant character before it, which is the standard heuristic
 * and is right for everything that reaches this module. Getting it wrong only costs a
 * misplaced statement boundary, which the caller detects as a parse failure.
 */
function opensRegex(code: string, index: number): boolean {
  let back = index - 1
  while (back >= 0 && /\s/.test(code[back] as string)) {
    back -= 1
  }
  if (back < 0) {
    return true
  }
  const previous = code[back] as string
  if (BEFORE_REGEX.has(previous)) {
    return true
  }
  if (!isIdentifierChar(previous)) {
    return false
  }
  let start = back
  while (start >= 0 && isIdentifierChar(code[start] as string)) {
    start -= 1
  }
  return KEYWORDS_BEFORE_REGEX.has(code.slice(start + 1, back + 1))
}

export interface ScanResult {
  /**
   * Offset of the first character of the last top-level statement, or `-1` when the
   * source has no code in it.
   */
  readonly lastStatementStart: number
  /**
   * Whether a `return` keyword appears at the top level of the script.
   *
   * At the top level specifically: a `return` inside a nested function belongs to that
   * function, so `const tidy = function () { return upper(s) }` produces no value for the
   * transform however it looks, and counting its `return` would let that erase a
   * selection in silence.
   */
  readonly hasReturn: boolean
}

/**
 * Scans `code` once and reports both facts.
 *
 * A statement boundary is a `;` or a line break reached at bracket depth zero, outside
 * every literal and comment. The character after it that is not whitespace and not a
 * comment starts the next statement — so a line break in the middle of a template
 * literal, an argument list or a block does not count, which is the whole point.
 */
export function scan(code: string): ScanResult {
  const stack: Mode[] = [{ kind: 'code', depth: 0 }]
  let index = 0
  let hasReturn = false

  // `-1` until the first real character is seen, so a source of only comments reports
  // that there is no statement to return.
  let statementStart = -1
  let atBoundary = true

  const top = (): Mode => stack[stack.length - 1] as Mode

  while (index < code.length) {
    const mode = top()
    const char = code[index] as string

    if (mode.kind === 'string') {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === mode.quote || char === '\n') {
        stack.pop()
      }
      index += 1
      continue
    }

    if (mode.kind === 'template') {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === '`') {
        stack.pop()
        index += 1
        continue
      }
      if (char === '$' && code[index + 1] === '{') {
        stack.push({ kind: 'code', depth: 1 })
        index += 2
        continue
      }
      index += 1
      continue
    }

    // Comments never start a statement and never end one.
    if (char === '/' && code[index + 1] === '/') {
      const end = code.indexOf('\n', index)
      index = end === -1 ? code.length : end
      continue
    }
    if (char === '/' && code[index + 1] === '*') {
      const end = code.indexOf('*/', index + 2)
      index = end === -1 ? code.length : end + 2
      continue
    }

    if (/\s/.test(char)) {
      if (char === '\n' && stack.length === 1 && mode.depth === 0) {
        atBoundary = true
      }
      index += 1
      continue
    }

    // The first non-blank, non-comment character after a boundary starts a statement.
    if (atBoundary) {
      statementStart = index
      atBoundary = false
    }

    if (char === '`') {
      stack.push({ kind: 'template' })
      index += 1
      continue
    }
    if (char === "'" || char === '"') {
      stack.push({ kind: 'string', quote: char })
      index += 1
      continue
    }
    if (char === '/' && opensRegex(code, index)) {
      index += 1
      let inClass = false
      while (index < code.length) {
        const inner = code[index] as string
        if (inner === '\\') {
          index += 2
          continue
        }
        if (inner === '[') {
          inClass = true
        } else if (inner === ']') {
          inClass = false
        } else if (inner === '/' && !inClass) {
          index += 1
          break
        } else if (inner === '\n') {
          break
        }
        index += 1
      }
      continue
    }

    if (char === '(' || char === '[' || char === '{') {
      mode.depth += 1
      index += 1
      continue
    }
    if (char === ')' || char === ']' || char === '}') {
      if (mode.depth > 0) {
        mode.depth -= 1
        index += 1
        // A `${…}` substitution closes back into its template.
        if (mode.depth === 0 && stack.length > 1) {
          stack.pop()
        }
        continue
      }
      index += 1
      continue
    }

    if (char === ';' && stack.length === 1 && mode.depth === 0) {
      atBoundary = true
      index += 1
      continue
    }

    if (isIdentifierChar(char)) {
      let end = index
      while (end < code.length && isIdentifierChar(code[end] as string)) {
        end += 1
      }
      if (
        code.slice(index, end) === 'return' &&
        stack.length === 1 &&
        mode.depth === 0
      ) {
        hasReturn = true
      }
      index = end
      continue
    }

    index += 1
  }

  return { lastStatementStart: statementStart, hasReturn }
}
