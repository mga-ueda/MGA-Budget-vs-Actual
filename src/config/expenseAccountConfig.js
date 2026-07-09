/**
 * 諸経費セクションで常時表示する勘定科目一覧（仕訳がなくても 0円で表示）。
 * 科目名は仕訳 CSVの表記を優先（scripts/scan-expense-accounts.mjs）。
 * 実行時の一覧は仕訳定義設定（journalDefinitionConfig）を参照します。
 */
import {
  DEFAULT_JOURNAL_DEFINITION,
  getJournalDefinition,
  isExpenseSectionDisplayAccount,
} from './journalDefinitionConfig.js';

export const EXPENSE_SECTION_ACCOUNTS = DEFAULT_JOURNAL_DEFINITION.expenseSectionAccounts;

/** 実行時の諸経費常時表示一覧 */
export function getExpenseSectionAccounts() {
  return getJournalDefinition().expenseSectionAccounts;
}

/** 表記差を正し、一覧の表記に寄せる */
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

/** 諸経費セクションの常時表示一覧に含まれる勘定か */
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

/** 仕訳と一覧をマージする（一覧外は末尾に出力） */
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
