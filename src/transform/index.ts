import { argKindOf } from './argKind'
import { compile, isBlankExpression } from './evaluate'
import { expandShorthand } from './shorthand'
import { toStr } from './toStr'
import {
  buildVars,
  selectionTexts,
  varValues,
  VAR_NAMES,
  type SelectionSnapshot,
  type TransformVars,
} from './vars'

/** What a transform produced for one selection. */
export type TransformItem =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly message: string }

/**
 * The outcome of transforming every selection.
 *
 * A failure here means the expression is wrong as a whole: it did not compile (a syntax
 * error), or it ran past its time budget and was interrupted. A failure inside an
 * individual {@link TransformItem} means the expression threw for that one selection,
 * which is routine (`n` is `NaN`, a property is missing) and leaves the others usable.
 */
export type TransformResult =
  | { readonly ok: true; readonly items: readonly TransformItem[] }
  | { readonly ok: false; readonly message: string }

/**
 * Applies a bare function to the variable it is meant to receive.
 *
 * Writing `upper` rather than `upper(s)`, or `convnum.toRoman` rather than
 * `convnum.toRoman(n)`, is the terse form most transforms want. Resolving it here — on
 * the *value* the expression produced — rather than by rewriting the source is what
 * makes it safe: the previous implementation string-replaced helper names across the
 * whole expression and corrupted string literals such as `s.replace('upper', 'x')`.
 *
 * Only functions registered with an argument kind are applied, so a function the user
 * wrote inline is left alone and surfaces as `[Function: …]` — visible feedback that
 * they probably meant to call it.
 */
function applyBareFunction(value: unknown, vars: TransformVars): unknown {
  if (typeof value !== 'function') {
    return value
  }
  const kind = argKindOf(value)
  if (kind === undefined) {
    return value
  }
  return (value as (arg: unknown) => unknown)(kind === 'n' ? vars.n : vars.s)
}

/**
 * Evaluates `code` once per selection and converts each result to text.
 *
 * The expression is expanded and compiled a single time, and every selection is then
 * evaluated in one interruptible call. Both matter because this runs on every keystroke
 * while the preview is live — and because that is exactly when half-written code such as
 * `while (x > 1) {` gets executed, so the run has to be stoppable.
 */
export function runTransform(
  snapshot: SelectionSnapshot,
  code: string,
): TransformResult {
  const compiled = compile(expandShorthand(code), VAR_NAMES)
  if (!compiled.ok) {
    return { ok: false, message: compiled.message }
  }

  // Both read once, before any user code runs. `count` because re-reading
  // `snapshot.texts.length` per iteration let `ss.push(s)` extend the loop it was
  // running inside; `texts` because every selection has to see the same `ss`.
  const count = snapshot.texts.length
  const texts = selectionTexts(snapshot)

  const bags: TransformVars[] = []
  const rows: unknown[][] = []
  for (let index = 0; index < count; index += 1) {
    const vars = buildVars(snapshot, index, texts)
    bags.push(vars)
    rows.push(varValues(vars))
  }

  const batch = compiled.compiled.runAll(rows)
  if (!batch.ok) {
    return { ok: false, message: batch.message }
  }

  const items: TransformItem[] = []
  for (let index = 0; index < count; index += 1) {
    const outcome = batch.outcomes[index]
    const vars = bags[index]

    if (outcome === undefined || vars === undefined) {
      // One outcome per row is the contract, so this is unreachable; reported rather
      // than thrown so that an impossible row could not take the whole preview down.
      items.push({ ok: false, message: 'No result' })
      continue
    }
    if (!outcome.ok) {
      items.push({ ok: false, message: outcome.message })
      continue
    }

    try {
      items.push({
        ok: true,
        text: toStr(applyBareFunction(outcome.value, vars)),
      })
    } catch (error) {
      // A bare helper can still throw once applied, e.g. a convnum converter handed a
      // value outside its range.
      items.push({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { ok: true, items }
}

// Re-exported rather than defined here: `compile` needs it too, and the advanced editor
// imports it from this module.
export { isBlankExpression }

export type { SelectionSnapshot, TransformVars }
