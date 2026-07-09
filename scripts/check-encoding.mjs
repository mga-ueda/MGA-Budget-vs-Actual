/**
 * 文字コードの文字化け・英語コメントを検査する。
 */
import { readFileSync, readdirSync, statSync } from 'fs';
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
  resolve(repoRoot, 'scripts/check-encoding.mjs'),
  resolve(repoRoot, 'scripts/fix-all-encoding.mjs'),
]);

const EXPENSE_CONFIG = resolve(repoRoot, 'src/config/journalDefinitionConfig.js');

const MOJIBAKE_CODE_POINTS = [
  0x7E5D, 0x7E3A, 0x96E3, 0x8AAA, 0x9A5B, 0x9AE2, 0x7ACA,
];
const WRONG_KANJI_CODE_POINTS = [0x71ED, 0x7E67, 0x9679, 0x87AD, 0x7E6D, 0x9670];
const REQUIRED_EXPENSE_ACCOUNTS = [
  [0x6c34, 0x9053, 0x5149, 0x71b1, 0x8cbb],
  [0x4fee, 0x7e55, 0x8cbb],
  [0x4fdd, 0x967a, 0x6599],
].map((cps) => String.fromCodePoint(...cps));

const MOJIBAKE_PATTERN = new RegExp(
  MOJIBAKE_CODE_POINTS.map((cp) => String.fromCodePoint(cp)).join('|'),
);
const WRONG_KANJI_PATTERN = new RegExp(
  WRONG_KANJI_CODE_POINTS.map((cp) => String.fromCodePoint(cp)).join('|'),
);
const REPLACEMENT_CHAR = String.fromCodePoint(0xFFFD);
const CJK_ESCAPE_PATTERN = /\\u[0-9a-fA-F]{4}/g;
const QUESTION_MOJIBAKE = /\?(?:\?|[\?A-Za-z]){2,}/;
const BLOCK_COMMENT = /\/\*\*([^*]|\*(?!\/))*\*\//g;
const ENGLISH_COMMENT_MARKERS = /\b(Merge|Order|Monthly|Rewrite|Encoding quality|Write expense|Regenerate expense|Default 19)\b/;

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function hasJapanese(text) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

function isCjkEscape(escapeSeq) {
  const code = parseInt(escapeSeq.slice(2), 16);
  return (
    (code >= 0x3000 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff)
  );
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
    if (/\.(js|mjs|css|html|md)$/.test(name)) out.push(path);
  }
  return out;
}

function findEnglishOnlyComments(text) {
  const hits = [];
  for (const match of text.matchAll(BLOCK_COMMENT)) {
    const body = match[0];
    if (hasJapanese(body)) continue;
    if (ENGLISH_COMMENT_MARKERS.test(body)) hits.push(body.split('\n')[0].trim());
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('//')) continue;
    if (hasJapanese(trimmed)) continue;
    if (ENGLISH_COMMENT_MARKERS.test(trimmed)) hits.push(trimmed);
  }
  return hits;
}

function findCjkEscapesInComments(text) {
  const hits = [];
  for (const line of text.split('\n')) {
    if (!/(?:\/\/|\/\*|\*)/.test(line)) continue;
    for (const match of line.matchAll(CJK_ESCAPE_PATTERN)) {
      if (isCjkEscape(match[0])) hits.push(match[0]);
    }
  }
  return hits;
}

const errors = [];

for (const dir of TARGET_DIRS) {
  for (const file of collectFiles(dir)) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(repoRoot, file).replace(/\\/g, '/');

    if (text.charCodeAt(0) === 0xfeff) {
      errors.push(`${rel}: ${jp(0x55, 0x54, 0x46, 0x2d, 0x38, 0x20, 0x42, 0x4f, 0x4d, 0x3067, 0x3059)}`);
    }

    if (text.includes(REPLACEMENT_CHAR) || MOJIBAKE_PATTERN.test(text)) {
      errors.push(`${rel}: ${jp(0x6587, 0x5b57, 0x5316, 0x3051, 0x306e, 0x7591, 0x3044, 0xFF08, 0x53, 0x68, 0x69, 0x66, 0x74, 0x5f, 0x4a, 0x49, 0x53, 0x8aa4, 0x8aad, 0x306a, 0x3069, 0xFF09)}`);
    }

    if (WRONG_KANJI_PATTERN.test(text)) {
      errors.push(`${rel}: ${jp(0x8aa4, 0x3063, 0x305f, 0x6f22, 0x5b57, 0xFF08, 0x71, 0x45, 0x44, 0x2192, 0x71, 0x42, 0x31, 0x306a, 0x3069, 0x306e, 0x7570, 0x4f53, 0x5b57, 0xFF09, 0x304c, 0x542b, 0x307e, 0x308c, 0x3066, 0x3044, 0x307e, 0x3059)}`);
    }

    for (const line of text.split('\n')) {
      if (!/(?:\/\/|\/\*|\*)/.test(line)) continue;
      if (QUESTION_MOJIBAKE.test(line)) {
        errors.push(`${rel}: ${jp(0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x306e, 0x6587, 0x5b57, 0x5316, 0x3051, 0xFF08, 0x3f, 0x9023, 0x7d9a, 0xFF09)}`);
        break;
      }
    }

    const englishComments = findEnglishOnlyComments(text);
    if (englishComments.length > 0) {
      errors.push(`${rel}: ${jp(0x82f1, 0x8a9e, 0x306e, 0x307f, 0x306e, 0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x3067, 0x3059, 0xFF08, 0x65e5, 0x672c, 0x8a9e, 0x3067, 0x66f8, 0x3044, 0x3066, 0x304f, 0x3060, 0x3055, 0x3044, 0xFF09)}`);
    }

    const cjkEscapes = findCjkEscapesInComments(text);
    if (cjkEscapes.length > 0) {
      errors.push(`${rel}: ${jp(0x65e5, 0x672c, 0x8a9e, 0x304c, 0x5c, 0x5c, 0x75, 0x30, 0x30, 0x30, 0x30, 0x3067, 0x66, 0x8a, 0x8a, 0x8a18, 0x3055, 0x308c, 0x3066, 0x3044, 0x307e, 0x3059, 0xFF08)}${cjkEscapes[0]}）`);
    }
  }
}

if (EXPENSE_CONFIG) {
  const expenseText = readFileSync(EXPENSE_CONFIG, 'utf8');
  for (const required of REQUIRED_EXPENSE_ACCOUNTS) {
    if (!expenseText.includes(required)) {
      errors.push(`src/config/journalDefinitionConfig.js: ${jp(0x6b63, 0x3057, 0x3044, 0x8868, 0x8a18, 0x304c, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093, 0xFF08)}${required}）`);
    }
  }
}

if (errors.length > 0) {
  console.error(jp(0x6587, 0x5b57, 0x30b3, 0x30fc, 0x30c9, 0x30c1, 0x30a7, 0x30c3, 0x30af, 0x306b, 0x5931, 0x6557, 0x3057, 0x307e, 0x3057, 0x305f, 0x3a));
  for (const err of errors) console.error(`  - ${err}`);
  console.error('.cursor/rules/utf8-encoding.mdc');
  console.error('node scripts/fix-all-encoding.mjs');
  process.exit(1);
}

console.log(jp(0x6587, 0x5b57, 0x30b3, 0x30fc, 0x30c9, 0x30c1, 0x30a7, 0x30c3, 0x30af, 0x20, 0x4f, 0x4b));
