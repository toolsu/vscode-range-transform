import { FALLBACK_SEQUENCE_LENGTH } from '@/const/const'

/**
 * Normalizes the range parameters to ensure consistent behavior across different input scenarios.
 * This function handles edge cases and ensures the step direction aligns with the relationship between start and stop.
 *
 * @param start - The starting number of the sequence. If undefined or not finite, it defaults to 1.
 * @param stop - The ending number of the sequence. If not finite, it is treated as undefined.
 * @param step - The step value (i.e., the difference between each element in the sequence).
 *               If undefined or not finite, it defaults to 1.
 * @param selectionCount - The length of the current text selection (used for fallback calculations).
 * @returns An object with normalized `start`, `step`, and `length` values, or `null` if normalization fails.
 *
 * Normalization logic:
 * 1. If `start` is undefined or not finite (!isFinite(), i.e. NaN, Infinity, -Infinity), set `start = 1`.
 * 2. If `step` is undefined or not finite, set `step = 1`.
 * 3. If `stop` is not finite, set `stop = undefined`.
 * 4. If `stop` is defined:
 *    - Adjust the sign of `step` to match the direction from `start` to `stop` (if start equals stop, then step is 0).
 *    - If `step` is 0:
 *       - set `length` to `selectionCount` if `selectionCount > 1`, otherwise set `length` to FALLBACK_SEQUENCE_LENGTH.
 *    - If `step` is not 0:
 *       - Calculate `stepCount` as: `Math.floor((stop - start) / step)`.
 *       - Set `length = Math.max(1, stepCount)`.
 *       - If `length` exceeds `selectionCount` and `selectionCount > 1`, use `selectionCount` instead.
 * 5. If `stop` is undefined:
 *    - Set `length = selectionCount > 1 ? selectionCount : FALLBACK_SEQUENCE_LENGTH`.
 *    - Use the provided `start` and `step` values.
 */
export const normalize = (
  start: number | undefined,
  stop: number | undefined,
  step: number | undefined,
  selectionCount: number,
): {
  start: number
  step: number
  length: number
} | null => {
  // Convert start: if undefined or !isFinite(), then converted to 1
  let normalizedStart = start
  if (normalizedStart === undefined || !isFinite(normalizedStart)) {
    normalizedStart = 1
  }

  // Convert step: if undefined or !isFinite(), then converted to 1
  let normalizedStep = step
  if (normalizedStep === undefined || !isFinite(normalizedStep)) {
    normalizedStep = 1
  }

  // Convert stop: if !isFinite(), then converted to undefined
  let normalizedStop = stop
  if (normalizedStop !== undefined && !isFinite(normalizedStop)) {
    normalizedStop = undefined
  }

  let length: number

  if (normalizedStop !== undefined) {
    // stop is not undefined
    // step should be converted to using the same sign as stop - start
    const direction = normalizedStop - normalizedStart
    if (direction !== 0) {
      normalizedStep = Math.abs(normalizedStep) * Math.sign(direction)
    } else {
      // If start equals stop, step should be 0
      normalizedStep = 0
    }

    // length is calculated from start, stop, and step (Math.floor((stop - start) / step))
    if (normalizedStep === 0) {
      // Zero step means constant sequence, use selection length, if selectionCount is 1, then use FALLBACK_SEQUENCE_LENGTH
      length = selectionCount > 1 ? selectionCount : FALLBACK_SEQUENCE_LENGTH
    } else {
      const stepCount =
        Math.floor((normalizedStop - normalizedStart) / normalizedStep) + 1
      length = Math.max(1, stepCount) // At least 1 element
      // if length is greater than selectionCount and selectionCount is greater than 1, then length is selectionCount
      if (length > selectionCount && selectionCount > 1) {
        length = selectionCount
      }
    }
  } else {
    // stop is undefined
    // use selection length, if selectionCount is 1, then use FALLBACK_SEQUENCE_LENGTH
    length = selectionCount > 1 ? selectionCount : FALLBACK_SEQUENCE_LENGTH
  }

  // Fix -0 to 0 for consistency
  if (Object.is(normalizedStep, -0)) {
    normalizedStep = 0
  }

  return {
    start: normalizedStart,
    step: normalizedStep,
    length,
  }
}
