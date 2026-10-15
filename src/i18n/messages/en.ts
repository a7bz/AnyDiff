/**
 * English message catalog — the source of truth for all other locales.
 *
 * Keys are semantic and stable; every other catalog must define the exact
 * same set of keys (enforced by `test/i18n.test.ts`).
 */
export const en = {
  // Shared
  'common.appName': 'AnyDiff',

  // File picker
  'picker.title.firstFile': 'AnyDiff: select the first file',
  'picker.title.secondFile': 'AnyDiff: select the second file',
  'picker.title.fileToCompare': 'AnyDiff: select a file to compare with',
  'picker.browse': 'Browse…',
  'picker.browseDescription': 'Pick a file with the system dialog (any location)',
  'picker.placeholder': 'Search workspace files, paste a path, or choose "Browse…"',

  // Errors
  'error.noActiveEditor': 'AnyDiff: no active editor.',
  'error.clipboardEmpty': 'AnyDiff: clipboard is empty.',
  'error.notGitRepository': 'AnyDiff: this folder is not a Git repository.',
  'error.fileNotFound': 'AnyDiff: file not found — {0}',
  'error.readRevisionFailed': 'AnyDiff: cannot read {0} at {1} (untracked file?).',
  'error.noActiveEditorToCompare': 'AnyDiff: no active editor to compare with.',
  'error.largeFileWarning': 'AnyDiff: {0} exceeds the {1} MB limit and may be slow to compare.',
  'error.confirmLargeFile': 'Compare anyway',
  'error.cancel': 'Cancel',
  'error.selectAtLeastTwoFiles': 'AnyDiff: select at least two files in the explorer.',

  // Manual input prompt
  'input.title': 'AnyDiff: paste or type the content to compare with',
  'input.placeholder': 'Type or paste content, then press Enter to compare (Esc to cancel)',

  // Clipboard history
  'clipboard.title': 'AnyDiff: clipboard history',
  'clipboard.empty': 'AnyDiff: clipboard history is empty. Copy something first.',
  'clipboard.targetTitle': 'AnyDiff: compare clipboard entry with',
  'clipboard.targetActiveEditor': 'Active editor',
  'clipboard.targetChooseFile': 'Choose file…',
  'clipboard.entryTitle': 'Clipboard history',

  // Recent comparisons
  'recent.title': 'AnyDiff: recent comparisons',
  'recent.empty': 'AnyDiff: no recent comparisons yet.',
  'recent.placeholder': 'Select a comparison to re-open',

  // Git
  'git.headLabel': 'HEAD',
  'git.headDescription': 'Latest commit',
  'git.commitDescription': 'Commit',
  'git.pickTitle': 'AnyDiff: compare {0} with',
  'git.pickPlaceholder': 'Select a revision',
  'git.workingSuffix': 'working',

  // Patch export
  'patch.noDiffOpen': 'AnyDiff: open a diff editor first.',
  'patch.identical': 'AnyDiff: the two sides are identical, nothing to export.',
  'patch.exported': 'AnyDiff: patch exported to {0}',
  'patch.saveTitle': 'AnyDiff: export comparison as patch',
  'patch.saveLabel': 'Export patch',

  // Status bar statistics
  'stats.statusBar': 'AnyDiff: {0} ↔ {1} — +{2} / -{3} lines ({4} unchanged)',

  // Source labels
  'source.clipboard': 'Clipboard',
  'source.manualInput': 'Manual input',
  'source.empty': '(empty)',
  'source.activeSuffix': 'active',
  'source.wholeFileSuffix': 'whole file',
  'source.workingSuffix': 'working',
  'source.unknownFile': 'untitled',

  // Language setting labels
  'language.auto': 'Auto (follow the VSCode UI language)',
  'language.en': 'English',
  'language.zhCn': '中文（简体）',

  // About
  'about.message': 'AnyDiff {0} — compare anything: files, selections, clipboard and Git versions.',
  'about.learnMore': 'Learn more',

  // Multi-column panel
  'panel.title': 'Multi-way comparison',
  'panel.changedRows': 'changed rows',
  'panel.stableRows': 'stable rows',
  'panel.columns': 'Columns',
  'multi.pickTitle': 'AnyDiff: add column {0}',
  'multi.pickPlaceholder': '{0} column(s) so far — pick another source, or finish',
  'multi.source.selection': 'Another selection',
  'multi.source.file': 'A file',
  'multi.source.clipboard': 'The clipboard',
  'multi.source.input': 'Manual input',
  'multi.source.done': 'Done, open the panel',
  'error.multiDiffNeedsTwo': 'AnyDiff: a multi-way comparison needs at least two columns.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Readonly<Record<MessageKey, string>>;
export default en;
