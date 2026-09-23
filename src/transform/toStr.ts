/**
 * Matches an object key that can be written bare in an object literal.
 *
 * Reserved words are deliberately not excluded: `{if: 1}` is legal JavaScript, so the
 * only keys that need quoting are the ones that are not identifier-shaped at all. The
 * test is ASCII-only, which is conservative in the safe direction — an exotic Unicode
 * key gets quoted rather than emitted bare and possibly broken.
 */
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** Stands in for a value whose getter threw, so serialisation can carry on. */
const UNREADABLE = '[Unreadable]'

/*
 * Built-in methods, kept so a value can be recognised by the internal slot it carries
 * rather than by `instanceof`.
 *
 * User expressions run inside a `node:vm` context, which is a separate realm: a `Date`
 * the user's code constructs is not an instance of *this* realm's `Date`, so every
 * `instanceof` below used to fall through to the plain-object branch and render
 * `new Date('2025-01-01')` as `{}`. Calling a built-in with `.call` probes the internal
 * slot instead, which is realm-independent — and, unlike `Object.prototype.toString`,
 * cannot be faked with a `Symbol.toStringTag`.
 */
type Probe<T> = (this: unknown) => T

const getTime = Date.prototype.getTime as unknown as Probe<number>
const stringValueOf = String.prototype.valueOf as unknown as Probe<string>
const numberValueOf = Number.prototype.valueOf as unknown as Probe<number>
const booleanValueOf = Boolean.prototype.valueOf as unknown as Probe<boolean>
const regExpSource = Object.getOwnPropertyDescriptor(RegExp.prototype, 'source')
  ?.get as Probe<string> | undefined
const regExpFlags = Object.getOwnPropertyDescriptor(RegExp.prototype, 'flags')
  ?.get as Probe<string> | undefined
const mapEntries = Map.prototype.entries as unknown as Probe<
  Iterable<[unknown, unknown]>
>
const setValues = Set.prototype.values as unknown as Probe<Iterable<unknown>>

/**
 * Converts whatever a user's expression returned into the text to write into their
 * document.
 *
 * The common cases are deliberately quiet: a string goes in verbatim (no quotes, no
 * escaping) and `null`/`undefined` insert nothing at all, because a transform that
 * happens to produce nothing should clear the selection rather than write the word
 * "undefined" into the file. Everything else falls through to {@link literal}, which
 * emits JavaScript source — this is a code editor, so a form the user can paste back
 * into their program beats JSON.
 */
export function toStr(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  // Everything that is not an object — number, bigint, boolean, symbol, function —
  // carries none of the internal slots probed below, so it goes straight to `literal`.
  if (typeof value !== 'object') {
    return literal(value)
  }

  const time = dateTimeOf(value)
  if (time !== undefined) {
    if (Number.isNaN(time)) {
      return ''
    }
    // UTC getters, not the local-time ones this used to use. Users write dates as ISO
    // strings (`new Date('2025-01-01')`), which parse as UTC midnight, so the local
    // getters reported `2024-12-31` for everyone west of Greenwich.
    const date = new Date(time)
    const year = String(date.getUTCFullYear()).padStart(4, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // A boxed primitive at the top level is treated as the primitive it wraps: someone
  // who wrote `new String(x)` wants the text, not a constructor call. Nested boxes keep
  // their `new String(...)` form, because there the wrapper is information.
  const text = boxedStringOf(value)
  if (text !== undefined) {
    return text
  }
  const numeric = boxedNumberOf(value)
  if (numeric !== undefined) {
    return literal(numeric)
  }
  const flag = boxedBooleanOf(value)
  if (flag !== undefined) {
    return literal(flag)
  }

  return literal(value)
}

/**
 * Serialises a value as JavaScript source.
 *
 * Exported separately from {@link toStr} so the notation can be tested on its own, and
 * because it is occasionally useful by itself. It never throws: unreachable getters,
 * cycles and hostile objects all degrade to a bracketed placeholder rather than
 * aborting the whole transform.
 */
export function literal(value: unknown): string {
  return write(value, new WeakSet())
}

/**
 * The recursion behind {@link literal}. `seen` holds the ancestors of `value`, which is
 * what makes cycle detection possible without also flagging repeats.
 */
function write(value: unknown, seen: WeakSet<object>): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'number':
    case 'bigint':
    case 'boolean':
      // `String` rather than `JSON.stringify`, which turns `NaN` and `Infinity` into
      // `null` and refuses bigints outright. Bigints lose their `n` suffix on purpose:
      // the point here is the value, and `10n` in a document is rarely what was meant.
      return String(value)
    case 'symbol':
      return `Symbol(${value.description ?? ''})`
    case 'function': {
      const name = safely(() => value.name, '')
      return name === '' ? '[Function (anonymous)]' : `[Function: ${name}]`
    }
  }

  const object = value as object
  if (seen.has(object)) {
    return '[Circular]'
  }
  seen.add(object)
  try {
    return writeObject(object, seen)
  } finally {
    // Dropping the value again on the way back up is what distinguishes a cycle from a
    // repeat: `[x, x]` has to print `x` twice, only an ancestor is truly circular.
    seen.delete(object)
  }
}

