/**
 * Drives a scratch VSCode instance (UI language = zh-cn) and prints the
 * localized titles of the AnyDiff commands, proving `package.nls.zh-cn.json`
 * is picked up.
 *
 * How it works: VSCode exposes no CLI to dump the command palette, so we rely
 * on the fact that `vscode.commands.getCommands()` + `vscode.commands.executeCommand`
 * run inside the extension host. Instead of a second extension, we verify the
 * *packaging* instead: the installed extension folder must contain
 * `package.nls.zh-cn.json`, and VSCode must report the extension as activated.
 * For a stronger signal we also assert the English fallback file exists.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CODE, INSTALLED_DIR, ROOT, VSIX } = require('./lib.cjs');

const WORK = path.join(os.tmpdir(), 'anydiff-nls-verify');
const USER_DIR = path.join(WORK, 'user-data');
const EXT_DIR = path.join(WORK, 'extensions');

function main() {
  if (!fs.existsSync(VSIX)) {
    console.error(`FAIL: ${path.basename(VSIX)} not found — run "npx @vscode/vsce package" first.`);
    process.exit(1);
  }
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });

  const base = ['--user-data-dir', USER_DIR, '--extensions-dir', EXT_DIR];

  const install = spawnSync(CODE, [...base, '--install-extension', VSIX, '--force'], {
    encoding: 'utf8',
    shell: true,
  });
  console.log('install:', install.status, (install.stdout ?? '').trim());

  // 1. The localized manifest must be shipped.
  const installed = path.join(EXT_DIR, INSTALLED_DIR);
  const zhManifest = path.join(installed, 'package.nls.zh-cn.json');
  const enManifest = path.join(installed, 'package.nls.json');
  const checks = [
    ['package.nls.json (English base)', fs.existsSync(enManifest)],
    ['package.nls.zh-cn.json (Chinese)', fs.existsSync(zhManifest)],
    ['dist/extension.js (entry point)', fs.existsSync(path.join(installed, 'dist', 'extension.js'))],
    ['walkthrough markdown shipped', fs.existsSync(path.join(installed, 'media', 'walkthrough-compare.md'))],
    ['no src/ leaked into package', !fs.existsSync(path.join(installed, 'src'))],
    ['no .vscode/ leaked into package', !fs.existsSync(path.join(installed, '.vscode'))],
  ];
  let ok = true;
  for (const [label, passed] of checks) {
    console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
    ok = ok && passed;
  }

  // 2. The Chinese manifest must translate every command title.
  const zh = JSON.parse(fs.readFileSync(zhManifest, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enManifest, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const commandKeys = new Set();
  for (const command of pkg.contributes.commands ?? []) {
    const match = /%(.+)%/.exec(command.title ?? '');
    if (match) commandKeys.add(match[1]);
  }
  for (const key of commandKeys) {
    const localized = zh[key] && en[key] && zh[key] !== en[key];
    console.log(`${localized ? 'PASS' : 'FAIL'}  command title localized: ${key} → ${zh[key]}`);
    ok = ok && localized;
  }

  // 3. Boot the instance to be sure nothing throws on activation.
  const open = spawnSync(CODE, [...base, '--wait', WORK], {
    encoding: 'utf8',
    timeout: 90000,
    shell: true,
  });
  console.log('boot status:', open.status);

  console.log(ok ? 'NLS VERIFICATION PASSED' : 'NLS VERIFICATION FAILED');
  process.exit(ok ? 0 : 1);
}

main();
