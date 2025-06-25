import { VALID_NUM_TYPES, type NumType } from 'convnum'

/**
 * Type priority order for resolving multiple common types
 */
export const TYPE_PRIORITY: NumType[] = VALID_NUM_TYPES

/**
 * Date format priority order for resolving multiple common date formats
 * Prioritize formats: Y-M-D variations first, then D-M-Y, then others
 */
export const DATE_FORMAT_PRIORITY: string[] = [
  // Year-Month-Day patterns (most preferred)
  'Y-M2-D2',
  'Y-M1-D1',
  'Y-M2-D1',
  'Y-M1-D2',
  'Y.M2.D2',
  'Y.M1.D1',
  'Y.M2.D1',
  'Y.M1.D2',
  'Y/M2/D2',
  'Y/M1/D1',
  'Y/M2/D1',
  'Y/M1/D2',

  // Day-Month-Year patterns
  'D2-M2-Y',
  'D1-M1-Y',
  'D2-M1-Y',
  'D1-M2-Y',
  'D2.M2.Y',
  'D1.M1.Y',
  'D2.M1.Y',
  'D1.M2.Y',
  'D2/M2/Y',
  'D1/M1/Y',
  'D2/M1/Y',
  'D1/M2/Y',

  // Month-Day-Year patterns
  'M2-D2-Y',
  'M1-D1-Y',
  'M2-D1-Y',
  'M1-D2-Y',
  'M2.D2.Y',
  'M1.D1.Y',
  'M2.D1.Y',
  'M1.D2.Y',
  'M2/D2/Y',
  'M1/D1/Y',
  'M2/D1/Y',
  'M1/D2/Y',

  // Year-Month patterns
  'Y-M2',
  'Y-M1',
  'Y.M2',
  'Y.M1',
  'Y/M2',
  'Y/M1',

  // Month-Year patterns
  'M2-Y',
  'M1-Y',
  'M2.Y',
  'M1.Y',
  'M2/Y',
  'M1/Y',

  // Month-Day patterns
  'M2-D2',
  'M1-D1',
  'M2-D1',
  'M1-D2',
  'M2.D2',
  'M1.D1',
  'M2.D1',
  'M1.D2',
  'M2/D2',
  'M1/D1',
  'M2/D1',
  'M1/D2',

  // Day-Month patterns
  'D2-M2',
  'D1-M1',
  'D2-M1',
  'D1-M2',
  'D2.M2',
  'D1.M1',
  'D2.M1',
  'D1.M2',
  'D2/M2',
  'D1/M1',
  'D2/M1',
  'D1/M2',

  // Month name formats
  'Ms D1, Y',
  'Mf D1, Y',
  'D1 Ms Y',
  'D1 Mf Y',
]

export const FALLBACK_SEQUENCE_LENGTH = 10

export const STYLES = {
  selection: {
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    color: 'rgb(139, 0, 0)',
  },
  preview: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    color: 'rgb(0, 255, 0)',
  },
}
