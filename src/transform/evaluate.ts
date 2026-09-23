import { createContext, Script } from 'node:vm'
import { scan } from './scan'

/**
 * How long a whole transform may run before V8 terminates it, in milliseconds.
 *
 * A synchronous runaway loop cannot be stopped by anything except V8's own interrupt,
 * and the extension host has one thread: without this the host freezes for good and
 * only "Developer: Restart Extension Host" brings it back. That matters because the
 * preview auto-runs while the user types, so half-written code such as `while (x > 1) {`
 * — which VS Code's bracket auto-closing turns into a *complete* statement — really does
 * get executed.
 *
 * 250 ms is the smallest budget with a wide margin over real work: a realistic transform
 * measures around 0.4 µs per selection, so 2000 selections finish in under a millisecond,
 * three orders of magnitude inside the budget. It is also short enough that a runaway
 * expression costs a quarter of a second of jank per preview rather than the session.
 */
export const EVALUATION_TIMEOUT_MS = 250

/**
 * Extra milliseconds granted per selection on top of {@link EVALUATION_TIMEOUT_MS}.
 *
 * The budget covers the whole batch, so a genuinely heavy expression over thousands of
 * selections must not be mistaken for a runaway one. One millisecond each is ~2500x the
 * measured cost, while still bounding the worst case to something the user can sit out.
 */
export const EVALUATION_TIMEOUT_PER_SELECTION_MS = 1

/**
 * The ceiling on the whole budget, in milliseconds.
 *
 * Without it the per-selection allowance is unbounded, and `editor.multiCursorLimit`
 * defaults to 10 000 — a figure `Ctrl+Shift+L` on a common token reaches easily. That
 * would put a runaway loop at a ten-second freeze *per keystroke*, which is the failure
 * the sandbox exists to prevent. Two seconds still leaves 10 000 selections roughly 500x
 * the measured cost of a realistic transform.
 */
export const EVALUATION_TIMEOUT_CEILING_MS = 2000

/**
 * Which of the candidate body shapes {@link compile} managed to build.
 *
 * `empty` is a source that holds nothing but whitespace and comments and `expression` is
 * a single expression; `lastStatement` had `return ` prefixed to its final top-level
 * statement, and `statements` is the raw source. Reported mainly for tests and
 * diagnostics — what actually decides how an `undefined` result is read is
 * {@link CompiledExpression.allowsUndefined}.
 */
export type BodyShape = 'empty' | 'expression' | 'lastStatement' | 'statements'

/**
 * A user expression turned into a function once, ready to be evaluated per selection.
 *
 * Compiling is the expensive half and happens once per keystroke; {@link runAll} happens
 * once per transform and evaluates every selection inside a single interruptible V8
 * call.
 */
export interface CompiledExpression {
  /** Which body shape was used, so the caller can judge an `undefined` result. */
  readonly shape: BodyShape
  /**
   * Whether an `undefined` result is something the user asked for.
   *
   * True for a single expression, for an empty source, and for a statement list that
   * contains an explicit `return` — `return m?.[0]` meaning "insert nothing when there is
   * no match" is a legitimate thing to write. False when the code simply ran off the end
   * without producing anything, which used to erase the selection in silence.
   */
  readonly allowsUndefined: boolean
  /**
   * Evaluates once per row, each row holding values positionally matching the `names`
   * passed to {@link compile}.
   */
  runAll(rows: readonly (readonly unknown[])[]): BatchOutcome
}

/**
 * The outcome of {@link compile}: either something runnable, or the reason the source
 * could not be turned into a function at all.
 */
export type CompileResult =
  | { readonly ok: true; readonly compiled: CompiledExpression }
  | { readonly ok: false; readonly message: string }

/**
 * The outcome of one evaluation.
 *
 * Failure is a value rather than an exception because a transform runs over many
 * selections at once: one selection blowing up must leave the others alone, and the
 * caller needs the message to show next to the offending selection.
 */
export type EvalOutcome =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string }

/**
 * The outcome of evaluating every selection.
 *
 * A failure here is whole-batch: the only way to get one is for V8 to interrupt the run
 * because it exceeded its time budget, which is a property of the expression rather than
 * of any single selection.
 */
export type BatchOutcome =
  | { readonly ok: true; readonly outcomes: readonly EvalOutcome[] }
  | { readonly ok: false; readonly message: string }

/**
 * What may be used as a function parameter name.
 *
 * Unicode-aware because JavaScript identifiers are; reserved words slip through it,
 * which is why {@link acceptsNames} probes as well.
 */
