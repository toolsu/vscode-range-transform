/**
 * Helper functions for transform operations
 * These functions will be used to generate the `usertypes/transform.d.ts` file
 * by the script `scripts/genTransformTypes.ts`, if you add a new function with comment,
 * you also need to modify `scripts/genTransformTypes.ts`
 */

/**
 * Extract number from string by removing all non-numeric characters
 * @param text Input text
 * @returns Extracted number or null if no number found
 * @example number("abc123") // returns 123
 * @remarks
 * In range-transform extension, you can also use shortcut `number` instead of `number(s)`
 */
export const number = (text: string): number => {
  const num = text.replace(/[^0-9.-]/g, '')
  return num ? Number(num) : NaN
}

/**
 * Convert number to uppercase letter A-Z (1=A, 2=B, etc.)
 * @param num Number between 1-26
 * @returns Uppercase letter or empty string if out of range
 * @example letter(1) // returns "A"
 * @remarks
 * In range-transform extension, you can also use shortcut `letter` instead of `letter(n)`
 */
export const letter = (num: number): string => {
  if (num < 1 || num > 26) {
    return ''
  }
  return String.fromCharCode(64 + num)
}

/**
 * Convert number to uppercase letter A-Z (alias for `letter()`)
 * @param num Number between 1-26
 * @returns Uppercase letter or empty string if out of range
 * @example upperletter(1) // returns "A"
 * @remarks
 * In range-transform extension, you can also use shortcut `upperletter` instead of `upperletter(n)`
 */
export const upperletter = (num: number): string => {
  return letter(num)
}

/**
 * Convert number to lowercase letter a-z (1=a, 2=b, etc.)
 * @param num Number between 1-26
 * @returns Lowercase letter or empty string if out of range
 * @example lowerletter(1) // returns "a"
 * @remarks
 * In range-transform extension, you can also use shortcut `lowerletter` instead of `lowerletter(n)`
 */
export const lowerletter = (num: number): string => {
  if (num < 1 || num > 26) {
    return ''
  }
  return String.fromCharCode(96 + num)
}

/**
 * Convert string to uppercase
 * @param text Input text
 * @returns Uppercase text
 * @example upper("hello") // returns "HELLO"
 * @remarks
 * In range-transform extension, you can also use shortcut `upper` instead of `upper(s)`
 */
export const upper = (text: string): string => {
  return text.toUpperCase()
}

/**
 * Convert string to lowercase
 * @param text Input text
 * @returns Lowercase text
 * @example lower("HELLO") // returns "hello"
 * @remarks
 * In range-transform extension, you can also use shortcut `lower` instead of `lower(s)`
 */
export const lower = (text: string): string => {
  return text.toLowerCase()
}
