import { describe, expect, it } from 'bun:test'
import { parseRange } from '../../range/parse'

describe('parseRange', () => {
  it('parses a lone start value', () => {
    expect(parseRange('5')).toEqual({
      start: '5',
      stop: undefined,
      step: undefined,
    })
  })

  it('parses start:stop', () => {
    expect(parseRange('1:5')).toEqual({
      start: '1',
      stop: '5',
      step: undefined,
    })
  })

  it('parses start:stop:step', () => {
    expect(parseRange('1:10:2')).toEqual({
      start: '1',
      stop: '10',
      step: '2',
    })
  })

  it('parses start::step (empty stop)', () => {
    expect(parseRange('1::2')).toEqual({
      start: '1',
      stop: undefined,
      step: '2',
    })
  })

  it('parses start: (empty stop)', () => {
    expect(parseRange('1:')).toEqual({
      start: '1',
      stop: undefined,
      step: undefined,
    })
  })

  it('parses start:: (empty stop and step)', () => {
    expect(parseRange('1::')).toEqual({
      start: '1',
      stop: undefined,
      step: undefined,
    })
  })

  it('parses decimal numbers', () => {
    expect(parseRange('1.5:5.5:0.5')).toEqual({
      start: '1.5',
      stop: '5.5',
      step: '0.5',
    })
  })

  it('parses negative numbers', () => {
    expect(parseRange('-3:3:1')).toEqual({
      start: '-3',
      stop: '3',
      step: '1',
    })
  })

  it('parses scientific notation', () => {
    expect(parseRange('1e0:1e1:1')).toEqual({
      start: '1e0',
      stop: '1e1',
      step: '1',
    })
  })

  it('rejects a newline inside an otherwise valid spec', () => {
    expect(parseRange('1\n:5')).toBeNull()
  })

  it('rejects more than two colons', () => {
    expect(parseRange('1:::5')).toBeNull()
  })

  it('rejects the empty string', () => {
    expect(parseRange('')).toBeNull()
  })

  it('rejects a spec that is only colons', () => {
    expect(parseRange('::')).toBeNull()
  })

  it('does not interpret the parts, however odd they look', () => {
    expect(parseRange('1+2hs)g:n_(_3t$*v4):_(5-2$).')).toEqual({
      start: '1+2hs)g',
      stop: 'n_(_3t$*v4)',
      step: '_(5-2$).',
    })
  })

  it('rejects an empty start with a stop', () => {
    expect(parseRange(':5')).toBeNull()
  })

  it('rejects an empty start with a stop and a step', () => {
    expect(parseRange(':5:2')).toBeNull()
  })

  it('rejects an empty start and stop with a step', () => {
    expect(parseRange('::2')).toBeNull()
  })

  it('rejects an empty start and step with a stop', () => {
    expect(parseRange(':5:')).toBeNull()
  })

  it('trims whitespace around every part', () => {
    expect(parseRange('  1  :  5  :  2  ')).toEqual({
      start: '1',
      stop: '5',
      step: '2',
    })
  })

  it('rejects whitespace mixed with newlines', () => {
    expect(parseRange('  1\n  :  5\n  :  2\n  ')).toBeNull()
  })

  it('rejects a whitespace-only start', () => {
    expect(parseRange('  :  5  :  2  ')).toBeNull()
  })

  it('rejects whitespace-only parts throughout', () => {
    expect(parseRange('  :  :  ')).toBeNull()
  })

  it('rejects a single colon surrounded by whitespace', () => {
    expect(parseRange('  :  ')).toBeNull()
  })

  it('rejects a whitespace-only start before a stop', () => {
    expect(parseRange('  :5')).toBeNull()
  })

  it('treats a whitespace-only stop as absent', () => {
    expect(parseRange('1:  ')).toEqual({
      start: '1',
      stop: undefined,
      step: undefined,
    })
  })

  it('treats a whitespace-only step as absent', () => {
    expect(parseRange('1:5:  ')).toEqual({
      start: '1',
      stop: '5',
      step: undefined,
    })
  })

  it('rejects input containing a newline', () => {
    expect(parseRange('1\n:5')).toBeNull()
  })

  it('rejects input containing whitespace and newlines', () => {
    expect(parseRange('  1\n  :  5\n  :  2\n  ')).toBeNull()
  })
})
