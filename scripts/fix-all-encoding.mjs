/** fix-all-encoding.mjs (fromCodePoint generator) */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const EXPENSE_ACCOUNTS = [
  [0x798f, 0x5229, 0x539a, 0x751f, 0x8cbb],
  [0x8377, 0x9020, 0x904b, 0x8cc3],
  [0x5e83, 0x544a, 0x8cbb],
  [0x4ea4, 0x969b, 0x8cbb],
  [0x65c5, 0x8cbb, 0x4ea4, 0x901a, 0x8cbb],
  [0x901a, 0x4fe1, 0x8cbb],
  [0x6c34, 0x9053, 0x5149, 0x71b1, 0x8cbb],
  [0x4fee, 0x7e55, 0x8cbb],
  [0x8eca, 0x4e21, 0x8cbb],
  [0x8cc3, 0x501f, 0x6599],
  [0x5730, 0x4ee3, 0x5bb6, 0x8cc3],
  [0x4fdd, 0x967a, 0x6599],
  [0x652f, 0x6255, 0x624b, 0x6570, 0x6599],
  [0x4f1a, 0x8b70, 0x8cbb],
  [0x65b0, 0x805e, 0x56f3, 0x66f8, 0x8cbb],
  [0x6d88, 0x8017, 0x54c1, 0x8cbb],
  [0x8af8, 0x4f1a, 0x8cbb],
  [0x7814, 0x4fee, 0x8cbb],
  [0x652f, 0x6255, 0x9867, 0x554f, 0x6599],
].map((cps) => String.fromCodePoint(...cps));

