import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Field separator used to parse `git log` output robustly. */
const SEP = '\u001f';

/** A commit touching a file, with the metadata shown in the picker. */
export interface FileRevision {
  /** Short hash, e.g. `a1b2c3d`. */
  hash: string;
  /** First line of the commit message. */
  subject: string;
  /** Author date, ISO-8601. */
  date: string;
}

/** Resolves the repository root for a path (falls back to its folder). */
export async function repositoryRoot(filePath: string): Promise<string> {
  const cwd = path.dirname(filePath);
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
    });
    return stdout.trim() || cwd;
  } catch {
    return cwd;
  }
}

/**
 * Returns the content of `filePath` at the given revision.
 *
 * `revision` may be a commit-ish (`HEAD`, `a1b2c3d`), `:0` for the staged
 * version or `:WORKTREE` for the file as it is on disk.
 */
export async function gitShowAtRevision(filePath: string, revision = 'HEAD'): Promise<string> {
  const root = await repositoryRoot(filePath);
  if (revision === 'WORKTREE') {
    const { readFile } = await import('fs/promises');
    return readFile(filePath, 'utf8');
  }
  // `:0` addresses the index (staged content), other values are commit-ish.
  // The `./` prefix makes git resolve the path relative to the cwd.
  const relative = await relativeToRoot(filePath, root);
  const { stdout } = await execFileAsync('git', ['show', `${revision}:./${relative}`], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    encoding: 'utf8',
  });
  return stdout;
}

/** True when `dir` is inside a git work tree. */
export async function isGitRepository(dir: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir });
    return true;
  } catch {
    return false;
  }
}

/** Lists commits touching a file, newest first. */
export async function listFileRevisions(filePath: string, limit = 30): Promise<FileRevision[]> {
  try {
    const root = await repositoryRoot(filePath);
    const relative = await relativeToRoot(filePath, root);
    const { stdout } = await execFileAsync(
      'git',
      ['log', `--format=%h${SEP}%s${SEP}%aI`, '-n', String(limit), '--', relative],
      { cwd: root, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' },
    );
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hash = '', subject = '', date = ''] = line.split(SEP);
        return { hash, subject, date };
      });
  } catch {
    return [];
  }
}

/** Returns true when the file has uncommitted (unstaged or staged) changes. */
export async function hasUncommittedChanges(filePath: string): Promise<boolean> {
  try {
    const root = await repositoryRoot(filePath);
    const relative = await relativeToRoot(filePath, root);
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--', relative], {
      cwd: root,
      encoding: 'utf8',
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/** Path of `filePath` relative to the repository root, using forward slashes. */
async function relativeToRoot(filePath: string, root: string): Promise<string> {
  const relative = path.relative(root, filePath);
  if (!relative || relative.startsWith('..')) {
    return path.basename(filePath);
  }
  return relative.split(path.sep).join('/');
}
