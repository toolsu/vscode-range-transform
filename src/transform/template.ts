/**
 * Template generator for advanced transform expressions
 */

import { ADVANCED_TRANSFORM_PLACEHOLDER } from '@/const/const'
import { resolve } from 'path'

export function generateTemplate(
  selectionCount: number,
  firstSelection?: string,
): string {
  const refPath = resolve(__dirname, '../usertypes/transform.d.ts').replace(
    /\\/g,
    '\\\\',
  ) // Escape backslashes for Windows paths
  return `/// <reference path="${refPath}" />

/**
 * ═══════════════════════════════════════════
 *        ADVANCED TRANSFORM EXPRESSION
 * ═══════════════════════════════════════════
 *
 * This expression will be evaluated for each
 * of your ${selectionCount} selection(s).
 * Write your JavaScript expression at the
 * bottom of this file.
 *
 * Example selections:
 * ${firstSelection ? `"${firstSelection}"` : '"hello"'}, "world",
 * "123"
 *
 * Available variables: s, n, i, i0, l, ss,
 * li0, li, fli0, fli, wl, len, cc, wc
 * Available functions: number(), letter(),
 * upperletter(), lowerletter(), upper(),
 * lower()
 * Convnum library: convnum.toRoman(),
 * convnum.toLatinLetter(),
 * convnum.toEnglishWords(),
 * etc.
 *
 * Hover over variables/functions for detailed
 * documentation.
 *
 * ═══════════════════════════════════════════
 *            EXAMPLE EXPRESSIONS
 * ═══════════════════════════════════════════
 */

// Simple transformations:
// n * 3                    // Multiply by 3
// upper(s)                 // To uppercase
// letter(n)                // Numbers to letters
// s + "_" + i              // Append index

// Conditional logic:
// n ? n * 2 : s            // Double if number
// s.length > 5 ? upper(s) : lower(s)
//                          // Upper if long
// i % 2 === 0 ? upper(s) : lower(s)
//                          // Alternate case

// Complex expressions:
// s.replace(/[aeiou]/g, 'X')
//                          // Replace vowels
// s.split('').reverse().join('')
//                          // Reverse string
// \`\${s}_\${i.toString().padStart(2, '0')}\`
//                          // Zero-padded index
// Math.pow(n || 1, 2)      // Square numbers

// Using convnum library:
// convnum.toRoman(n)       // Roman numerals
// convnum.toLatinLetter(i) // Index to letters
// convnum.toEnglishWords(n)// Numbers to words
// convnum.toHex(n, "upper")// To hexadecimal
// convnum.toMonth(n, "en-US", "short")
//                          // To month names

// Multi-line expressions:
// (() => {
//   if (n && n > 10)
//     return \`Big: \${n}\`;
//   if (n)
//     return \`Small: \${n}\`;
//   return upper(s);
// })()

/**
 * ═══════════════════════════════════════════
 *          YOUR EXPRESSION GOES HERE
 * ═══════════════════════════════════════════
 *
 * Write your JavaScript expression below this
 * comment. The result will replace each
 * selected text.
 *
 * Simple example: n * 3
 * Complex example:
 * n ? \`Number: \${n * 2}\` : \`Text: \${upper(s)}\`
 */

${ADVANCED_TRANSFORM_PLACEHOLDER}`
}
