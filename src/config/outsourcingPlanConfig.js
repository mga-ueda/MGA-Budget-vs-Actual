import { normalizeAmount, emptyMonthly } from './planAmountUtils.js';

const OUTSOURCING_PLAN_STORAGE_KEY = 'mga-outsourcing-plans';
const OUTSOURCING_PLAN_SETTINGS_STORAGE_KEY = 'mga-outsourcing-plan-settings';
export const DEFAULT_OUTSOURCING_PLAN_YEARS = 3;
const MIN_OUTSOURCING_PLAN_YEARS = 1;
const MAX_OUTSOURCING_PLAN_YEARS = 30;

export function createVendorId(accountLabel, subLabel) {
  const base = `${accountLabel}|${subLabel}`;
  return `out-v-${encodeURIComponent(base).replace(/%/g, '_')}`;
}

export function normalizeVendorEntry(entry, fiscalMonths) {
  if (!entry || typeof entry !== 'object') return null;
  const accountLabel = String(entry.accountLabel ?? '').trim();
  const subLabel = String(entry.subLabel ?? '').trim();
  if (!accountLabel || !subLabel) return null;
  const id = String(entry.id ?? '').trim() || createVendorId(accountLabel, subLabel);
  const monthly = emptyMonthly(fiscalMonths);
  if (entry.monthly && typeof entry.monthly === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(entry.monthly[month]);
    }
  }
  const result = { id, accountLabel, subLabel, monthly };
  if (entry.manual) result.manual = true;
  return result;
}

