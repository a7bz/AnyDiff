# AnyDiff

> Compare **anything** in VSCode: files, selections, clipboard, manual input and Git versions.

AnyDiff removes the friction from "let me check what changed here". Instead of
creating temporary files to compare a snippet with something you copied, open a
diff in one click.

Everything runs locally — no content ever leaves your machine.

## Features

| Feature | How to use |
| --- | --- |
| **Compare any two files** | Explorer context menu → *AnyDiff: Compare Two Files*, or the command palette. Files outside the workspace work too: type a path or use *Browse…*. |
| **Compare several files at once** | Multi-select files in the explorer → *AnyDiff: Compare Selected Files with Each Other*. The first file is diffed against each of the others. |
| **Multi-way comparison** | Command palette → *AnyDiff: Open Multi-Way Comparison Panel*. Assemble 2–3 columns (selection / file / clipboard / input), toggle *Only changes*, and see them aligned on the lines they share. |
| **Saved sessions** | Save the current multi-way panel as a named session (*AnyDiff: Save Comparison Session*) and reopen it later (*AnyDiff: Open Saved Session*). |
| **Compare file with the active editor** | Explorer context menu on a file, or the command palette. |
| **Selection vs clipboard** | Select code → right-click → *AnyDiff: Compare Selection with Clipboard*. |
| **Selection vs any file** | Select code → right-click → *AnyDiff: Compare Selection with Any File*. |
| **Selection vs manual input** | Select code → right-click → *AnyDiff: Compare Selection with Manual Input*, then type or paste in the editor that opens. |
| **Selection vs another selection** | Select snippet A → *AnyDiff: Compare Selection with Another Selection* (it is stashed); select snippet B → run it again and pick A. |
| **Clipboard vs any file** | Command palette → *AnyDiff: Compare Clipboard with Any File*. |
| **JSON structural comparison** | Right-click a `.json`/`.jsonc` file → *AnyDiff: Compare Two JSON Files Structurally*. Keys are compared by path, so reordering or re-indenting produces no noise. |
| **Compare with Git HEAD / a commit** | Editor context menu → *AnyDiff: Compare with Git HEAD*. Pick HEAD, the index, or any commit that touched the file (with commit message and date). |
| **Compare two Git revisions** | Editor context menu → *AnyDiff: Compare Two Git Revisions*. Diff any two of HEAD / index / working tree / a commit. |
| **Clipboard history** | Command palette → *AnyDiff: Show Clipboard History*. Entries can be cleared from the same picker. |
| **Recent comparisons** | Every comparison is remembered — including selection/clipboard/input ones. Reopen with *AnyDiff: Show Recent Comparisons*. |
| **Export a patch** | With a diff editor focused, run *AnyDiff: Export Current Comparison as Patch* (also available from the diff editor's title bar). |
| **Line statistics** | Shown in the status bar after every comparison (`+12 / -3 lines`). |

Comparisons open in the **native VSCode diff editor**, so you keep the familiar
keyboard shortcuts, inline navigation and syntax highlighting.

On first install a short **walkthrough** explains the main flows.

## Commands

All commands live under the `AnyDiff:` prefix in the command palette.

```
anydiff.compareFiles                    Compare Two Files
anydiff.compareMultipleFiles            Compare Selected Files with Each Other
anydiff.openMultiDiffPanel              Open Multi-Way Comparison Panel
anydiff.saveSession                     Save Comparison Session
anydiff.openSession                     Open Saved Session
anydiff.compareFileWithActive           Compare File with Active Editor
anydiff.compareSelectedWithClipboard    Compare Selection with Clipboard
anydiff.compareSelectedWithFile         Compare Selection with Any File
anydiff.compareSelectedWithInput        Compare Selection with Manual Input
anydiff.compareSelectionWithSelection   Compare Selection with Another Selection
anydiff.compareClipboardWithFile        Compare Clipboard with Any File
anydiff.compareJsonSemantic             Compare Two JSON Files Structurally
anydiff.compareJsonWithActive           Compare JSON with Active File Structurally
anydiff.compareWithGitHead              Compare with Git HEAD
anydiff.compareGitRevisions             Compare Two Git Revisions
anydiff.showClipboardHistory            Show Clipboard History
anydiff.showRecent                      Show Recent Comparisons
anydiff.exportPatch                     Export Current Comparison as Patch
anydiff.about                           About
```

## Keybindings

Keybindings ship **disabled** so they never collide with your existing setup.
Enable the ones you want in your `keybindings.json`:

```json
[
  { "key": "ctrl+k d", "command": "anydiff.compareSelectedWithClipboard" },
  { "key": "ctrl+k f", "command": "anydiff.compareSelectedWithFile" },
  { "key": "ctrl+k i", "command": "anydiff.compareSelectedWithInput" },
  { "key": "ctrl+k s", "command": "anydiff.compareSelectionWithSelection" },
  { "key": "ctrl+k g", "command": "anydiff.compareWithGitHead" },
  { "key": "ctrl+k r", "command": "anydiff.compareGitRevisions" },
  { "key": "ctrl+k h", "command": "anydiff.showRecent" }
]
```

## Internationalization

AnyDiff ships with English and Simplified Chinese. The interface language is
detected automatically from the VSCode UI language, or can be forced:

```json
{
  "anydiff.language": "zh-cn"  // or "auto" (default) / "en"
}
```

Changing the setting takes effect immediately for messages; command palette
titles and settings descriptions follow the VSCode display language
(`package.nls.json` / `package.nls.zh-cn.json`).

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `anydiff.language` | `auto` | Interface language: `auto`, `en` or `zh-cn`. |
| `anydiff.ignoreTrimWhitespace` | `false` | Ignore leading/trailing whitespace when comparing. |
| `anydiff.ignoreAllWhitespace` | `false` | Ignore all whitespace changes. |
| `anydiff.ignoreCase` | `false` | Case-insensitive comparison. |
| `anydiff.clipboardHistoryLimit` | `20` | Number of clipboard entries to keep. |
| `anydiff.maxFileSizeMB` | `10` | Warn before comparing larger files. |
| `anydiff.showStatsNotification` | `true` | Show `+/-` line counts in the status bar. |

Large files are detected automatically: when either side exceeds
`anydiff.maxFileSizeMB`, a confirmation prompt appears before the diff opens.
Set the value to `0` to disable the check.

## Development

```bash
npm install
npm run watch      # rebuild on change (or use F5 in VSCode)
```

Press `F5` to launch the extension in a new VSCode window.

```bash
npm run package          # production build into dist/
npm run vsix             # package + build a .vsix with @vscode/vsce
npm run check-types      # tsc --noEmit
npm test                 # unit tests (diff stats, patch, JSON, i18n, manifest)
npm run verify:nls       # verify localization packaging end-to-end
npm run verify:i18n      # boot a zh-cn instance and check the logs
npm run verify:e2e       # install the vsix and smoke-test activation
```

### Layout

```
src/
├── extension.ts          command registration, activation
├── commands/             one module per command group
├── providers/            DiffSource + virtual documents (any-diff: scheme)
├── views/                DiffViewManager, multi-way panel, text input panel
├── utils/                diff stats, patch export, JSON, git, file picker, i18n helpers
└── i18n/                 message catalogs (en, zh-cn) + locale resolution
```

`test/manifest.test.ts` checks the `package.json` wiring (commands, menus,
keybindings, version sync with `package-lock.json`), and
`test/i18n.test.ts` fails if a catalog key is missing, mistranslated, or never
used — so the manifests and translations cannot drift.

Adding a language:

1. Copy `src/i18n/messages/en.ts` to e.g. `src/i18n/messages/de.ts` and translate.
2. Register it in `src/i18n/index.ts` (`catalogs` + `resolveLocale`).
3. Add `"de"` to the `anydiff.language` enum in `package.json`.
4. Optionally add `package.nls.de.json` for manifest strings.

## Privacy

AnyDiff is a pure client-side extension. It reads files and the clipboard only
to render a comparison inside VSCode, and never transmits anything over the
network.

## License

MIT
