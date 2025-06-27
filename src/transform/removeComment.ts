/**
 * Extract the user's expression from the template content by removing all comments
 */
export function removeComment(templateContent: string): string {
  // Remove single-line comments and multi-line comments
  let cleaned = templateContent
    // Remove multi-line comments /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove single-line comments // ...
    .replace(/\/\/.*$/gm, '')
    // Remove empty lines and trim whitespace
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim()
  return cleaned
}
