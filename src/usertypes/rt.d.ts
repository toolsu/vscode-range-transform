/// <reference path="./convnum.d.ts" />

/**
 * Ambient declarations for "Range & Transform: Transform Selections (Advanced)".
 *
 * This file is hand-written and shipped verbatim into the scratch directory next to the
 * file you are editing, which is what gives that file hover documentation, completion
 * and type checking. The JSDoc below is the documentation users read.
 *
 * `src/usertypes/assert.ts` fails to compile if these declarations drift apart from
 * `buildVars()` in `src/transform/vars.ts`.
 */

/**
 * The selected text, exactly as it appears — not trimmed.
 *
 * For a bare cursor with nothing selected, `s` is `""`.
 *
 * @example
 * // selection: "  hello  "
 * s // "  hello  "
 */
declare const s: string

/**
 * The selected text read as a number.
 *
 * Everything except digits, `.` and `-` is stripped first, so `"abc123def"` gives
 * `123` and `"$1.50"` gives `1.5`. When nothing numeric is left, `n` is `NaN`.
 *
 * @example
 * // selection: "item 42"
 * n * 2 // 84
 */
declare const n: number

/**
 * The selected text read as a number in whatever numeral system it is written in.
 *
 * Where `n` simply strips everything that is not a digit, this recognises the text first:
 * `IV` gives `4`, `十二` gives `12`, `0xff` gives `255`, `Wednesday` gives `3`. Text it
 * cannot make sense of gives `NaN`, the same as `n`.
 *
 * @example
 * // selection: "XIV"
 * cn + 1 // 15
 */
declare const cn: number

/**
 * The 1-based position of this selection, counting in document order.
 *
 * @example
 * // three selections, top to bottom
 * i // 1, then 2, then 3
 */
declare const i: number

/** The 0-based position of this selection, counting in document order. */
declare const i0: number

/**
 * How many selections there are in total.
 *
 * @example
 * `${i}/${l}` // "2/5"
 */
declare const l: number

/**
 * Every selected string, in document order.
 *
 * The same array for every selection, so it can be used to compute totals.
 *
 * @example
 * ss.map(number).reduce((a, b) => a + b, 0) // sum of all selections
 */
declare const ss: readonly string[]

/**
 * The line of this selection relative to the first selection, 1-based.
 *
 * The first selection's line is `1`. Selections further down the file count up; two
 * selections on the same line share a value.
 */
declare const li: number

/** The line of this selection relative to the first selection, 0-based. */
declare const li0: number

/** The line of this selection within the file, 1-based — matches the editor's gutter. */
declare const fli: number

/** The line of this selection within the file, 0-based. */
declare const fli0: number

/**
 * The whole line the selection starts on.
 *
 * @example
 * // line: "const total = 42" with "42" selected
 * wl // "const total = 42"
 */
declare const wl: string

/**
 * The length of the selected text in UTF-16 code units.
 *
 * Most characters count as 1, but `"😀"` counts as 2 and `"👨‍👩‍👧‍👦"` as 11. `[...s].length`
 * counts code points instead (1 and 7); for what a reader would call characters, use
 * `Intl.Segmenter` (1 and 1).
 */
declare const len: number

/**
 * The number of whitespace-separated words in the selection.
 *
 * @example
 * // selection: "hello there world"
 * wc // 3
 */
declare const wc: number

/**
 * Reads a string as a number, ignoring everything except digits, `.` and `-`.
 *
 * Returns `NaN` when nothing numeric is left. This is how `n` is derived from `s`.
 *
 * @example
 * number('abc123') // 123
 */
declare function number(text: string): number

/**
 * Turns 1–26 into `A`–`Z`. Out of range gives `""`.
 *
 * Writing `letter` on its own is enough — a bare function is applied automatically, and
 * `letter` takes a number, so it receives `n`.
 *
 * @example
 * letter(1) // "A"
 */
declare function letter(num: number): string

/** Turns 1–26 into `A`–`Z`. An alias of {@link letter}. */
declare function upperletter(num: number): string

/**
 * Turns 1–26 into `a`–`z`. Out of range gives `""`.
 *
 * @example
 * lowerletter(1) // "a"
 */
declare function lowerletter(num: number): string

/**
 * Upper-cases a string.
 *
 * Writing `upper` on its own is enough — a bare function is applied automatically, and
 * `upper` takes a string, so it receives `s`.
 *
 * @example
 * upper('hello') // "HELLO"
 */
declare function upper(text: string): string

/**
 * Lower-cases a string.
 *
 * @example
 * lower('HELLO') // "hello"
 */
declare function lower(text: string): string

/**
 * The [convnum](https://github.com/toolsu/convnum) library: conversion between numeral
 * systems, languages and date formats.
 *
 * `to…` functions take a number and `from…` functions take a string, apart from
 * `toJulianDay`, whose argument is a `Date`, and `fromJulianDay`, whose argument is a
 * number. The ones that need no second argument also work bare — `convnum.toRoman` on
 * its own is applied to `n`, `convnum.fromRoman` to `s`. The rest, `convnum.toBase` and
 * `convnum.convertTo` among them, have to be called in full or they insert
 * `[Function: toBase]`.
 *
 * @example
 * convnum.toRoman(n)            // 4 -> "IV"
 * convnum.toEnglishWords(n)     // 42 -> "forty-two"
 * convnum.toChineseWords(n)     // 123 -> "一百二十三"
 * convnum.toHex(n)              // 255 -> "ff"   (second argument is the prefix:
 *                               //                'lower' -> "0xff", 'upper' -> "0XFF")
 * convnum.toMonth(n, 'en-US', 'short') // 1 -> "Jan"
 */
declare const convnum: typeof import('./convnum')
