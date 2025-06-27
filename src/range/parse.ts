export const parse = (
  command: string,
): {
  start: string
  stop?: string
  step?: string
} | null => {
  // Handle empty string
  if (command === '') {
    return null
  }

  // If command contains any newline, it's invalid
  if (command.includes('\n')) {
    return null
  }

  // Count colons
  const colonCount = (command.match(/:/g) || []).length

  // More than 2 colons is invalid
  if (colonCount > 2) {
    return null
  }

  let start: string | undefined
  let stop: string | undefined
  let step: string | undefined

  if (colonCount === 0) {
    // No colons: just start value
    start = command.trim()
  } else if (colonCount === 1) {
    // One colon: start:stop format
    const match = command.match(/^([^:]*):([^:]*)$/)
    if (!match) {
      return null
    }
    start = match[1].trim()
    stop = match[2].trim()
  } else if (colonCount === 2) {
    // Two colons: start:stop:step format
    const match = command.match(/^([^:]*):([^:]*):([^:]*)$/)
    if (!match) {
      return null
    }
    start = match[1].trim()
    stop = match[2].trim()
    step = match[3].trim()
  }

  // Convert empty strings to undefined
  start = start === '' ? undefined : start
  stop = stop === '' ? undefined : stop
  step = step === '' ? undefined : step

  return {
    start: start as any,
    stop,
    step,
  }
}
