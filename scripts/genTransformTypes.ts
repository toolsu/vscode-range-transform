import fs from 'fs'
import path from 'path'

const transformTypeHeader = `/// <reference path="./convnum.d.ts" />

/**
 * Transform template type definitions
 * Available variables and functions for Range & Transform expressions
 */

`

interface VariableInfo {
  name: string
  type: string
  comment: string
}

interface FunctionInfo {
  name: string
  signature: string
  comment: string
}

/**
 * Extract JSDoc comment from lines before a declaration
 */
function extractJSDocComment(lines: string[], startIndex: number): string {
  const commentLines: string[] = []
  let i = startIndex - 1

  // Look backwards for JSDoc comments
  while (i >= 0) {
    const line = lines[i].trim()
    if (line.startsWith('*/')) {
      // Found end of JSDoc, now collect the comment
      const jsdocLines: string[] = []
      let j = i
      while (j >= 0) {
        const commentLine = lines[j].trim()
        jsdocLines.unshift(commentLine)
        if (commentLine.startsWith('/**')) {
          break
        }
        j--
      }
      return jsdocLines.join('\n ')
    } else if (line.startsWith('*') || line.startsWith('//')) {
      // Single line comment
      commentLines.unshift(line)
    } else if (line === '') {
      // Empty line, continue
    } else {
      // Non-comment line, stop
      break
    }
    i--
  }

  return commentLines.length > 0 ? commentLines.join('\n   ') : ''
}

/**
 * Parse variables from the vars object in transform/main.ts
 */
function parseVariablesFromMainTs(content: string): VariableInfo[] {
  const variables: VariableInfo[] = []
  const lines = content.split('\n')

  // Find the vars object
  let inVarsObject = false
  let braceCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.includes('const vars = {')) {
      inVarsObject = true
      braceCount = 1
      continue
    }

    if (!inVarsObject) {
      continue
    }

    // Count braces to know when we exit the vars object
    braceCount += (line.match(/{/g) || []).length
    braceCount -= (line.match(/}/g) || []).length

    if (braceCount === 0) {
      break
    }

    // Look for property definitions (handle multiline and simple cases)
    const propertyMatch =
      line.match(/^(\w+):\s*(.+?)(?:,\s*)?$/) || line.match(/^(\w+),\s*$/) // Handle lines with just property name and comma
    if (propertyMatch) {
      const [, propName, propValue = ''] = propertyMatch

      // Skip function definitions, helper function references, and the convnum import (but not selection/selections)
      const helperFunctions = [
        'number',
        'letter',
        'upperletter',
        'lowerletter',
        'upper',
        'lower',
      ]
      if (
        ((propValue.includes('=>') || propValue.includes('function')) &&
          !propName.includes('selection')) ||
        propName === 'convnum' ||
        helperFunctions.includes(propName)
      ) {
        continue
      }

      // Extract JSDoc comment for this property
      const comment = extractJSDocComment(lines, i)

      // Determine type based on the property value and name
      let type = 'unknown'
      if (propName === 's' || propName === 'wl') {
        type = 'string'
      } else if (propName === 'ss') {
        type = 'string[]'
      } else if (propName === 'selection') {
        type = "import('vscode').Selection"
      } else if (propName === 'selections') {
        type = "import('vscode').Selection[]"
      } else if (propName.match(/^(n|i|i0|l|li0?|fli0?|len|wc)$/)) {
        type = 'number'
      }

      variables.push({
        name: propName,
        type,
        comment:
          comment || `/**\n * \`${propName}\`: TODO - Add description\n */`,
      })
    }
  }

  return variables
}

/**
 * Parse exported functions from transform/helpers.ts
 */
function parseFunctionsFromHelpersTs(content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Look for exported function declarations
    const exportMatch = line.match(
      /^export const (\w+) = \(([^)]*)\):\s*(\w+(?:\[\])?)\s*=>/,
    )
    if (exportMatch) {
      const [, funcName, params, returnType] = exportMatch

      // Extract JSDoc comment
      const comment = extractJSDocComment(lines, i)

      // Build function signature
      const signature = `${funcName}(${params}): ${returnType}`

      functions.push({
        name: funcName,
        signature,
        comment: comment || `/**\n * ${funcName} function\n */`,
      })
    }
  }

  return functions
}

/**
 * Generate the transform.d.ts content
 */
function generateTransformDtsContent(
  variables: VariableInfo[],
  functions: FunctionInfo[],
): string {
  let content = transformTypeHeader

  // Add variable declarations
  for (const variable of variables) {
    content += `${variable.comment}\n`
    content += `declare const ${variable.name}: ${variable.type}\n\n`
  }

  // Add function declarations
  for (const func of functions) {
    content += `${func.comment}\n`
    content += `declare function ${func.signature}\n\n`
  }

  return content.trim() + '\n'
}

/**
 * Main function to generate transform types
 */
function generateTransformTypes(): void {
  try {
    console.log('🔄 Generating transform types...')

    // Read source files
    const mainTsPath = path.join(__dirname, '../src/transform/main.ts')
    const helpersTsPath = path.join(__dirname, '../src/transform/helpers.ts')

    const mainTsContent = fs.readFileSync(mainTsPath, 'utf-8')
    const helpersTsContent = fs.readFileSync(helpersTsPath, 'utf-8')

    // Parse variables and functions
    const variables = parseVariablesFromMainTs(mainTsContent)
    const functions = parseFunctionsFromHelpersTs(helpersTsContent)

    console.log(`   Found ${variables.length} variables in main.ts`)
    console.log(`   Found ${functions.length} functions in helpers.ts`)

    if (variables.length === 0) {
      console.warn('   ⚠️  No variables found - check parsing logic')
    }
    if (functions.length === 0) {
      console.warn('   ⚠️  No functions found - check parsing logic')
    }

    // Generate the .d.ts content
    const dtsContent = generateTransformDtsContent(variables, functions)

    // Write the file
    const outputPath = path.join(__dirname, '../usertypes/transform.d.ts')

    // Ensure the usertypes directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    fs.writeFileSync(outputPath, dtsContent, 'utf-8')

    console.log(`✅ Generated ${outputPath}`)
    console.log(`   File size: ${dtsContent.length} characters`)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Error generating transform types:', errMsg)
    process.exit(1)
  }
}

generateTransformTypes()
