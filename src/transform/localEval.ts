/**
 * Safe evaluation function for user code
 * Executes the provided code with access to the given variables
 * It's optional for user to add return statements,
 * if not, it will be added automatically before the last statement
 */
export function localEval(code: string, vars: Record<string, any>): any {
  let func, result
  try {
    func = new Function('vars', `with(vars) { return ${code} }`)
    result = func(vars)
  } catch (error) {
    try {
      func = new Function('vars', `with(vars) { ${code} }`)
      result = func(vars)
      if (result === undefined) {
        // Add return before the last statement
        // Match the last statement after semicolon/newline OR from start of string
        const withReturn = code.replace(
          /(?:([;\n]\s*)|^)([^;\n]+)\s*$/,
          '$1return $2',
        )
        func = new Function('vars', `with(vars) { ${withReturn} }`)
        result = func(vars)
      }
    } catch (error) {}
  }
  return result
}
