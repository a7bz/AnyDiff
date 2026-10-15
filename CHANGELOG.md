# Changelog

All notable changes to AnyDiff are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-10-15

### Added

- **JSON structural comparison** — compare `.json`/`.jsonc` files by key path
  instead of by text, so reordering keys or re-indenting produces no noise.
  Available for two files or the active file (`anydiff.compareJsonSemantic`,
  `anydiff.compareJsonWithActive`).
- **Selection vs another selection** — capture snippet A, select snippet B, and
  diff the two (`anydiff.compareSelectionWithSelection`).
- **Compare two Git revisions** — diff any two of HEAD / index / working tree /
  a commit against each other (`anydiff.compareGitRevisions`).
- **Saved sessions** — name a multi-way comparison and reopen it later
  (`anydiff.saveSession`, `anydiff.openSession`).
- **Getting-started walkthrough** — shown once on first install.
- **Editor title bar buttons** for *Export patch* in any diff editor.

### Changed

- The Git revision picker now shows the commit subject and date instead of a
  bare hash, and offers the index (staged) revision for files with staged
  changes.
- Manual input and the multi-way panel now use a proper multi-line webview
  editor (with `Ctrl+Enter` to submit) instead of relying on an undocumented
  QuickInput flag.
- The multi-way panel gained line numbers, per-cell change highlighting, a
  column language label, and an **Only changes** toggle (`d`).
- Virtual documents now carry a language-appropriate extension, so clipboard,
  selection and Git diffs are syntax-highlighted correctly.
- Clipboard history moves a re-copied entry to the top instead of duplicating
  it, and can be cleared from the picker.
- The extension activates on startup so the clipboard watcher works before any
  command is run.
- Version bumped to `0.2.0`; `package.json` gained `repository`, `bugs` and
  `homepage` fields.

### Fixed

- **Recent comparisons were never recorded** — `anydiff.showRecent` always
  reported an empty list. Every comparison opened through the diff manager is
  now remembered, including virtual (selection/clipboard/input) sides, and can
  be replayed.
- The file picker's **Browse…** entry resolved the typed query instead of
  opening the system file dialog.
- *About* reported a hard-coded version instead of the running extension's.
- *Export patch* exported the first diff tab it found rather than the focused
  one.
- The multi-way panel's script was blocked by its own Content-Security-Policy.
- Virtual document content is released when its editor closes.

### Developer

- Unit tests grew from 46 to 104, covering JSON flattening, language/extension
  mapping, virtual documents, the clipboard watcher, history stores, the diff
  recorder hook, webview helpers, and `package.json` manifest integrity.
- Verification scripts derive the vsix name and version from `package.json`
  (shared `scripts/lib.cjs`) instead of hard-coding `0.1.0`.
- New `npm run vsix`, `npm run verify:*` scripts.

## [0.1.0] - 2026-10-15

Initial release.

### Added

- **File comparison**
  - Compare any two files, including files outside the workspace (fuzzy search,
    type an absolute/relative path, or use the system file dialog).
  - Compare a file with the active editor.
  - Multi-select files in the explorer to compare the first against each of the
    others in one go.
  - Recent comparison history, re-openable from the command palette.

- **Selection comparison**
  - Selection vs clipboard.
  - Selection vs any file.
  - Selection vs manual input (multi-line input box).
  - Clipboard vs any file.
  - Without a selection the whole file is used.

- **Enhancements**
  - Multi-way comparison panel (2–3 columns: selection / file / clipboard /
    input) with diff3-style alignment on the lines every column shares.
  - Ignore leading/trailing whitespace, all whitespace, or case
    (`anydiff.ignoreTrimWhitespace`, `anydiff.ignoreAllWhitespace`,
    `anydiff.ignoreCase`).
  - `+/-` line statistics in the status bar after each comparison
    (`anydiff.showStatsNotification`).
  - Export the current comparison as a unified diff patch, applicable with
    `git apply` / `patch -p1`.
  - Compare with Git `HEAD` or any commit touching the file.
  - Clipboard history (polled, `anydiff.clipboardHistoryLimit`).
  - Large-file guard with confirmation prompt (`anydiff.maxFileSizeMB`).

- **Internationalization**
  - English and Simplified Chinese, auto-detected from the VSCode UI language
    or forced with `anydiff.language`.
  - Command titles and settings descriptions localized via
    `package.nls.json` / `package.nls.zh-cn.json`.

- **Developer experience**
  - 46 unit tests (diff statistics, patch generation, multi-way alignment,
    i18n catalog integrity, NLS manifest consistency, guard logic).
  - esbuild bundling, `F5` debugging, and a packaging verification script.
