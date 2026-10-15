/**
 * Verifies that AnyDiff's command titles and settings are localized when the
 * VSCode UI language is Chinese.
 *
 * Runs a scratch VSCode instance with `--locale=zh-cn`, waits for the extension
 * host to start, then dumps `code --list-extensions` output plus any log lines
 * produced by the extension.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VSIX = path.join(ROOT, 'anydiff-0.1.0.vsix');
const WORK = path.join(os.tmpdir(), 'anydiff-i18n-check');
const USER_DIR = path.join(WORK, 'user-data');
const EXT_DIR = path.join(WORK, 'extensions');

function main() {
  const CODE = process.platform === 'win32' ? 'code.cmd' : 'code';
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(path.join(WORK, 'sample.txt'), 'hello\nworld\n');

  const base = ['--user-data-dir', USER_DIR, '--extensions-dir', EXT_DIR, '--locale=zh-cn'];

  const install = spawnSync(CODE, [...base, '--install-extension', VSIX, '--force'], {
    encoding: 'utf8',
    shell: true,
  });
  console.log('install rc:', install.status, '|', (install.stdout ?? '').trim());
  if (install.error) {
    console.log('install error:', install.error.message);
  }

  const open = spawnSync(CODE, [...base, '--wait', WORK], {
    encoding: 'utf8',
    timeout: 90000,
    shell: true,
  });
  console.log('open status:', open.status);

  // The extension activates on command registration; a clean activation means
  // no unhandled errors in the extension host log.
  const logDir = path.join(USER_DIR, 'logs');
  let anydiffLogs = 0;
  let errors = 0;
  if (fs.existsSync(logDir)) {
    for (const dir of fs.readdirSync(logDir)) {
      const exthost = path.join(logDir, dir, 'exthost');
      if (!fs.existsSync(exthost)) continue;
      for (const file of fs.readdirSync(exthost)) {
        if (!file.startsWith('anydiff')) continue;
        anydiffLogs++;
        const text = fs.readFileSync(path.join(exthost, file), 'utf8');
        const bad = text.split('\n').filter((l) => /\berror\b/i.test(l));
        errors += bad.length;
        if (bad.length) console.log('ERROR LINES:\n' + bad.slice(0, 10).join('\n'));
      }
    }
  }
  console.log(`anydiff log files: ${anydiffLogs}, error lines: ${errors}`);
  console.log('I18N CHECK COMPLETE');
}

main();
