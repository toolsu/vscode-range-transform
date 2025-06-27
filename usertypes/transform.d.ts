/// <reference path="./convnum.d.ts" />

/**
 * Transform template type definitions
 * Available variables and functions for Range & Transform expressions
 */

/**
 * @type {string} s - The exact selected text string (untrimmed)
 * Example: If you select "hello", s equals "hello"
 */
declare const s: string

/**
 * @type {number} n - Selected text converted to number
 * Extracts number by removing all non-numeric characters except digits and decimal point
 * Example: If you select "abc123def", n equals 123
 */
declare const n: number

/**
 * @type {number} i - Selection index (1-based)
 * The position of each selection, starting from 1
 * Example: First selection = 1, second = 2, etc.
 */
declare const i: number

/**
 * @type {number} i0 - Selection index (0-based)
 * The position of each selection, starting from 0
 * Example: First selection = 0, second = 1, etc.
 */
declare const i0: number

/**
 * @type {number} l - Total count of selections
 * Example: If you have multiple selections, l equals the total count
 */
declare const l: number

/**
 * @type {string[]} ss - Array of all selected text strings
 * Example: ["hello", "world", "test"]
 */
declare const ss: string[]

/**
 * @type {number} li0 - Line index relative to first selection (0-based)
 * Line index relative to the first selection, starting from 0
 */
declare const li0: number

/**
 * @type {number} li - Line index relative to first selection (1-based)
 * Line index relative to the first selection, starting from 1
 */
declare const li: number

/**
 * @type {number} fli0 - Absolute file line index (0-based)
 * Absolute line index in the file, starting from 0
 */
declare const fli0: number

/**
 * @type {number} fli - Absolute file line index (1-based)
 * Absolute line index in the file, starting from 1
 */
declare const fli: number

/**
 * @type {string} wl - Whole line text
 * The entire line content where the selection starts
 */
declare const wl: string

/**
 * @type {number} len - String length (UTF-16 code units)
 * UTF-16 code unit count (most characters = 1, some emoji may be more)
 */
declare const len: number

/**
 * @type {number} cc - Character count
 * True character count (better for emoji handling than len)
 */
declare const cc: number

/**
 * @type {number} wc - Word count
 * Number of words in the selection (whitespace-separated)
 */
declare const wc: number

/**
 * @type {import('vscode').Selection} selection - Current VS Code Selection object
 */
declare const selection: import('vscode').Selection

/**
 * @type {import('vscode').Selection[]} selections - All VS Code Selection objects
 */
declare const selections: import('vscode').Selection[]

/**
 * Extract number from string by removing all non-numeric characters
 * @param {string} text - Input text
 * @returns {number} Extracted number or null if no number found
 * @example number("abc123") // returns 123
 */
declare function number(text: string): number

/**
 * Convert number to uppercase letter A-Z (1=A, 2=B, etc.)
 * @param {number} num - Number between 1-26
 * @returns {string} Uppercase letter or empty string if out of range
 * @example letter(1) // returns "A"
 */
declare function letter(num: number): string

/**
 * Convert number to uppercase letter A-Z (alias for letter)
 * @param {number} num - Number between 1-26
 * @returns {string} Uppercase letter or empty string if out of range
 * @example upperletter(1) // returns "A"
 */
declare function upperletter(num: number): string

/**
 * Convert number to lowercase letter a-z (1=a, 2=b, etc.)
 * @param {number} num - Number between 1-26
 * @returns {string} Lowercase letter or empty string if out of range
 * @example lowerletter(1) // returns "a"
 */
declare function lowerletter(num: number): string

/**
 * Convert string to uppercase
 * @param {string} text - Input text
 * @returns {string} Uppercase text
 * @example upper("hello") // returns "HELLO"
 */
declare function upper(text: string): string

/**
 * Convert string to lowercase
 * @param {string} text - Input text
 * @returns {string} Lowercase text
 * @example lower("HELLO") // returns "hello"
 */
declare function lower(text: string): string
