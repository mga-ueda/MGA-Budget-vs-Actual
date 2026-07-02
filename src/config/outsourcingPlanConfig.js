import { normalizeAmount, emptyMonthly } from './planAmountUtils.js';

const OUTSOURCING_PLAN_STORAGE_KEY = 'mga-outsourcing-plans';

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

function getPeriodExcludedKeys(plans, fiscalPeriod) {
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
  const excluded = getPeriodExcludedKeys(plans, fiscalPeriod);
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
  const excludedKeys = getPeriodExcludedKeys(plans, fiscalPeriod);
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

/** 参照期の取引先一覧を、未登録分だけ対象期に追加する（金額は空） */
export function syncVendorListFromReference(plans, targetPeriod, referencePeriod, fiscalMonths) {
  const refVendors = getPeriodVendorEntries(plans, referencePeriod, fiscalMonths);
  const targetVendors = getPeriodVendorEntries(plans, targetPeriod, fiscalMonths);
  const targetKeys = new Set(
    targetVendors.map((v) => `${v.accountLabel}\x00${v.subLabel}`),
  );
  const targetExcluded = getPeriodExcludedKeys(plans, targetPeriod);
  let changed = false;
  const next = [...targetVendors];
  for (const ref of refVendors) {
    const key = `${ref.accountLabel}\x00${ref.subLabel}`;
    if (targetKeys.has(key) || targetExcluded.has(key)) continue;
    targetKeys.add(key);
    const vendor = normalizeVendorEntry({
      accountLabel: ref.accountLabel,
      subLabel: ref.subLabel,
      monthly: {},
    }, fiscalMonths);
    if (vendor) {
      next.push(vendor);
      changed = true;
    }
  }
  if (!changed) return plans;
  return setPeriodVendorEntries(plans, targetPeriod, next, fiscalMonths);
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
