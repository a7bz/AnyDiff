import type { Messages } from './en';

/** Simplified Chinese (zh-cn) message catalog. */
export const zhCn: Messages = {
  // Shared
  'common.appName': 'AnyDiff',

  // File picker
  'picker.title.firstFile': 'AnyDiff: 选择第一个文件',
  'picker.title.secondFile': 'AnyDiff: 选择第二个文件',
  'picker.title.fileToCompare': 'AnyDiff: 选择要对比的文件',
  'picker.browse': '浏览…',
  'picker.browseDescription': '使用系统对话框选择文件（任意位置）',
  'picker.placeholder': '搜索工作区文件、粘贴路径，或选择“浏览…”',

  // Errors
  'error.noActiveEditor': 'AnyDiff: 没有活动的编辑器。',
  'error.clipboardEmpty': 'AnyDiff: 剪贴板为空。',
  'error.notGitRepository': 'AnyDiff: 当前文件夹不是 Git 仓库。',
  'error.fileNotFound': 'AnyDiff: 找不到文件 — {0}',
  'error.readRevisionFailed': 'AnyDiff: 无法读取 {0} 在 {1} 处的内容（文件未被跟踪？）。',
  'error.noActiveEditorToCompare': 'AnyDiff: 没有可对比的活动编辑器。',
  'error.largeFileWarning': 'AnyDiff: {0} 超过 {1} MB 限制，对比可能较慢。',
  'error.confirmLargeFile': '仍要对比',
  'error.cancel': '取消',
  'error.selectAtLeastTwoFiles': 'AnyDiff: 请先在资源管理器中选中至少两个文件。',

  // Manual input prompt
  'input.title': 'AnyDiff: 粘贴或输入要对比的内容',
  'input.placeholder': '输入或粘贴内容，按 Enter 开始对比（Esc 取消）',

  // Clipboard history
  'clipboard.title': 'AnyDiff: 剪贴板历史',
  'clipboard.empty': 'AnyDiff: 剪贴板历史为空，请先复制一些内容。',
  'clipboard.targetTitle': 'AnyDiff: 将剪贴板内容与以下对象对比',
  'clipboard.targetActiveEditor': '当前编辑器',
  'clipboard.targetChooseFile': '选择文件…',
  'clipboard.entryTitle': '剪贴板历史',

  // Recent comparisons
  'recent.title': 'AnyDiff: 最近对比记录',
  'recent.empty': 'AnyDiff: 还没有对比记录。',
  'recent.placeholder': '选择要重新打开的对比',

  // Git
  'git.headLabel': 'HEAD',
  'git.headDescription': '最新提交',
  'git.commitDescription': '提交',
  'git.pickTitle': 'AnyDiff: 将 {0} 与以下版本对比',
  'git.pickPlaceholder': '选择一个版本',
  'git.workingSuffix': '工作区',

  // Patch export
  'patch.noDiffOpen': 'AnyDiff: 请先打开一个对比编辑器。',
  'patch.identical': 'AnyDiff: 两侧内容相同，无需导出。',
  'patch.exported': 'AnyDiff: 补丁已导出到 {0}',
  'patch.saveTitle': 'AnyDiff: 导出对比结果为补丁',
  'patch.saveLabel': '导出补丁',

  // Status bar statistics
  'stats.statusBar': 'AnyDiff: {0} ↔ {1} — +{2} / -{3} 行（{4} 行未变化）',

  // Source labels
  'source.clipboard': '剪贴板',
  'source.manualInput': '手动输入',
  'source.empty': '（空）',
  'source.activeSuffix': '当前',
  'source.wholeFileSuffix': '整个文件',
  'source.workingSuffix': '工作区',
  'source.unknownFile': '未命名',

  // Language setting labels
  'language.auto': '自动（跟随 VSCode 界面语言）',
  'language.en': 'English',
  'language.zhCn': '中文（简体）',

  // About
  'about.message': 'AnyDiff {0} — 任意内容对比：文件、选区、剪贴板与 Git 版本。',
  'about.learnMore': '了解更多',

  // Multi-column panel
  'panel.title': '多列对比',
  'panel.changedRows': '行有差异',
  'panel.stableRows': '行一致',
  'panel.columns': '列数',
  'multi.pickTitle': 'AnyDiff: 添加第 {0} 列',
  'multi.pickPlaceholder': '当前已有 {0} 列 — 选择下一个内容来源，或完成',
  'multi.source.selection': '另一段选区',
  'multi.source.file': '一个文件',
  'multi.source.clipboard': '剪贴板',
  'multi.source.input': '手动输入',
  'multi.source.done': '完成，打开面板',
  'error.multiDiffNeedsTwo': 'AnyDiff: 多列对比至少需要两列。',
};

export default zhCn;
