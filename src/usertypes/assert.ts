/**
 * Compile-time guard that `rt.d.ts` and `buildVars()` describe the same thing.
 *
 * `rt.d.ts` is hand-written because it is the documentation users hover in the advanced
 * editor; `vars.ts` is the runtime bag those names are bound to. Nothing generates one
 * from the other, so this file makes the compiler enforce that they match: add a
 * variable to either side without the other and `tsc -p tsconfig.globals.json` fails.
 *
 * Checked only by `tsconfig.globals.json`. The main project excludes `src/usertypes`,
 * because `declare const s: string` would otherwise be in scope across the whole
 * extension.
 */

import type { TransformVars } from '../transform/vars'

/** The ambient globals `rt.d.ts` declares, gathered into an object type. */
interface AmbientVars {
  s: typeof s
  n: typeof n
  cn: typeof cn
  i: typeof i
  i0: typeof i0
  l: typeof l
  ss: typeof ss
  li: typeof li
  li0: typeof li0
  fli: typeof fli
  fli0: typeof fli0
  wl: typeof wl
  len: typeof len
  wc: typeof wc
  number: typeof number
  letter: typeof letter
  upperletter: typeof upperletter
  lowerletter: typeof lowerletter
  upper: typeof upper
  lower: typeof lower
  convnum: typeof convnum
}

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type Expect<T extends true> = T

/** Fails if either side declares a name the other does not. */
type _SameNames = Expect<Equal<keyof TransformVars, keyof AmbientVars>>

declare const runtimeVars: TransformVars
declare const ambientVars: AmbientVars

/** Fails if any shared name has an incompatible type in either direction. */
const _runtimeSatisfiesAmbient: AmbientVars = runtimeVars
const _ambientSatisfiesRuntime: TransformVars = ambientVars

export type { AmbientVars, _SameNames }
export { _runtimeSatisfiesAmbient, _ambientSatisfiesRuntime }
