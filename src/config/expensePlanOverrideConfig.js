import { canonicalExpenseAccount, EXPENSE_SECTION_ACCOUNTS } from './expenseAccountConfig.js';
import { formatFiscalPeriodLabel } from './appSettings.js';
import { normalizeAmount, emptyMonthly } from './planAmountUtils.js';

const EXPENSE_PLAN_OVERRIDE_STORAGE_KEY = 'mga-expense-plan-overrides';

export function normalizeExpenseOverrideMonthly(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan && typeof plan === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan[month]);
    }
  }
  return monthly;
}

export function loadExpensePlanOverrides() {
  try {
    const raw = localStorage.getItem(EXPENSE_PLAN_OVERRIDE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveExpensePlanOverrides(overrides) {
  localStorage.setItem(EXPENSE_PLAN_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  return overrides;
}

/** 支払い計画オーバーライドの対象期間 */
export function buildExpensePlanOverridePeriodEntries(currentPeriod) {
  return [
    { period: currentPeriod, label: formatFiscalPeriodLabel(currentPeriod) },
    { period: currentPeriod + 1, label: formatFiscalPeriodLabel(currentPeriod + 1) },
  ];
}

export function getExpenseOverrideAccounts(overrides, fiscalPeriod) {
  const stored = overrides[String(fiscalPeriod)];
  if (!stored || typeof stored !== 'object') return [];
  return Object.keys(stored).sort((a, b) => a.localeCompare(b, 'ja'));
}

export function getExpenseOverrideMonthly(overrides, fiscalPeriod, account, fiscalMonths) {
  const stored = overrides[String(fiscalPeriod)]?.[account];
  return normalizeExpenseOverrideMonthly(stored, fiscalMonths);
}

export function setExpenseOverrideMonthly(overrides, fiscalPeriod, account, monthly, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const next = { ...overrides };
  if (!next[periodKey]) next[periodKey] = {};
  next[periodKey] = {
    ...next[periodKey],
    [account]: normalizeExpenseOverrideMonthly(monthly, fiscalMonths),
  };
  return saveExpensePlanOverrides(next);
}

export function addExpenseOverrideAccount(overrides, fiscalPeriod, account, fiscalMonths) {
  const canonical = canonicalExpenseAccount(account);
  if (!canonical) return overrides;
  const existing = getExpenseOverrideAccounts(overrides, fiscalPeriod);
  if (existing.includes(canonical)) return overrides;
  return setExpenseOverrideMonthly(
    overrides,
    fiscalPeriod,
    canonical,
    emptyMonthly(fiscalMonths),
    fiscalMonths,
  );
}

export function removeExpenseOverrideAccount(overrides, fiscalPeriod, account) {
  const periodKey = String(fiscalPeriod);
  const stored = overrides[periodKey];
  if (!stored || !stored[account]) return overrides;
  const next = { ...overrides, [periodKey]: { ...stored } };
  delete next[periodKey][account];
  if (Object.keys(next[periodKey]).length === 0) delete next[periodKey];
  return saveExpensePlanOverrides(next);
}

/** オーバーライド対象期間の科目→月次マップ */
export function buildExpenseOverrideMapForPeriod(overrides, fiscalPeriod, fiscalMonths) {
  const map = new Map();
  for (const account of getExpenseOverrideAccounts(overrides, fiscalPeriod)) {
    map.set(account, getExpenseOverrideMonthly(overrides, fiscalPeriod, account, fiscalMonths));
  }
  return map;
}

/** プルダウン用の諸経勘定科目候補 */
export function collectExpenseOverrideAccountCandidates(planData, selectedAccounts = []) {
  const selected = new Set(selectedAccounts);
  const accounts = new Set(EXPENSE_SECTION_ACCOUNTS);
  const expenseSection = planData?.sections?.find((s) => s.id === 'expense');
  if (expenseSection) {
    for (const row of expenseSection.rows) {
      if (row.type === 'total' || row.type === 'plan') continue;
      accounts.add(canonicalExpenseAccount(row.label));
    }
  }
  return [...accounts]
    .filter((account) => !selected.has(account))
    .sort((a, b) => a.localeCompare(b, 'ja'));
}

/** オーバーライドを適用する行を特定 */
export function resolveExpenseOverrideTargetRow(rows, account) {
  const canonical = canonicalExpenseAccount(account);
  const matching = rows.filter((row) => {
    if (row.type === 'total' || row.type === 'plan' || row.type === 'breakdown') return false;
    return canonicalExpenseAccount(row.label) === canonical;
  });
  const leafRows = matching.filter((row) => row.type === 'item' || row.type === 'sub');
  if (leafRows.length === 1) return leafRows[0];
  const groupRow = matching.find((row) => row.type === 'group');
  if (leafRows.length > 1 && groupRow) return groupRow;
  const items = matching.filter((row) => row.type === 'item');
  if (items.length === 1) return items[0];
  return null;
}
