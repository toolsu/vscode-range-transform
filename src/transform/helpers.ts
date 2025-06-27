/**
 * Helper functions for transform operations
 */

/**
 * Extract number from string by removing all non-numeric characters except digits and decimal point
 */
export const number = (s: string): number => {
  const num = s.replace(/[^0-9.-]/g, '')
  return num ? Number(num) : NaN
}

/**
 * Convert number to uppercase letter A-Z (1=A, 2=B, etc.)
 */
export const letter = (n: number): string => {
  if (n < 1 || n > 26) {
    return ''
  }
  return String.fromCharCode(64 + n)
}

/**
 * Alias for letter() - convert number to uppercase letter
 */
export const upperletter = (n: number): string => {
  return letter(n)
}

/**
 * Convert number to lowercase letter a-z (1=a, 2=b, etc.)
 */
export const lowerletter = (n: number): string => {
  if (n < 1 || n > 26) {
    return ''
  }
  return String.fromCharCode(96 + n)
}

/**
 * Convert string to uppercase
 */
export const upper = (s: string): string => {
  return s.toUpperCase()
}

/**
 * Convert string to lowercase
 */
export const lower = (s: string): string => {
  return s.toLowerCase()
}
