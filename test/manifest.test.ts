import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')) as T;
}

interface Manifest {
  name: string;
  version: string;
  publisher: string;
  contributes: {
    commands?: Array<{ command: string; title?: string }>;
    keybindings?: Array<{ command: string }>;
    menus?: Record<string, Array<{ command?: string; when?: string }>>;
  };
}

describe('package.json manifest integrity', () => {
  const pkg = readJson<Manifest>('package.json');

  it('keeps package-lock.json in sync with the manifest version', () => {
    const lock = readJson<{ version: string; packages: Record<string, { version?: string }> }>(
      'package-lock.json',
    );
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages['']?.version).toBe(pkg.version);
  });

  it('registers a command for every command contribution', () => {
    const ids = (pkg.contributes.commands ?? []).map((command) => command.command);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('only references known commands from menus', () => {
    const known = new Set((pkg.contributes.commands ?? []).map((command) => command.command));
    for (const [menu, entries] of Object.entries(pkg.contributes.menus ?? {})) {
      for (const entry of entries) {
        if (!entry.command) {
          continue;
        }
        expect(known.has(entry.command), `${menu} references unknown ${entry.command}`).toBe(true);
      }
    }
  });

  it('does not declare the same command twice in one menu', () => {
    for (const [menu, entries] of Object.entries(pkg.contributes.menus ?? {})) {
      const seen = new Set<string>();
      for (const entry of entries) {
        const key = `${entry.command}::${entry.when ?? ''}`;
        expect(seen.has(key), `${menu} declares ${key} twice`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('only references known commands from keybindings', () => {
    const known = new Set((pkg.contributes.commands ?? []).map((command) => command.command));
    for (const binding of pkg.contributes.keybindings ?? []) {
      expect(known.has(binding.command), `keybinding for unknown ${binding.command}`).toBe(true);
    }
  });

  it('keeps every shipped keybinding disabled by default', () => {
    for (const binding of pkg.contributes.keybindings ?? []) {
      expect(binding).toMatchObject({ when: 'false' });
    }
  });

  it('activates on startup so background features work without a command', () => {
    const events = readJson<{ activationEvents: string[] }>('package.json').activationEvents;
    expect(events).toContain('onStartupFinished');
  });
});
