# Changelog

All notable changes to Range & Transform are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1]

First release.

### Insert Sequence from Range

- `start:stop:step`, where `stop` and `step` are optional and the sign of `step` is
  corrected from the direction of travel.
- `step` is read in any notation JavaScript reads as a number, so `0x0A::0x10` steps by
  sixteen instead of repeating `0x0A`.
- 26 numeral systems: decimal (leading zeros preserved), Latin, Greek, Cyrillic and
  Hebrew letters, Greek letter names, Roman numerals, hexadecimal, binary and octal
  (prefix and case preserved), Eastern Arabic digits, English and French words and
  ordinals, Chinese numerals and financial numerals, Heavenly Stems, Earthly Branches,
  solar terms, NATO phonetic alphabet, astrological signs, month names and weekday names.
  Chinese numerals are read in their canonical form only: `一万` and `壹万` count, a bare
  `万` is not a numeral in either system and is not recognised.
- Dates and year-months, in the separators and field orders convnum recognises, plus the
  East Asian layouts that label each field with a suffix: `2023年12月25日`,
  `2023년 12월 25일`, `2023年12月`, `12月25日`.
- Cyclic kinds wrap around, so `fri::2` runs into the following week.
- Month and weekday names in about forty languages — `janvier:juin`, `Januar:Juni`,
  `enero:junio`, `январь:июнь`, `ocak:haziran`, `1月:6月`, `星期一:星期五` — each counted
  and written back in its own language, keeping the case and the long-or-short form. A
  name several languages share is settled by the other end of the range where it can be:
  `mars:juin` is French, `mars:maj` is Swedish.
- The style the start value leaves undetermined is taken from the stop value. Only
  Traditional-versus-Simplified Chinese is ever undetermined: 立春 and 雨水 are written
  the same either way, so `立春:驚蟄` now counts in Traditional rather than falling back
  to Simplified.
- One item per cursor when there are several; at a single cursor the whole sequence is
  inserted joined by newlines.

### Transform Selections

- Any one-line JavaScript expression, evaluated once per selection.
- Variables `s`, `n`, `i`, `i0`, `l`, `ss`, `li`, `li0`, `fli`, `fli0`, `wl`, `len`, `wc`.
- Helpers `number`, `letter`, `upperletter`, `lowerletter`, `upper`, `lower`, and the
  whole convnum library under `convnum`.
- `cn` reads the selection as a number in whatever numeral system it is written in —
  `IV` gives `4`, `十二` gives `12`, `0xff` gives `255`, `Wednesday` gives `3` — where
  `n` simply strips everything that is not a digit.
- Shorthand: a leading arithmetic operator binds to `n` (`*3`), a leading member access
  binds to `s` (`.trim()`), and a bare function is applied to the variable it takes
  (`upper`, `convnum.toRoman`).
- A syntax error blocks the command; a runtime error in one selection marks that
  selection and leaves the rest working. Code that ends without producing a value is
  reported rather than silently emptying the selection.
- Expressions are evaluated in a sandboxed context with a time budget, so an endless loop
  is stopped instead of freezing the editor, and `process` and `require` are out of reach.

### Transform Selections (Advanced)

- A scratch TypeScript file with full IntelliSense over every variable and helper,
  including hover documentation and the complete convnum API.
- Multi-line expressions; the value of the last line that carries code is what gets
  inserted, and an explicit `return` works too. The one-line shorthand does not apply
  here, though a bare helper on the last line is still called for you.
- Closing the tab applies, emptying the file cancels, and there are explicit ✓ and ✕
  buttons in the editor title bar plus <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd>.
- The file saves itself, so closing it never prompts and nothing is lost to a crash.
- An expression that will not parse is never applied: ✓ and
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> report the error and leave the editor
  open, and closing the tab brings it back with the text still in it.

### Everywhere

- A live inline diff while typing: the replaced text struck through in red, the
  replacement beside it in green, following the editor theme.
- The whole rewrite is one undo step, and the results are left selected so commands can
  be chained.
- The last range and the last expression are remembered separately, and pre-filled the
  next time their input box opens.

[unreleased]: https://github.com/toolsu/vscode-range-transform/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/toolsu/vscode-range-transform/releases/tag/v0.0.1
