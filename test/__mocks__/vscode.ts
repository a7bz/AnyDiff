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
  registerTextDocumentContentProvider(_scheme: string, _provider: unknown) {
    return { dispose() {} };
  },
  workspaceFolders: [] as unknown[],
  asRelativePath(path: string) {
    return path;
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
  async showWarningMessage() {
    return undefined;
  },
  async showInformationMessage() {
    return undefined;
  },
  setStatusBarMessage() {
    return { dispose() {} };
  },
  tabGroups: { all: [] as unknown[] },
};

export const Uri = {
  file(path: string) {
    return { fsPath: path, path, toString: () => path, scheme: 'file' };
  },
  parse(value: string) {
    return { fsPath: value, path: value, toString: () => value, scheme: 'any-diff' };
  },
};

export const FileType = { File: 1, Directory: 2 } as const;

export const ViewColumn = { Active: -1, Beside: -2, One: 1 } as const;

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
