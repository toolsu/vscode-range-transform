# Range & Transform <img width="32" src="icon.png">

2 commands:

- **Insert Sequence from Range**: generate number, letter, or other sequence (`start:stop:step`) (e.g. `2:9`, `c:z:3`, `Mon:Fri:2`)
- **Transform Multi-Selections**: modify the selected text (JavaScript code with predefined variables and methods like `s`, `n`, `i`, etc.) (e.g. `n*3`, `letter(n)`).

When you are typing, there is a preview of the final output, which you can press <kbd>Enter</kbd> to confirm.

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/tomchen.range-transform?label=Visual%20Studio%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=tomchen.range-transform) [![Open VSX Version](https://img.shields.io/open-vsx/v/tomchen/range-transform?label=Open%20VSX&color=%23a60ee5)](https://open-vsx.org/extension/tomchen/range-transform) [![Actions Status](https://github.com/tomchen/vscode-range-transform/workflows/Test/badge.svg)](https://github.com/tomchen/vscode-range-transform/actions) [![License](https://img.shields.io/github/license/tomchen/vscode-range-transform)](https://github.com/tomchen/vscode-range-transform/blob/main/LICENSE)

## "R&T: Insert Sequence from Range" Command

`start:stop:step`

`start`: required, can be one of:

...

`stop`: optional, if omitted, it will generate a sequence of length 10, or number of the selections if multiple selections

- It should be of the same type as `start`
- It could be the same as `start`, in this rare case, the length of the sequence will be 10 (if you want change it, make sure it's multiple selections then run the command)

`step`: optional, default is 1, and its sign (positive or negative or 0) will be automatically corrected based on `start` and `stop`

The sequence will replace your originally selected text if there is any.

If multiple selections, it will only try to fill the selections and won't generate more.

## "Transform Selections" Command

It can be any one-line JavaScript code, the result of the code will replace the selected text. The code can use the following variables and functions:

## VS Code multi-selection hotkeys

If you don't know how to do multi-selection in VS Code yet, you can read VS Code's official documentation [Basic editing § Multiple selections (multi-cursor)](https://code.visualstudio.com/docs/editor/codebasics#_multiple-selections-multicursor) and PDF cheatsheets for [Windows](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf), [Linux](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf) and [macOS](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf). Here are some of the most useful ones:

- Hold middle click (wheel click) and drag to **multi-select**
- <kbd>Alt</kbd> (Windows/Linux) / <kbd>⌥ Option</kbd> (macOS) + click/select to **add a new cursor/selection**
- Multi-cursor then <kbd>Ctrl</kbd> (Windows/Linux) / <kbd>⌘ Command</kbd> (macOS) + <kbd>D</kbd> to **multi-select words**
- Search then <kbd>Alt</kbd> (Windows/Linux) / <kbd>⌥ Option</kbd> (macOS) + <kbd>Enter</kbd> to **multi-select all occurrences of matched ones**
- <kbd>Ctrl</kbd> (Windows/Linux) / <kbd>⌘ Command</kbd> (macOS) + <kbd>L</kbd> to **select current line**

## Release Notes

### 1.0.0

Initial release
