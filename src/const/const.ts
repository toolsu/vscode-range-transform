import { VALID_NUM_TYPES, type NumType } from 'convnum'

/**
 * Type priority order for resolving multiple common types
 */
export const TYPE_PRIORITY: NumType[] = VALID_NUM_TYPES

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
