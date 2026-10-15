/**
 * Shared helpers for the verification scripts.
 *
 * The extension version lives in `package.json`; deriving the vsix filename
 * and the installed folder from it keeps these scripts working across bumps.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

/** Path of the packaged vsix for the current version. */
const VSIX = path.join(ROOT, `${pkg.name}-${pkg.version}.vsix`);

/** Folder name VSCode uses when installing this extension. */
const INSTALLED_DIR = `${pkg.publisher}.${pkg.name}-${pkg.version}`;

/** `code` executable, accounting for the Windows shim. */
const CODE = process.platform === 'win32' ? 'code.cmd' : 'code';

module.exports = {
  ROOT,
  pkg,
  VSIX,
  INSTALLED_DIR,
  CODE,
  version: pkg.version,
};
