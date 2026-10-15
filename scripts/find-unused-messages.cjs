/** Dev helper: reports message keys never referenced by the source. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const en = fs.readFileSync(path.join(ROOT, 'src/i18n/messages/en.ts'), 'utf8');
const keys = [...en.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1]);

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'i18n') out = out.concat(walk(full));
    } else if (full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

const blob = walk(path.join(ROOT, 'src'))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

const unused = keys.filter((key) => !blob.includes(`'${key}'`));
console.log(`keys: ${keys.length}, unused: ${unused.length}`);
if (unused.length) console.log(unused.join('\n'));
