/**
 * Stand-in for convnum's declarations, used only while type-checking this repository.
 *
 * `rt.d.ts` refers to convnum as `typeof import('./convnum')` because in the scratch
 * directory convnum's real declarations sit right next to it, copied there verbatim
 * from `src/generated/convnumDts.ts`. There is no `node_modules` in that directory, so
 * a bare `import('convnum')` could not resolve.
 *
 * Inside this repository that same relative specifier resolves to this file, which
 * simply re-exports the installed package — so `tsconfig.globals.json` checks
 * `rt.d.ts` against the genuine convnum API.
 */
export * from 'convnum'
