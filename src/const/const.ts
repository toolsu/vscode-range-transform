export const FALLBACK_SEQUENCE_LENGTH = 10

// Temporary file cleanup configuration
export const TEMP_FILE = {
  // How often to run cleanup (in milliseconds)
  CLEANUP_INTERVAL_MS: 86400000, // 24 * 60 * 60 * 1000, i.e. 24 hours

  // Age threshold for deleting temp files (in milliseconds)
  MAX_FILE_AGE_MS: 1800000, // 30 * 60 * 1000, i.e. 30 minutes

  // File pattern for range-transform temp files
  FILE_PREFIX: 'range-transform-',
  FILE_SUFFIX: '.ts',
} as const

export const ADVANCED_TRANSFORM_PLACEHOLDER = 's'
