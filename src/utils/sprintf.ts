/**
 * sprintf function
 * @param format - The format string
 * @param args - The arguments to be formatted
 * @returns The formatted string
 *
 * @example
 * sprintf("Hello %s, you have %d new %s.", "Alice", 5, "messages");
 */
export function sprintf(format: string, ...args: (string | number)[]): string {
  let i = 0
  return format.replace(/%([sdf])/g, (match, type) => {
    if (i >= args.length) {
      // not enough arguments
      return match
    }
    const arg = args[i++]
    switch (type) {
      case 's':
        return String(arg)
      case 'd':
        return parseInt(String(arg), 10).toString()
      case 'f':
        return parseFloat(String(arg)).toString()
      default:
        return match
    }
  })
}
