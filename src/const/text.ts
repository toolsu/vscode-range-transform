/** Every user-facing string, in one place. */
export const TEXT = {
  noActiveEditor: 'Range & Transform: open a file first.',
  noSelections: 'Range & Transform: place at least one cursor first.',

  rangeTitle: 'Insert Sequence from Range',
  rangePrompt: 'start:stop:step — stop and step are optional',
  rangePlaceholder: '1:9:2',
  rangeEmpty: 'Enter a range, for example 1:9:2, a:z, Mon:Fri or 一:十',
  rangeInvalid: 'Not a range this extension understands.',

  transformTitle: 'Transform Selections',
  transformPrompt:
    'JavaScript expression — s is the text, n is it as a number, i is the index',
  transformPlaceholder: 'n*3',
  transformEmpty: 'Enter an expression, for example n*3, *3, upper or s.trim()',

  advancedTitle: 'Transform Selections (Advanced)',
  advancedInvalidExpression: (message: string) =>
    `Range & Transform: the expression could not be evaluated — ${message}`,
  advancedNothingToApply:
    'Range & Transform: the expression was empty, so nothing was applied.',
  advancedScratchFailed: (message: string) =>
    `Range & Transform: could not open the advanced editor — ${message}`,
  advancedApplyFailed: (message: string) =>
    `Range & Transform: the transform could not be applied — ${message}`,
  advancedSourceChanged:
    'Range & Transform: that document changed, so the advanced transform no longer lines ' +
    'up with your selections and can no longer be applied. Copy anything you want to ' +
    'keep, then close the scratch editor and run the command again.',
  advancedStale:
    'Range & Transform: the document changed after this transform was started, so nothing ' +
    'was applied. Copy your expression if you need it, then close this editor and run the ' +
    'command again on the current selections.',
  advancedStaleDiscarded:
    'Range & Transform: nothing was applied — the document had changed since the ' +
    'transform was started.',

  appliedWithFailures: (applied: number, failed: number) =>
    `Range & Transform: rewrote ${applied} ${applied === 1 ? 'selection' : 'selections'}; ` +
    `${failed} ${failed === 1 ? 'was' : 'were'} left unchanged.`,
  allFailed: (message: string) =>
    `Range & Transform: nothing could be produced for any selection — ${message}`,
  editRejected:
    'Range & Transform: the document changed while the command was open, so nothing was ' +
    'applied. Try again.',
  editFailed: (message: string) =>
    `Range & Transform: the document could not be edited — ${message}. If the file was ` +
    'closed, reopen it and run the command again.',
} as const
