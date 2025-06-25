import { parse } from './parse'
import { normalize } from './normalize'
import { generateNumbers } from './generateNumbers'
import {
  getTypes,
  convertFrom,
  convertTo,
  type NumType,
  type TypeInfo,
} from 'convnum'
import { findCommonType } from './findCommonType'

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

  // Get TypeInfo arrays for start and stop values
  const startTypeInfos = getTypes(start)
  const stopTypeInfos = stop ? getTypes(stop) : []

  // Extract type strings for findCommonType compatibility
  const startTypes = startTypeInfos.map((info) => info.type)
  const stopTypes = stopTypeInfos.map((info) => info.type)

  // If start has no types, return empty
  if (startTypes.length === 0) {
    return []
  }

  // Find common type between start and stop
  const foundCommonType = findCommonType(startTypes, stopTypes)
  if (!foundCommonType) {
    return []
  }
  const commonType: NumType = foundCommonType

  // Find the corresponding TypeInfo object for the common type
  const startTypeInfo = startTypeInfos.find((info) => info.type === commonType)
  const stopTypeInfo = stopTypeInfos.find((info) => info.type === commonType)

  // Use start TypeInfo if available, fallback to stop TypeInfo, then fallback to basic type object
  const typeInfoForConversion: TypeInfo = startTypeInfo ||
    stopTypeInfo || { type: commonType }

  // Convert start and stop to numbers using the common TypeInfo
  let startNum: number
  let stopNum: number | undefined
  let stepNum: number | undefined

  try {
    startNum = convertFrom(start, typeInfoForConversion)
    stopNum = stop ? convertFrom(stop, typeInfoForConversion) : undefined
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

  // Convert numbers back to the original type using the TypeInfo object
  try {
    return numbers.map((num) => convertTo(num, typeInfoForConversion))
  } catch (error) {
    // Conversion failed, fallback to decimal representation
    return numbers.map((num) => num.toString())
  }
}
