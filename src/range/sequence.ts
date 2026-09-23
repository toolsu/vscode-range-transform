/**
 * Builds the arithmetic sequence `start, start + step, start + 2 * step, ...`.
 *
 * Each element is computed from `start` rather than from its predecessor, so a long
 * float sequence does not accumulate rounding error term by term.
 *
 * A non-finite argument, or a length that is not a positive integer, yields an empty
 * array: those inputs mean the range was never usable, and an empty result lets callers
 * simply insert nothing.
 *
 * `length` is allocated in full and is not bounded here, so callers must have bounded it
 * already — `normalize` is the gate, and it refuses anything past `MAX_SEQUENCE_LENGTH`.
 *
 * @example
 * generateNumbers(1, 2, 5) // [1, 3, 5, 7, 9]
 * generateNumbers(10, -1, 4) // [10, 9, 8, 7]
 * generateNumbers(5, 0, 3) // [5, 5, 5]
 */
export function generateNumbers(
  start: number,
  step: number,
  length: number,
): number[] {
  if (!isFinite(start) || !isFinite(step) || !isFinite(length)) {
    return []
  }

  if (length <= 0 || !Number.isInteger(length)) {
    return []
  }

  const result: number[] = []
  for (let i = 0; i < length; i++) {
    result.push(start + i * step)
  }
  return result
}
