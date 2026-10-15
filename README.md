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
| **Multi-way comparison** | Command palette → *AnyDiff: Open Multi-Way Comparison Panel*. Assemble 2–3 columns (selection / file / clipboard / input) and see them aligned on the lines they share. |
| **Compare file with the active editor** | Explorer context menu on a file, or the command palette. |
| **Selection vs clipboard** | Select code → right-click → *AnyDiff: Compare Selection with Clipboard*. |
| **Selection vs any file** | Select code → right-click → *AnyDiff: Compare Selection with Any File*. |
| **Selection vs manual input** | Select code → right-click → *AnyDiff: Compare Selection with Manual Input*, then paste or type. |
| **Clipboard vs any file** | Command palette → *AnyDiff: Compare Clipboard with Any File*. |
| **Compare with Git HEAD / a commit** | Editor context menu → *AnyDiff: Compare with Git HEAD*. |
| **Clipboard history** | Command palette → *AnyDiff: Show Clipboard History*. |
| **Export a patch** | With a diff editor focused, run *AnyDiff: Export Current Comparison as Patch*. |
| **Line statistics** | Shown in the status bar after every comparison (`+12 / -3 lines`). |

Comparisons open in the **native VSCode diff editor**, so you keep the familiar
keyboard shortcuts, inline navigation and syntax highlighting.

## Commands

All commands live under the `AnyDiff:` prefix in the command palette.

```
anydiff.compareFiles                    Compare Two Files
anydiff.compareMultipleFiles            Compare Selected Files with Each Other
anydiff.openMultiDiffPanel              Open Multi-Way Comparison Panel
anydiff.compareFileWithActive           Compare File with Active Editor
anydiff.compareSelectedWithClipboard    Compare Selection with Clipboard
anydiff.compareSelectedWithFile         Compare Selection with Any File
anydiff.compareSelectedWithInput        Compare Selection with Manual Input
anydiff.compareClipboardWithFile        Compare Clipboard with Any File
anydiff.compareWithGitHead              Compare with Git HEAD
anydiff.showClipboardHistory            Show Clipboard History
anydiff.exportPatch                     Export Current Comparison as Patch
```

## Keybindings

Keybindings ship **disabled** so they never collide with your existing setup.
Enable the ones you want in your `keybindings.json`:

```json
[
  { "key": "ctrl+k d", "command": "anydiff.compareSelectedWithClipboard" },
  { "key": "ctrl+k f", "command": "anydiff.compareSelectedWithFile" },
  { "key": "ctrl+k i", "command": "anydiff.compareSelectedWithInput" },
  { "key": "ctrl+k g", "command": "anydiff.compareWithGitHead" }
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
npm run check-types      # tsc --noEmit
npm test                 # unit tests (diff stats, patch, i18n, NLS manifests)
node scripts/verify-nls.cjs   # verify localization packaging end-to-end
```

### Layout

```
src/
├── extension.ts          command registration, activation
├── commands/             one module per command group
├── providers/            DiffSource + virtual documents (any-diff: scheme)
├── views/                DiffViewManager (native vscode.diff + stats)
├── utils/                diff stats, patch export, git, file picker, language
└── i18n/                 message catalogs (en, zh-cn) + locale resolution
```

Adding a language:

1. Copy `src/i18n/messages/en.ts` to e.g. `src/i18n/messages/de.ts` and translate.
2. Register it in `src/i18n/index.ts` (`catalogs` + `resolveLocale`).
3. Add `"de"` to the `anydiff.language` enum in `package.json`.
4. Optionally add `package.nls.de.json` for manifest strings.

`test/i18n.test.ts` and `test/packageNls.test.ts` fail the build if a catalog
is missing keys or placeholders, so translations cannot drift.

## Privacy

AnyDiff is a pure client-side extension. It reads files and the clipboard only
to render a comparison inside VSCode, and never transmits anything over the
network.

## License

MIT