/** Serialises the object kinds a transform is likely to produce. */
function writeObject(value: object, seen: WeakSet<object>): string {
  // `Array.isArray` is already cross-realm, which is why it needs no probe of its own —
  // but it does throw on a revoked proxy, and this function promises never to throw.
  if (safely(() => Array.isArray(value), false)) {
    // No space after the comma: arrays are usually numbers or short strings, and the
    // compact form is what a user wants pasted into a document.
    const items = value as unknown[]
    return `[${items.map((item) => write(item, seen)).join(',')}]`
  }

  const source = regExpSourceOf(value)
  if (source !== undefined) {
    return `/${source}/${regExpFlagsOf(value)}`
  }

  const time = dateTimeOf(value)
  if (time !== undefined) {
    return Number.isNaN(time)
      ? 'new Date(NaN)'
      : `new Date(${JSON.stringify(new Date(time).toISOString())})`
  }

  const text = boxedStringOf(value)
  if (text !== undefined) {
    return `new String(${JSON.stringify(text)})`
  }
  const numeric = boxedNumberOf(value)
  if (numeric !== undefined) {
    return `new Number(${String(numeric)})`
  }
  const flag = boxedBooleanOf(value)
  if (flag !== undefined) {
    return `new Boolean(${String(flag)})`
  }

  const entries = mapEntriesOf(value)
  if (entries !== undefined) {
    const pairs = entries.map(
      ([key, item]) => `[${write(key, seen)},${write(item, seen)}]`,
    )
    return `new Map([${pairs.join(',')}])`
  }

  const items = setValuesOf(value)
  if (items !== undefined) {
    return `new Set([${items.map((item) => write(item, seen)).join(',')}])`
  }

  return writePlainObject(value, seen)
}

/**
 * Serialises a plain object or class instance as `{key: value, ...}`.
 *
 * Class instances are not labelled with their constructor name: the user asked for
 * text, and `Foo {a: 1}` is not something they could paste back into code.
 */
function writePlainObject(value: object, seen: WeakSet<object>): string {
  const keys = safely<string[]>(() => Object.keys(value), [])
  const entries = keys.map((key) => {
    // Reading a property can run a getter, and a getter can do anything at all —
    // including throw. Losing one entry is much better than losing the transform.
    const rendered = safely(
      () => write((value as Record<string, unknown>)[key], seen),
      UNREADABLE,
    )
    const name = IDENTIFIER.test(key) ? key : JSON.stringify(key)
    return `${name}: ${rendered}`
  })
  return `{${entries.join(', ')}}`
}

/**
 * The timestamp of `value` if it is a `Date` from any realm, otherwise `undefined`.
 *
 * `NaN` means an Invalid Date, which is still a `Date`; only `undefined` means "not one".
 */
function dateTimeOf(value: object): number | undefined {
  return safely<number | undefined>(() => getTime.call(value), undefined)
}

/** The wrapped text if `value` is a boxed string from any realm. */
function boxedStringOf(value: object): string | undefined {
  return safely<string | undefined>(() => stringValueOf.call(value), undefined)
}

/** The wrapped number if `value` is a boxed number from any realm. */
function boxedNumberOf(value: object): number | undefined {
  return safely<number | undefined>(() => numberValueOf.call(value), undefined)
}

/** The wrapped boolean if `value` is a boxed boolean from any realm. */
function boxedBooleanOf(value: object): boolean | undefined {
  return safely<boolean | undefined>(
    () => booleanValueOf.call(value),
    undefined,
  )
}

/** The pattern text if `value` is a regular expression from any realm. */
function regExpSourceOf(value: object): string | undefined {
  return safely<string | undefined>(() => regExpSource?.call(value), undefined)
}

/** The flags of a value {@link regExpSourceOf} has already confirmed is a regexp. */
function regExpFlagsOf(value: object): string {
  return safely(() => regExpFlags?.call(value) ?? '', '')
}

/** The entries if `value` is a `Map` from any realm. */
function mapEntriesOf(value: object): [unknown, unknown][] | undefined {
  return safely<[unknown, unknown][] | undefined>(
    () => [...mapEntries.call(value)],
    undefined,
  )
}

/** The members if `value` is a `Set` from any realm. */
function setValuesOf(value: object): unknown[] | undefined {
  return safely<unknown[] | undefined>(
    () => [...setValues.call(value)],
    undefined,
  )
}

/** Runs `read`, falling back to `fallback` if it throws. */
function safely<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    return fallback
  }
}
