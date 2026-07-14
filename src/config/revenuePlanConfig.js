import {
  calcTaxInclusiveFromTaxExclusiveAmount,
  isAccountingTaxExclusive,
} from './consumptionTaxRateConfig.js';
import { normalizeAmount, emptyMonthly } from './planAmountUtils.js';

const REVENUE_PLAN_STORAGE_KEY = 'mga-revenue-plans';
const REVENUE_PLAN_SETTINGS_STORAGE_KEY = 'mga-revenue-plan-settings';

export const DEFAULT_REVENUE_PLAN_YEARS = 3;
const MIN_REVENUE_PLAN_YEARS = 1;
const MAX_REVENUE_PLAN_YEARS = 30;

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

/** Shift+Enter: 全未入力なら期末まで反映。既入力区間内を編集するとその区間末尾まで。空区間・区間後の未入力月からは、次の既入力まで（なければ期末まで）空月を埋める。0は未入力とみなす。 */
export function hasRevenuePlanInputValue(value) {
  return value != null && value !== 0;
}

/** 受注先の契約月数（売上金額が入っている月を数える。計画・実績の月別金額マップを渡す） */
export function countClientOrderMonths(monthlyRevenue, fiscalMonths) {
  if (!monthlyRevenue) return 0;
  let count = 0;
  for (const month of fiscalMonths) {
    if (hasRevenuePlanInputValue(monthlyRevenue[month])) count += 1;
  }
  return count;
}

/** 年月（例: 2024年 4月。1桁月は削に半角スペース） */
export function formatOrderYearMonth(year, month) {
  if (year == null || month == null) return '';
  const monthText = Number(month) < 10 ? ' ' + String(month) : String(month);
  return String(year) + '年' + monthText + '月';
}

/** 受注先の取引開始・終了年月を表示文字にする */
export function formatClientTradeDateRange(start, end) {
  if (!start || !end) return '';
  const startText = formatOrderYearMonth(start.year, start.month);
  const endText = formatOrderYearMonth(end.year, end.month);
  if (!startText || !endText) return '';
  return startText + '〜' + endText;
}

/** 前後の年月が暦上で連続するか */
export function isConsecutiveCalendarMonth(prev, next) {
  if (!prev || !next) return false;
  const prevIndex = prev.year * 12 + prev.month;
  const nextIndex = next.year * 12 + next.month;
  return nextIndex === prevIndex + 1;
}

/** 売上が入った月を連続区間ごとに分割する（途中が空けば別期間） */
export function splitFilledMonthsIntoTradeRanges(filledMonths) {
  if (!Array.isArray(filledMonths) || filledMonths.length === 0) return [];
  const ranges = [];
  let rangeStart = filledMonths[0];
  let rangeEnd = filledMonths[0];
  for (let i = 1; i < filledMonths.length; i += 1) {
    const cur = filledMonths[i];
    if (isConsecutiveCalendarMonth(rangeEnd, cur)) {
      rangeEnd = cur;
      continue;
    }
    ranges.push({
      start: { year: rangeStart.year, month: rangeStart.month },
      end: { year: rangeEnd.year, month: rangeEnd.month },
    });
    rangeStart = cur;
    rangeEnd = cur;
  }
  ranges.push({
    start: { year: rangeStart.year, month: rangeStart.month },
    end: { year: rangeEnd.year, month: rangeEnd.month },
  });
  return ranges;
}

/** 複数の取引期間を、区切りで連結（改行しない） */
export function formatClientTradeDateRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) return '';
  return ranges
    .map((range) => formatClientTradeDateRange(range.start, range.end))
    .filter(Boolean)
    .join('、');
}

export function applyRevenueMonthlyFromMonthForward(
  source,
  startMonth,
  amount,
  pastMonths,
  fiscalMonths,
  options = {},
) {
  const next = cloneClientMonthly(source, fiscalMonths);
  const startIndex = fiscalMonths.indexOf(startMonth);
  if (startIndex < 0) return next;
  next[startMonth] = amount;

  const isPast = (month) => Boolean(pastMonths?.has?.(month));
  const rangeMaps = Array.isArray(options.rangeMaps) && options.rangeMaps.length > 0
    ? options.rangeMaps
    : [source];
  const hasRangeValue = (month) => rangeMaps.some((map) => hasRevenuePlanInputValue(map?.[month]));

  const hasAnyFilled = fiscalMonths.some((month) => !isPast(month) && hasRangeValue(month));
  const startHadValue = hasRangeValue(startMonth);

  // 全体未入力、または入力月自体が未入力（区間の延長）: 空月を先へ埋める
  if (!hasAnyFilled || !startHadValue) {
    for (let i = startIndex + 1; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      if (isPast(month)) continue;
      if (hasAnyFilled && hasRangeValue(month)) break;
      next[month] = amount;
    }
    return next;
  }

  // 既入力区間内: 連続する既入力の末尾までだけ上書き
  for (let i = startIndex + 1; i < fiscalMonths.length; i += 1) {
    const month = fiscalMonths[i];
    if (isPast(month)) continue;
    if (hasRangeValue(month)) {
      next[month] = amount;
    } else {
      break;
    }
  }
  return next;
}

export function applyManMonthsFromMonthForward(
  source,
  startMonth,
  amount,
  pastMonths,
  fiscalMonths,
  options = {},
) {
  return applyRevenueMonthlyFromMonthForward(
    source,
    startMonth,
    amount,
    pastMonths,
    fiscalMonths,
    options,
  );
}