function escapeSingleQuoted(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function write(relPath, content) {
  const path = resolve(repoRoot, relPath);
  writeFileSync(path, content, { encoding: 'utf8' });
  console.log('Wrote', relPath);
}

function replaceFunctionComment(source, functionName, commentText) {
  const marker = `export function ${functionName}`;
  const idx = source.indexOf(marker);
  if (idx < 0) return source;
  const before = source.slice(0, idx);
  const after = source.slice(idx);
  const commentEnd = before.lastIndexOf('*/');
  const commentStart = commentEnd >= 0 ? before.lastIndexOf('/**', commentEnd) : -1;
  if (commentStart < 0) {
    return `${before}/** ${commentText} */\n${after}`;
  }
  return `${before.slice(0, commentStart)}/** ${commentText} */\n${after}`;
}

const accountLines = EXPENSE_ACCOUNTS.map((name) => `  ${escapeSingleQuoted(name)},`).join('\n');

const expenseAccountConfig = `/**
 * ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x3067, 0x5e38, 0x6642, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x4e00, 0x89a7, 0xFF08, 0x4ed5, 0x8a33, 0x304c, 0x306a, 0x304f, 0x3066, 0x3082, 0x20, 0x30, 0x5186, 0x3067, 0x8868, 0x793a, 0xFF09, 0x3002)}
 * ${jp(0x79d1, 0x76ee, 0x540d, 0x306f, 0x4ed5, 0x8a33, 0x20, 0x43, 0x53, 0x56, 0x306e, 0x8868, 0x8a18, 0x3092, 0x512a, 0x5148, 0xFF08, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x73, 0x2f, 0x73, 0x63, 0x61, 0x6e, 0x2d, 0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x2d, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x73, 0x2e, 0x6d, 0x6a, 0x73, 0xFF09, 0x3002}
 * ${jp(0x5b9f, 0x884c, 0x6642, 0x306e, 0x4e00, 0x89a7, 0x306f, 0x4ed5, 0x8a33, 0x5b9a, 0x7fa9, 0x8a2d, 0x5b9a, 0xFF08, 0x6a, 0x6f, 0x75, 0x72, 0x6e, 0x61, 0x6c, 0x44, 0x65, 0x66, 0x69, 0x6e, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0xFF09, 0x3092, 0x53c2, 0x7167, 0x3057, 0x307e, 0x3059, 0x3002)}
 */
import {
  DEFAULT_JOURNAL_DEFINITION,
  getJournalDefinition,
} from './journalDefinitionConfig.js';

export const EXPENSE_SECTION_ACCOUNTS = DEFAULT_JOURNAL_DEFINITION.expenseSectionAccounts;

/** ${jp(0x5b9f, 0x884c, 0x6642, 0x306e, 0x8af8, 0x7d4c, 0x8cbb, 0x5e38, 0x6642, 0x8868, 0x793a, 0x4e00, 0x89a7)} */
export function getExpenseSectionAccounts() {
  return getJournalDefinition().expenseSectionAccounts;
}

/** ${jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d, 0x3092, 0x4e00, 0x89a7, 0x306e, 0x6b63, 0x898f, 0x8868, 0x8a18, 0x306b, 0x5bc4, 0x305b, 0x308b, 0xFF08, 0x8868, 0x8a18, 0x5dee, 0x30fb, 0x7570, 0x4f53, 0x5b57, 0x306e, 0x91cd, 0x8907, 0x3092, 0x9632, 0x3050, 0xFF09)} */
export function canonicalExpenseAccount(account) {
  if (!account) return account;
  const accounts = getExpenseSectionAccounts();
  const accountSet = new Set(accounts);
  if (accountSet.has(account)) return account;
  const normalized = account.normalize('NFKC');
  for (const canonical of accounts) {
    if (canonical.normalize('NFKC') === normalized) return canonical;
  }
  return account;
}

/** ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306e, 0x5e38, 0x6642, 0x8868, 0x793a, 0x4e00, 0x89a7, 0x306b, 0x542b, 0x307e, 0x308c, 0x308b, 0x52d8, 0x5b9a, 0x304b)} */
export function isKnownExpenseSectionAccount(account) {
  return new Set(getExpenseSectionAccounts()).has(canonicalExpenseAccount(account));
}

function combineExpenseJournalItems(items) {
  if (items.length === 1) return items[0];
  const combined = { ...items[0], sub: items[0].sub ?? '', values: { ...items[0].values } };
  for (let i = 1; i < items.length; i += 1) {
    for (const [month, amount] of Object.entries(items[i].values ?? {})) {
      combined.values[month] = (combined.values[month] ?? 0) + (amount ?? 0);
    }
  }
  return combined;
}

/** ${jp(0x4ed5, 0x8a33, 0x3068, 0x4e00, 0x89a7, 0x3092, 0x30de, 0x30fc, 0x30b8, 0x3059, 0x308b, 0xFF08, 0x4e00, 0x89a7, 0x5916, 0x306f, 0x672b, 0x5c3e, 0x306b, 0x51fa, 0x529b, 0xFF09)} */
export function mergeExpenseSectionItems(journalItems, emptyMonthValues) {
  const expenseAccounts = getExpenseSectionAccounts();
  const expenseAccountSet = new Set(expenseAccounts);
  const journalByAccount = new Map();
  for (const item of journalItems) {
    const account = canonicalExpenseAccount(item.account);
    const normalized = { ...item, account };
    if (!journalByAccount.has(account)) journalByAccount.set(account, []);
    journalByAccount.get(account).push(normalized);
  }

  const merged = [];

  for (const account of expenseAccounts) {
    const items = journalByAccount.get(account);
    if (items?.length) {
      const bySub = new Map();
      for (const item of items) {
        const subKey = item.sub ?? '';
        if (!bySub.has(subKey)) bySub.set(subKey, []);
        bySub.get(subKey).push(item);
      }
      for (const subItems of bySub.values()) {
        merged.push(combineExpenseJournalItems(subItems));
      }
    } else {
      merged.push({ account, sub: '', values: emptyMonthValues() });
    }
  }

  for (const item of journalItems) {
    const account = canonicalExpenseAccount(item.account);
    if (expenseAccountSet.has(account)) continue;
    merged.push({ ...item, account });
  }

  return merged;
}
`;

const expenseSortConfig = `import { EXPENSE_SECTION_ACCOUNTS } from './expenseAccountConfig.js';

const EXPENSE_SORT_STORAGE_KEY = 'mga-expense-sort-order';

/** ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x306e, 0x4e26, 0x3073, 0x9806, 0xFF08, 0x6570, 0x5024, 0x304c, 0x5c0f, 0x3055, 0x3044, 0x307b, 0x3069, 0x4e0a, 0xFF09, 0x3002, 0x672a, 0x8a2d, 0x5b9a, 0x6642, 0x306f, 0x20, 0x45, 0x58, 0x50, 0x45, 0x4e, 0x53, 0x45, 0x5f, 0x53, 0x45, 0x43, 0x54, 0x49, 0x4f, 0x4e, 0x5f, 0x41, 0x43, 0x43, 0x4f, 0x55, 0x4e, 0x54, 0x53, 0x306e, 0x9806, 0x5e8f)} */
export const DEFAULT_EXPENSE_SORT_ORDER = Object.fromEntries(
  EXPENSE_SECTION_ACCOUNTS.map((account, index) => [account, index + 1]),
);

export const DEFAULT_EXPENSE_ACCOUNT_ORDER = [...EXPENSE_SECTION_ACCOUNTS];

const UNKNOWN_ACCOUNT_SORT_BASE = DEFAULT_EXPENSE_ACCOUNT_ORDER.length + 1000;

export function expenseSortConfigKey(account) {
  return \`expense|sort|\${account}\`;
}

export function loadExpenseSortConfig() {
  try {
    const raw = localStorage.getItem(EXPENSE_SORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveExpenseSortConfig(config) {
  localStorage.setItem(EXPENSE_SORT_STORAGE_KEY, JSON.stringify(config));
}

export function getDefaultExpenseAccountSortOrder(account) {
  const order = DEFAULT_EXPENSE_SORT_ORDER[account];
  return order != null ? order : null;
}

export function getExpenseAccountSortOrder(config, account) {
  const key = expenseSortConfigKey(account);
  const custom = config[key];
  if (custom != null && Number.isFinite(Number(custom))) {
    return Number(custom);
  }
  const defaultOrder = getDefaultExpenseAccountSortOrder(account);
  if (defaultOrder != null) return defaultOrder;
  return UNKNOWN_ACCOUNT_SORT_BASE;
}

export function getExpenseAccountSortOrderDisplay(config, account) {
  const key = expenseSortConfigKey(account);
  if (config[key] != null) return String(config[key]);
  const defaultOrder = getDefaultExpenseAccountSortOrder(account);
  return defaultOrder != null ? String(defaultOrder) : '';
}

export function setExpenseAccountSortOrder(config, account, rawValue) {
  const key = expenseSortConfigKey(account);
  const newConfig = { ...config };
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) {
    delete newConfig[key];
    return newConfig;
  }
  const num = parseInt(trimmed, 10);
  if (!Number.isFinite(num)) {
    delete newConfig[key];
    return newConfig;
  }
  const defaultOrder = getDefaultExpenseAccountSortOrder(account);
  if (defaultOrder != null && num === defaultOrder) {
    delete newConfig[key];
    return newConfig;
  }
  newConfig[key] = num;
  return newConfig;
}

function collectAccountBlock(rows, startIndex) {
  const first = rows[startIndex];
  if (first.type === 'total') {
    return { blockRows: [first], nextIndex: startIndex + 1, account: null, isTotal: true };
  }

  const account = first.label;
  const blockRows = [first];
  const blockIds = new Set([first.id]);
  let i = startIndex + 1;

  while (i < rows.length) {
    const next = rows[i];
    if (next.type === 'total') break;
    if (next.parentId && blockIds.has(next.parentId)) {
      blockRows.push(next);
      blockIds.add(next.id);
      i += 1;
      continue;
    }
    if (!next.parentId && next.label === account) {
      blockRows.push(next);
      if (next.id) blockIds.add(next.id);
      i += 1;
      continue;
    }
    break;
  }

  return { blockRows, nextIndex: i, account, isTotal: false };
}

/** ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306e, 0x884c, 0x3092, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x30d6, 0x30ed, 0x30c3, 0x30af, 0x5358, 0x4f4d, 0x3067, 0x4e26, 0x3073, 0x66ff, 0x3048, 0x308b)} */
export function sortExpenseSectionRows(rows, config) {
  const blocks = [];
  let i = 0;
  while (i < rows.length) {
    const block = collectAccountBlock(rows, i);
    blocks.push(block);
    i = block.nextIndex;
  }

  const totalBlocks = blocks.filter((b) => b.isTotal);
  const accountBlocks = blocks
    .filter((b) => !b.isTotal)
    .map((block, index) => ({ block, index }));

  accountBlocks.sort((a, b) => {
    const orderA = getExpenseAccountSortOrder(config, a.block.account);
    const orderB = getExpenseAccountSortOrder(config, b.block.account);
    if (orderA !== orderB) return orderA - orderB;
    return a.index - b.index;
  });

  return [
    ...accountBlocks.flatMap(({ block }) => block.blockRows),
    ...totalBlocks.flatMap((block) => block.blockRows),
  ];
}

export function applyExpenseSortToPlanData(planData, config) {
  if (!planData?.sections) return planData;
  return {
    ...planData,
    sections: planData.sections.map((section) => {
      if (section.id !== 'expense') return section;
      return { ...section, rows: sortExpenseSectionRows(section.rows, config) };
    }),
  };
}
`;

const period = (n) => `${String.fromCodePoint(0x7b2c)}${String.fromCodePoint(0xff10 + n)}${String.fromCodePoint(0x671f)}`;
const journalPrefix = jp(0x4ed5, 0x8a33, 0x30c7, 0x30fc, 0x30bf, 0x5f);

const JOURNAL_FILES = [
  `${period(1)}/${journalPrefix}2018-12-07_2019-11-30.csv`,
  `${period(2)}/${journalPrefix}2019-12-01_2020-11-30.csv`,
  `${period(3)}/${journalPrefix}2020-12-01_2021-11-30.csv`,
  `${period(4)}/${journalPrefix}2021-12-01_2022-11-30.csv`,
  `${period(5)}/${journalPrefix}2022-12-01_2023-11-30.csv`,
  `${period(6)}/${journalPrefix}2023-12-01_2024-11-30.csv`,
  `${period(7)}/${journalPrefix}2024-12-01_2025-11-30.csv`,
  `${period(8)}/${journalPrefix}2025-12-01_2026-11-30.csv`,
];

const journalFilesLiteral = JOURNAL_FILES.map((p) => `  ${escapeSingleQuoted(p)},`).join('\n');

const scanExpenseAccounts = `/**
 * ${jp(0x5168, 0x671f, 0x306e, 0x4ed5, 0x8a33, 0x20, 0x43, 0x53, 0x56, 0x304b, 0x3089, 0x8af8, 0x7d4c, 0x8cbb, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x3092, 0x30b9, 0x30ad, 0x30e3, 0x30f3, 0x3057, 0x3001, 0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x41, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0x2e, 0x6a, 0x73, 0x3092, 0x66f4, 0x65b0, 0x3059, 0x308b, 0x3002)}
 * ${jp(0x5b9f, 0x884c, 0x3a, 0x20, 0x73, 0x63, 0x61, 0x6e, 0x2d, 0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x2e, 0x62, 0x61, 0x74, 0x20, 0x307e, 0x305f, 0x306f, 0x20, 0x6e, 0x6f, 0x64, 0x65, 0x20, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x73, 0x2f, 0x73, 0x63, 0x61, 0x6e, 0x2d, 0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x2d, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x73, 0x2e, 0x6d, 0x6a, 0x73)}
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseCsvLine, decodeCsvBuffer } from '../src/parse/parser.js';
import { categorizeAccount } from '../src/parse/parseJournal.js';
import {
  EXPENSE_SECTION_ACCOUNTS,
  canonicalExpenseAccount,
} from '../src/config/expenseAccountConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const csvRoot = resolve(repoRoot, 'csv');
const configPath = resolve(repoRoot, 'src/config/expenseAccountConfig.js');
const outputPath = resolve(__dirname, 'expense-scan-output.json');

const JOURNAL_FILES = [
${journalFilesLiteral}
];

const SGA_ACCOUNT_EXCEPTIONS = new Set([
  ${escapeSingleQuoted(jp(0x8377, 0x9020, 0x904b, 0x8cc3))},
  ${escapeSingleQuoted(jp(0x5730, 0x4ee3, 0x5bb6, 0x8cc3))},
  ${escapeSingleQuoted(jp(0x8cc3, 0x501f, 0x6599))},
]);

/** ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306e, 0x5e38, 0x6642, 0x8868, 0x793a, 0x5bfe, 0x8c61, 0x3092, 0x5224, 0x5b9a)} */
function isScannableExpenseAccount(account) {
  if (!account) return false;
  if (categorizeAccount(account) !== 'expense') return false;
  if (/(?:${jp(0x8cbb)}|${jp(0x6599)})$/.test(account)) return true;
  return SGA_ACCOUNT_EXCEPTIONS.has(account);
}

function scanJournalFile(text) {
  const byCanonical = new Map();
  for (const line of text.split(/\\r?\\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (cells[19]?.trim() === ${escapeSingleQuoted(jp(0x958b, 0x59cb, 0x4ed5, 0x8a33))}) continue;

    for (const account of [cells[2]?.trim(), cells[10]?.trim()]) {
      if (!isScannableExpenseAccount(account)) continue;
      const key = canonicalExpenseAccount(account);
      const prev = byCanonical.get(key);
      if (!prev) {
        byCanonical.set(key, { name: account, count: 1 });
      } else {
        prev.count += 1;
        if (account !== prev.name) prev.name = account;
      }
    }
  }
  return byCanonical;
}

function mergeAccountLists(existing, scannedByCanonical) {
  const merged = [];
  const known = new Set();

  for (const name of existing) {
    const key = canonicalExpenseAccount(name);
    known.add(key);
    const fromJournal = scannedByCanonical.get(key);
    merged.push(fromJournal?.name ?? name);
  }

  const additions = [];
  return { merged, additions };
}

function escapeSingleQuoted(value) {
  return \`'\${value.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'")}'\`;
}

function formatAccountsArray(accounts) {
  return accounts.map((account) => \`  \${escapeSingleQuoted(account)},\`).join('\\n');
}

function updateExpenseAccountConfig(accounts) {
  const source = readFileSync(configPath, 'utf8');
  const arrayBlock = \`export const EXPENSE_SECTION_ACCOUNTS = [\\n\${formatAccountsArray(accounts)}\\n];\`;
  const updated = source.replace(
    /export const EXPENSE_SECTION_ACCOUNTS = \\[[\\s\\S]*?\\];/,
    arrayBlock,
  );
  if (updated === source) {
    throw new Error(${escapeSingleQuoted(jp(0x45, 0x58, 0x50, 0x45, 0x4e, 0x53, 0x45, 0x5f, 0x53, 0x45, 0x43, 0x54, 0x49, 0x4f, 0x4e, 0x5f, 0x41, 0x43, 0x43, 0x4f, 0x55, 0x4e, 0x54, 0x53, 0x306e, 0x66f4, 0x65b0, 0x306b, 0x5931, 0x6557, 0x3057, 0x307e, 0x3057, 0x305f))});
  }
  writeFileSync(configPath, updated, { encoding: 'utf8' });
}

const scannedByCanonical = new Map();
for (const rel of JOURNAL_FILES) {
  const filePath = join(csvRoot, rel);
  if (!existsSync(filePath)) {
    console.warn(\`${jp(0x30B9, 0x30AD, 0x30C3, 0x30D7, 0xFF08, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x306a, 0x3057, 0xFF09, 0x3a, 0x20)}\${filePath}\`);
    continue;
  }
  const text = decodeCsvBuffer(readFileSync(filePath));
  for (const [key, entry] of scanJournalFile(text)) {
    const prev = scannedByCanonical.get(key);
    if (!prev || entry.count > prev.count) {
      scannedByCanonical.set(key, { ...entry });
    }
  }
}

const { merged, additions } = mergeAccountLists(EXPENSE_SECTION_ACCOUNTS, scannedByCanonical);
const spellingChanges = merged.filter((name, index) => name !== EXPENSE_SECTION_ACCOUNTS[index]);
const unchanged = additions.length === 0
  && spellingChanges.length === 0
  && merged.length === EXPENSE_SECTION_ACCOUNTS.length;

writeFileSync(outputPath, \`\${JSON.stringify({
  scannedFiles: JOURNAL_FILES.length,
  previousCount: EXPENSE_SECTION_ACCOUNTS.length,
  nextCount: merged.length,
  additions,
  accounts: merged,
}, null, 2)}\\n\`, { encoding: 'utf8' });

if (unchanged) {
  console.log(\`${jp(0x5909, 0x66f4, 0x306a, 0x3057, 0xFF08)}\${merged.length}${jp(0x20, 0x79d1, 0x76ee, 0xFF09, 0x3002, 0x20)}\${outputPath} ${jp(0x3092, 0x51fa, 0x529b, 0x3057, 0x307e, 0x3057, 0x305f, 0x3002)}\`);
} else {
  updateExpenseAccountConfig(merged);
  execSync('node scripts/check-encoding.mjs', { cwd: repoRoot, stdio: 'inherit' });
  execSync('node build.mjs', { cwd: repoRoot, stdio: 'inherit' });
  console.log(\`${jp(0x66f4, 0x65b0, 0x3057, 0x307e, 0x3057, 0x305f, 0x3a, 0x20)}\${configPath}\`);
  console.log(\`${jp(0x8ffd, 0x52a0, 0x20)}\${additions.length}${jp(0x20, 0x79d1, 0x76ee, 0x3a, 0x20)}\${additions.join(${escapeSingleQuoted(jp(0x3001))}) || ${escapeSingleQuoted(jp(0x306a, 0x3057))}}\`);
  console.log(\`${jp(0x5408, 0x8a08, 0x20)}\${merged.length}${jp(0x20, 0x79d1, 0x76ee, 0x3002, 0x20)}\${outputPath} ${jp(0x3092, 0x51fa, 0x529b, 0x3057, 0x307e, 0x3057, 0x305f, 0x3002)}\`);
}
`;

const checkEncoding = `/**
 * ${jp(0x6587, 0x5b57, 0x30b3, 0x30fc, 0x30c9, 0x306e, 0x6587, 0x5b57, 0x5316, 0x3051, 0x30fb, 0x82f1, 0x8a9e, 0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x3092, 0x691c, 0x67fb, 0x3059, 0x308b, 0x3002)}
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
  resolve(repoRoot, 'scripts/patch-expense-config.mjs'),
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
const CJK_ESCAPE_PATTERN = /\\\\u[0-9a-fA-F]{4}/g;
const QUESTION_MOJIBAKE = /\\?(?:\\?|[\\?A-Za-z]){2,}/;
const BLOCK_COMMENT = /\\/\\*\\*([^*]|\\*(?!\\/))*\\*\\//g;
const ENGLISH_COMMENT_MARKERS = /\\b(Merge|Order|Monthly|Rewrite|Encoding quality|Write expense|Regenerate expense|Default 19)\\b/;

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function hasJapanese(text) {
  return /[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF]/.test(text);
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
    if (/\\.(js|mjs|css|html|md)$/.test(name)) out.push(path);
  }
  return out;
}

function findEnglishOnlyComments(text) {
  const hits = [];
  for (const match of text.matchAll(BLOCK_COMMENT)) {
    const body = match[0];
    if (hasJapanese(body)) continue;
    if (ENGLISH_COMMENT_MARKERS.test(body)) hits.push(body.split('\\n')[0].trim());
  }
  for (const line of text.split('\\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('//')) continue;
    if (hasJapanese(trimmed)) continue;
    if (ENGLISH_COMMENT_MARKERS.test(trimmed)) hits.push(trimmed);
  }
  return hits;
}

function findCjkEscapesInComments(text) {
  const hits = [];
  for (const line of text.split('\\n')) {
    if (!/(?:\\/\\/|\\/\\*|\\*)/.test(line)) continue;
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
    const rel = relative(repoRoot, file).replace(/\\\\/g, '/');

    if (text.charCodeAt(0) === 0xfeff) {
      errors.push(\`\${rel}: \${jp(0x55, 0x54, 0x46, 0x2d, 0x38, 0x20, 0x42, 0x4f, 0x4d, 0x3067, 0x3059)}\`);
    }

    if (text.includes(REPLACEMENT_CHAR) || MOJIBAKE_PATTERN.test(text)) {
      errors.push(\`\${rel}: \${jp(0x6587, 0x5b57, 0x5316, 0x3051, 0x306e, 0x7591, 0x3044, 0xFF08, 0x53, 0x68, 0x69, 0x66, 0x74, 0x5f, 0x4a, 0x49, 0x53, 0x8aa4, 0x8aad, 0x306a, 0x3069, 0xFF09)}\`);
    }

    if (WRONG_KANJI_PATTERN.test(text)) {
      errors.push(\`\${rel}: \${jp(0x8aa4, 0x3063, 0x305f, 0x6f22, 0x5b57, 0xFF08, 0x71, 0x45, 0x44, 0x2192, 0x71, 0x42, 0x31, 0x306a, 0x3069, 0x306e, 0x7570, 0x4f53, 0x5b57, 0xFF09, 0x304c, 0x542b, 0x307e, 0x308c, 0x3066, 0x3044, 0x307e, 0x3059)}\`);
    }

    for (const line of text.split('\\n')) {
      if (!/(?:\\/\\/|\\/\\*|\\*)/.test(line)) continue;
      if (QUESTION_MOJIBAKE.test(line)) {
        errors.push(\`\${rel}: \${jp(0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x306e, 0x6587, 0x5b57, 0x5316, 0x3051, 0xFF08, 0x3f, 0x9023, 0x7d9a, 0xFF09)}\`);
        break;
      }
    }

    const englishComments = findEnglishOnlyComments(text);
    if (englishComments.length > 0) {
      errors.push(\`\${rel}: \${jp(0x82f1, 0x8a9e, 0x306e, 0x307f, 0x306e, 0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x3067, 0x3059, 0xFF08, 0x65e5, 0x672c, 0x8a9e, 0x3067, 0x66f8, 0x3044, 0x3066, 0x304f, 0x3060, 0x3055, 0x3044, 0xFF09)}\`);
    }

    const cjkEscapes = findCjkEscapesInComments(text);
    if (cjkEscapes.length > 0) {
      errors.push(\`\${rel}: \${jp(0x65e5, 0x672c, 0x8a9e, 0x304c, 0x5c, 0x5c, 0x75, 0x30, 0x30, 0x30, 0x30, 0x3067, 0x66, 0x8a, 0x8a, 0x8a18, 0x3055, 0x308c, 0x3066, 0x3044, 0x307e, 0x3059, 0xFF08)}\${cjkEscapes[0]}${jp(0xFF09)}\`);
    }
  }
}

if (EXPENSE_CONFIG) {
  const expenseText = readFileSync(EXPENSE_CONFIG, 'utf8');
  for (const required of REQUIRED_EXPENSE_ACCOUNTS) {
    if (!expenseText.includes(required)) {
      errors.push(\`src/config/journalDefinitionConfig.js: \${jp(0x6b63, 0x3057, 0x3044, 0x8868, 0x8a18, 0x304c, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093, 0xFF08)}\${required}${jp(0xFF09)}\`);
    }
  }
}

if (errors.length > 0) {
  console.error(jp(0x6587, 0x5b57, 0x30b3, 0x30fc, 0x30c9, 0x30c1, 0x30a7, 0x30c3, 0x30af, 0x306b, 0x5931, 0x6557, 0x3057, 0x307e, 0x3057, 0x305f, 0x3a));
  for (const err of errors) console.error(\`  - \${err}\`);
  console.error('.cursor/rules/utf8-encoding.mdc');
  console.error('node scripts/fix-all-encoding.mjs');
  process.exit(1);
}

console.log(jp(0x6587, 0x5b57, 0x30b3, 0x30fc, 0x30c9, 0x30c1, 0x30a7, 0x30c3, 0x30af, 0x20, 0x4f, 0x4b));
`;

const restoreScript = `/**
 * ${jp(0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x41, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0x2e, 0x6a, 0x73, 0x3092, 0x518d, 0x751f, 0x6210, 0xFF08, 0x66, 0x69, 0x78, 0x2d, 0x61, 0x6c, 0x6c, 0x2d, 0x65, 0x6e, 0x63, 0x6f, 0x64, 0x69, 0x6e, 0x67, 0x2e, 0x6d, 0x6a, 0x73, 0x3092, 0x5b9f, 0x884c, 0xFF09, 0x3002)}
 */
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
execSync('node scripts/fix-all-encoding.mjs', { cwd: repoRoot, stdio: 'inherit' });
`;

execSync('node scripts/patch-expense-config.mjs', { cwd: repoRoot, stdio: 'inherit' });
execSync('node scripts/write-bs-balance-sheet-account-config.mjs', { cwd: repoRoot, stdio: 'inherit' });
execSync('node scripts/gen-journal-definition-config.mjs', { cwd: repoRoot, stdio: 'inherit' });
execSync('node scripts/gen-journal-definition-settings.mjs', { cwd: repoRoot, stdio: 'inherit' });
write('src/config/expenseSortConfig.js', expenseSortConfig);
write('scripts/scan-expense-accounts.mjs', scanExpenseAccounts);
write('scripts/check-encoding.mjs', checkEncoding);
write('scripts/restore-expense-account-config.mjs', restoreScript);

patchOutsourcingSources();
patchEnglishComments();
writeCursorEncodingRule();

console.log('All UTF-8 source files regenerated.');

function patchOutsourcingSources() {
  const noSubLabel = escapeSingleQuoted(jp(0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x306a, 0x3057));
  const outsourcingConfigPath = resolve(repoRoot, 'src/config/outsourcingPlanConfig.js');
  let outsourcingConfig = readFileSync(outsourcingConfigPath, 'utf8');

  outsourcingConfig = outsourcingConfig.replace(/\nconst NO_SUB_LABEL = '[^']*';\n/, '\n');

  if (!outsourcingConfig.includes('export function mergeVendorsFromSubaccounts')) {
    const mergeBlock = `/** ${jp(0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x4e00, 0x89a7, 0x304b, 0x3089, 0x672a, 0x767b, 0x9332, 0x306e, 0x53d6, 0x5f15, 0x5148, 0x3060, 0x3051, 0x8a08, 0x753b, 0x306b, 0x8ffd, 0x52a0, 0x3059, 0x308b, 0xFF08, 0x91d1, 0x984d, 0x306f, 0x7a7a, 0x306e, 0x307e, 0x307e, 0xFF09)} */
export function mergeVendorsFromSubaccounts(plans, fiscalPeriod, subaccounts, fiscalMonths) {
  if (!Array.isArray(subaccounts) || subaccounts.length === 0) return plans;
  const entries = getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths);
  const existingKeys = new Set(
    entries.map((e) => \`\${e.accountLabel}\\x00\${e.subLabel}\`),
  );
  let changed = false;
  const next = [...entries];
  for (const { accountLabel, subLabel } of subaccounts) {
    const account = String(accountLabel ?? '').trim();
    const sub = String(subLabel ?? '').trim();
    if (!account || !sub || sub === ${noSubLabel}) continue;
    const key = \`\${account}\\x00\${sub}\`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    const vendor = createManualVendor({ accountLabel: account, subLabel: sub });
    if (vendor) {
      next.push(normalizeVendorEntry(vendor, fiscalMonths));
      changed = true;
    }
  }
  if (!changed) return plans;
  return setPeriodVendorEntries(plans, fiscalPeriod, next, fiscalMonths);
}

`;
    outsourcingConfig = outsourcingConfig.replace(
      'export function syncVendorListFromReference',
      `${mergeBlock}export function syncVendorListFromReference`,
    );
  } else {
    outsourcingConfig = replaceFunctionComment(
      outsourcingConfig,
      'mergeVendorsFromSubaccounts',
      jp(0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x4e00, 0x89a7, 0x304b, 0x3089, 0x672a, 0x767b, 0x9332, 0x306e, 0x53d6, 0x5f15, 0x5148, 0x3060, 0x3051, 0x8a08, 0x753b, 0x306b, 0x8ffd, 0x52a0, 0x3059, 0x308b, 0xFF08, 0x91d1, 0x984d, 0x306f, 0x7a7a, 0x306e, 0x307e, 0x307e, 0xFF09),
    );
    outsourcingConfig = outsourcingConfig.replace(
      /if \(!account \|\| !sub \|\| sub === (?:NO_SUB_LABEL|'[^']+')\) continue;/,
      `if (!account || !sub || sub === ${noSubLabel}) continue;`,
    );
  }

  outsourcingConfig = replaceFunctionComment(
    outsourcingConfig,
    'syncVendorListFromReference',
    jp(0x53c2, 0x7167, 0x671f, 0x306e, 0x53d6, 0x5f15, 0x5148, 0x4e00, 0x89a7, 0x3092, 0x3001, 0x672a, 0x767b, 0x9332, 0x5206, 0x3060, 0x3051, 0x5bfe, 0x8c61, 0x671f, 0x306b, 0x8ffd, 0x52a0, 0x3059, 0x308b, 0xFF08, 0x91d1, 0x984d, 0x306f, 0x7a7a, 0xFF09),
  );

  writeFileSync(outsourcingConfigPath, outsourcingConfig, { encoding: 'utf8' });
  console.log('Wrote src/config/outsourcingPlanConfig.js');

  const planOutsourcingPath = resolve(repoRoot, 'src/enrich/planOutsourcingRows.js');
  let planOutsourcing = readFileSync(planOutsourcingPath, 'utf8');

  planOutsourcing = replaceFunctionComment(
    planOutsourcing,
    'calcOutsourcingBreakdownForMonth',
    jp(0x7a0e, 0x8fbc, 0x652f, 0x6255, 0x984d, 0x304b, 0x3089, 0x500b, 0x4eba, 0x4e8b, 0x696d, 0x4e3b, 0x5411, 0x3051, 0x6e90, 0x6cc9, 0x5185, 0x8a33, 0x3092, 0x7b97, 0x51fa),
  );

  planOutsourcing = replaceFunctionComment(
    planOutsourcing,
    'enrichPlanDataWithOutsourcingRows',
    jp(0x5916, 0x6ce8, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x652f, 0x6255, 0x8a08, 0x753b, 0x3092, 0x30de, 0x30fc, 0x30b8, 0x3059, 0x308b, 0xFF08, 0x4e88, 0x7b97, 0x30fb, 0x4e88, 0x5b9f, 0x30e2, 0x30fc, 0x30c9, 0xFF09),
  );

  planOutsourcing = replaceFunctionComment(
    planOutsourcing,
    'collectOutsourcingActualAmountsFromPlanData',
    jp(0x4e88, 0x5b9f, 0x30c7, 0x30fc, 0x30bf, 0x304b, 0x3089, 0x5916, 0x6ce8, 0x5b9f, 0x7e3e, 0x306e, 0x6708, 0x5225, 0x91d1, 0x984d, 0x3092, 0x53d6, 0x5f15, 0x5148, 0x3054, 0x3068, 0x306b, 0x62bd, 0x51fa),
  );

  planOutsourcing = replaceFunctionComment(
    planOutsourcing,
    'collectOutsourcingSubaccountsFromPlanData',
    jp(0x4e88, 0x5b9f, 0x30c7, 0x30fc, 0x30bf, 0x304b, 0x3089, 0x5916, 0x6ce8, 0x306e, 0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x4e00, 0x89a7, 0x3092, 0x62bd, 0x51fa),
  );

  writeFileSync(planOutsourcingPath, planOutsourcing, { encoding: 'utf8' });
  console.log('Wrote src/enrich/planOutsourcingRows.js');
}

function patchEnglishComments() {
  const replacements = [
    [resolve(repoRoot, 'src/config/employeeConfig.js'),
      '/** Monthly compensation (director salary or base + allowances). */',
      `/** ${jp(0x6708, 0x984d, 0x5831, 0x916c, 0xFF08, 0x5f79, 0x54e1, 0x5831, 0x916c, 0x307e, 0x305f, 0x306f, 0x57fa, 0x672c, 0x7d66, 0xFF0B, 0x624b, 0x5f53, 0xFF09, 0x3002)} */`],
    [resolve(repoRoot, 'src/enrich/planTaxPaymentRows.js'),
      '/** Merge tax public charge payment plan into other section (plan / budget-actual modes). */',
      `/** ${jp(0x7a0e, 0x91d1, 0x30fb, 0x516c, 0x79df, 0x516c, 0x8ab2, 0x306e, 0x652f, 0x6255, 0x8a08, 0x753b, 0x3092, 0x305d, 0x306e, 0x4ed6, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x30de, 0x30fc, 0x30b8, 0xFF08, 0x4e88, 0x7b97, 0x30fb, 0x4e88, 0x5b9f, 0x30e2, 0x30fc, 0x30c9, 0xFF09, 0x3002)} */`],
    [resolve(repoRoot, 'src/enrich/planEmployeeSalaryRows.js'),
      '/** Merge employee salary plan rows into personnel (plan / budget-actual modes). */',
      `/** ${jp(0x4eba, 0x4ef6, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x5f93, 0x696d, 0x54e1, 0x7d66, 0x4e0e, 0x8a08, 0x753b, 0x884c, 0x3092, 0x30de, 0x30fc, 0x30b8, 0xFF08, 0x4e88, 0x7b97, 0x30fb, 0x4e88, 0x5b9f, 0x30e2, 0x30fc, 0x30c9, 0xFF09, 0x3002)} */`],
  ];

  for (const [filePath, from, to] of replacements) {
    let text = readFileSync(filePath, 'utf8');
    if (!text.includes(from)) continue;
    text = text.replace(from, to);
    writeFileSync(filePath, text, { encoding: 'utf8' });
    console.log('Wrote', relative(repoRoot, filePath));
  }

  const employeeSalaryPath = resolve(repoRoot, 'src/enrich/planEmployeeSalaryRows.js');
  let employeeSalary = readFileSync(employeeSalaryPath, 'utf8');
  const orderFrom = `/**
 * Order: director CSV, director plan rows, staff plan rows, salary CSV,
 * overtime CSV (plan-filled), travel CSV (plan-filled), rest.
 */`;
  const orderTo = `/**
 * ${jp(0x4e26, 0x3073, 0x9806, 0xFF1a, 0x5f79, 0x54e1, 0x43, 0x53, 0x56, 0x2192, 0x5f79, 0x54e1, 0x8a08, 0x753b, 0x884c, 0x2192, 0x4e00, 0x822c, 0x8077, 0x8a08, 0x753b, 0x884c, 0x2192, 0x7d66, 0x4e0e, 0x43, 0x53, 0x56, 0x2192, 0x6b8b, 0x696d, 0x43, 0x53, 0x56, 0xFF08, 0x8a08, 0x753b, 0x88dc, 0x5b8c, 0xFF09, 0x2192, 0x51fa, 0x5f35, 0x43, 0x53, 0x56, 0xFF08, 0x8a08, 0x753b, 0x88dc, 0x5b8c, 0xFF09, 0x2192, 0x305d, 0x306e, 0x4ed6, 0x3002)}
 */`;
  if (employeeSalary.includes(orderFrom)) {
    employeeSalary = employeeSalary.replace(orderFrom, orderTo);
    writeFileSync(employeeSalaryPath, employeeSalary, { encoding: 'utf8' });
    console.log('Wrote src/enrich/planEmployeeSalaryRows.js');
  }
}

function writeCursorEncodingRule() {
  const rule = `---
description: ${jp(0x30bd, 0x30fc, 0x30b9, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x306f, 0x5e38, 0x306b, 0x20, 0x55, 0x54, 0x46, 0x2d, 0x38, 0xFF08, 0x42, 0x4f, 0x4d, 0x20, 0x306a, 0x3057, 0xFF09, 0x3067, 0x66f8, 0x304f)}
globs: **/*.{css,js,mjs,html,json,md}
alwaysApply: true
---

# ${jp(0x6587, 0x5b57, 0x30b3, 0x30fc, 0x30c9, 0xFF08, 0x55, 0x54, 0x46, 0x2d, 0x38, 0xFF09)}

## ${jp(0x5fc5, 0x9808)}

- ${jp(0x65e5, 0x672c, 0x8a9e, 0x306f, 0x20, 0x2a, 0x2a, 0x55, 0x54, 0x46, 0x2d, 0x38, 0xFF08, 0x42, 0x4f, 0x4d, 0x20, 0x306a, 0x3057, 0xFF09, 0x2a, 0x2a, 0x20, 0x3067, 0x3001, 0x2a, 0x2a, 0x65e5, 0x672c, 0x8a9e, 0x6587, 0x5b57, 0x2a, 0x2a, 0x20, 0x3067, 0x66f8, 0x304f, 0xFF08, 0x5c, 0x5c, 0x75, 0x30, 0x30, 0x30, 0x30, 0x306f, 0x4f7f, 0x308f, 0x306a, 0x3044, 0xFF09)}
- ${jp(0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x306f, 0x65e5, 0x672c, 0x8a9e, 0x3067, 0x66f8, 0x304f, 0xFF08, 0x82f1, 0x8a9e, 0x3060, 0x3051, 0x306e, 0x8aac, 0x660e, 0x306b, 0x3057, 0x306a, 0x3044, 0xFF09)}
- ${jp(0x65e5, 0x672c, 0x8a9e, 0x3092, 0x542b, 0x3080, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x306f, 0x20, 0x6e, 0x6f, 0x64, 0x65, 0x20, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x73, 0x2f, 0x66, 0x69, 0x78, 0x2d, 0x61, 0x6c, 0x6c, 0x2d, 0x65, 0x6e, 0x63, 0x6f, 0x64, 0x69, 0x6e, 0x67, 0x2e, 0x6d, 0x6a, 0x73, 0x20, 0x3067, 0x751f, 0x6210, 0x30fb, 0x4fee, 0x5fa9, 0x3059, 0x308b, 0xFF08, 0x43, 0x75, 0x72, 0x73, 0x6f, 0x72, 0x20, 0x57, 0x72, 0x69, 0x74, 0x65, 0x20, 0x3067, 0x65e5, 0x672c, 0x8a9e, 0x76f4, 0x66f8, 0x304d, 0x7981, 0x6b62, 0xFF09)}
- PowerShell ${jp(0x306e, 0x20, 0x4f, 0x75, 0x74, 0x2d, 0x46, 0x69, 0x6c, 0x65, 0x20, 0x3084, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x3e, 0x3e, 0x20, 0x3067, 0x30bd, 0x30fc, 0x30b9, 0x3092, 0x66f8, 0x304b, 0x306a, 0x3044)}

## ${jp(0x7981, 0x6b62)}

- Shift_JIS / CP932 ${jp(0x3068, 0x3057, 0x3066, 0x4fdd, 0x5b58, 0x3057, 0x305f, 0x30d5, 0x30a1, 0x30a4, 0x30eb)}
- ${jp(0x6587, 0x5b57, 0x5316, 0x3051, 0x3057, 0x305f, 0x30b3, 0x30e1, 0x30f3, 0x30c8, 0xFF08, 0x7e5d, 0x7e3a, 0x306a, 0x3069, 0xFF09, 0x3092, 0x653e, 0x7f6e, 0x3057, 0x306a, 0x3044)}
- ${jp(0x65e5, 0x672c, 0x8a9e, 0x6587, 0x5b57, 0x3092, 0x20, 0x5c, 0x5c, 0x75, 0x58, 0x58, 0x58, 0x58, 0x20, 0x5f6f, 0x5f0f, 0x3067, 0x8a18, 0x8ff0, 0xFF08, 0x6570, 0x5b66, 0x30fb, 0x8a18, 0x53f7, 0x306e, 0x20, 0x5c, 0x5c, 0x75, 0x32, 0x32, 0x31, 0x32, 0x20, 0x306f, 0x9664, 0x5916, 0x53EF, 0xFF09)}

## ${jp(0x4fdd, 0x5b58, 0x524d)}

- \`node scripts/check-encoding.mjs\` ${jp(0x304c, 0x901a, 0x308b, 0x3053, 0x3068)}
- \`node build.mjs\` ${jp(0x306e, 0x524d, 0x306b, 0x3053, 0x306e, 0x30c1, 0x30a7, 0x30c3, 0x30af, 0x304c, 0x8d70, 0x308b)}
- ${jp(0x4fee, 0x5fa9, 0x306f, 0x20, 0x6e, 0x6f, 0x64, 0x65, 0x20, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x73, 0x2f, 0x66, 0x69, 0x78, 0x2d, 0x61, 0x6c, 0x6c, 0x2d, 0x65, 0x6e, 0x63, 0x6f, 0x64, 0x69, 0x6e, 0x67, 0x2e, 0x6d, 0x6a, 0x73, 0x20, 0x3092, 0x5b9f, 0x884c)}

## PowerShell ${jp(0x3067, 0x3069, 0x3046, 0x3057, 0x3066, 0x3082, 0x8aa, 0x8aad, 0x307f, 0x8fbc, 0x3057, 0x305f, 0x3044, 0x5834, 0x5408)}

\`\`\`powershell
[System.IO.File]::ReadAllText($path, [Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))
\`\`\`
`;
  writeFileSync(resolve(repoRoot, '.cursor/rules/utf8-encoding.mdc'), rule, { encoding: 'utf8' });
  console.log('Wrote .cursor/rules/utf8-encoding.mdc');
}
