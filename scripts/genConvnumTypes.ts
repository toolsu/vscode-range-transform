import fs from 'fs'
import path from 'path'

export const convnumNamespaceComment = `/**
 * convnum library type definitions used by Range & Transform VS Code Extension
 * Auto-generated from convnum package - DO NOT EDIT MANUALLY
 * This exposes ALL convnum functionality in a namespace format
 */

/**
 * Convnum library for number conversions
 * Access via \`convnum\` variable
 *
 * Examples:
 * - convnum.toLatinLetter(1) // "a" (1=a, 2=b, etc.)
 * - convnum.toLatinLetter(1, true) // "A" (uppercase)
 * - convnum.toRoman(4) // "IV"
 * - convnum.toHex(255) // "ff"
 * - convnum.toHex(255, "upper") // "FF"
 * - convnum.toChineseWords(123) // "一百二十三"
 * - convnum.toEnglishWords(42) // "forty-two"
 * - convnum.toMonth(1) // "January"
 * - convnum.toMonth(1, "en-US", "short") // "Jan"
 * - convnum.toDayOfWeek(1) // "Monday" (0=Sunday, 1=Monday)
 *
 * See full documentation: https://github.com/tomchen/convnum
 */`

/**
 * Script to generate usertypes/convnum.d.ts from node_modules/convnum/dist/index.d.ts
 * This creates a namespace version with ALL convnum types and functions exposed
 */

function transformDeclarationsToNamespace(content: string): string {
  // Remove any import/export statements that don't belong in a namespace
  let transformed = content
    .replace(/^export\s*{\s*[^}]*\s*}\s*;?\s*$/gm, '') // Remove export statements
    .replace(/^import\s+[^;]+;?\s*$/gm, '') // Remove import statements

  // Transform all declare statements to namespace exports
  transformed = transformed
    // Transform declare function to export function
    .replace(/^declare function\s+/gm, 'export function ')
    // Transform declare const to export const
    .replace(/^declare const\s+/gm, 'export const ')
    // Transform declare interface to export interface
    .replace(/^declare interface\s+/gm, 'export interface ')
    // Transform declare type to export type
    .replace(/^declare type\s+/gm, 'export type ')
    // Transform standalone type definitions to export type
    .replace(/^type\s+/gm, 'export type ')
    // Transform declare namespace to export namespace
    .replace(/^declare namespace\s+/gm, 'export namespace ')
    // Transform declare class to export class
    .replace(/^declare class\s+/gm, 'export class ')
    // Transform declare enum to export enum
    .replace(/^declare enum\s+/gm, 'export enum ')
    // Transform declare var to export var
    .replace(/^declare var\s+/gm, 'export var ')
    // Transform declare let to export let
    .replace(/^declare let\s+/gm, 'export let ')
    // Transform standalone interface to export interface
    .replace(/^interface\s+/gm, 'export interface ')

  // Split into lines and filter/process each line
  const lines = transformed.split('\n')
  const processedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip empty lines at the beginning and end
    if (line.trim() === '') {
      if (processedLines.length > 0) {
        processedLines.push(line)
      }
      continue
    }

    // Skip comment lines that are standalone (keep JSDoc comments before exports)
    if (
      line.trim().startsWith('//') &&
      !lines[i + 1]?.trim().startsWith('export')
    ) {
      continue
    }

    // Add proper indentation to all content
    if (line.trim()) {
      processedLines.push(`  ${line}`)
    } else {
      processedLines.push('')
    }
  }

  // Remove trailing empty lines
  while (
    processedLines.length > 0 &&
    processedLines[processedLines.length - 1].trim() === ''
  ) {
    processedLines.pop()
  }

  return processedLines.join('\n')
}

function generateNamespaceTypes(): void {
  try {
    // Read the source type definitions
    const convnumTypesPath = path.join(
      __dirname,
      '../node_modules/convnum/dist/index.d.ts',
    )
    const sourceContent = fs.readFileSync(convnumTypesPath, 'utf-8')

    // Transform the content to namespace format
    const namespaceBody = transformDeclarationsToNamespace(sourceContent)

    // Generate the namespace file content
    const namespaceContent = `${convnumNamespaceComment}
declare namespace convnum {
${namespaceBody}
}
`

    // Write the generated content
    const outputPath = path.join(__dirname, '../usertypes/convnum.d.ts')

    // Ensure the usertypes directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    fs.writeFileSync(outputPath, namespaceContent, 'utf-8')

    // Count exports for reporting
    const exportCount = (namespaceBody.match(/^\s*export\s+/gm) || []).length

    console.log(`✅ Generated ${outputPath}`)
    console.log(
      `   Included ${exportCount} exports (functions, types, constants)`,
    )
    console.log(`   File size: ${namespaceContent.length} characters`)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Error generating convnum types:', errMsg)
    process.exit(1)
  }
}

generateNamespaceTypes()
