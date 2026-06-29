/**
 * ?\?[?X???? CJK \\uXXXX ?G?X?P?[?v?? UTF-8 ???????e??????u??????B
 * ???w?L?? \\u2212 ??? ALLOWED ??O?? CJK ???????B
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');

const TARGET_DIRS = [
  resolve(repoRoot, 'src'),
  resolve(repoRoot, 'scripts'),
];

const SKIP_FILES = new Set([
  resolve(repoRoot, 'src/plan.bundle.js'),
  resolve(repoRoot, 'scripts/fix-all-encoding.mjs'),
  resolve(repoRoot, 'scripts/deunicode.mjs'),
]);

/** ???[????c??????G?X?P?[?v?i???w?E?L???j */
const ALLOWED_CODE_POINTS = new Set([0x2212]);

function isCjkCodePoint(code) {
  return (
    (code >= 0x3000 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff)
    || (code >= 0xff00 && code <= 0xffef)
  );
}

function deunicodeText(text) {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    const code = parseInt(hex, 16);
    if (ALLOWED_CODE_POINTS.has(code)) return match;
    if (!isCjkCodePoint(code)) return match;
    return String.fromCodePoint(code);
  });
}

function collectFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (SKIP_FILES.has(path)) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      collectFiles(path, out);
      continue;
    }
    if (/\.(js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

let changedCount = 0;

for (const dir of TARGET_DIRS) {
  for (const file of collectFiles(dir)) {
    const before = readFileSync(file, 'utf8');
    const after = deunicodeText(before);
    if (after === before) continue;
    writeFileSync(file, after, { encoding: 'utf8' });
    changedCount += 1;
    console.log('Deunicoded', relative(repoRoot, file).replace(/\\/g, '/'));
  }
}

console.log(changedCount > 0 ? `Done (${changedCount} files)` : 'No changes');