export function loadOutsourcingPlans() {
  try {
    const raw = localStorage.getItem(OUTSOURCING_PLAN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOutsourcingPlans(plans) {
  localStorage.setItem(OUTSOURCING_PLAN_STORAGE_KEY, JSON.stringify(plans));
  return plans;
}

/** 受注計画と同様、今期を含む計画年数（デフォルト 3 年） */
export function normalizeOutsourcingPlanYears(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_OUTSOURCING_PLAN_YEARS;
  return Math.min(MAX_OUTSOURCING_PLAN_YEARS, Math.max(MIN_OUTSOURCING_PLAN_YEARS, n));
}

export function loadOutsourcingPlanSettings() {
  try {
    const raw = localStorage.getItem(OUTSOURCING_PLAN_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOutsourcingPlanSettings(settings) {
  localStorage.setItem(OUTSOURCING_PLAN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export function getOutsourcingPlanYears(settings) {
  return normalizeOutsourcingPlanYears(settings?.planYears ?? DEFAULT_OUTSOURCING_PLAN_YEARS);
}

export function setOutsourcingPlanYears(settings, planYears) {
  return saveOutsourcingPlanSettings({
    ...settings,
    planYears: normalizeOutsourcingPlanYears(planYears),
  });
}

export function buildOutsourcingPlanPeriodEntries(currentPeriod, planYears) {
  const years = normalizeOutsourcingPlanYears(planYears);
  const entries = [];
  for (let i = 0; i < years; i += 1) {
    entries.push({ period: currentPeriod + i });
  }
  return entries;
}


export function getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const raw = plans[periodKey];
  if (!raw || typeof raw !== 'object') return [];
  const entries = Array.isArray(raw.vendors) ? raw.vendors : Object.values(raw);
  const normalized = entries.map((e) => normalizeVendorEntry(e, fiscalMonths)).filter(Boolean);
  const seen = new Set();
  return normalized.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

export function setPeriodVendorEntries(plans, fiscalPeriod, vendors, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const prev = plans[periodKey] ?? {};
  const normalized = vendors
    .map((e) => normalizeVendorEntry(e, fiscalMonths))
    .filter(Boolean);
  return saveOutsourcingPlans({
    ...plans,
    [periodKey]: {
      ...prev,
      vendors: normalized,
    },
  });
}

function vendorEntryKey(accountLabel, subLabel) {
  return `${accountLabel}\x00${subLabel}`;
}

function outGetPeriodExcludedKeys(plans, fiscalPeriod) {
  const periodKey = String(fiscalPeriod);
  const raw = plans[periodKey];
  if (!raw || typeof raw !== 'object') return new Set();
  const keys = Array.isArray(raw.excludedKeys) ? raw.excludedKeys : [];
  return new Set(keys);
}

function addExcludedVendorKey(plans, fiscalPeriod, accountLabel, subLabel) {
  const account = String(accountLabel ?? '').trim();
  const sub = String(subLabel ?? '').trim();
  if (!account || !sub) return plans;
  const key = vendorEntryKey(account, sub);
  const excluded = outGetPeriodExcludedKeys(plans, fiscalPeriod);
  if (excluded.has(key)) return plans;
  excluded.add(key);
  const periodKey = String(fiscalPeriod);
  const prev = plans[periodKey] ?? {};
  return saveOutsourcingPlans({
    ...plans,
    [periodKey]: {
      ...prev,
      excludedKeys: [...excluded],
    },
  });
}

export function getVendorEntry(plans, fiscalPeriod, vendorId, fiscalMonths) {
  const entries = getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths);
  return entries.find((e) => e.id === vendorId) ?? null;
}

export function setVendorEntry(plans, fiscalPeriod, entry, fiscalMonths) {
  const normalized = normalizeVendorEntry(entry, fiscalMonths);
  if (!normalized) return plans;
  const entries = getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths);
  const idx = entries.findIndex((e) => e.id === normalized.id);
  const next = [...entries];
  if (idx >= 0) next[idx] = normalized;
  else next.push(normalized);
  return setPeriodVendorEntries(plans, fiscalPeriod, next, fiscalMonths);
}

export function removeVendorEntry(plans, fiscalPeriod, vendorId, fiscalMonths) {
  const entries = getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths);
  const removed = entries.find((e) => e.id === vendorId);
  let next = setPeriodVendorEntries(
    plans,
    fiscalPeriod,
    entries.filter((e) => e.id !== vendorId),
    fiscalMonths,
  );
  if (removed) {
    next = addExcludedVendorKey(
      next,
      fiscalPeriod,
      removed.accountLabel,
      removed.subLabel,
    );
  }
  return next;
}

export function createManualVendor({ accountLabel, subLabel }) {
  const account = String(accountLabel ?? '').trim();
  const sub = String(subLabel ?? '').trim();
  if (!account || !sub) return null;
  return {
    id: createVendorId(account, sub),
    accountLabel: account,
    subLabel: sub,
    monthly: {},
    manual: true,
  };
}

/** 補助科目一覧から未登録の取引先だけ計画に追加する（金額は空のまま） */
export function mergeVendorsFromSubaccounts(plans, fiscalPeriod, subaccounts, fiscalMonths) {
  if (!Array.isArray(subaccounts) || subaccounts.length === 0) return plans;
  const entries = getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths);
  const existingKeys = new Set(
    entries.map((e) => `${e.accountLabel}\x00${e.subLabel}`),
  );
  const excludedKeys = outGetPeriodExcludedKeys(plans, fiscalPeriod);
  let changed = false;
  const next = [...entries];
  for (const { accountLabel, subLabel } of subaccounts) {
    const account = String(accountLabel ?? '').trim();
    const sub = String(subLabel ?? '').trim();
    if (!account || !sub || sub === '補助科目なし') continue;
    const key = `${account}\x00${sub}`;
    if (existingKeys.has(key) || excludedKeys.has(key)) continue;
    existingKeys.add(key);
    const vendor = normalizeVendorEntry({
      accountLabel: account,
      subLabel: sub,
      monthly: {},
    }, fiscalMonths);
    if (vendor) {
      next.push(vendor);
      changed = true;
    }
  }
  if (!changed) return plans;
  return setPeriodVendorEntries(plans, fiscalPeriod, next, fiscalMonths);
}

/** 手動追加以外の取引先を対象期から除去する（旧自動同期の名残。金額があっても除去し、再登録防止のため excluded に追加） */
export function purgeEmptyNonManualVendors(plans, fiscalPeriod, fiscalMonths) {
  const entries = getPeriodVendorEntries(plans, fiscalPeriod, fiscalMonths);
  const kept = [];
  let next = plans;
  let changed = false;
  for (const entry of entries) {
    if (entry.manual) {
      kept.push(entry);
      continue;
    }
    changed = true;
    next = addExcludedVendorKey(next, fiscalPeriod, entry.accountLabel, entry.subLabel);
  }
  if (!changed) return plans;
  return setPeriodVendorEntries(next, fiscalPeriod, kept, fiscalMonths);
}

export function computeVendorPlanTotal(entry, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += entry.monthly[month] ?? 0;
  }
  return total;
}

export function computeOutsourcingPlanMonthlyTotals(vendors, fiscalMonths) {
  const totals = emptyMonthly(fiscalMonths);
  for (const vendor of vendors) {
    for (const month of fiscalMonths) {
      totals[month] = (totals[month] ?? 0) + (vendor.monthly[month] ?? 0);
    }
  }
  return totals;
}

export function sumVendorMonthlyTotal(entry, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += entry.monthly[month] ?? 0;
  }
  return total;
}

export function computeOutsourcingIncreaseRate(currentTotal, nextTotal) {
  if (!Number.isFinite(currentTotal) || currentTotal <= 0) return null;
  if (!Number.isFinite(nextTotal)) return null;
  return ((nextTotal - currentTotal) / currentTotal) * 100;
}

export function formatOutsourcingIncreaseRate(ratePercent) {
  if (ratePercent === null || !Number.isFinite(ratePercent)) return '';
  const rounded = Math.round(ratePercent * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%`;
}
