import { NumType } from 'convnum'
import { TYPE_PRIORITY } from '@/const/const'

/**
 * Finds the highest priority common type between start and stop value types.
 *
 * This function determines which number type should be used for conversion when both
 * start and stop values have been detected as multiple possible types by convnum.
 *
 * @param startTypes - Array of possible types detected for the start value
 * @param stopTypes - Array of possible types detected for the stop value
 * @returns The highest priority common type, or null if no common types exist
 *
 * **Logic:**
 * 1. If stopTypes is empty, use startTypes as candidates
 * 2. Otherwise, find types that exist in both startTypes and stopTypes arrays
 * 3. Return the one with highest priority from TYPE_PRIORITY
 * 4. If no common types exist, return null (incompatible start/stop types)
 *
 * **Examples:**
 * - startTypes: ['decimal', 'roman'], stopTypes: ['decimal', 'binary'] → 'decimal'
 * - startTypes: ['roman'], stopTypes: ['binary'] → null (no common types)
 * - startTypes: ['decimal', 'roman'], stopTypes: [] → 'decimal' (use startTypes)
 * - startTypes: ['binary', 'decimal'], stopTypes: ['decimal', 'binary'] → 'decimal' (higher priority)
 */
export const findCommonType = (
  startTypes: NumType[],
  stopTypes: NumType[],
): NumType | null => {
  // If stopTypes is empty, use startTypes as candidates
  const commonTypes =
    stopTypes.length === 0
      ? startTypes
      : startTypes.filter((type) => stopTypes.includes(type))

  if (commonTypes.length === 0) {
    return null
  }

  // Find the first type in priority order that exists in common types
  for (const priorityType of TYPE_PRIORITY) {
    if (commonTypes.includes(priorityType)) {
      return priorityType
    }
  }

  // Fallback to first common type (shouldn't happen with complete priority list)
  return commonTypes[0]
}
