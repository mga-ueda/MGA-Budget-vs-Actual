/**
 * 諸経費セクションで常時表示する勘定科目一覧（仕訳がなくても 0円で表示）。
 * 科目名は仕訳 CSVの表記を優先（scripts/scan-expense-accounts.mjs）。
 */
export const EXPENSE_SECTION_ACCOUNTS = [
  '福利厚生費',
  '荷造運賃',
  '広告費',
  '交際費',
  '旅費交通費',
  '通信費',
  '水道光熱費',
  '修繕費',
  '車両費',
  '賃借料',
  '地代家賃',
  '保険料',
  '支払手数料',
  '会議費',
  '新聞図書費',
  '消耗品費',
  '諸会費',
  '研修費',
  '支払顧問料',
];

const EXPENSE_SECTION_ACCOUNT_SET = new Set(EXPENSE_SECTION_ACCOUNTS);

/** 表記差を正し、一覧の表記に寄せる */
export function canonicalExpenseAccount(account) {
  if (!account) return account;
  if (EXPENSE_SECTION_ACCOUNT_SET.has(account)) return account;
  const normalized = account.normalize('NFKC');
  for (const canonical of EXPENSE_SECTION_ACCOUNTS) {
    if (canonical.normalize('NFKC') === normalized) return canonical;
  }
  return account;
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
