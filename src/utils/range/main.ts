import { parse } from './parse'
import { normalize } from './normalize'
import { generateNumbers } from './generateNumbers'
import { getTypes, convertFrom, convertTo, type NumType } from 'convnum'
import { TYPE_PRIORITY } from '@/const/const'

/**
 * Find the common types between start and stop, then return the highest priority type
 */
function findCommonType(
  startTypes: NumType[],
  stopTypes: NumType[],
): NumType | null {
  const commonTypes = startTypes.filter((type) => stopTypes.includes(type))

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

/**
 * Main function that processes a range command and generates the corresponding sequence.
 * This is the primary entry point for range transformation functionality.
 *
 * @param command - The range command string (e.g., "1:10:2", "V:X", "Mon:Fri")
 * @param selectionCount - The number of selections to generate sequence for
 * @returns Array of strings representing the sequence, or empty array if command is invalid
 */
export const main = (command: string, selectionCount: number): string[] => {
  // Parse the command string to extract start, stop, and step values
  const parsed = parse(command)

  // Return empty array if parsing failed or start value is missing
  if (!parsed || parsed.start === undefined) {
    return []
  }

  const { start, stop, step } = parsed

  // Get types for start and stop values
  const startTypes = getTypes(start)
  const stopTypes = stop ? getTypes(stop) : []

  // If start has no types, return empty
  if (startTypes.length === 0) {
    return []
  }

  let commonType: NumType

  if (stop === undefined) {
    // If no stop value, use the first type from start with highest priority
    commonType =
      startTypes.find((type) => TYPE_PRIORITY.includes(type)) || startTypes[0]
  } else {
    // If stop has no types, return empty
    if (stopTypes.length === 0) {
      return []
    }

    // Find common type between start and stop
    const foundCommonType = findCommonType(startTypes, stopTypes)
    if (!foundCommonType) {
      return []
    }
    commonType = foundCommonType
  }

  // Convert start and stop to numbers using the common type
  let startNum: number
  let stopNum: number | undefined
  let stepNum: number | undefined

  try {
    startNum = convertFrom(start, commonType)
    stopNum = stop ? convertFrom(stop, commonType) : undefined
    stepNum = step ? parseFloat(step) : undefined
  } catch (error) {
    // Conversion failed
    return []
  }

  // Normalize the parameters to handle edge cases and ensure consistent behavior
  const normalized = normalize(startNum, stopNum, stepNum, selectionCount)

  // If normalization failed, return empty array
  if (!normalized) {
    return []
  }

  // Generate the number sequence based on normalized parameters
  const numbers = generateNumbers(
    normalized.start,
    normalized.step,
    normalized.length,
  )

  // Convert numbers back to the original type
  try {
    return numbers.map((num) => convertTo(num, commonType))
  } catch (error) {
    // Conversion failed, fallback to decimal representation
    return numbers.map((num) => num.toString())
  }
}
