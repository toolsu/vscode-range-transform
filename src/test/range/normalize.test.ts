import { describe, expect, it } from 'bun:test'
import { DEFAULT_SEQUENCE_LENGTH } from '../../const/const'
import { MAX_SEQUENCE_LENGTH, normalize } from '../../range/normalize'

describe('normalize', () => {
  it('normalizes an ascending range with a positive step', () => {
    expect(normalize(1, 10, 2, 5)).toEqual({ start: 1, step: 2, length: 5 })
  })

  it('normalizes a descending range with a negative step', () => {
    expect(normalize(10, 1, -2, 5)).toEqual({ start: 10, step: -2, length: 5 })
  })

  it('flips a negative step to match an ascending direction', () => {
    expect(normalize(1, 10, -2, 5)).toEqual({ start: 1, step: 2, length: 5 })
  })

  it('flips a positive step to match a descending direction', () => {
    expect(normalize(10, 1, 2, 5)).toEqual({ start: 10, step: -2, length: 5 })
  })

  it('falls back to the default length for a single selection', () => {
    expect(normalize(5, undefined, 2, 1)).toEqual({
      start: 5,
      step: 2,
      length: DEFAULT_SEQUENCE_LENGTH,
    })
  })

  it('uses the selection count when there is no stop', () => {
    expect(normalize(5, undefined, 2, 7)).toEqual({
      start: 5,
      step: 2,
      length: 7,
    })
  })

  it('defaults an undefined step to 1', () => {
    expect(normalize(1, 10, undefined, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('keeps a zero step in an ascending range', () => {
    expect(normalize(1, 10, 0, 5)).toEqual({ start: 1, step: 0, length: 5 })
  })

  it('keeps a zero step in a descending range', () => {
    expect(normalize(10, 1, 0, 5)).toEqual({ start: 10, step: 0, length: 5 })
  })

  it('collapses the step to 0 when start equals stop', () => {
    expect(normalize(5, 5, 2, 5)).toEqual({ start: 5, step: 0, length: 5 })
  })

  it('handles a negative start with a positive stop', () => {
    expect(normalize(-5, 5, 2, 5)).toEqual({ start: -5, step: 2, length: 5 })
  })

  it('handles a positive start with a negative stop', () => {
    expect(normalize(5, -5, 2, 5)).toEqual({ start: 5, step: -2, length: 5 })
  })

  it('handles two negative bounds, ascending', () => {
    expect(normalize(-10, -1, 2, 5)).toEqual({ start: -10, step: 2, length: 5 })
  })

  it('handles two negative bounds, descending', () => {
    expect(normalize(-1, -10, 2, 5)).toEqual({ start: -1, step: -2, length: 5 })
  })

  it('handles large numbers', () => {
    expect(normalize(1000000, 2000000, 100000, 5)).toEqual({
      start: 1000000,
      step: 100000,
      length: 5,
    })
  })

  it('handles a decimal step', () => {
    expect(normalize(1, 5, 0.5, 5)).toEqual({ start: 1, step: 0.5, length: 5 })
  })

  it('handles a very small step', () => {
    expect(normalize(0, 1, 0.001, 5)).toEqual({
      start: 0,
      step: 0.001,
      length: 5,
    })
  })

  it('keeps a negative step when there is no stop', () => {
    expect(normalize(10, undefined, -2, 5)).toEqual({
      start: 10,
      step: -2,
      length: 5,
    })
  })

  it('keeps a zero step when there is no stop', () => {
    expect(normalize(5, undefined, 0, 5)).toEqual({
      start: 5,
      step: 0,
      length: 5,
    })
  })

  it('handles the maximum safe integer', () => {
    expect(
      normalize(Number.MAX_SAFE_INTEGER - 10, Number.MAX_SAFE_INTEGER, 1, 5),
    ).toEqual({
      start: Number.MAX_SAFE_INTEGER - 10,
      step: 1,
      length: 5,
    })
  })

  it('handles the minimum safe integer', () => {
    expect(
      normalize(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER + 10, 1, 5),
    ).toEqual({
      start: Number.MIN_SAFE_INTEGER,
      step: 1,
      length: 5,
    })
  })

  it('defaults an undefined start to 1', () => {
    expect(normalize(undefined, 10, 2, 5)).toEqual({
      start: 1,
      step: 2,
      length: 5,
    })
  })

  it('defaults an undefined start with no stop', () => {
    expect(normalize(undefined, undefined, 2, 5)).toEqual({
      start: 1,
      step: 2,
      length: 5,
    })
  })

  it('defaults every undefined argument', () => {
    expect(normalize(undefined, undefined, undefined, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('falls back to the default length for a selection count of 0', () => {
    expect(normalize(5, undefined, 2, 0)).toEqual({
      start: 5,
      step: 2,
      length: DEFAULT_SEQUENCE_LENGTH,
    })
  })

  it('falls back to the default length for a selection count of 1', () => {
    expect(normalize(5, undefined, 2, 1)).toEqual({
      start: 5,
      step: 2,
      length: DEFAULT_SEQUENCE_LENGTH,
    })
  })

  it('uses a selection count of 2', () => {
    expect(normalize(5, undefined, 2, 2)).toEqual({
      start: 5,
      step: 2,
      length: 2,
    })
  })

  it('uses a very large selection count', () => {
    expect(normalize(1, undefined, 1, 1000)).toEqual({
      start: 1,
      step: 1,
      length: 1000,
    })
  })

  it('emits a single element when the step overshoots the stop', () => {
    expect(normalize(1, 10, 1000000, 5)).toEqual({
      start: 1,
      step: 1000000,
      length: 1,
    })
  })

  it('emits a single element when a negative step overshoots the stop', () => {
    expect(normalize(10, 1, -1000000, 5)).toEqual({
      start: 10,
      step: -1000000,
      length: 1,
    })
  })

  it('converts a NaN start to 1', () => {
    expect(normalize(NaN, 5, 1, 5)).toEqual({ start: 1, step: 1, length: 5 })
  })

  it('converts an Infinity start to 1', () => {
    expect(normalize(Infinity, 5, 1, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('converts a -Infinity start to 1', () => {
    expect(normalize(-Infinity, 5, 1, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('treats a NaN stop as absent', () => {
    expect(normalize(1, NaN, 1, 5)).toEqual({ start: 1, step: 1, length: 5 })
  })

  it('treats an Infinity stop as absent', () => {
    expect(normalize(1, Infinity, 1, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('treats a -Infinity stop as absent', () => {
    expect(normalize(1, -Infinity, 1, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('converts a NaN step to 1', () => {
    expect(normalize(1, 5, NaN, 5)).toEqual({ start: 1, step: 1, length: 5 })
  })

  it('converts an Infinity step to 1', () => {
    expect(normalize(1, 5, Infinity, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('converts a -Infinity step to 1', () => {
    expect(normalize(1, 5, -Infinity, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('repairs a range where every argument is non-finite', () => {
    expect(normalize(NaN, Infinity, -Infinity, 5)).toEqual({
      start: 1,
      step: 1,
      length: 5,
    })
  })

  it('keeps a zero step with an absent stop', () => {
    expect(normalize(5, undefined, 0, 5)).toEqual({
      start: 5,
      step: 0,
      length: 5,
    })
  })

  it('keeps a zero step with a present stop', () => {
    expect(normalize(5, 10, 0, 5)).toEqual({ start: 5, step: 0, length: 5 })
  })

  it('handles a very small positive step', () => {
    expect(normalize(0, 0.1, 0.01, 5)).toEqual({
      start: 0,
      step: 0.01,
      length: 5,
    })
  })

  it('handles a very small negative step', () => {
    expect(normalize(0.1, 0, -0.01, 5)).toEqual({
      start: 0.1,
      step: -0.01,
      length: 5,
    })
  })

  it('handles a step larger than the whole range', () => {
    expect(normalize(1, 10, 20, 5)).toEqual({ start: 1, step: 20, length: 1 })
  })

  it('handles a negative step larger than the whole range', () => {
    expect(normalize(10, 1, -20, 5)).toEqual({
      start: 10,
      step: -20,
      length: 1,
    })
  })

  it('handles a step exactly equal to the range', () => {
    expect(normalize(1, 10, 9, 5)).toEqual({ start: 1, step: 9, length: 2 })
  })

  it('handles a step one larger than the range', () => {
    expect(normalize(1, 10, 10, 5)).toEqual({ start: 1, step: 10, length: 1 })
  })

  it('handles decimal bounds with an integer step', () => {
    expect(normalize(1.5, 5.5, 1, 5)).toEqual({
      start: 1.5,
      step: 1,
      length: 5,
    })
  })

  it('handles integer bounds with a decimal step', () => {
    expect(normalize(1, 5, 0.5, 5)).toEqual({ start: 1, step: 0.5, length: 5 })
  })

  it('handles decimal bounds and a decimal step', () => {
    expect(normalize(1.1, 5.5, 0.3, 5)).toEqual({
      start: 1.1,
      step: 0.3,
      length: 5,
    })
  })

  it('handles negative decimals', () => {
    expect(normalize(-1.5, -5.5, -0.5, 5)).toEqual({
      start: -1.5,
      step: -0.5,
      length: 5,
    })
  })

  it('handles mixed positive and negative decimals', () => {
    expect(normalize(-1.5, 5.5, 0.5, 5)).toEqual({
      start: -1.5,
      step: 0.5,
      length: 5,
    })
  })

  it('caps the length at the selection count', () => {
    expect(normalize(1, 20, 1, 5)).toEqual({ start: 1, step: 1, length: 5 })
  })

  it('leaves a length below the selection count alone', () => {
    expect(normalize(1, 3, 1, 5)).toEqual({ start: 1, step: 1, length: 3 })
  })

  it('does not cap the length for a single selection', () => {
    expect(normalize(1, 20, 1, 1)).toEqual({ start: 1, step: 1, length: 20 })
  })

  it('needs no capping when the length equals the selection count', () => {
    expect(normalize(1, 5, 1, 5)).toEqual({ start: 1, step: 1, length: 5 })
  })

  describe('defaultLength', () => {
    it('overrides the default length for a single selection', () => {
      expect(normalize(5, undefined, 2, 1, 3)).toEqual({
        start: 5,
        step: 2,
        length: 3,
      })
    })

    it('overrides the default length for a zero step', () => {
      expect(normalize(5, 5, 2, 1, 4)).toEqual({
        start: 5,
        step: 0,
        length: 4,
      })
    })

    it('is ignored once there is more than one selection', () => {
      expect(normalize(5, undefined, 2, 6, 3)).toEqual({
        start: 5,
        step: 2,
        length: 6,
      })
    })
  })

  describe('MAX_SEQUENCE_LENGTH', () => {
    it('accepts a range of exactly the cap', () => {
      expect(normalize(1, MAX_SEQUENCE_LENGTH, 1, 1)).toEqual({
        start: 1,
        step: 1,
        length: MAX_SEQUENCE_LENGTH,
      })
    })

    it('refuses a range one element past the cap', () => {
      expect(normalize(1, MAX_SEQUENCE_LENGTH + 1, 1, 1)).toBeNull()
    })

    it('refuses a range far past the cap rather than materialising it', () => {
      // 1:100000000 used to abort the extension host with an uncatchable
      // "JavaScript heap out of memory", on every keystroke of the preview.
      expect(normalize(1, 100000000, 1, 1)).toBeNull()
    })

    it('refuses a descending range past the cap', () => {
      expect(normalize(1000000, 1, -1, 1)).toBeNull()
    })

    it('refuses a tiny step that turns a short range into a long sequence', () => {
      expect(normalize(0, 1, 0.00001, 1)).toBeNull()
    })

    it('accepts a long range whose step keeps it under the cap', () => {
      expect(normalize(1, 1000000, 100, 1)).toEqual({
        start: 1,
        step: 100,
        length: 10000,
      })
    })

    it('refuses a defaultLength past the cap', () => {
      expect(normalize(1, undefined, 1, 1, MAX_SEQUENCE_LENGTH + 1)).toBeNull()
    })

    it('still fills a selection count above the cap', () => {
      // Those elements are one per cursor the user placed, so they are not the
      // runaway allocation the cap exists to stop.
      const count = MAX_SEQUENCE_LENGTH + 10000
      expect(normalize(1, undefined, 1, count)).toEqual({
        start: 1,
        step: 1,
        length: count,
      })
    })

    it('caps a runaway range down to a selection count above the cap', () => {
      const count = MAX_SEQUENCE_LENGTH + 10000
      expect(normalize(1, 100000000, 1, count)).toEqual({
        start: 1,
        step: 1,
        length: count,
      })
    })
  })
})
