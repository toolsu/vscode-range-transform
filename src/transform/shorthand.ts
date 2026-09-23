import type { ArgKind } from './argKind'

/**
 * Expands the leading-operator shorthand of a one-line transform expression.
 *
 * `*3` becomes `n*3` and `.trim()` becomes `s.trim()`. Every rule fires only on a prefix
 * that is illegal or meaningless at the start of a JavaScript expression, so a complete
 * expression can never be rewritten — `n*3`, `upper(s)` and `s.replace('*', 'x')` all
 * come back untouched.
 *
 * This is deliberately a prefix test on the trimmed source and nothing else. The previous
 * implementation ran a global regex over the whole expression and happily corrupted
 * string literals that contained a helper name or an operator.
 *
 * Returns the **trimmed** source, expanded or not: surrounding whitespace cannot change
 * what an expression evaluates to, and trimming is what makes the prefix test meaningful
 * in the first place. Multi-line source — the advanced editor, where the shorthand would
 * be more confusing than useful and where line 1 is a `///` reference comment — is never
 * expanded.
 */
export function expandShorthand(code: string): string {
  const trimmed = code.trim()
  if (trimmed === '' || /[\r\n]/.test(trimmed)) {
    return trimmed
  }
  const subject = shorthandSubject(trimmed)
  return subject === undefined ? trimmed : subject + trimmed
}

/**
 * The variable a shorthand prefix implies, or `undefined` when `code` is already a
 * self-contained expression.
 *
 * `+`/`-` bind to `n`, reading them as arithmetic rather than as unary sign. This is the
 * documented choice and the strictly more useful one: a bare literal is written `1`, not
 * `+1`, so nobody types `-1` meaning the constant.
 */
function shorthandSubject(code: string): ArgKind | undefined {
  const first = code[0]
  switch (first) {
    case '*':
    case '%':
    case '+':
    case '-':
      // `**2` is covered here too — the second `*` needs no special case.
      return 'n'
    case '/':
      return startsWithRegexLiteral(code) ? undefined : 'n'
    // A leading `[` deliberately has no rule. It would have to choose between indexing
    // (`[0]` meaning `s[0]`) and an array literal, and the literal wins on real usage:
    // `[...s].length` is the documented way to count characters rather than UTF-16 code
    // units. Rewriting that to `s[...s].length` would break the one expression the docs
    // tell people to reach for. `s[0]` is one character longer; that is the better trade.
    case '.':
      // `.5` is a number literal, not a member access.
      return isDigit(code[1]) ? undefined : 's'
    case '?':
      return code[1] === '.' ? 's' : undefined
    default:
      return undefined
  }
}

/**
 * Whether a leading `/` opens a regex literal rather than a division.
 *
 * The rule: a regex literal has a closing unescaped `/` that is not inside a character
 * class, and a division does not — `/a/.test(s)` and `/[aeiou]/g` close, `/2` does not.
 * Line and block comments fall out of the same rule: both contain a second slash, so a
 * source that opens with one is left alone. `/2/3` is the one genuinely ambiguous case
 * and is read as a regex; write `n/2/3` for the division.
 */
function startsWithRegexLiteral(code: string): boolean {
  let inCharClass = false
  for (let i = 1; i < code.length; i++) {
    const char = code[i]
    if (char === '\\') {
      i++
    } else if (inCharClass) {
      if (char === ']') {
        inCharClass = false
      }
    } else if (char === '[') {
      inCharClass = true
    } else if (char === '/') {
      return true
    }
  }
  return false
}

/** True for `'0'`–`'9'`; `undefined` (end of input) is not a digit. */
function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9'
}
