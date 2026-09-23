import {
  convertFrom,
  convertTo,
  DEFAULT_LOCALES,
  findCommonDateFormat,
  findCommonType,
  formatDayString,
  formatMonthString,
  getTypes,
  parseDateString,
  resolveTypeAlias,
  type ParseDateResult,
  type TypeInfo,
} from 'convnum'
import { normalize } from './normalize'
import { parseRange } from './parse'
import { generateNumbers } from './sequence'

/**
 * Reads the step of a range as a number, whatever notation it is written in.
 *
 * `Number` rather than `parseFloat`: `parseFloat('0x10')` stops at the `x` and returns
 * `0`, which turns `0x0A::0x10` into a constant sequence. `Number` reads the `0x`, `0b`
 * and `0o` prefixes, and anything it cannot read at all comes back as `NaN`, which
 * `normalize` repairs to 1 like any other half-typed step.
 */
function parseStep(step: string): number {
  return Number(step)
}

/**
 * Which numeric axis a date format counts along.
 *
 * `2023-01` can only move in whole months (adding 30 days to it is meaningless), while
 * `2023-01-15` moves in days. convnum reports both as properties on an interpretation,
 * and the one that is present decides both the arithmetic and the formatter.
 */
type DateUnit = 'months' | 'days'

/**
 * Expands a `start:stop:step` range spec into the text to insert at each selection.
 *
 * Dates are tried first, then numerals. That order matters: `2023-01` is a valid
 * year-month date *and* a valid decimal number followed by junk, and reading it as a
 * date is what the user meant. Anything that is neither — mismatched systems like
 * `Monday:5`, an unknown word, a date start with a non-date stop — yields an empty
 * array, which callers treat as "insert nothing".
 *
 * @param spec - `START`, `START:STOP` or `START:STOP:STEP`, e.g. `1:10:2`, `V:X`,
 * `Mon:Fri`, `2023-01-01::7`.
 * @param selectionCount - How many selections the sequence has to fill.
 * @param defaultLength - Length to use when a single cursor gives no better hint.
 * @param locales - Languages whose month and weekday names to recognise, most preferred
 * first. Defaults to convnum's list of about forty.
 */
export function generateSequence(
  spec: string,
  selectionCount: number,
  defaultLength?: number,
  locales: readonly string[] = DEFAULT_LOCALES,
): string[] {
  const parsed = parseRange(spec)
  if (!parsed) {
    return []
  }

  const { start, stop, step } = parsed

  const dates = tryDateSequence(
    start,
    stop,
    step,
    selectionCount,
    defaultLength,
  )
  if (dates !== null) {
    return dates
  }

  return (
    tryNumeralSequence(
      start,
      stop,
      step,
      selectionCount,
      defaultLength,
      locales,
    ) ?? []
  )
}

/**
 * Reads the range as dates.
 *
 * Returns `null` when the range is simply not a date range and the numeral path should
 * have its turn, and an empty array when it *is* a date range that cannot produce
 * anything — the two cases must stay distinct, or `2023-01-01:invalid` would fall
 * through and be reinterpreted as some unrelated numeral sequence.
 */
function tryDateSequence(
  start: string,
  stop: string | undefined,
  step: string | undefined,
  selectionCount: number,
  defaultLength: number | undefined,
): string[] | null {
  let startInterps: ParseDateResult
  try {
    startInterps = parseDateString(start)
  } catch {
    return null
  }

  let stopInterps: ParseDateResult | null = null
  if (stop !== undefined) {
    try {
      stopInterps = parseDateString(stop)
    } catch {
      // A date start with a non-date stop is a contradiction, not a numeral range.
      return []
    }
  }

  // Both ends are usually ambiguous ("2023-01-01" parses as Y-M2-D2 and as Y-M1-D1);
  // convnum picks the highest-priority format the two ends agree on.
  const dateFormat = findCommonDateFormat(startInterps, stopInterps)
  if (!dateFormat) {
    return null
  }

  const startInterp = startInterps.find((i) => i.format === dateFormat)
  if (!startInterp) {
    return null
  }
  const stopInterp = stopInterps?.find((i) => i.format === dateFormat)

  const unit: DateUnit | null =
    startInterp.months !== undefined
      ? 'months'
      : startInterp.days !== undefined
        ? 'days'
        : null
  if (unit === null) {
    // A format with neither months nor days (a bare time, say) has no axis to count
    // along, so let the numeral path try instead.
    return null
  }

  const parsedStep = step === undefined ? 1 : parseStep(step)
  // Dates move in whole units: there is no date between 2023-01 and 2023-02, and none
  // between two consecutive days either. Left alone, `formatMonthString` interpolates the
  // fraction into the output ("2023-1.5") and `formatDayString` truncates it, so half the
  // sequence comes out duplicated. Rounding or truncating here would silently answer a
  // different question, so a deliberate fractional step is refused instead and the input
  // box reports it. A non-finite step is left to `normalize`, which repairs it to 1 —
  // that is half-typed input rather than a wrong answer.
  if (isFinite(parsedStep) && !Number.isInteger(parsedStep)) {
    return []
  }

  const normalized = normalize(
    startInterp[unit],
    stopInterp?.[unit],
    parsedStep,
    selectionCount,
    defaultLength,
  )
  if (!normalized) {
    return []
  }

  const numbers = generateNumbers(
    normalized.start,
    normalized.step,
    normalized.length,
  )
  const formatValue = unit === 'months' ? formatMonthString : formatDayString

  try {
    return numbers.map((num) => formatValue(num, dateFormat))
  } catch {
    return null
  }
}

