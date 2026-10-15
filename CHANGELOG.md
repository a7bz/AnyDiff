# Changelog

All notable changes to AnyDiff are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
