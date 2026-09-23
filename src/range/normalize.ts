import { DEFAULT_SEQUENCE_LENGTH } from '../const/const'

/**
 * The largest sequence a range may ask for on its own.
 *
 * Every element of a sequence is materialised several times over — as a number, then as
 * a string, then joined into one blob and spread character by character by the preview —
 * and all of it runs synchronously inside the preview debounce, i.e. while the user is
 * still typing and before Enter is ever pressed. Unbounded, `1:10000000` costs ~800 ms
 * and 1.2 GB per keystroke, and `1:100000000` aborts the process with "JavaScript heap
 * out of memory", which no `try` can catch and which kills every extension in the window.
 *
 * 20000 is past anything a real range needs: a daily date sequence spanning half a
 * century is ~18000 elements, and VS Code's own `editor.multiCursorLimit` defaults to
 * 10000. At that size the whole pipeline stays around 50 ms and a few megabytes even on
 * the slowest path (dates), so a keystroke still feels instant.
 */
export const MAX_SEQUENCE_LENGTH = 20000

/** A range reduced to the only three numbers a generator needs. */
export interface NormalizedRange {
  readonly start: number
  readonly step: number
  readonly length: number
}

/**
 * Turns a loosely specified range into a start, a step and an element count.
 *
 * Everything the user left out or got wrong is repaired rather than rejected, because
 * this runs on every keystroke of a live preview: a half-typed range should show a
 * plausible sequence, not an error. Specifically:
 *
 * - a missing or non-finite `start` becomes `1`, and a missing or non-finite `step`
 *   becomes `1`; a non-finite `stop` is treated as no `stop` at all
 * - with a `stop`, the sign of `step` is forced to point from `start` towards `stop`, so
 *   `10:1:2` counts down instead of producing nothing
 * - `start === stop` collapses `step` to `0`, i.e. a constant sequence
 *
 * The element count is where `selectionCount` comes in. With more than one selection the
 * count is what the user is really asking for, so it caps a range that would otherwise
 * overshoot (`1:100` across 5 cursors gives 1..5) and it wins outright when the step is
 * `0` or there is no `stop`. A single cursor carries no such information, so
 * `defaultLength` is used instead.
 *
 * Returns `null` when the range asks for more than `MAX_SEQUENCE_LENGTH` elements, which
 * callers surface as "this is not a usable range".
 *
 * @param selectionCount - How many selections the sequence has to fill.
 * @param defaultLength - Length to use when a single cursor gives no better hint.
 */
export function normalize(
  start: number | undefined,
  stop: number | undefined,
  step: number | undefined,
  selectionCount: number,
  defaultLength: number = DEFAULT_SEQUENCE_LENGTH,
): NormalizedRange | null {
  const normalizedStart = start === undefined || !isFinite(start) ? 1 : start
  const normalizedStop =
    stop === undefined || !isFinite(stop) ? undefined : stop
  let normalizedStep = step === undefined || !isFinite(step) ? 1 : step

  // Used whenever the range itself implies no count: no stop to walk towards, or a
  // zero step that never gets there.
  const fallbackLength = selectionCount > 1 ? selectionCount : defaultLength
  let length: number

  if (normalizedStop === undefined) {
    length = fallbackLength
  } else {
    const direction = normalizedStop - normalizedStart
    normalizedStep =
      direction === 0 ? 0 : Math.abs(normalizedStep) * Math.sign(direction)

    if (normalizedStep === 0) {
      length = fallbackLength
    } else {
      const stepCount =
        Math.floor((normalizedStop - normalizedStart) / normalizedStep) + 1
      // At least one element: a step that overshoots the stop still emits the start.
      length = Math.max(1, stepCount)
      if (length > selectionCount && selectionCount > 1) {
        length = selectionCount
      }
    }
  }

  // Refused rather than truncated: a silently shortened sequence looks right in the
  // preview and then inserts 20000 lines nobody asked for, while `null` reaches the
  // input box as a validation error and keeps Enter blocked until the range is narrowed.
  // A length that is exactly the selection count is exempt — those elements are one per
  // cursor the user placed themselves, and each is consumed rather than accumulated, so
  // refusing to number 30000 cursors would be a bug rather than a safeguard.
  if (length > MAX_SEQUENCE_LENGTH && length > selectionCount) {
    return null
  }

  return {
    start: normalizedStart,
    // `Math.abs(0) * Math.sign(-1)` is -0, which would print as "-0" downstream.
    step: Object.is(normalizedStep, -0) ? 0 : normalizedStep,
    length,
  }
}
