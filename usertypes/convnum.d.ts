/**
 * Convnum library type definitions
 * This is a subset of the most commonly used functions from convnum
 */

/**
 * Convnum library for number conversions
 * Access via `convnum` variable
 *
 * Examples:
 * - convnum.toLatinLetter(1) // "a" (1=a, 2=b, etc.)
 * - convnum.toLatinLetter(1, true) // "A" (uppercase)
 * - convnum.toRoman(4) // "IV"
 * - convnum.toHex(255) // "ff"
 * - convnum.toHex(255, "upper") // "FF"
 * - convnum.toChineseWords(123) // "一百二十三"
 * - convnum.toEnglishWords(42) // "forty-two"
 * - convnum.toMonth(1) // "January"
 * - convnum.toMonth(1, "en-US", "short") // "Jan"
 * - convnum.toDayOfWeek(1) // "Monday" (0=Sunday, 1=Monday)
 *
 * See full documentation: https://github.com/tomchen/convnum
 */
declare namespace convnum {
  export function toLatinLetter(num: number, upperCase?: boolean): string
  export function fromLatinLetter(letter: string): number
  export function toGreekLetter(num: number, upperCase?: boolean): string
  export function fromGreekLetter(letter: string): number
  export function toRoman(num: number): string
  export function fromRoman(roman: string): number
  export function toHex(num: number, prefix?: false | 'lower' | 'upper'): string
  export function fromHex(hex: string): number
  export function toBin(num: number, prefix?: false | 'lower' | 'upper'): string
  export function fromBin(binary: string): number
  export function toOct(num: number, prefix?: false | 'lower' | 'upper'): string
  export function fromOct(octal: string): number
  export function toChineseWords(num: number, trad?: boolean): string
  export function fromChineseWords(words: string): number
  /**
   * Convert number to English words
   * @param num - Number to convert
   * @returns English words
   * @example toEnglishWords(123) // "one hundred twenty-three"
   */
  export function toEnglishWords(num: number): string
  export function fromEnglishWords(words: string): number
  export function toFrenchWords(num: number): string
  export function fromFrenchWords(words: string): number
  export function toMonth(
    monthNumber: number,
    locale?: string,
    type?: 'long' | 'short' | 'narrow',
  ): string
  export function fromMonth(monthName: string, locale?: string): number | null
  export function toDayOfWeek(
    dayNumber: number,
    locale?: string,
    type?: 'long' | 'short' | 'narrow',
  ): string
  export function fromDayOfWeek(dayName: string, locale?: string): number | null
}
