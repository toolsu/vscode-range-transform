import type { NumType } from 'convnum'

/**
 * Type priority order for resolving multiple common types
 */
export const TYPE_PRIORITY: NumType[] = [
  'decimal',
  'latin_letter',
  'greek_letter',
  'month_name',
  'day_of_week',
  'roman',
  'chinese_words',
  'chinese_financial',
  'chinese_heavenly_stem',
  'chinese_earthly_branch',
  'chinese_solar_term',
  'cyrillic_letter',
  'binary',
  'octal',
  'hexadecimal',
  'arabic',
  'english_cardinal',
  'english_words',
  'french_words',
  'astrological_sign',
  'nato_phonetic',
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
