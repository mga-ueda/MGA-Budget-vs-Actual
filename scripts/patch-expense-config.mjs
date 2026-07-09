/** patch-expense-config.mjs (fromCodePoint generator) */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(repoRoot, 'src/config/expenseAccountConfig.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const content = `/**
 * ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x3067, 0x5e38, 0x6642, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x4e00, 0x89a7, 0xFF08, 0x4ed5, 0x8a33, 0x304c, 0x306a, 0x304f, 0x3066, 0x3082, 0x20, 0x30, 0x5186, 0x3067, 0x8868, 0x793a, 0xFF09, 0x3002)}
 * ${jp(0x79d1, 0x76ee, 0x540d, 0x306f, 0x4ed5, 0x8a33, 0x20, 0x43, 0x53, 0x56, 0x306e, 0x8868, 0x8a18, 0x3092, 0x512a, 0x5148, 0xFF08, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x73, 0x2f, 0x73, 0x63, 0x61, 0x6e, 0x2d, 0x65, 0x78, 0x70, 0x65, 0x6e, 0x73, 0x65, 0x2d, 0x61, 0x63, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x73, 0x2e, 0x6d, 0x6a, 0x73, 0xFF09, 0x3002)}
 * ${jp(0x5b9f, 0x884c, 0x6642, 0x306e, 0x4e00, 0x89a7, 0x306f, 0x4ed5, 0x8a33, 0x5b9a, 0x7fa9, 0x8a2d, 0x5b9a, 0xFF08, 0x6a, 0x6f, 0x75, 0x72, 0x6e, 0x61, 0x6c, 0x44, 0x65, 0x66, 0x69, 0x6e, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0xFF09, 0x3092, 0x53c2, 0x7167, 0x3057, 0x307e, 0x3059, 0x3002)}
 */
import {
  DEFAULT_JOURNAL_DEFINITION,
  getJournalDefinition,
  isExpenseSectionDisplayAccount,
} from './journalDefinitionConfig.js';

export const EXPENSE_SECTION_ACCOUNTS = DEFAULT_JOURNAL_DEFINITION.expenseSectionAccounts;

/** ${jp(0x5b9f, 0x884c, 0x6642, 0x306e, 0x8af8, 0x7d4c, 0x8cbb, 0x5e38, 0x6642, 0x8868, 0x793a, 0x4e00, 0x89a7)} */
export function getExpenseSectionAccounts() {
  return getJournalDefinition().expenseSectionAccounts;
}

/** ${jp(0x8868, 0x8a18, 0x5dee, 0x3092, 0x6b63, 0x3057, 0x3001, 0x4e00, 0x89a7, 0x306e, 0x8868, 0x8a18, 0x306b, 0x5bc4, 0x305b, 0x308b)} */
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
    if (!isExpenseSectionDisplayAccount(account)) continue;
    merged.push({ ...item, account });
  }

  return merged;
}
`;

writeFileSync(configPath, content, { encoding: 'utf8' });
console.log('Wrote', configPath);