/**
 * Reads the range as numerals: decimal, hex, roman, letters, weekday and month names,
 * Chinese, Greek, NATO and the rest of convnum's systems.
 *
 * The `TypeInfo` detected on `start` is what formats the whole output, so casing,
 * `0x`/`0b` prefixes, zero padding and Traditional-vs-Simplified Chinese survive the
 * round trip and the result looks like what the user typed. Returns `null` when the two
 * ends share no system, when either end cannot actually be converted, or when the range
 * asks for more elements than the system can express (see `convertAll`).
 */
function tryNumeralSequence(
  start: string,
  stop: string | undefined,
  step: string | undefined,
  selectionCount: number,
  defaultLength: number | undefined,
  locales: readonly string[],
): string[] | null {
  const startInfos = getTypes(start, { locales })
  const stopInfos = stop === undefined ? [] : getTypes(stop, { locales })

  const commonType = findCommonType(
    startInfos.map((info) => resolveTypeAlias(info.type)),
    stopInfos.map((info) => resolveTypeAlias(info.type)),
  )
  if (!commonType) {
    return null
  }

  const pair = pickReading(startInfos, stopInfos, commonType)
  if (!pair) {
    return null
  }
  const { startInfo, stopInfo } = pair
  const renderInfo = resolveStyle(startInfo, stopInfo)

  try {
    const normalized = normalize(
      convertFrom(start, startInfo),
      stop !== undefined && stopInfo ? convertFrom(stop, stopInfo) : undefined,
      step === undefined ? undefined : parseStep(step),
      selectionCount,
      defaultLength,
    )
    if (!normalized) {
      return null
    }

    const numbers = generateNumbers(
      normalized.start,
      normalized.step,
      normalized.length,
    )

    return convertAll(numbers, renderInfo)
  } catch {
    return null
  }
}

/**
 * Picks which reading of the two ends to work from.
 *
 * A month or weekday name can belong to several languages at once, and `getTypes`
 * reports them all. Preferring a language both ends agree on is what settles most of
 * those without guessing: `mars` alone is French, Swedish or Norwegian, but `mars:juin`
 * can only be French and `mars:maj` can only be Swedish. With nothing to agree on — one
 * end, or two ends that share no language — the most preferred reading of the start
 * wins, which for everything except month and weekday names is the only reading there is.
 */
function pickReading(
  startInfos: readonly TypeInfo[],
  stopInfos: readonly TypeInfo[],
  commonType: string,
): { startInfo: TypeInfo; stopInfo: TypeInfo | undefined } | null {
  const starts = startInfos.filter((info) => info.type === commonType)
  const stops = stopInfos.filter((info) => info.type === commonType)

  const first = starts[0]
  if (!first) {
    return null
  }
  if (stops.length === 0) {
    return { startInfo: first, stopInfo: undefined }
  }

  for (const startInfo of starts) {
    const agreed = stops.find((info) => info.locale === startInfo.locale)
    if (agreed) {
      return { startInfo, stopInfo: agreed }
    }
  }

  return { startInfo: first, stopInfo: stops[0] }
}

/**
 * Decides how to render the sequence, using the stop value to settle what the start
 * value leaves open.
 *
 * Only `zhst` can be genuinely undetermined: `2` means "these characters are written the
 * same in Simplified and Traditional Chinese", which is true of 立春 and 雨水 but not of
 * 驚蟄. Reading `立春:驚蟄` off the start alone therefore produced a Simplified sequence
 * for a range the user wrote in Traditional. Every other property convnum reports —
 * `case`, `format`, `prefix`, `digits`, `ukStyle` — is definite wherever it appears, so
 * the start value stays authoritative for those: a user who writes `Mar:August` asked
 * for short month names and one long one, and honouring the start is the only reading
 * that does not silently rewrite what they typed.
 */
function resolveStyle(
  startInfo: TypeInfo,
  stopInfo: TypeInfo | undefined,
): TypeInfo {
  if (
    startInfo.zhst === 2 &&
    stopInfo?.zhst !== undefined &&
    stopInfo.zhst !== 2
  ) {
    return { ...startInfo, zhst: stopInfo.zhst }
  }
  return startInfo
}

/**
 * Renders every number in the detected numeral system, stopping where the system does.
 *
 * Conversion is per element rather than all-or-nothing. Wrapping the whole map in one
 * `try` and falling back to `num.toString()` meant a single unconvertible value threw
 * away the numeral system for the entire sequence: `MMMCMXCV:` came out as
 * `['3995', '3996', ...]` because 4000 has no roman numeral, and `Mon:Fri:0.5` came out
 * as bare decimals because there is no weekday between Mon and Tue. Digits are never
 * what the user asked for when they typed roman numerals or weekday names.
 *
 * Truncating at the first failure — rather than dropping it and keeping what follows —
 * is what keeps element *i* aligned with cursor *i*: a hole in the middle would shift
 * every later cursor onto its neighbour's value.
 *
 * Returns `null` when a truncated sequence has no step left in it, i.e. when the first
 * value converted and the second did not. That is the fractional-step case, and handing
 * back a lone start value pretending to be a range is worse than an empty result, which
 * the input box turns into a visible validation error.
 */
function convertAll(numbers: number[], info: TypeInfo): string[] | null {
  const converted: string[] = []
  for (const num of numbers) {
    try {
      converted.push(convertTo(num, info))
    } catch {
      break
    }
  }

  if (converted.length < numbers.length && converted.length < 2) {
    return null
  }
  return converted
}
