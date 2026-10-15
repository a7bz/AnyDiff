/**
 * Minimal `vscode` module stub for unit tests.
 *
 * Only the APIs the tested code paths touch are implemented; everything else
 * throws so accidental reliance on the real runtime is caught early.
 */
interface ConfigOptions {
  language?: 'auto' | 'en' | 'zh-cn';
  uiLanguage?: string;
}

const state: ConfigOptions = {};

const closeListeners: Array<(document: { uri: { scheme: string } }) => void> = [];

/** Test helper: simulates VSCode closing a text document. */
export function __closeDocument(uri: { scheme: string }): void {
  for (const listener of closeListeners) {
    listener({ uri });
  }
}

export const workspace = {
  getConfiguration(_section?: string) {
    return {
      get<T>(key: string, defaultValue?: T): T {
        const value = state[key as keyof ConfigOptions];
        return (value ?? defaultValue) as T;
      },
    };
  },
  onDidChangeConfiguration(_listener: unknown) {
    return { dispose() {} };
  },
  onDidCloseTextDocument(listener: (document: { uri: { scheme: string } }) => void) {
    closeListeners.push(listener);
    return { dispose() {} };
  },
  registerTextDocumentContentProvider(_scheme: string, _provider: unknown) {
    return { dispose() {} };
  },
  workspaceFolders: [] as unknown[],
  textDocuments: [] as Array<{ uri: { toString(): string }; getText(): string }>,
  asRelativePath(path: string) {
    return path;
  },
  fs: {
    async readFile(_uri: unknown): Promise<Uint8Array> {
      throw new Error('workspace.fs.readFile is not stubbed for tests');
    },
    async stat(_uri: unknown): Promise<{ type: number; size: number }> {
      throw new Error('workspace.fs.stat is not stubbed for tests');
    },
    async writeFile(_uri: unknown, _content: Uint8Array): Promise<void> {
      throw new Error('workspace.fs.writeFile is not stubbed for tests');
    },
  },
  async findFiles(): Promise<unknown[]> {
    return [];
  },
};

export const env = {
  language: 'en' as string,
  clipboard: {
    async readText() {
      return '';
    },
  },
};

export const window = {
  createQuickPick() {
    throw new Error('window.createQuickPick is not stubbed for tests');
  },
  async showQuickPick() {
    throw new Error('window.showQuickPick is not stubbed for tests');
  },
  async showInputBox() {
    throw new Error('window.showInputBox is not stubbed for tests');
  },
  async showWarningMessage() {
    return undefined;
  },
  async showInformationMessage() {
    return undefined;
  },
  async showSaveDialog() {
    return undefined;
  },
  async showOpenDialog() {
    return undefined;
  },
  createWebviewPanel() {
    throw new Error('window.createWebviewPanel is not stubbed for tests');
  },
  setStatusBarMessage() {
    return { dispose() {} };
  },
  tabGroups: {
    all: [] as unknown[],
    activeTabGroup: { activeTab: undefined as unknown },
  },
};

export const Uri = {
  file(path: string) {
    return { fsPath: path, path, toString: () => path, scheme: 'file' };
  },
  joinPath(base: { fsPath: string }, ...parts: string[]) {
    const fsPath = [base.fsPath, ...parts].join('/');
    return { fsPath, path: fsPath, toString: () => fsPath, scheme: 'file' };
  },
  parse(value: string) {
    const withoutScheme = value.includes(':') ? value.slice(value.indexOf(':') + 1) : value;
    return {
      fsPath: withoutScheme,
      path: withoutScheme,
      toString: () => value,
      scheme: value.includes(':') ? value.slice(0, value.indexOf(':')) : '',
    };
  },
};

export const FileType = { File: 1, Directory: 2 } as const;

export const ViewColumn = { Active: -1, Beside: -2, One: 1 } as const;

export const extensions = {
  getExtension(_id: string): { packageJSON?: unknown } | undefined {
    return undefined;
  },
};

export const commands = {
  async executeCommand(_command: string, ..._args: unknown[]): Promise<unknown> {
    return undefined;
  },
};

export class ThemeIcon {
  constructor(readonly id: string) {}
}

/** Test helper: overrides values returned by `workspace.getConfiguration`. */
export function __setConfig(options: ConfigOptions): void {
  Object.assign(state, options);
}

/** Test helper: overrides `env.language`. */
export function __setUiLanguage(language: string): void {
  env.language = language;
}

export class EventEmitter<T = unknown> {
  private listeners: Array<(e: T) => void> = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => undefined };
  };
  fire(e: T) {
    for (const listener of this.listeners) {
      listener(e);
    }
  }
  dispose() {
    this.listeners = [];
  }
}
