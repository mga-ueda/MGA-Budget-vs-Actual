/** patch-expense-config.mjs (fromCodePoint generator) */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(repoRoot, 'src/config/expenseAccountConfig.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function sq(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const DEFAULT_ACCOUNTS = [
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

const accounts = DEFAULT_ACCOUNTS;
const accountLines = accounts.map((name) => `  ${sq(name)},`).join('\n');

const content = `/**
 * ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x3067, 0x5e38, 0x6642, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x4e00, 0x89a7, 0xFF08, 0x4ed5, 0x8a33, 0x304c, 0x306a, 0x304f, 0x3066, 0x3082, 0x20, 0x30, 0x5186, 0x3067, 0x8868, 0x793a, 0xFF09, 0x3002)}
 * ${jp(0x79d1, 0x76ee, 0x540d, 0x306f, 0x4ed5, 0x8a33, 0x20, 0x43, 0x53, 0x56, 0x306e, 0x8868, 0x8a18, 0x3092, 0x512a, 0x5148, 0xFF08, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x73, 0x2f, 0x73, 0x63, 0x61, 0x6e, 0x2d, 0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x2d, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x73, 0x2e, 0x6d, 0x6a, 0x73, 0xFF09, 0x3002)}
 */
export const EXPENSE_SECTION_ACCOUNTS = [
${accountLines}
];

const EXPENSE_SECTION_ACCOUNT_SET = new Set(EXPENSE_SECTION_ACCOUNTS);

/** ${jp(0x8868, 0x8a18, 0x5dee, 0x3092, 0x6b63, 0x3057, 0x3001, 0x4e00, 0x89a7, 0x306e, 0x8868, 0x8a18, 0x306b, 0x5bc4, 0x305b, 0x308b)} */
export function canonicalExpenseAccount(account) {
  if (!account) return account;
  if (EXPENSE_SECTION_ACCOUNT_SET.has(account)) return account;
  const normalized = account.normalize('NFKC');
  for (const canonical of EXPENSE_SECTION_ACCOUNTS) {
    if (canonical.normalize('NFKC') === normalized) return canonical;
  }
  return account;
}

/** ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306e, 0x5e38, 0x6642, 0x8868, 0x793a, 0x4e00, 0x89a7, 0x306b, 0x542b, 0x307e, 0x308c, 0x308b, 0x52d8, 0x5b9a, 0x304b)} */
export function isKnownExpenseSectionAccount(account) {
  return EXPENSE_SECTION_ACCOUNT_SET.has(canonicalExpenseAccount(account));
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
  const journalByAccount = new Map();
  for (const item of journalItems) {
    const account = canonicalExpenseAccount(item.account);
    const normalized = { ...item, account };
    if (!journalByAccount.has(account)) journalByAccount.set(account, []);
    journalByAccount.get(account).push(normalized);
  }

  const merged = [];

  for (const account of EXPENSE_SECTION_ACCOUNTS) {
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
    if (EXPENSE_SECTION_ACCOUNT_SET.has(account)) continue;
    merged.push({ ...item, account });
  }

  return merged;
}
`;

writeFileSync(configPath, content, { encoding: 'utf8' });
console.log('Wrote', configPath);
