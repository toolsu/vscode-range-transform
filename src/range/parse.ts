/**
 * The three raw parts of a `start:stop:step` range spec, still as text.
 *
 * They stay strings here because what a part means depends on the numeral system or the
 * date format worked out later: `0xa`, `mon` and `2023-01` are all valid starts, and
 * none of them survives an early `parseFloat`.
 */
export interface ParsedRange {
  readonly start: string
  readonly stop?: string
  readonly step?: string
}

/**
 * Splits a range spec into its parts, or returns `null` if it is not a range at all.
 *
 * Parts are trimmed, and an omitted one (`1::2`, `1:`) becomes `undefined` rather than
 * an empty string, so later stages can tell "not given, use a default" apart from
 * "given, but unreadable".
 *
 * A missing `start` is rejected outright: every sequence has to start somewhere, and
 * with no start text there is nothing to infer a numeral system or a date format from.
 * Newlines are rejected because the spec comes from a single-line input box, so a
 * multi-line value can only be a paste accident.
 */
export function parseRange(spec: string): ParsedRange | null {
  if (spec.includes('\n')) {
    return null
  }

  const parts = spec.split(':')

  // `start:stop:step` is the whole grammar; a fourth part is a typo, not an extension.
  if (parts.length > 3) {
    return null
  }

  const [start, stop, step] = parts.map((part) => part.trim())

  if (start === '') {
    return null
  }

  return {
    start,
    stop: stop === '' ? undefined : stop,
    step: step === '' ? undefined : step,
  }
}
