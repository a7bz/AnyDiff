import * as path from 'path';
import * as vscode from 'vscode';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.jsonc': 'jsonc',
  '.md': 'markdown',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sh': 'shellscript',
  '.bash': 'shellscript',
  '.ps1': 'powershell',
  '.sql': 'sql',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.lua': 'lua',
  '.pl': 'perl',
  '.r': 'r',
  '.dart': 'dart',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

/**
 * Canonical file extension for a language id.
 *
 * Virtual documents are served through the `any-diff:` scheme and VSCode
 * derives their language from the uri path, so the registered path must carry
 * an extension that maps back to the language. Languages without an entry here
 * fall back to `.txt` (plaintext).
 */
const EXTENSION_BY_LANGUAGE: Record<string, string> = {
  typescript: 'ts',
  typescriptreact: 'tsx',
  javascript: 'js',
  javascriptreact: 'jsx',
  json: 'json',
  jsonc: 'jsonc',
  markdown: 'md',
  python: 'py',
  ruby: 'rb',
  go: 'go',
  rust: 'rs',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  php: 'php',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  yaml: 'yaml',
  toml: 'toml',
  shellscript: 'sh',
  powershell: 'ps1',
  sql: 'sql',
  swift: 'swift',
  kotlin: 'kt',
  lua: 'lua',
  perl: 'pl',
  r: 'r',
  dart: 'dart',
  vue: 'vue',
  svelte: 'svelte',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  plaintext: 'txt',
};

/** File extension (without the dot) to use for a virtual document. */
export function extensionForLanguage(languageId: string | undefined): string {
  if (!languageId) {
    return 'txt';
  }
  return EXTENSION_BY_LANGUAGE[languageId] ?? 'txt';
}

/** Best-effort language id for a file path, used to highlight virtual docs. */
export function languageIdOf(uri: vscode.Uri): string {
  const ext = path.extname(uri.fsPath).toLowerCase();
  if (ext === '.txt') {
    return 'plaintext';
  }
  if (LANGUAGE_BY_EXTENSION[ext]) {
    return LANGUAGE_BY_EXTENSION[ext];
  }
  // Special file names.
  const base = path.basename(uri.fsPath).toLowerCase();
  switch (base) {
    case 'dockerfile':
      return 'dockerfile';
    case 'makefile':
      return 'makefile';
    case 'package.json':
      return 'json';
    default:
      return 'plaintext';
  }
}