const IDENTIFIER = /^[\p{ID_Start}_$][\p{ID_Continue}$]*$/u

/** Context property holding the compiled user function while the driver runs. */
const FUNCTION_SLOT = '__rtFn'

/** Context property holding the argument rows while the driver runs. */
const ROWS_SLOT = '__rtRows'

/**
 * Shown when a statement-list body runs to completion without producing a value.
 *
 * Silence used to be the outcome: `undefined` became the empty string and every
 * selection was replaced with nothing, reported as a success.
 */
const NO_VALUE_MESSAGE =
  'The code ran but produced no value. End it with the value to insert, or use an explicit return.'

/**
 * Evaluates the user function once per row, inside the sandbox.
 *
 * Compiled once for the whole module because it never varies. Running the loop *here*
 * rather than calling into the sandbox per selection is what makes the timeout
 * affordable: arming V8's watchdog costs ~60 µs, which is 60 ms wasted on 1000
 * selections, so it is armed once for the batch instead of once per selection.
 *
 * The loop state lives in this script's own scope, which does not enclose the user's
 * body, so user code cannot reach `index` or `out` and derail the iteration. The two
 * context slots it reads are deleted immediately, before any user code runs, for the
 * same reason. `count` is read once so that nothing the user does can extend the loop.
 */
const DRIVER = new Script(`(function () {
  'use strict'
  const fn = ${FUNCTION_SLOT}
  const rows = ${ROWS_SLOT}
  delete globalThis.${FUNCTION_SLOT}
  delete globalThis.${ROWS_SLOT}
  const out = []
  const push = out.push
  const apply = fn.apply
  const count = rows.length
  for (let index = 0; index < count; index += 1) {
    try {
      push.call(out, { ok: true, value: apply.call(fn, undefined, rows[index]) })
    } catch (error) {
      push.call(out, { ok: false, error: error })
    }
  }
  return out
})()`)

/** One row's result as the driver reports it, still holding a sandbox-realm error. */
interface RawOutcome {
  readonly ok: boolean
  readonly value?: unknown
  readonly error?: unknown
}

/**
 * Compiles `code` into a function whose parameters are `names`.
 *
 * Binding the variables as real parameters (rather than `with (vars)`, which the old
 * implementation used) is what makes this strict-mode safe: `with` is illegal in strict
 * mode, defeats every scope optimisation, and exposes the entire bag including inherited
 * properties.
 *
 * The body shape is chosen by catching `SyntaxError` at construction time, which parses
 * but never executes. The previous implementation instead ran the code, and re-ran it
 * with a different body when the first attempt produced `undefined` — so any expression
 * with a side effect performed it twice.
 *
 * The function is built inside a `node:vm` context rather than with `new Function`,
 * because that buys the only thing that can stop a runaway synchronous loop — see
 * {@link EVALUATION_TIMEOUT_MS}.
 *
 * The context is *not* a security boundary and is not meant to be one. Everything handed
 * in — the helper functions, the whole `convnum` namespace, the `ss` array — belongs to
 * the host realm, and `anything.constructor.constructor` reaches the host `Function` from
 * any of them. That is not a weakness worth closing: this evaluates code the user typed
 * themselves, into their own editor, one keystroke ago. It is worth stating, though,
 * because the timeout does not reach code that escapes that way — a host-realm timer
 * scheduled from inside an expression outlives the interrupt. Accidental runaways, which
 * is what the budget is for, cannot escape.
 *
 * Never throws: every failure is reported as `{ ok: false }`.
 */
