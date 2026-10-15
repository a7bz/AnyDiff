import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Returns the content of `filePath` at the given revision (default HEAD). */
export async function gitShowAtRevision(filePath: string, revision = 'HEAD'): Promise<string> {
  const cwd = path.dirname(filePath);
  const relative = path.basename(filePath);
  const { stdout } = await execFileAsync('git', ['show', `${revision}:./${relative}`], {
    cwd,
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
export async function listFileRevisions(filePath: string, limit = 30): Promise<string[]> {
  try {
    const cwd = path.dirname(filePath);
    const relative = path.basename(filePath);
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--format=%h', '-n', String(limit), '--', relative],
      { cwd, maxBuffer: 1024 * 1024, encoding: 'utf8' },
    );
    return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Returns true when the file has uncommitted changes. */
export async function hasUncommittedChanges(filePath: string): Promise<boolean> {
  try {
    const cwd = path.dirname(filePath);
    const relative = path.basename(filePath);
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--', relative], {
      cwd,
      encoding: 'utf8',
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
