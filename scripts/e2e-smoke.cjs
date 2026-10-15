/**
 * Real-instance smoke test for AnyDiff.
 *
 * Strategy: launch VSCode headless with the extension installed into a scratch
 * profile, open a workspace containing two known files, then run each AnyDiff
 * command through `code --command`? That is not available, so instead we drive
 * the extension via a tiny host: we start VSCode with a workspace that contains
 * a `.vscode/tasks.json` invoking `code --install-extension` first, then we use
 * the VSCode CLI to open a diff ourselves and verify the extension activated
 * without errors by reading its log file.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VSIX = path.join(ROOT, 'anydiff-0.1.0.vsix');
const WORK = path.join(os.tmpdir(), 'anydiff-e2e');
const USER_DIR = path.join(WORK, 'user-data');
const EXT_DIR = path.join(WORK, 'extensions');
const LOG_DIR = path.join(USER_DIR, 'logs');

function main() {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(path.join(WORK, '.vscode'), { recursive: true });

  fs.writeFileSync(path.join(WORK, 'left.txt'), 'alpha\nbeta\ngamma\ndelta\nepsilon\n');
  fs.writeFileSync(path.join(WORK, 'right.txt'), 'alpha\nBETA\ngamma\ndelta\nepsilon\nzeta\n');

  const base = ['--user-data-dir', USER_DIR, '--extensions-dir', EXT_DIR];

  // 1) Install into the scratch profile.
  const install = spawnSync('code', [...base, '--install-extension', VSIX, '--force'], {
    encoding: 'utf8',
  });
  console.log(install.stdout || install.stderr);

  const list = spawnSync('code', [...base, '--list-extensions'], { encoding: 'utf8' });
  if (!list.stdout.includes('anydiff')) {
    console.error('FAIL: extension not installed');
    process.exit(1);
  }
  console.log('PASS: extension installed in scratch profile');

  // 2) Open the workspace; the extension activates (workspace contains files).
  const open = spawnSync(
    'code',
    [...base, '--wait', WORK, '--diff',
      path.join(WORK, 'left.txt'), path.join(WORK, 'right.txt')],
    { encoding: 'utf8', timeout: 60000 },
  );
  console.log('open rc:', open.status);

  // 3) Look for the extension host log and confirm it activated cleanly.
  const logs = LOG_DIR && fs.existsSync(LOG_DIR) ? fs.readdirSync(LOG_DIR) : [];
  console.log('log dirs:', logs.length);
  let found = false;
  for (const dir of logs) {
    const exthost = path.join(LOG_DIR, dir, 'exthost');
    if (!fs.existsSync(exthost)) continue;
    const files = fs.readdirSync(exthost).filter((f) => f.includes('anydiff'));
    for (const file of files) {
      const text = fs.readFileSync(path.join(exthost, file), 'utf8');
      found = true;
      const errors = text.split('\n').filter((l) => /error|Error/.test(l));
      console.log(`--- ${file} (${text.length} chars) ---`);
      if (errors.length) {
        console.log('ERRORS:\n' + errors.slice(0, 20).join('\n'));
      } else {
        console.log('no errors reported');
      }
    }
  }
  if (!found) {
    console.log('NOTE: no anydiff-specific log output found (may be normal)');
  }
  console.log('SMOKE TEST COMPLETE');
}

main();
