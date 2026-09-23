import { describe, expect, it } from 'bun:test'
import { MAX_SEQUENCE_LENGTH, normalize } from '../../range/normalize'
import { generateNumbers } from '../../range/sequence'

describe('generateNumbers', () => {
  describe('normal cases', () => {
    it('generates an ascending sequence with a positive step', () => {
      expect(generateNumbers(1, 2, 5)).toEqual([1, 3, 5, 7, 9])
    })

    it('generates a descending sequence with a negative step', () => {
      expect(generateNumbers(10, -1, 4)).toEqual([10, 9, 8, 7])
    })

    it('generates a constant sequence with a zero step', () => {
      expect(generateNumbers(5, 0, 3)).toEqual([5, 5, 5])
    })

    it('generates a single-element sequence', () => {
      expect(generateNumbers(42, 1, 1)).toEqual([42])
    })

    it('generates a sequence with a decimal step', () => {
      expect(generateNumbers(0, 0.5, 4)).toEqual([0, 0.5, 1, 1.5])
    })

    it('generates a sequence from a negative start', () => {
      expect(generateNumbers(-5, 2, 3)).toEqual([-5, -3, -1])
    })

    it('generates a sequence of large numbers', () => {
      expect(generateNumbers(1000, 100, 3)).toEqual([1000, 1100, 1200])
    })
  })

  describe('edge cases', () => {
    it('returns nothing for a zero length', () => {
      expect(generateNumbers(1, 1, 0)).toEqual([])
    })

    it('returns nothing for a negative length', () => {
      expect(generateNumbers(1, 1, -1)).toEqual([])
    })

    it('returns nothing for a non-integer length', () => {
      expect(generateNumbers(1, 1, 3.5)).toEqual([])
    })

    it('handles a very large length', () => {
      const result = generateNumbers(0, 1, 1000)
      expect(result.length).toBe(1000)
      expect(result[0]).toBe(0)
      expect(result[999]).toBe(999)
    })

    it('handles a very small step', () => {
      expect(generateNumbers(0, 0.001, 3)).toEqual([0, 0.001, 0.002])
    })

    it('handles a very large step', () => {
      expect(generateNumbers(0, 1000000, 3)).toEqual([0, 1000000, 2000000])
    })
  })

  describe('non-finite values', () => {
    it('returns nothing for a NaN start', () => {
      expect(generateNumbers(NaN, 1, 5)).toEqual([])
    })

    it('returns nothing for a NaN step', () => {
      expect(generateNumbers(1, NaN, 5)).toEqual([])
    })

    it('returns nothing for a NaN length', () => {
      expect(generateNumbers(1, 1, NaN)).toEqual([])
    })

    it('returns nothing for an Infinity start', () => {
      expect(generateNumbers(Infinity, 1, 5)).toEqual([])
    })

    it('returns nothing for a -Infinity start', () => {
      expect(generateNumbers(-Infinity, 1, 5)).toEqual([])
    })

    it('returns nothing for an Infinity step', () => {
      expect(generateNumbers(1, Infinity, 5)).toEqual([])
    })

    it('returns nothing for a -Infinity step', () => {
      expect(generateNumbers(1, -Infinity, 5)).toEqual([])
    })

    it('returns nothing for an Infinity length', () => {
      expect(generateNumbers(1, 1, Infinity)).toEqual([])
    })

    it('returns nothing for a -Infinity length', () => {
      expect(generateNumbers(1, 1, -Infinity)).toEqual([])
    })

    it('returns nothing when several arguments are non-finite', () => {
      expect(generateNumbers(NaN, Infinity, -Infinity)).toEqual([])
    })
  })

  describe('floating point precision', () => {
    it('reproduces plain float arithmetic', () => {
      expect(generateNumbers(0.1, 0.1, 3)).toEqual([
        0.1, 0.2, 0.30000000000000004,
      ])
    })

    it('reproduces plain float arithmetic for negatives', () => {
      expect(generateNumbers(-0.1, -0.1, 3)).toEqual([
        -0.1, -0.2, -0.30000000000000004,
      ])
    })
  })

  describe('integration with normalize output', () => {
    it('works with a typical normalized range', () => {
      const normalized = { start: 1, step: 1, length: 5 }
      expect(
        generateNumbers(normalized.start, normalized.step, normalized.length),
      ).toEqual([1, 2, 3, 4, 5])
    })

    it('works with a zero step from normalize', () => {
      const normalized = { start: 5, step: 0, length: 3 }
      expect(
        generateNumbers(normalized.start, normalized.step, normalized.length),
      ).toEqual([5, 5, 5])
    })

    it('works with a negative step from normalize', () => {
      const normalized = { start: 10, step: -2, length: 4 }
      expect(
        generateNumbers(normalized.start, normalized.step, normalized.length),
      ).toEqual([10, 8, 6, 4])
    })

    it('never sees a length past the cap, because normalize refuses first', () => {
      // generateNumbers allocates whatever it is handed, so normalize is the only
      // thing standing between a typo and an out-of-memory abort.
      expect(normalize(1, 100000000, 1, 1)).toBeNull()
    })

    it('handles the largest length normalize will hand it', () => {
      const normalized = normalize(1, MAX_SEQUENCE_LENGTH, 1, 1)
      expect(normalized).not.toBeNull()

      const result = generateNumbers(
        normalized!.start,
        normalized!.step,
        normalized!.length,
      )
      expect(result).toHaveLength(MAX_SEQUENCE_LENGTH)
      expect(result[MAX_SEQUENCE_LENGTH - 1]).toBe(MAX_SEQUENCE_LENGTH)
    })
  })
})
