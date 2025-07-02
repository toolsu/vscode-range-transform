import { parse } from './parse'
import { normalize } from './normalize'
import { generateNumbers } from './generateNumbers'
import {
  getTypes,
  convertFrom,
  convertTo,
  parseDateString,
  formatDayString,
  formatMonthString,
  findCommonType,
  findCommonDateFormat,
  type ParseDateResult,
  NumType,
} from 'convnum'

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

    // If stop is provided, try to parse it as a date
    if (stop) {
      try {
        stopDateResult = parseDateString(stop)
      } catch {
        // Stop failed to parse as date, if start was parsed as date but stop was not,
        // this is an incompatible situation, so return empty array
        return []
      }
    }

    // Find the best compatible format between start and stop
    const bestFormat = findCommonDateFormat(startDateResult, stopDateResult)

    if (!bestFormat) {
      // No compatible format found between start and stop
      // Fall through to regular (non-date) processing
    } else {
      // Find the corresponding DateInterpretations for the best format
      const startInterp = startDateResult.find(
        (interp) => interp.format === bestFormat,
      )
      const stopInterp = stopDateResult?.find(
        (interp) => interp.format === bestFormat,
      )

      if (!startInterp) {
        // This shouldn't happen given our logic above, but handle it gracefully
        // Fall through to regular processing
      } else {
        // Determine if this is a year-month format (has months property) or date format (has days property)
        const isYearMonth = startInterp.months !== undefined
        const isDayBased = startInterp.days !== undefined

        // Extract the numeric values for calculation
        let startValue: number
        let stopValue: number | undefined

        if (isYearMonth) {
          // Use months as the numeric value for year-month dates
          startValue = startInterp.months!
          stopValue = stopInterp?.months
        } else if (isDayBased) {
          // Use days as the numeric value for day-based dates
          startValue = startInterp.days!
          stopValue = stopInterp?.days
        } else {
          // Fallback to timestamp (though this shouldn't be needed with new convnum)
          startValue = startInterp.timestamp
          stopValue = stopInterp?.timestamp
        }

        // Parse the step value
        const stepNum = step ? parseFloat(step) : 1

        // For day-based dates, step is in days, so use it directly
        // For month-based dates, step is in months, so use it directly
        // For timestamp fallback, convert step from days to milliseconds
        const actualStep =
          isYearMonth || isDayBased ? stepNum : stepNum * 86400000

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

        // Convert numbers back to date strings using the appropriate formatter
        try {
          return numbers.map((num) => {
            if (isYearMonth) {
              // Use formatMonthString for year-month formats
              return formatMonthString(num, bestFormat)
            } else if (isDayBased) {
              // Use formatDayString for day-based formats
              return formatDayString(num, bestFormat)
            }
            // Fallback to formatDateString for timestamp-based (don't use it)
            // return formatDateString(Math.floor(num / 86400000), bestFormat)
            // Must be either isYearMonth or isDayBased, otherwise fall through to regular processing
            throw new Error()
          })
        } catch (error) {
          // Date formatting failed, fall through to regular processing
        }
      }
    }
  } catch {
    // Date parsing failed completely, fall through to regular processing
  }

  // Regular (non-date) processing for numeric/letter/word sequences
  const startTypeInfos = getTypes(start)
  const stopTypeInfos = stop ? getTypes(stop) : []

  // Extract type strings for findCommonType
  const startTypes = startTypeInfos.map((info) => info.type) as NumType[]
  const stopTypes = stopTypeInfos.map((info) => info.type) as NumType[]

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