export function clientHasManMonthPlan(client, fiscalMonths) {
  return Boolean(
    client?.manMonths
    && fiscalMonths.some((m) => client.manMonths[m] != null && client.manMonths[m] !== 0),
  );
}

export function getEffectiveUnitPrice(client, month) {
  return client.monthlyUnitPrice?.[month] ?? null;
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
  // 税抜経理では仕訳実績と揃えるため上乗せしない
  if (isAccountingTaxExclusive(taxOptions?.accountingTaxBasis)) {
    return taxExclusiveAmount;
  }
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

  // 旧「既定単価」は月別単価へ移行する（空の月だけ埋める）。移行後は保持しない。
  const legacyDefaultUnitPrice = normalizeAmount(entry.defaultUnitPrice);
  if (legacyDefaultUnitPrice != null) {
    for (const month of fiscalMonths) {
      if (monthlyUnitPrice[month] == null) {
        monthlyUnitPrice[month] = legacyDefaultUnitPrice;
      }
    }
  }

  const result = {
    id,
    accountLabel,
    subLabel,
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

/** 契約月数サマリの受注先ソート（null | 'asc' | 'desc'） */
export function normalizeOrderMonthsClientSort(value) {
  if (value === 'asc' || value === 'desc') return value;
  return null;
}

export function getOrderMonthsClientSort(settings) {
  return normalizeOrderMonthsClientSort(settings?.orderMonthsClientSort);
}

export function setOrderMonthsClientSort(settings, sort) {
  return saveRevenuePlanSettings({
    ...settings,
    orderMonthsClientSort: normalizeOrderMonthsClientSort(sort),
  });
}

export function buildRevenuePlanPeriodEntries(currentPeriod, planYears) {
  const years = normalizeRevenuePlanYears(planYears);
  const entries = [];
  for (let i = 0; i < years; i += 1) {
    const period = currentPeriod + i;
    let label;
    if (i === 0) label = '今期';
    else if (i === 1) label = '来期';
    else label = `第${i + 1}期`;
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

function revGetPeriodExcludedKeys(plans, fiscalPeriod) {
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
  const excluded = revGetPeriodExcludedKeys(plans, fiscalPeriod);
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
  if (!client) return { plans, ok: false, reason: 'not_found' };

  const oldSub = client.subLabel;
  const oldId = client.id;
  const newId = createClientId(client.accountLabel, sub);

  function isSameClient(entry) {
    // 他期へ同期済みで manual が落ちた行も、同一受注先として扱う
    return entry.id === oldId
      || (entry.accountLabel === client.accountLabel && entry.subLabel === oldSub);
  }

  // 同名は操作中の期内だけ禁止。他期に同名があっても許可する。
  const duplicate = sourceEntries.some(
    (e) => !isSameClient(e)
      && e.accountLabel === client.accountLabel
      && e.subLabel === sub,
  );
  if (duplicate) return { plans, ok: false, reason: 'duplicate' };

  // 名前変更は操作した期だけに適用する（他期の同名受注先と独立）
  const updatedEntries = sourceEntries.map((entry) => {
    if (!isSameClient(entry)) return entry;
    return normalizeClientEntry({
      ...entry,
      subLabel: sub,
      id: newId,
      manual: true,
    }, fiscalMonths);
  });
  const renamedEntry = updatedEntries.find((e) => e.id === newId)
    ?? normalizeClientEntry({
      ...client,
      subLabel: sub,
      id: newId,
      manual: true,
    }, fiscalMonths);

  return {
    plans: setPeriodClientEntries(plans, fiscalPeriod, updatedEntries, fiscalMonths),
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
  const excludedKeys = revGetPeriodExcludedKeys(plans, fiscalPeriod);
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

/** 参照期の受注先一覧を、未登録分だけ対象期に追加する（金額は空。手動追加の manual フラグも引き継ぐ） */
export function syncClientListFromReference(plans, targetPeriod, referencePeriod, fiscalMonths) {
  const refClients = getPeriodClientEntries(plans, referencePeriod, fiscalMonths);
  const targetClients = getPeriodClientEntries(plans, targetPeriod, fiscalMonths);
  const targetExcluded = revGetPeriodExcludedKeys(plans, targetPeriod);
  let changed = false;
  const next = targetClients.map((entry) => {
    if (entry.manual) return entry;
    const key = `${entry.accountLabel}\x00${entry.subLabel}`;
    const ref = refClients.find(
      (r) => r.manual
        && r.accountLabel === entry.accountLabel
        && r.subLabel === entry.subLabel,
    );
    if (!ref) return entry;
    if (targetExcluded.has(key)) return entry;
    const healed = normalizeClientEntry({ ...entry, manual: true }, fiscalMonths);
    if (!healed) return entry;
    changed = true;
    return healed;
  });
  const targetKeys = new Set(
    next.map((v) => `${v.accountLabel}\x00${v.subLabel}`),
  );
  for (const ref of refClients) {
    const key = `${ref.accountLabel}\x00${ref.subLabel}`;
    if (targetKeys.has(key) || targetExcluded.has(key)) continue;
    targetKeys.add(key);
    const client = normalizeClientEntry({
      accountLabel: ref.accountLabel,
      subLabel: ref.subLabel,
      manMonths: {},
      monthlyUnitPrice: {},
      manual: ref.manual ? true : undefined,
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
