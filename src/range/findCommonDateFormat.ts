import { ParseDateResult } from 'convnum'

/**
 * Finds the best common date format between start and stop DateInterpretations.
 *
 * the best format when multiple interpretations exist between start and stop dates.
 *
 * **Key Features:**
 * - Handles year-month formats (uses `months` property and `formatMonthString()`)
 * - Handles day-based formats (uses `days` property and `formatDayString()`)
 * - Ensures format compatibility between start and stop values
 * - Falls back gracefully when no priority format is found
 *
 * **Logic:**
 * 1. Extract all possible formats from start interpretations
 * 2. If no stop value or stop is empty, find highest priority format from start formats
 * 3. If stop value exists, find formats common to both start and stop
 * 5. If no common formats exist, fall back to start's highest priority format (same as step 2)
 * 6. Fall back to first format if none found in priority list
 *
 * Note: convnum's compareDateFormatOrder is used by convnum to determine parseDateString's output date format order,
 * first format is the highest priority format, which is the one we use here
 *
 * @param startDateResult - Array of DateInterpretations from start value
 * @param stopDateResult - Array of DateInterpretations from stop value (optional)
 * @returns The best format string (from common formats or start formats), or null only if start is empty
 */
export const findCommonDateFormat = (
  startDateResult: ParseDateResult,
  stopDateResult?: ParseDateResult | null,
): string | null => {
  // Extract all formats from start interpretations
  const startFormats = startDateResult.map((interp) => interp.format)

  // If no stop or stop is empty array, just find the highest priority format from start
  if (!stopDateResult || stopDateResult.length === 0) {
    // Fallback to first format if not found in priority list
    return startFormats[0] || null
  }

  // Extract all formats from stop interpretations
  const stopFormats = stopDateResult.map((interp) => interp.format)

  // Find common formats between start and stop
  const commonFormats = startFormats.filter((format) =>
    stopFormats.includes(format),
  )

  if (commonFormats.length === 0) {
    // No common formats found
    // Fallback to first format if not found in priority list
    return startFormats[0] || null
  }

  // Fallback to first common format if not found in priority list
  return commonFormats[0]
}
