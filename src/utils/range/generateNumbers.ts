/**
 * Generates a sequence of numbers based on start, step, and length parameters.
 *
 * This function creates an array of numbers starting from `start`, with each subsequent
 * number incremented by `step`, until the array reaches the specified `length`.
 *
 * @param start - The starting number of the sequence
 * @param step - The step value (difference between consecutive elements)
 * @param length - The number of elements to generate
 * @returns An array of numbers, or empty array if any parameter is non-finite
 *
 * @example
 * generateNumbers(1, 2, 5) // [1, 3, 5, 7, 9]
 * generateNumbers(10, -1, 4) // [10, 9, 8, 7]
 * generateNumbers(5, 0, 3) // [5, 5, 5]
 */
export const generateNumbers = (
  start: number,
  step: number,
  length: number,
): number[] => {
  // Return empty array if any parameter is non-finite (NaN, Infinity, -Infinity)
  if (!isFinite(start) || !isFinite(step) || !isFinite(length)) {
    return []
  }

  // Return empty array if length is not a positive integer
  if (length <= 0 || !Number.isInteger(length)) {
    return []
  }

  const result: number[] = []

  for (let i = 0; i < length; i++) {
    result.push(start + i * step)
  }

  return result
}
