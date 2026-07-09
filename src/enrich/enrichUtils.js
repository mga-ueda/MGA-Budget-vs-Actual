import { FISCAL_MONTHS } from '../config/fiscalCalendar.js';
import { planDataFromCache } from '../csv/csvLoader.js';

export function emptyRawMonthValues(fiscalMonths = FISCAL_MONTHS) {
  const values = {};
  for (const m of fiscalMonths) values[m] = 0;
  return values;
}

export function addRawMonthValues(target, source, fiscalMonths = FISCAL_MONTHS) {
  for (const m of fiscalMonths) {
    target[m] += source[m] ?? 0;
  }
}

export function isMissingCsvMonthValue(value) {
  return value === undefined || value === null || value === 0;
}

export function rawValuesFromRow(row) {
  const values = emptyRawMonthValues();
  addRawMonthValues(values, row.values);
  return values;
}

export function loadReferencePeriodPlanData(expandConfig, businessStartYear, fiscalPeriod) {
  if (fiscalPeriod < 1) return null;
  try {
    const cached = planDataFromCache(expandConfig, {
      businessStartYear,
      fiscalPeriod,
    });
    return cached?.data ?? null;
  } catch {
    return null;
  }
}

export function collectActualAmountsFromPlanData(
  planData,
  fiscalMonths,
  sectionId,
  isDetailRow,
  noSubLabel,
  requiredAccountLabel = null,
) {
  const section = planData?.sections?.find((s) => s.id === sectionId);
  if (!section) return new Map();
  const result = new Map();
  for (const row of section.rows) {
    if (!isDetailRow(row)) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === noSubLabel) continue;
    const account = String(row.label ?? '').trim();
    if (!account || (requiredAccountLabel && account !== requiredAccountLabel)) continue;
    const key = `${account}\x00${sub}`;
    const monthly = {};
    for (const m of fiscalMonths) {
      const val = row.values[m];
      if (val != null && val !== 0) monthly[m] = val;
    }
    result.set(key, monthly);
  }
  return result;
}

export function collectSubaccountsFromPlanData(
  planData,
  sectionId,
  isDetailRow,
  noSubLabel,
  requiredAccountLabel = null,
) {
  const section = planData?.sections?.find((s) => s.id === sectionId);
  if (!section) return [];
  const result = [];
  const seen = new Set();
  for (const row of section.rows) {
    if (!isDetailRow(row)) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === noSubLabel) continue;
    const account = String(row.label ?? '').trim();
    if (!account || (requiredAccountLabel && account !== requiredAccountLabel)) continue;
    const key = `${account}\x00${sub}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ accountLabel: account, subLabel: sub });
  }
  return result;
}
