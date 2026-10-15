import { describe, expect, it } from 'vitest';
import { __setConfig } from './__mocks__/vscode';
import { ClipboardHistory } from '../src/commands/clipboardHistory';
import { RecentComparisons } from '../src/commands/recentComparisons';
import { SessionStore } from '../src/commands/sessions';
import type { DiffSource } from '../src/providers/diffSource';

/** Minimal in-memory `vscode.Memento` for the stores under test. */
class FakeMemento {
  private readonly store = new Map<string, unknown>();

  get<T>(key: string, defaultValue?: T): T {
    return (this.store.has(key) ? this.store.get(key) : defaultValue) as T;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
}

function virtual(title: string, text: string, languageId = 'plaintext'): DiffSource {
  return {
    title,
    uri: { scheme: 'any-diff', path: title, fsPath: title } as never,
    languageId,
    text: async () => text,
  };
}

function file(title: string, fsPath: string): DiffSource {
  return {
    title,
    uri: { scheme: 'file', path: fsPath, fsPath } as never,
    languageId: 'typescript',
    filePath: fsPath,
  };
}

describe('RecentComparisons', () => {
  it('starts empty', () => {
    expect(new RecentComparisons(new FakeMemento() as never).list()).toEqual([]);
  });

  it('records a file pair and reports it newest-first', async () => {
    const recent = new RecentComparisons(new FakeMemento() as never);
    await recent.record(file('a.ts', '/w/a.ts'), file('b.ts', '/w/b.ts'));
    const entries = recent.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].left.filePath).toBe('/w/a.ts');
    expect(entries[0].right.filePath).toBe('/w/b.ts');
  });

  it('records virtual sides by their inline text', async () => {
    const recent = new RecentComparisons(new FakeMemento() as never);
    await recent.record(virtual('Clipboard', 'hello'), file('b.ts', '/w/b.ts'));
    expect(recent.list()[0].left.text).toBe('hello');
  });

  it('deduplicates the same comparison', async () => {
    const recent = new RecentComparisons(new FakeMemento() as never);
    await recent.record(file('a.ts', '/w/a.ts'), file('b.ts', '/w/b.ts'));
    await recent.record(file('a.ts', '/w/a.ts'), file('b.ts', '/w/b.ts'));
    expect(recent.list()).toHaveLength(1);
  });

  it('treats the two sides as ordered', async () => {
    const recent = new RecentComparisons(new FakeMemento() as never);
    await recent.record(file('a.ts', '/w/a.ts'), file('b.ts', '/w/b.ts'));
    await recent.record(file('b.ts', '/w/b.ts'), file('a.ts', '/w/a.ts'));
    expect(recent.list()).toHaveLength(2);
  });

  it('skips virtual sides that are too large to store', async () => {
    const recent = new RecentComparisons(new FakeMemento() as never);
    await recent.record(virtual('Huge', 'x'.repeat(200_001)), file('b.ts', '/w/b.ts'));
    expect(recent.list()).toEqual([]);
  });

  it('persists entries across instances', async () => {
    const memento = new FakeMemento() as never;
    await new RecentComparisons(memento).record(file('a.ts', '/w/a.ts'), file('b.ts', '/w/b.ts'));
    expect(new RecentComparisons(memento).list()).toHaveLength(1);
  });
});

describe('ClipboardHistory', () => {
  it('records copies newest-first', async () => {
    __setConfig({});
    const history = new ClipboardHistory(new FakeMemento() as never);
    await history.push('one');
    await history.push('two');
    expect(history.list().map((entry) => entry.text)).toEqual(['two', 'one']);
  });

  it('ignores an immediate duplicate', async () => {
    const history = new ClipboardHistory(new FakeMemento() as never);
    await history.push('one');
    await history.push('one');
    expect(history.list()).toHaveLength(1);
  });

  it('moves a re-copied older entry to the top', async () => {
    const history = new ClipboardHistory(new FakeMemento() as never);
    await history.push('one');
    await history.push('two');
    await history.push('one');
    expect(history.list().map((entry) => entry.text)).toEqual(['one', 'two']);
  });

  it('clears the history', async () => {
    const history = new ClipboardHistory(new FakeMemento() as never);
    await history.push('one');
    await history.clear();
    expect(history.list()).toEqual([]);
  });
});

describe('SessionStore', () => {
  it('saves and lists sessions newest-first', async () => {
    const store = new SessionStore(new FakeMemento() as never);
    await store.save('first', [{ title: 'a', text: '1' }, { title: 'b', text: '2' }]);
    await store.save('second', [{ title: 'c', text: '3' }, { title: 'd', text: '4' }]);
    expect(store.list().map((session) => session.name)).toEqual(['second', 'first']);
  });

  it('overwrites a session with the same name', async () => {
    const store = new SessionStore(new FakeMemento() as never);
    await store.save('same', [{ title: 'a', text: '1' }, { title: 'b', text: '2' }]);
    await store.save('same', [{ title: 'x', text: '9' }, { title: 'y', text: '8' }]);
    const sessions = store.list();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].columns[0].title).toBe('x');
  });

  it('removes a session by name', async () => {
    const store = new SessionStore(new FakeMemento() as never);
    await store.save('a', [{ title: '1', text: '' }, { title: '2', text: '' }]);
    await store.save('b', [{ title: '1', text: '' }, { title: '2', text: '' }]);
    await store.remove('a');
    expect(store.list().map((session) => session.name)).toEqual(['b']);
  });
});
