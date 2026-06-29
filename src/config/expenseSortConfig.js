import { EXPENSE_SECTION_ACCOUNTS } from './expenseAccountConfig.js';

const EXPENSE_SORT_STORAGE_KEY = 'mga-expense-sort-order';

/** 諸経費の並び順（数値が小さいほど上）。未設定時は EXPENSE_SECTION_ACCOUNTSの順序 */
export const DEFAULT_EXPENSE_SORT_ORDER = Object.fromEntries(
  EXPENSE_SECTION_ACCOUNTS.map((account, index) => [account, index + 1]),
);

export const DEFAULT_EXPENSE_ACCOUNT_ORDER = [...EXPENSE_SECTION_ACCOUNTS];

const UNKNOWN_ACCOUNT_SORT_BASE = DEFAULT_EXPENSE_ACCOUNT_ORDER.length + 1000;

export function expenseSortConfigKey(account) {
  return `expense|sort|${account}`;
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

/** 諸経費セクションの行を勘定科目ブロック単位で並び替える */
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