export function compile(code: string, names: readonly string[]): CompileResult {
  const nameProblem = describeNameProblem(names)
  if (nameProblem !== undefined) {
    return { ok: false, message: nameProblem }
  }

  // Ordered most-specific first. `return (…)` covers the single-expression case for
  // both the input box and the advanced editor, comments and all: comments are legal
  // inside parentheses, so the `/// <reference />` line and the whole template header
  // need no stripping. The newline before `)` is load-bearing — without it a trailing
  // `// comment` would swallow the closing parenthesis.
  //
  // A source with no code in it is classified up front rather than left to fall through
  // the shapes: a multi-line block comment ends on a line that does not *look* like a
  // comment, so it would otherwise be taken for a statement list that produced nothing.
  const candidates: readonly (readonly [BodyShape, string])[] =
    isBlankExpression(code)
      ? [['empty', code]]
      : [
          ['expression', `return (${code}\n)`],
          ['lastStatement', withReturnOnLastStatement(code)],
          ['statements', code],
        ]

  const { hasReturn } = scan(code)
  const problems: string[] = []
  for (const [shape, body] of candidates) {
    const allowsUndefined =
      shape === 'empty' ||
      shape === 'expression' ||
      (shape === 'statements' && hasReturn)
    try {
      return {
        ok: true,
        compiled: build(shape, names, body, allowsUndefined),
      }
    } catch (error) {
      problems.push(messageOf(error))
    }
  }

  // Which complaint helps depends on what the user was writing. For a one-line input box
  // the expression candidate died on the real mistake, and its message points at it. For
  // a multi-line script that candidate dies on the first statement keyword no matter what
  // is wrong further down, so it would always report "Unexpected token 'const'"; the
  // statement-list candidate is the one that saw the actual error.
  const informative = /[\r\n]/.test(code.trim())
    ? problems[problems.length - 1]
    : problems[0]
  return { ok: false, message: informative ?? 'Invalid expression' }
}

/**
 * Builds the sandbox and the function inside it. Throws `SyntaxError` if `body` does not
 * parse, which is how {@link compile} chooses between the candidate shapes.
 *
 * The strict-mode directive matters beyond `this` being `undefined` instead of the
 * global object: without it an assignment to an undeclared name in a user expression
 * would silently create a global that outlives the transform.
 *
 * A fresh context per compile — so per keystroke — rather than one shared for the
 * session: a global the user's code leaves behind must not be visible to the next
 * expression they type.
 */
function build(
  shape: BodyShape,
  names: readonly string[],
  body: string,
  allowsUndefined: boolean,
): CompiledExpression {
  const source = `(function (${names.join(',')}) {\n'use strict';\n${body}\n})`
  const script = new Script(source)
  const context = createContext({})
  // Evaluating a function expression only creates a closure, so nothing of the user's
  // runs here — unless the body closes the wrapper itself, as `}); while (true) {}; (`
  // does, which is exactly why this one is on the clock as well.
  const fn = script.runInContext(context, { timeout: EVALUATION_TIMEOUT_MS })
  return {
    shape,
    allowsUndefined,
    runAll: (rows) => runBatch(context, fn, rows, allowsUndefined),
  }
}

/**
 * The time budget for a batch of `rowCount` selections.
 *
 * Exported so the ceiling can be checked without running a runaway loop: terminating a
 * `vm` script repeatedly in one process crashes Bun, so the unit suite triggers a real
 * timeout once and reasons about the arithmetic here for the rest.
 */
export function timeoutFor(rowCount: number): number {
  return Math.min(
    EVALUATION_TIMEOUT_MS + rowCount * EVALUATION_TIMEOUT_PER_SELECTION_MS,
    EVALUATION_TIMEOUT_CEILING_MS,
  )
}

/**
 * Runs the driver over `rows`, converting anything user code threw into an outcome.
 *
 * The context slots are cleared in `finally` as well as inside the driver, because a
 * timeout can in principle fire before the driver's own `delete` statements run.
 */
function runBatch(
  context: object,
  fn: unknown,
  rows: readonly (readonly unknown[])[],
  allowsUndefined: boolean,
): BatchOutcome {
  const slots = context as Record<string, unknown>
  let raw: readonly RawOutcome[]
  try {
    slots[FUNCTION_SLOT] = fn
    slots[ROWS_SLOT] = rows
    raw = DRIVER.runInContext(context, {
      timeout: timeoutFor(rows.length),
    }) as readonly RawOutcome[]
  } catch (error) {
    return { ok: false, message: describeAbort(error, rows.length) }
  } finally {
    delete slots[FUNCTION_SLOT]
    delete slots[ROWS_SLOT]
  }

  const outcomes: EvalOutcome[] = []
  for (let index = 0; index < rows.length; index += 1) {
    outcomes.push(interpret(raw[index], allowsUndefined))
  }
  return { ok: true, outcomes }
}

/**
 * Turns one raw driver result into an {@link EvalOutcome}.
 *
 * The statement-list guard is the point of {@link BodyShape}. Those two shapes are
 * reached by any well-formed statement list, including ones that never produce a value —
 * an `if` whose branches only compute, a `switch`, a lone function declaration. They used
 * to be reported as a successful empty string, so the selection was silently erased with
 * nothing warning the user. An expression that evaluates to `undefined` still gives the
 * empty string, because there the user did ask for exactly that.
 */
