<h1><img src="icon.png" width="28" align="top" alt=""> Range &amp; Transform</h1>

Fill multi-cursor selections with a sequence, or rewrite them with a line of JavaScript —
watching an inline diff of the result as you type.

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/tomchen.range-transform?label=Visual%20Studio%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=tomchen.range-transform)
[![Open VSX](https://img.shields.io/open-vsx/v/tomchen/range-transform?label=Open%20VSX&color=%23a60ee5)](https://open-vsx.org/extension/tomchen/range-transform)
[![Test](https://github.com/toolsu/vscode-range-transform/actions/workflows/test.yml/badge.svg)](https://github.com/toolsu/vscode-range-transform/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/toolsu/vscode-range-transform)](LICENSE)

Guide and live demo: [toolsu.com/range-transform](https://toolsu.com/range-transform/).
The numeral systems come from [convnum](https://toolsu.com/convnum/), which you can also
try in the browser with its [Sequence Generator](https://toolsu.com/convnum/tools/sequence-generator/).

## Three commands

Open the Command Palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>)
and type `rt`, `range` or `transform`:

| Command                                                | What you type                                                         | What happens                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Range & Transform: Insert Sequence from Range**      | `1:10`, `Mon:Fri:2`, `一:十`                                          | Each cursor gets the next item in the sequence             |
| **Range & Transform: Transform Selections**            | `n*3`, `*3`, `upper`, `.trim()`                                       | Each selection is replaced by the result of the expression |
| **Range & Transform: Transform Selections (Advanced)** | a multi-line expression, in a real editor with types and autocomplete | Same, with room to think                                   |

All three show a **live inline diff** while you type: the text being replaced is struck
through in red, the replacement appears next to it in green. The first two run in an
input box, where <kbd>Enter</kbd> applies and <kbd>Esc</kbd> walks away. The third runs in
a real editor, where <kbd>Enter</kbd> is a newline like anywhere else and closing the tab
is what applies — see [Transform Selections (Advanced)](#transform-selections-advanced).
Either way the whole rewrite is a single undo step.

## Insert Sequence from Range

```
start:stop:step
```

- **`start`** is required and decides the _kind_ of sequence (see the table below).
- **`stop`** is optional. Leave it out and the sequence just keeps counting: `1:` fills
  every cursor, `mon::2` gives every other weekday.
- **`step`** is optional and defaults to `1`. Its sign is corrected for you, so `10:1`
  counts down without needing `-1`. It can be written in hexadecimal, binary or octal
  too: `0x0A::0x10` steps by sixteen.

With several cursors, one item goes to each cursor and the sequence stops there. With a
single cursor there is nowhere to spread it, so the whole sequence is inserted joined by
newlines — put one cursor down, type `1:10`, get ten lines.

### What `start` can be

Anything [convnum](https://github.com/toolsu/convnum) recognises — 26 numeral systems,
plus dates — each counted and written back in its own terms:

| Kind                                 | Example                                                                                      | Result                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Decimal                              | `1:10:2`                                                                                     | `1` `3` `5` `7` `9`                           |
| Zero-padded decimal                  | `01:05`                                                                                      | `01` `02` `03` `04` `05`                      |
| Latin letter                         | `a:e` or `A:E`                                                                               | `a` `b` `c` `d` `e` or `A` `B` `C` `D` `E`    |
| Roman numeral                        | `II:X`                                                                                       | `II` `III` `IV` `V` …                         |
| Hexadecimal / binary / octal         | `0x1:0xf`, `0b1:0b101`, `0o1:0o7`                                                            | prefix and case preserved                     |
| Eastern Arabic                       | `٠:٥`                                                                                        | `٠` `١` `٢` `٣` `٤` `٥`                       |
| English words                        | `one:five`                                                                                   | `one` `two` `three` `four` `five`             |
| English ordinal words                | `first:fifth`                                                                                | `first` `second` `third` …                    |
| English ordinal abbreviations        | `1st:5th`                                                                                    | `1st` `2nd` `3rd` `4th` `5th`                 |
| French words                         | `un:cinq`                                                                                    | `un` `deux` `trois` …                         |
| French ordinal words                 | `premier:cinquième`                                                                          | `premier` `deuxième` …                        |
| French ordinal abbreviations         | `1er:5e`                                                                                     | `1er` `2e` `3e` `4e` `5e`                     |
| Chinese numerals                     | `一:五`                                                                                      | `一` `二` `三` `四` `五`                      |
| Chinese financial numerals           | `壹:伍`                                                                                      | `壹` `贰` `叁` `肆` `伍`                      |
| Heavenly Stems 天干                  | `甲:癸`                                                                                      | `甲` `乙` `丙` …                              |
| Earthly Branches 地支                | `子:辰`                                                                                      | `子` `丑` `寅` `卯` `辰`                      |
| Solar terms 节气                     | `立春:惊蛰` or `立春:驚蟄`                                                                   | `立春` `雨水` `惊蛰` or `立春` `雨水` `驚蟄`  |
| Greek letter                         | `α:ε` or `Α:Δ`                                                                               | `α` `β` `γ` `δ` `ε` or `Α` `Β` `Γ` `Δ`        |
| Greek letter names                   | `Alpha:Delta`                                                                                | `Alpha` `Beta` `Gamma` `Delta`                |
| Cyrillic letter                      | `а:г` or `А:Г`                                                                               | `а` `б` `в` `г` or `А` `Б` `В` `Г`            |
| Hebrew letter                        | `א:ה`                                                                                        | `א` `ב` `ג` `ד` `ה`                           |
| NATO phonetic                        | `Alfa:Echo`                                                                                  | `Alfa` `Bravo` `Charlie` …                    |
| Astrological sign                    | `Aries:Cancer`                                                                               | `Aries` `Taurus` `Gemini` `Cancer`            |
| Month name                           | `Jan:Jun`, `January:June`, `janvier:juin`, `1月:6月`                                         | short or long, case and language preserved    |
| Day of week                          | `Mon:Fri`, `monday:friday`, `lundi:vendredi`, `星期一:星期五`                                | short or long, case and language preserved    |
| Date                                 | `2023-01-01:2023-01-05`                                                                      | also `.` `/` `,` separators, `D-M-Y`, `M-D-Y` |
| Year-month                           | `2023-01:2023-06`                                                                            | steps by month                                |
| Named-month/date of different format | `Dec 25, 2023:Dec 29, 2023` or `Dec 25 2023:Dec 29 2023` or `25 Dec 2023:29 Dec 2023`        |                                               |
| East Asian date                      | `2023年12月25日:2023年12月29日`, `2023年12月:2024年3月`, `2023년 12월 25일:2023년 12월 29일` | each field labelled, so nothing is guessed    |

Notes:

- **The style of `start` is preserved.** `MON:FRI` stays upper case, `0XA:0XF` keeps its
  upper-case prefix, `01:10` keeps its leading zero, `一:十` stays Simplified.
- **Cyclic kinds wrap around.** `fri::2` continues past Sunday into the next week, and
  `甲::3` wraps through the ten stems.
- **`start` and `stop` must be the same kind.** `Mon:5` produces nothing, and the input
  box tells you so before you press Enter. Watch out for pairs that share a kind you did
  not have in mind: `1` and `a` are both hexadecimal digits, so `1:a` counts `1` `2` …
  `9` `a` rather than failing.
- **Roman numerals versus letters.** `I`, `V`, `X`, `C` and friends are also perfectly
  good Latin letters, and a single letter is read as a letter. Write at least one end
  with two or more characters — `II:X` or `I:XX` — to get Roman numerals.
- **Month and weekday names work in about forty languages.** `janvier:juin`,
  `Januar:Juni`, `enero:junio`, `январь:июнь`, `ocak:haziran`, `1月:6月`,
  `星期一:星期五` — each counted and written back in its own language, keeping the
  case and the long-or-short form you typed. A name several languages share is settled by
  the other end of the range where it can be: `mars:juin` is French, `mars:maj` is
  Swedish. With nothing to go on, the more widely used language wins.
- **Chinese numerals are read in their canonical form.** `一万` counts in ordinary
  numerals and `壹万` in the financial ones. A bare `万` is neither — no Chinese numeral
  is written that way — so it is not recognised, and nor is `一十` in place of `十`.

## Transform Selections

Type any one-line JavaScript expression. Its value replaces each selection.

```js
n * 3                                   // 1, 2, 3   ->  3, 6, 9
upper(s)                                // a, b, c   ->  A, B, C
`${i}. ${s}`                            // a, b, c   ->  1. a, 2. b, 3. c
s + '_' + i                             // a, b, c   ->  a_1, b_2, c_3
i.toString().padStart(3, '0')           //           ->  001, 002, 003
i % 2 ? upper(s) : s                    // x, y      ->  X, y
[...s].reverse().join('')               // hello     ->  olleh
ss.map(number).reduce((a, b) => a + b)  // 10,20,30  ->  60, 60, 60
convnum.toRoman(n)                      // 4, 9      ->  IV, IX
```

### Shorthand

Three rules let you skip the boilerplate. Each one fires only on something that would be
illegal or pointless as real JavaScript, so a complete expression is never touched.

| You type                                | It runs                                     | Why it is unambiguous                               |
| --------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `*3` `/2` `%7` `**2` `+1` `-1`          | `n*3` `n/2` …                               | an expression cannot begin with a binary operator   |
| `.trim()` `.padStart(3,'0')` `?.length` | `s.trim()` …                                | an expression cannot begin with a member access     |
| `upper` `letter` `convnum.toRoman`      | `upper(s)` `letter(n)` `convnum.toRoman(n)` | a bare function is applied to the variable it takes |

The last rule works on the _value_, not the text, so `s.replace('upper', 'x')` is left
completely alone — and every single-argument convnum converter works bare, not just the
built-in helpers. Converters that need a second argument do not: `convnum.toBase`,
`convnum.convertTo` and `convnum.formatDayString` have to be called in full, and so does
`convnum.toJulianDay`, whose argument is a `Date` rather than `s` or `n`. Neither is a
function you wrote yourself ever called for you. Left un-called, any of them inserts
`[Function: toBase]` — or `[Function (anonymous)]` if it has no name — which is your hint
that a call is missing.

`+` and `-` bind to `n`, reading them as arithmetic, so `-1` on a selection of `5` gives
`4`. For the constant `-1`, write `(-1)`: the first character is then a parenthesis, which
no rule fires on. Or use **Insert Sequence from Range**, which is what constants are for.

### Variables

|                |                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `s`            | the selected text, exactly as it is — not trimmed                                                                                                                                                             |
| `n`            | `s` read as a number; everything but digits, `.` and `-` is stripped, so `"item 42"` gives `42`. `NaN` when there is no number                                                                                |
| `cn`           | `s` read as a number in whatever numeral system it is written in — `IV` gives `4`, `十二` gives `12`, `0xff` gives `255`, `Wednesday` gives `3`. `NaN` when nothing recognises it (=`convnum.anyToNumber(s)`) |
| `i` / `i0`     | this selection's position, 1-based / 0-based, counted in document order                                                                                                                                       |
| `l`            | how many selections there are                                                                                                                                                                                 |
| `ss`           | every selected string, in document order — the same array for every selection, so it can be used for totals                                                                                                   |
| `wl`           | the whole line this selection starts on                                                                                                                                                                       |
| `len`          | length of `s` in UTF-16 code units (`"😀"` counts as 2 — `[...s].length` counts code points instead)                                                                                                          |
| `wc`           | number of whitespace-separated words in `s`                                                                                                                                                                   |
| `li` / `li0`   | line relative to the first selection, 1-based / 0-based                                                                                                                                                       |
| `fli` / `fli0` | line within the file, 1-based / 0-based — `fli` matches the gutter                                                                                                                                            |

### Functions

|                                    |                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number(text)`                     | reads a string as a number, the way `n` is derived from `s`                                                                                                                                                                                       |
| `letter(num)` / `upperletter(num)` | `1`–`26` → `A`–`Z`                                                                                                                                                                                                                                |
| `lowerletter(num)`                 | `1`–`26` → `a`–`z`                                                                                                                                                                                                                                |
| `upper(text)` / `lower(text)`      | change case                                                                                                                                                                                                                                       |
| `convnum`                          | the whole [convnum](https://github.com/toolsu/convnum) library — `convnum.toRoman(cn)`, `convnum.toEnglishWords(n)`, `convnum.toChineseWords(cn)`, `convnum.toHex(n)`, `convnum.toMonth(cn)`, `convnum.fromRoman(s)`, `convnum.anyToNumber(s)`, … |

Standard JavaScript is all there too: `Math`, `Date`, `JSON`, template literals, regular
expressions, arrow functions.

### When something goes wrong

A **syntax error** blocks <kbd>Enter</kbd> and is explained under the input box. A
**runtime error in one selection** — `n` was `NaN`, a property was missing — marks that
one with ⚠ in the preview, leaves it untouched, and lets the rest through.

Code that **ends without producing a value**, such as `let out = upper(s)` with nothing
after it, is refused. That is a property of the code rather than of the text, so it fails
for every selection and nothing is applied — which is the point: it used to replace every
selection with nothing at all. End the script with the value you want, or write an
explicit `return`.

An expression that never finishes is **stopped** rather than left to freeze the editor:
a quarter of a second, plus a millisecond per selection, up to two seconds. That matters
because the preview runs while you are still typing, and half-written code such as
`while (x > 1) {` becomes complete the moment VS Code auto-closes the brace.

### What gets inserted

The expression's value is turned into text: strings as-is, `null` as nothing, a `Date` as
`YYYY-MM-DD`, and anything structured as the JavaScript literal you could paste back into
your code (`[1,2,3]`, `{name: "John", age: 30}`, `/ab+c/g`).

`undefined` also inserts nothing, but only where you asked for it — a single expression,
or a script with an explicit `return`. A script that just runs off the end is the "no
value" case above.

## Transform Selections (Advanced)

The same thing, with room to breathe. It opens a scratch TypeScript file beside your
document:

- **Full IntelliSense.** Hover `s`, `wc` or `convnum.toMonth` for its documentation.
  Completion, signature help and type checking all work.
- **As many lines as you like.** The value of the last expression is what gets inserted —
  no `return` and no wrapping function needed, though an explicit `return` works too. It
  is the last _line_ that carries code, so give that expression a line of its own.
- **The live diff keeps running** in your original document, in the column beside you.
- **No shorthand.** `*3` and `.trim()` are conveniences of the one-line input box; a
  multi-line file is read as plain JavaScript, so write `n * 3` and `s.trim()`. Bare
  helpers do still work: a last line of `upper` is `upper(s)`.

Given a selection of `hello-world`, this inserts `I. HELLO WORLD`:

<!-- prettier-ignore -->
```ts
const parts = s.split('-')
const label = parts.map(upper).join(' ')

`${convnum.toRoman(i)}. ${label}`
```

The line break before the template literal is doing real work. Run those two lines
together and JavaScript reads the backtick as a _tag_ applied to the expression before it,
which fails with "Cannot access 'label' before initialization". A line that starts with
`` ` ``, `(`, `[`, `+`, `-` or `/` continues the line above rather than beginning a new
statement, so give the value you want inserted a line of its own.

**Close the tab to apply.** This is how VS Code's own Git extension treats a commit
message: closing the editor is what commits. To cancel, empty the file before closing it,
or use the **✕** button in the editor's title bar. There is also a **✓** button, and
<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd>, if you would rather say so explicitly.

The file saves itself as you type, so closing it never asks whether you want to keep it,
and nothing is lost if the window goes away. An expression with a syntax error is never
applied: **✓** and <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> report the error and
leave the editor where it is, and closing the tab brings it straight back with your text
still in it. Nothing is thrown away over a typo — but a syntax error does mean the tab
will not go away until you fix it or cancel.

## Settings

| Setting                                | Default |                                                                            |
| -------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `rangeTransform.defaultSequenceLength` | `10`    | how many items to generate at a single cursor when the range has no `stop` |
| `rangeTransform.preview.maxLength`     | `120`   | where to truncate each item in the inline preview                          |
| `rangeTransform.rememberLastInput`     | `true`  | pre-fill the input box with what you typed last time                       |

## Keyboard shortcuts

One shortcut is claimed by default, and only one: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> +
<kbd>Enter</kbd> applies the transform while the advanced editor's scratch file is the
focused tab. It is scoped to that one file and cannot fire in any other editor. The three
commands themselves have no shortcut, deliberately: an extension's keybindings outrank the
built-in ones, so whatever key they claimed would be taken away from you for as long as
this is installed.

To bind your own, run **Preferences: Open Keyboard Shortcuts (JSON)** and add:

```jsonc
{
  "key": "ctrl+k r", // "cmd+k r" on macOS
  "command": "range-transform.insertSequence",
  "when": "editorTextFocus && !editorReadonly"
},
{
  "key": "ctrl+k t",
  "command": "range-transform.transform",
  "when": "editorTextFocus && !editorReadonly"
},
{
  "key": "ctrl+k shift+t",
  "command": "range-transform.transformAdvanced",
  "when": "editorTextFocus && !editorReadonly"
}
```

Avoid <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + _key_ combinations. Windows reports
<kbd>AltGr</kbd> as <kbd>Ctrl</kbd> + <kbd>Alt</kbd>, so on any layout that uses
<kbd>AltGr</kbd> to type characters — German, French, Polish, the Nordic layouts and many
more — such a binding swallows one of those characters. A layout with no <kbd>AltGr</kbd>
characters at all, US English among them, is the safe case, not the dangerous one.

## Making multiple selections

Everything here works on a single selection too, but it earns its keep with several. The
ways of making them that are worth knowing, most of these from VS Code's
[Basic editing](https://code.visualstudio.com/docs/editing/codebasics#_multiple-selections-multicursor) docs:

- Hold the middle mouse button and drag to **select a column**
- <kbd>Alt</kbd> / <kbd>⌥</kbd> + click to **add a cursor**
- <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>D</kbd> to **add the next occurrence** of what is selected
- <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> to **select every occurrence**
- Search, then <kbd>Alt</kbd> / <kbd>⌥</kbd> + <kbd>Enter</kbd> to **select every match**
- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd> / <kbd>↑</kbd> to **add a cursor below or above** —
  <kbd>⌥</kbd> + <kbd>⌘</kbd> + <kbd>↓</kbd> / <kbd>↑</kbd> on macOS,
  <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd> / <kbd>↑</kbd> on Linux
- <kbd>Shift</kbd> / <kbd>⇧</kbd> + <kbd>Alt</kbd> / <kbd>⌥</kbd> + <kbd>I</kbd> to **insert cursor at end of each line selected**
- <kbd>Shift</kbd> / <kbd>⇧</kbd> + <kbd>Alt</kbd> / <kbd>⌥</kbd> + <kbd>→</kbd> / <kbd>←</kbd> to **expand/shrink selection**
- <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>L</kbd> to **select current line**

Full cheat sheets: [Windows](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf) · [Linux](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf) · [macOS](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf)

## Development

```bash
bun install          # convnum must be built first if it is a local dependency
bun run watch        # or just press F5 in VS Code to launch the Extension Host
bun run test:unit    # pure logic, milliseconds
bun run test:e2e     # the extension host, downloads VS Code on first run
bun run checkall     # types, lint, formatting and unit tests
bun run vsix         # build a .vsix
```

Press <kbd>F5</kbd> to open a second VS Code window with the extension loaded, then
<kbd>Ctrl</kbd> + <kbd>R</kbd> in that window to reload after a change.

## Licence

[MIT](LICENSE) © [Tom Chen](https://github.com/tomchen)
