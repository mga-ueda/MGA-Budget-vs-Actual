import { calcTaxInclusiveFromTaxExclusiveAmount } from './consumptionTaxRateConfig.js';

const REVENUE_PLAN_STORAGE_KEY = 'mga-revenue-plans';
const REVENUE_PLAN_SETTINGS_STORAGE_KEY = 'mga-revenue-plan-settings';

export const DEFAULT_REVENUE_PLAN_YEARS = 3;
const MIN_REVENUE_PLAN_YEARS = 1;
const MAX_REVENUE_PLAN_YEARS = 30;

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function emptyMonthly(fiscalMonths) {
  const monthly = {};
  for (const month of fiscalMonths) monthly[month] = null;
  return monthly;
}

export function parseManMonthInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

export function formatManMonths(value) {
  if (value === null || value === undefined || value === 0) return '';
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

export function cloneClientMonthly(source, fiscalMonths) {
  const next = {};
  for (const month of fiscalMonths) next[month] = source?.[month] ?? null;
  return next;
}

export function applyManMonthsFromMonthForward(source, startMonth, amount, pastMonths, fiscalMonths) {
  const next = cloneClientMonthly(source, fiscalMonths);
  const startIndex = fiscalMonths.indexOf(startMonth);
  if (startIndex < 0) return next;
  next[startMonth] = amount;
  for (let i = startIndex + 1; i < fiscalMonths.length; i += 1) {
    const month = fiscalMonths[i];
    if (pastMonths.has(month)) continue;
    next[month] = amount;
  }
  return next;
}

export function clientHasManMonthPlan(client, fiscalMonths) {
  return Boolean(
    client?.manMonths
    && fiscalMonths.some((m) => client.manMonths[m] != null && client.manMonths[m] !== 0),
  );
}

export function getEffectiveUnitPrice(client, month) {
  const override = client.monthlyUnitPrice?.[month];
  if (override != null) return override;
  return client.defaultUnitPrice ?? null;
}

function parseFiscalMonthNumber(monthLabel, fiscalEndMonth) {
  if (monthLabel === '決算整理') return fiscalEndMonth;
  const m = String(monthLabel).match(new RegExp('^(\\d{1,2})月$'));
  return m ? parseInt(m[1], 10) : null;
}

function applyConsumptionTaxToMonthlyAmount(
  taxExclusiveAmount,
  monthLabel,
  taxOptions,
) {
  if (taxExclusiveAmount == null || taxExclusiveAmount === 0) return taxExclusiveAmount;
  if (!taxOptions?.consumptionTaxRates || !taxOptions?.monthYearMap) {
    return taxExclusiveAmount;
  }
  const calendarYear = taxOptions.monthYearMap[monthLabel];
  const calendarMonth = parseFiscalMonthNumber(monthLabel, taxOptions.fiscalEndMonth);
  if (calendarYear == null || calendarMonth == null) return taxExclusiveAmount;
  return calcTaxInclusiveFromTaxExclusiveAmount(
    taxExclusiveAmount,
    calendarYear,
    calendarMonth,
    taxOptions.consumptionTaxRates,
  );
}

export function computeClientMonthlyRevenue(client, fiscalMonths, taxOptions = null) {
  const monthly = emptyMonthly(fiscalMonths);
  const hasManMonthPlan = client.manMonths
    && fiscalMonths.some((m) => client.manMonths[m] != null && client.manMonths[m] !== 0);

  if (hasManMonthPlan) {
    for (const month of fiscalMonths) {
      const mm = client.manMonths[month];
      if (mm == null || mm === 0) continue;
      const price = getEffectiveUnitPrice(client, month);
      if (price == null || price === 0) continue;
      const taxExclusive = Math.round(mm * price);
      monthly[month] = applyConsumptionTaxToMonthlyAmount(taxExclusive, month, taxOptions);
    }
    return monthly;
  }

  if (client.monthly && typeof client.monthly === 'object') {
    for (const month of fiscalMonths) {
      const amount = normalizeAmount(client.monthly[month]);
      monthly[month] = applyConsumptionTaxToMonthlyAmount(amount, month, taxOptions);
    }
  }
  return monthly;
}

export function createClientId(accountLabel, subLabel) {
  const base = `${accountLabel}|${subLabel}`;
  return `rev-c-${encodeURIComponent(base).replace(/%/g, '_')}`;
}

export function normalizeClientEntry(entry, fiscalMonths) {
  if (!entry || typeof entry !== 'object') return null;
  const accountLabel = String(entry.accountLabel ?? '').trim();
  const subLabel = String(entry.subLabel ?? '').trim();
  if (!accountLabel || !subLabel) return null;
  const id = String(entry.id ?? '').trim() || createClientId(accountLabel, subLabel);

  const manMonths = emptyMonthly(fiscalMonths);
  if (entry.manMonths && typeof entry.manMonths === 'object') {
    for (const month of fiscalMonths) {
      manMonths[month] = normalizeAmount(entry.manMonths[month]);
    }
  }

  const monthlyUnitPrice = emptyMonthly(fiscalMonths);
  if (entry.monthlyUnitPrice && typeof entry.monthlyUnitPrice === 'object') {
    for (const month of fiscalMonths) {
      monthlyUnitPrice[month] = normalizeAmount(entry.monthlyUnitPrice[month]);
    }
  }

  const defaultUnitPrice = normalizeAmount(entry.defaultUnitPrice);

  const result = {
    id,
    accountLabel,
    subLabel,
    defaultUnitPrice,
    manMonths,
    monthlyUnitPrice,
  };
  if (entry.manual) result.manual = true;

  result.monthly = computeClientMonthlyRevenue(result, fiscalMonths);
  return result;
}

export function loadRevenuePlans() {
  try {
    const raw = localStorage.getItem(REVENUE_PLAN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRevenuePlans(plans) {
  localStorage.setItem(REVENUE_PLAN_STORAGE_KEY, JSON.stringify(plans));
  return plans;
}

export function normalizeRevenuePlanYears(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_REVENUE_PLAN_YEARS;
  return Math.min(MAX_REVENUE_PLAN_YEARS, Math.max(MIN_REVENUE_PLAN_YEARS, n));
}

export function loadRevenuePlanSettings() {
  try {
    const raw = localStorage.getItem(REVENUE_PLAN_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRevenuePlanSettings(settings) {
  localStorage.setItem(REVENUE_PLAN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export function getRevenuePlanYears(settings) {
  return normalizeRevenuePlanYears(settings?.planYears ?? DEFAULT_REVENUE_PLAN_YEARS);
}

export function setRevenuePlanYears(settings, planYears) {
  return saveRevenuePlanSettings({
    ...settings,
    planYears: normalizeRevenuePlanYears(planYears),
  });
}

export function buildRevenuePlanPeriodEntries(currentPeriod, planYears) {
  const years = normalizeRevenuePlanYears(planYears);
  const entries = [];
  for (let i = 0; i < years; i += 1) {
    const period = currentPeriod + i;
    let label;
    if (i === 0) label = '\u4eca\u671f';
    else if (i === 1) label = '\u6765\u671f';
    else label = `\u7b2c${i + 1}\u671f`;
    entries.push({ period, label });
  }
  return entries;
}

export function getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const raw = plans[periodKey];
  if (!raw || typeof raw !== 'object') return [];
  const entries = Array.isArray(raw.clients) ? raw.clients : Object.values(raw);
  const normalized = entries.map((e) => normalizeClientEntry(e, fiscalMonths)).filter(Boolean);
  const seen = new Set();
  const deduped = normalized.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  const clientOrder = Array.isArray(raw.clientOrder) ? raw.clientOrder : null;
  if (!clientOrder?.length) return deduped;

  const byId = new Map(deduped.map((entry) => [entry.id, entry]));
  const ordered = [];
  const placed = new Set();
  for (const id of clientOrder) {
    const entry = byId.get(id);
    if (!entry || placed.has(id)) continue;
    ordered.push(entry);
    placed.add(id);
  }
  for (const entry of deduped) {
    if (placed.has(entry.id)) continue;
    ordered.push(entry);
  }
  return ordered;
}

export function setPeriodClientEntries(plans, fiscalPeriod, clients, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const prev = plans[periodKey] ?? {};
  const normalized = clients
    .map((e) => normalizeClientEntry(e, fiscalMonths))
    .filter(Boolean);
  return saveRevenuePlans({
    ...plans,
    [periodKey]: {
      ...prev,
      clients: normalized,
      clientOrder: normalized.map((entry) => entry.id),
    },
  });
}

function clientEntryKey(accountLabel, subLabel) {
  return `${accountLabel}\x00${subLabel}`;
}

function getPeriodExcludedKeys(plans, fiscalPeriod) {
  const periodKey = String(fiscalPeriod);
  const raw = plans[periodKey];
  if (!raw || typeof raw !== 'object') return new Set();
  const keys = Array.isArray(raw.excludedKeys) ? raw.excludedKeys : [];
  return new Set(keys);
}

function addExcludedClientKey(plans, fiscalPeriod, accountLabel, subLabel) {
  const account = String(accountLabel ?? '').trim();
  const sub = String(subLabel ?? '').trim();
  if (!account || !sub) return plans;
  const key = clientEntryKey(account, sub);
  const excluded = getPeriodExcludedKeys(plans, fiscalPeriod);
  if (excluded.has(key)) return plans;
  excluded.add(key);
  const periodKey = String(fiscalPeriod);
  const prev = plans[periodKey] ?? {};
  return saveRevenuePlans({
    ...plans,
    [periodKey]: {
      ...prev,
      excludedKeys: [...excluded],
    },
  });
}

export function getClientEntry(plans, fiscalPeriod, clientId, fiscalMonths) {
  const entries = getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths);
  return entries.find((e) => e.id === clientId) ?? null;
}

export function setClientEntry(plans, fiscalPeriod, entry, fiscalMonths) {
  const normalized = normalizeClientEntry(entry, fiscalMonths);
  if (!normalized) return plans;
  const entries = getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths);
  const idx = entries.findIndex((e) => e.id === normalized.id);
  const next = [...entries];
  if (idx >= 0) next[idx] = normalized;
  else next.push(normalized);
  return setPeriodClientEntries(plans, fiscalPeriod, next, fiscalMonths);
}

export function removeClientEntry(plans, fiscalPeriod, clientId, fiscalMonths) {
  const entries = getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths);
  const removed = entries.find((e) => e.id === clientId);
  let next = setPeriodClientEntries(
    plans,
    fiscalPeriod,
    entries.filter((e) => e.id !== clientId),
    fiscalMonths,
  );
  if (removed) {
    next = addExcludedClientKey(
      next,
      fiscalPeriod,
      removed.accountLabel,
      removed.subLabel,
    );
  }
  return next;
}

export function moveClientEntry(plans, fiscalPeriod, clientId, direction, fiscalMonths) {
  const delta = direction < 0 ? -1 : 1;
  const entries = getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths);
  const idx = entries.findIndex((e) => e.id === clientId);
  if (idx < 0) return plans;
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= entries.length) return plans;
  const next = [...entries];
  [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
  return setPeriodClientEntries(plans, fiscalPeriod, next, fiscalMonths);
}

export function renameManualClientEntry(plans, fiscalPeriod, clientId, newSubLabel, fiscalMonths) {
  const sub = String(newSubLabel ?? '').trim();
  if (!sub) return { plans, ok: false, reason: 'empty' };
  const sourceEntries = getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths);
  const client = sourceEntries.find((e) => e.id === clientId);
  if (!client?.manual) return { plans, ok: false, reason: 'not_manual' };

  const oldSub = client.subLabel;
  const oldId = client.id;
  const newId = createClientId(client.accountLabel, sub);

  function isSameManualClient(entry) {
    if (!entry?.manual) return false;
    return entry.id === oldId
      || (entry.accountLabel === client.accountLabel && entry.subLabel === oldSub);
  }

  for (const periodKey of Object.keys(plans)) {
    const period = Number(periodKey);
    if (!Number.isFinite(period)) continue;
    const entries = getPeriodClientEntries(plans, period, fiscalMonths);
    const duplicate = entries.some(
      (e) => !isSameManualClient(e)
        && e.accountLabel === client.accountLabel
        && e.subLabel === sub,
    );
    if (duplicate) return { plans, ok: false, reason: 'duplicate' };
  }

  let nextPlans = plans;
  let renamedEntry = null;
  for (const periodKey of Object.keys(nextPlans)) {
    const period = Number(periodKey);
    if (!Number.isFinite(period)) continue;
    const raw = nextPlans[periodKey];
    if (!raw || typeof raw !== 'object') continue;

    const entries = getPeriodClientEntries(nextPlans, period, fiscalMonths);
    let changed = false;
    const updatedEntries = entries.map((entry) => {
      if (!isSameManualClient(entry)) return entry;
      changed = true;
      const nextEntry = normalizeClientEntry({
        ...entry,
        subLabel: sub,
        id: newId,
        manual: true,
      }, fiscalMonths);
      if (period === fiscalPeriod) renamedEntry = nextEntry;
      return nextEntry;
    });
    if (!changed) continue;
    nextPlans = setPeriodClientEntries(nextPlans, period, updatedEntries, fiscalMonths);
  }

  if (!renamedEntry) {
    renamedEntry = normalizeClientEntry({
      ...client,
      subLabel: sub,
      id: newId,
    }, fiscalMonths);
  }

  return {
    plans: nextPlans,
    ok: true,
    entry: renamedEntry,
  };
}

export function createManualClient({ accountLabel, subLabel }) {
  const account = String(accountLabel ?? '').trim();
  const sub = String(subLabel ?? '').trim();
  if (!account || !sub) return null;
  return {
    id: createClientId(account, sub),
    accountLabel: account,
    subLabel: sub,
    manMonths: {},
    monthlyUnitPrice: {},
    manual: true,
  };
}

/** 補助科目一覧から未登録の受注先だけ計画に追加する（金額は空のまま） */
export function mergeClientsFromSubaccounts(plans, fiscalPeriod, subaccounts, fiscalMonths) {
  if (!Array.isArray(subaccounts) || subaccounts.length === 0) return plans;
  const entries = getPeriodClientEntries(plans, fiscalPeriod, fiscalMonths);
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
    const client = normalizeClientEntry({
      accountLabel: account,
      subLabel: sub,
      manMonths: {},
      monthlyUnitPrice: {},
    }, fiscalMonths);
    if (client) {
      next.push(client);
      changed = true;
    }
  }
  if (!changed) return plans;
  return setPeriodClientEntries(plans, fiscalPeriod, next, fiscalMonths);
}

/** 参照期の受注先一覧を、未登録分だけ対象期に追加する（金額は空） */
export function syncClientListFromReference(plans, targetPeriod, referencePeriod, fiscalMonths) {
  const refClients = getPeriodClientEntries(plans, referencePeriod, fiscalMonths);
  const targetClients = getPeriodClientEntries(plans, targetPeriod, fiscalMonths);
  const targetKeys = new Set(
    targetClients.map((v) => `${v.accountLabel}\x00${v.subLabel}`),
  );
  const targetExcluded = getPeriodExcludedKeys(plans, targetPeriod);
  let changed = false;
  const next = [...targetClients];
  for (const ref of refClients) {
    const key = `${ref.accountLabel}\x00${ref.subLabel}`;
    if (targetKeys.has(key) || targetExcluded.has(key)) continue;
    targetKeys.add(key);
    const client = normalizeClientEntry({
      accountLabel: ref.accountLabel,
      subLabel: ref.subLabel,
      manMonths: {},
      monthlyUnitPrice: {},
    }, fiscalMonths);
    if (client) {
      next.push(client);
      changed = true;
    }
  }
  if (!changed) return plans;
  return setPeriodClientEntries(plans, targetPeriod, next, fiscalMonths);
}

export function computeClientPlanTotal(entry, fiscalMonths) {
  const monthly = computeClientMonthlyRevenue(entry, fiscalMonths);
  let total = 0;
  for (const month of fiscalMonths) {
    total += monthly[month] ?? 0;
  }
  return total;
}

export function computeRevenuePlanMonthlyTotals(clients, fiscalMonths) {
  const totals = emptyMonthly(fiscalMonths);
  for (const client of clients) {
    const monthly = computeClientMonthlyRevenue(client, fiscalMonths);
    for (const month of fiscalMonths) {
      totals[month] = (totals[month] ?? 0) + (monthly[month] ?? 0);
    }
  }
  return totals;
}

export function sumClientMonthlyTotal(entry, fiscalMonths) {
  return computeClientPlanTotal(entry, fiscalMonths);
}
export const MISC_INCOME_ACCOUNT = '雑収入';

/** 雑収入計画の対象期間（今期・来期） */
export function buildMiscIncomePlanPeriodEntries(currentPeriod) {
  return [
    { period: currentPeriod, label: '今期' },
    { period: currentPeriod + 1, label: '来期' },
  ];
}

function normalizeMiscIncomeMonthly(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan && typeof plan === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan[month]);
    }
  }
  return monthly;
}

export function getMiscIncomeMonthly(plans, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const raw = plans[periodKey]?.miscIncome;
  return normalizeMiscIncomeMonthly(raw, fiscalMonths);
}

export function setMiscIncomeMonthly(plans, fiscalPeriod, monthly, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const prev = plans[periodKey] ?? {};
  return saveRevenuePlans({
    ...plans,
    [periodKey]: {
      ...prev,
      miscIncome: normalizeMiscIncomeMonthly(monthly, fiscalMonths),
    },
  });
}

export function miscIncomeHasPlanValues(monthly, fiscalMonths) {
  return fiscalMonths.some((month) => (monthly[month] ?? 0) !== 0);
}