function interpret(
  raw: RawOutcome | undefined,
  allowsUndefined: boolean,
): EvalOutcome {
  if (raw === undefined) {
    return { ok: false, message: 'Evaluation produced no result' }
  }
  if (!raw.ok) {
    return { ok: false, message: messageOf(raw.error) }
  }
  if (raw.value === undefined && !allowsUndefined) {
    return { ok: false, message: NO_VALUE_MESSAGE }
  }
  return { ok: true, value: raw.value }
}

/**
 * True when the code holds nothing but whitespace and comments.
 *
 * Used by {@link compile} to recognise the one source for which no value is the right
 * answer, and by the advanced editor to treat an emptied-out scratch file as "cancel",
 * the same way `git commit` treats an empty message. The comment stripping is
 * deliberately naive — it only has to decide whether there is *something* there, and a
 * string literal containing `//` errs towards "not blank", which is the safe direction.
 */
export function isBlankExpression(code: string): boolean {
  const withoutComments = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
  return withoutComments.trim() === ''
}

/** Explains why the batch was abandoned. */
function describeAbort(error: unknown, rowCount: number): string {
  if (isTimeout(error)) {
    return `Stopped after ${timeoutFor(rowCount)} ms: the expression never finished. An endless loop or an unbounded recursion is the usual cause.`
  }
  return messageOf(error)
}

/** Whether `error` is V8 interrupting the run rather than user code throwing. */
function isTimeout(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code
  if (code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
    return true
  }
  return /timed out/i.test(messageOf(error))
}

/**
 * Prefixes `return ` to the last top-level statement.
 *
 * This is what lets an advanced expression be a short script that ends with the value to
 * insert. The insertion point comes from {@link scan}, not from counting lines: the last
 * *line* of
 *
 *     const label = upper(s)
 *     `Line 1: ${label}
 *     Line 2: ${i}`
 *
 * is the tail of a template literal, and prefixing it puts the word `return ` inside the
 * string the user is building. That still parses, so the usual protection — a bad guess
 * fails to construct and `compile` falls through — does not fire, and the corruption
 * reaches the document.
 *
 * A boundary the scanner guesses wrongly is harmless: the body then fails to construct
 * and the next candidate takes over.
 */
function withReturnOnLastStatement(code: string): string {
  const { lastStatementStart } = scan(code)
  if (lastStatementStart < 0) {
    // Blank lines and comments only: there is nothing to return.
    return code
  }
  return `${code.slice(0, lastStatementStart)}return ${code.slice(lastStatementStart)}`
}

/**
 * Explains why `names` cannot be used, or `undefined` if they can.
 *
 * Without this check a bad name would surface as a `SyntaxError` about the user's
 * expression, which is the one thing that is not wrong with it.
 */
function describeNameProblem(names: readonly string[]): string | undefined {
  for (const name of names) {
    if (!IDENTIFIER.test(name)) {
      return `Not a valid variable name: ${JSON.stringify(name)}`
    }
  }
  if (!acceptsNames(names)) {
    return `Not valid variable names: ${names.join(', ')}`
  }
  return undefined
}

/**
 * Whether `names` can actually be parameters of a strict-mode function.
 *
 * Catches reserved words, duplicates and `eval`/`arguments`, all of which look like
 * identifiers. The body is a bare directive, so nothing runs.
 */
function acceptsNames(names: readonly string[]): boolean {
  try {
    return typeof new Function(...names, `'use strict';`) === 'function'
  } catch {
    return false
  }
}

/**
 * A displayable message for anything a user expression can throw.
 *
 * `throw 'oops'` is legal, so the thrown value is not necessarily an `Error`; and a
 * hand-made error object can carry a getter or a `toString` that throws in turn, which
 * is why even the stringification is guarded.
 *
 * The `instanceof` check is backed up by the internal-slot tag because user code runs in
 * a separate realm: a `TypeError` raised in there is not an instance of *this* realm's
 * `Error`, and without the second check every runtime failure would be reported as
 * "TypeError: …" instead of the message alone.
 */
function messageOf(error: unknown): string {
  try {
    if (error instanceof Error || isErrorObject(error)) {
      return String((error as Error).message)
    }
    return String(error)
  } catch {
    return 'Unknown error'
  }
}

/** Whether `value` carries the `[[ErrorData]]` slot, whatever realm created it. */
function isErrorObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Error]'
}
