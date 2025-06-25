import { parse } from './parse'
import { normalize } from './normalize'
import { generateNumbers } from './generateNumbers'
import {
  getTypes,
  convertFrom,
  convertTo,
  parseDateString,
  formatDateString,
  formatMonthString,
  type NumType,
  type TypeInfo,
  type ParseDateResult,
  type DateInterpretation,
} from 'convnum'
import { findCommonType } from './findCommonType'

/**
 * Main function that processes a range command and generates the corresponding sequence.
 * This is the primary entry point for range transformation functionality.
 *
 * @param command - The range command string "START:STOP:STEP" (e.g., "1:10:2", "V:X", "Mon:Fri")
 * - START: the starting value of the sequence
 * - STOP: the ending value of the sequence
 * - STEP: the step, meaning the difference between each element in the sequence
 * - See `normalize()` for more details
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

  // Try to parse start and stop as date strings first
  try {
    const startDateResult = parseDateString(start)
    let stopDateResult: ParseDateResult | null = null

    if (stop) {
      try {
        stopDateResult = parseDateString(stop)
      } catch {
        // Stop failed to parse as date, if start was parsed as date but stop was not,
        // this is an incompatible situation, so return empty array
        return []
      }
    }

    // Find the best compatible format between start and stop (or just use start format)
    let bestFormat: string | null = null
    let startValue: number | undefined
    let stopValue: number | undefined

    if (stopDateResult) {
      // Both start and stop are dates - choose best interpretations
      let startInterp = startDateResult[0]
      let stopInterp = stopDateResult[0]

      // Prefer interpretations with more padding (more '2's in format)
      for (const interp of startDateResult) {
        const currentPadding = (startInterp.format.match(/2/g) || []).length
        const newPadding = (interp.format.match(/2/g) || []).length
        if (newPadding > currentPadding) {
          startInterp = interp
        }
      }

      for (const interp of stopDateResult) {
        const currentPadding = (stopInterp.format.match(/2/g) || []).length
        const newPadding = (interp.format.match(/2/g) || []).length
        if (newPadding > currentPadding) {
          stopInterp = interp
        }
      }

      // Check if both have the same value type (both timestamps or both months)
      const startHasMonths = startInterp.months !== undefined
      const stopHasMonths = stopInterp.months !== undefined

      if (startHasMonths === stopHasMonths) {
        // Compatible - both have same value type
        bestFormat = startInterp.format
        startValue = startInterp.months ?? startInterp.timestamp
        stopValue = stopInterp.months ?? stopInterp.timestamp
      }
    } else {
      // Only start is a date - prefer interpretation with more padding
      let startInterp = startDateResult[0]
      for (const interp of startDateResult) {
        const currentPadding = (startInterp.format.match(/2/g) || []).length
        const newPadding = (interp.format.match(/2/g) || []).length
        if (newPadding > currentPadding) {
          startInterp = interp
        }
      }
      bestFormat = startInterp.format
      startValue = startInterp.months ?? startInterp.timestamp
    }

    // If we successfully parsed dates, process as date sequence
    if (bestFormat && startValue !== undefined) {
      const stepNum = step ? parseFloat(step) : 1

      // Calculate actual step based on whether we're using timestamps or months
      let actualStep: number
      const hasMonths = startDateResult.some(
        (interp) => interp.format === bestFormat && interp.months !== undefined,
      )

      if (hasMonths) {
        // For month-based dates, step is in months
        actualStep = stepNum
      } else {
        // For timestamp-based dates, step is in days, convert to milliseconds
        actualStep = stepNum * 86400000 // 86400000 ms = 1 day
      }

      // Use existing normalize and generateNumbers functions
      const normalized = normalize(
        startValue,
        stopValue,
        actualStep,
        selectionCount,
      )
      if (!normalized) {
        return []
      }

      const numbers = generateNumbers(
        normalized.start,
        normalized.step,
        normalized.length,
      )

      // Convert numbers back to date strings
      try {
        return numbers.map((num) => {
          return hasMonths
            ? formatMonthString(num, bestFormat)
            : formatDateString(num, bestFormat)
        })
      } catch (error) {
        // Date formatting failed, fall through to regular processing
      }
    }
  } catch {
    // Date parsing failed, fall through to regular processing
  }

  // Regular (non-date) processing
  const startTypeInfos = getTypes(start)
  const stopTypeInfos = stop ? getTypes(stop) : []

  // Extract type strings for findCommonType
  const startTypes = startTypeInfos.map((info) => info.type)
  const stopTypes = stopTypeInfos.map((info) => info.type)

  // Find a common type between start and stop values
  const commonType = findCommonType(startTypes, stopTypes)

  // Return empty array if no common type found
  if (!commonType) {
    return []
  }

  // Convert start and stop values to numbers using the common type
  const startTypeInfo = startTypeInfos.find((info) => info.type === commonType)
  const stopTypeInfo = stopTypeInfos.find((info) => info.type === commonType)

  if (!startTypeInfo) {
    return []
  }

  try {
    const startNum = convertFrom(start, startTypeInfo)
    const stopNum =
      stop && stopTypeInfo ? convertFrom(stop, stopTypeInfo) : undefined
    const stepNum = step ? parseFloat(step) : undefined

    // Normalize the start, stop, and step values
    const normalized = normalize(startNum, stopNum, stepNum, selectionCount)

    // Return empty array if normalization failed
    if (!normalized) {
      return []
    }

    // Generate the sequence of numbers
    const numbers = generateNumbers(
      normalized.start,
      normalized.step,
      normalized.length,
    )

    // Determine which TypeInfo to use for conversion back to strings
    const typeInfoForConversion = (() => {
      // Prefer the TypeInfo from the start value for consistency
      const startTypeInfo = startTypeInfos.find(
        (typeInfo) => typeInfo.type === commonType,
      )
      if (startTypeInfo) {
        return startTypeInfo
      }

      // Fallback to TypeInfo from stop value if start doesn't have the common type
      return stopTypeInfos.find((typeInfo) => typeInfo.type === commonType)
    })()

    // Return empty array if no TypeInfo found for conversion
    if (!typeInfoForConversion) {
      return []
    }

    // Convert numbers back to the original type using the TypeInfo object
    try {
      return numbers.map((num) => convertTo(num, typeInfoForConversion))
    } catch (error) {
      // Conversion failed, fallback to decimal representation
      return numbers.map((num) => num.toString())
    }
  } catch (error) {
    // Conversion failed completely, return empty array
    return []
  }
}
