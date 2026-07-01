import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = resolve(repoRoot, 'src/config/monthDisplayConfig.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const content = `import { FISCAL_MONTHS } from '../parse/parseJournal.js';
import {
  buildPastFiscalMonthSet,
  getFiscalPeriodDisplayMode,
} from './appSettings.js';

/** @typedef {'actual' | 'plan'} MonthDisplayMode */

const MONTH_DISPLAY_STORAGE_KEY = 'mga-month-display';

/**
 * ${jp(0x671f, 0x3054, 0x3068, 0x306e, 0x5b9f, 0x7e3e, 0x2f, 0x8a08, 0x753b, 0x306e, 0x5883, 0x754c, 0x3002)}
 * planFromMonth ${jp(0x4ee5, 0x964d, 0x306e, 0x6708, 0x304c, 0x8a08, 0x753b, 0x8868, 0x793a, 0x3002, 0x672a, 0x8a2d, 0x5b9a, 0x306f, 0x5168, 0x6708, 0x8a08, 0x753b, 0x3002)}
 * planFromMonth: null ${jp(0x306f, 0x5168, 0x6708, 0x5b9f, 0x7e3e, 0xff08, 0x6c7a, 0x7d42, 0x6574, 0x7406, 0x9664, 0x304f, 0xff09, 0x3002)}
 * @type {Record<string, { planFromMonth: string | null }>}
 */
export const EMPTY_MONTH_DISPLAY_CONFIG = {};

const MONTH_DISPLAY_NON_TOGGLE_MONTHS = new Set([${JSON.stringify(jp(0x6c7a, 0x7b97, 0x6574, 0x7406))}]);

/** ${jp(0x6708, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x306e, 0x5b9f, 0x7e3e, 0x2f, 0x8a08, 0x753b, 0x5207, 0x308a, 0x66ff, 0x3048, 0x5bfe, 0x8c61, 0x304b, 0xff08, 0x6c7a, 0x7b97, 0x6574, 0x7406, 0x306f, 0x5bfe, 0x8c61, 0x5916, 0xff09)} */
export function isMonthDisplayToggleTarget(monthLabel) {
  return !MONTH_DISPLAY_NON_TOGGLE_MONTHS.has(monthLabel);
}

function getLastToggleMonthIndex(fiscalMonths = FISCAL_MONTHS) {
  for (let i = fiscalMonths.length - 1; i >= 0; i -= 1) {
    if (isMonthDisplayToggleTarget(fiscalMonths[i])) return i;
  }
  return -1;
}

function getDefaultPlanFromMonth(fiscalMonths = FISCAL_MONTHS) {
  const idx = fiscalMonths.findIndex((m) => isMonthDisplayToggleTarget(m));
  return idx >= 0 ? fiscalMonths[idx] : fiscalMonths[0];
}

/** ${jp(0x8a08, 0x753b, 0x8868, 0x793a, 0x304c, 0x59cb, 0x307e, 0x308b, 0x6708, 0x306e, 0x4f1a, 0x8a08, 0x6708, 0x30a4, 0x30f3, 0x30c7, 0x30c3, 0x30af, 0x30b9, 0xff08, 0x672a, 0x8a2d, 0x5b9a, 0x306f, 0x6700, 0x521d, 0x306e, 0x30c8, 0x30, 0x30b0, 0x30eb, 0x5bfe, 0x8c61, 0x6708, 0xff09)} */
export function getFirstPlanMonthIndex(config, fiscalPeriod, fiscalMonths = FISCAL_MONTHS) {
  const periodKey = String(fiscalPeriod);
  const entry = config?.[periodKey];
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'planFromMonth')) {
    return fiscalMonths.findIndex((m) => isMonthDisplayToggleTarget(m));
  }
  if (entry.planFromMonth === null) {
    return getLastToggleMonthIndex(fiscalMonths) + 1;
  }
  const idx = fiscalMonths.indexOf(entry.planFromMonth);
  if (idx < 0) return fiscalMonths.findIndex((m) => isMonthDisplayToggleTarget(m));
  return idx;
}

function normalizePeriodEntry(entry, fiscalMonths = FISCAL_MONTHS) {
  if (!entry || typeof entry !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(entry, 'planFromMonth')) {
    if (entry.planFromMonth === null) return { planFromMonth: null };
    const month = String(entry.planFromMonth);
    if (!isMonthDisplayToggleTarget(month)) return null;
    if (month === getDefaultPlanFromMonth(fiscalMonths)) return null;
    return { planFromMonth: month };
  }
  return null;
}

/** ${jp(0x4fdd, 0x5b58, 0x5024, 0x3092, 0x6b63, 0x898f, 0x5316, 0xff08, 0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8, 0x72b6, 0x614b, 0x306f, 0x671f, 0x30a8, 0x30f3, 0x30c8, 0x30ea, 0x3092, 0x7701, 0x7565, 0xff09)} */
export function normalizeMonthDisplayConfig(raw, fiscalMonths = FISCAL_MONTHS) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_MONTH_DISPLAY_CONFIG };
  const result = {};
  for (const [periodKey, entry] of Object.entries(raw)) {
    const normalized = normalizePeriodEntry(entry, fiscalMonths);
    if (normalized) result[String(periodKey)] = normalized;
  }
  return result;
}

export function loadMonthDisplayConfig() {
  try {
    const raw = localStorage.getItem(MONTH_DISPLAY_STORAGE_KEY);
    return raw ? normalizeMonthDisplayConfig(JSON.parse(raw)) : { ...EMPTY_MONTH_DISPLAY_CONFIG };
  } catch {
    return { ...EMPTY_MONTH_DISPLAY_CONFIG };
  }
}

export function saveMonthDisplayConfig(config) {
  const normalized = normalizeMonthDisplayConfig(config);
  if (Object.keys(normalized).length === 0) {
    localStorage.removeItem(MONTH_DISPLAY_STORAGE_KEY);
    return;
  }
  localStorage.setItem(MONTH_DISPLAY_STORAGE_KEY, JSON.stringify(normalized));
}

/** ${jp(0x6708, 0x306e, 0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0xff08, 0x5883, 0x754c, 0x3088, 0x308a, 0x5b9f, 0x7e3e, 0x304b, 0x8a08, 0x753b, 0x304b, 0x3092, 0x5224, 0x5225, 0xff09)} */
export function getMonthDisplayMode(
  config,
  fiscalPeriod,
  monthLabel,
  _businessStartYear,
  fiscalMonths = FISCAL_MONTHS,
) {
  if (!isMonthDisplayToggleTarget(monthLabel)) return 'actual';
  const idx = fiscalMonths.indexOf(monthLabel);
  if (idx < 0) return 'plan';
  const firstPlanIdx = getFirstPlanMonthIndex(config, fiscalPeriod, fiscalMonths);
  return idx >= firstPlanIdx ? 'plan' : 'actual';
}

/**
 * ${jp(0x4e88, 0x5b9f, 0x8868, 0x793a, 0x6642, 0x306e, 0x65, 0x6e, 0x72, 0x69, 0x63, 0x68, 0x20, 0x2f, 0x20, 0x55, 0x49, 0x7528, 0x6708, 0x96c6, 0x5408, 0x3092, 0x69cb, 0x7bc9, 0x3059, 0x308b, 0x3002)}
 */
export function buildBudgetActualMonthSets({
  config,
  businessStartYear,
  fiscalPeriod,
  fiscalMonths = FISCAL_MONTHS,
}) {
  const actualMonthSet = new Set();
  const skipPlanFillMonths = new Set();
  const forcePlanMonths = new Set();

  for (const monthLabel of fiscalMonths) {
    if (!isMonthDisplayToggleTarget(monthLabel)) continue;
    const mode = getMonthDisplayMode(
      config,
      fiscalPeriod,
      monthLabel,
      businessStartYear,
      fiscalMonths,
    );

    if (mode === 'actual') {
      actualMonthSet.add(monthLabel);
      skipPlanFillMonths.add(monthLabel);
    } else {
      forcePlanMonths.add(monthLabel);
    }
  }

  return { actualMonthSet, skipPlanFillMonths, forcePlanMonths };
}

/**
 * ${jp(0x6708, 0x30af, 0x30ea, 0x30c3, 0x30af, 0x3067, 0x5b9f, 0x7e3e, 0x2f, 0x8a08, 0x753b, 0x306e, 0x5883, 0x754c, 0x3092, 0x79fb, 0x52d5, 0x3059, 0x308b, 0x3002)}
 * ${jp(0x8a08, 0x753b, 0x72b6, 0x614b, 0x306e, 0x6708, 0x3092, 0x62bc, 0x3059, 0x2192, 0x305d, 0x306e, 0x6708, 0x4ee5, 0x964d, 0x3092, 0x8a08, 0x753b, 0x3001, 0x524d, 0x3092, 0x5b9f, 0x7e3e, 0x3002)}
 * ${jp(0x5b9f, 0x7e3e, 0x72b6, 0x614b, 0x306e, 0x6708, 0x3092, 0x62bc, 0x3059, 0x2192, 0x305d, 0x306e, 0x6708, 0x307e, 0x3067, 0x5b9f, 0x7e3e, 0x3001, 0x4ee5, 0x964d, 0x3092, 0x8a08, 0x753b, 0x3002)}
 */
export function toggleMonthDisplayMode(
  config,
  fiscalPeriod,
  monthLabel,
  _businessStartYear,
  fiscalMonths = FISCAL_MONTHS,
) {
  if (!isMonthDisplayToggleTarget(monthLabel)) {
    return normalizeMonthDisplayConfig(config, fiscalMonths);
  }

  const normalized = normalizeMonthDisplayConfig(config, fiscalMonths);
  const periodKey = String(fiscalPeriod);
  const idx = fiscalMonths.indexOf(monthLabel);
  if (idx < 0) return normalized;

  const current = getMonthDisplayMode(
    normalized,
    fiscalPeriod,
    monthLabel,
    _businessStartYear,
    fiscalMonths,
  );

  let planFromMonth;
  if (current === 'plan') {
    const nextIdx = idx + 1;
    const lastToggleIdx = getLastToggleMonthIndex(fiscalMonths);
    planFromMonth = nextIdx > lastToggleIdx ? null : fiscalMonths[nextIdx];
  } else {
    planFromMonth = monthLabel;
  }

  const nextConfig = { ...normalized };
  const defaultPlanFromMonth = getDefaultPlanFromMonth(fiscalMonths);

  if (planFromMonth === defaultPlanFromMonth) {
    delete nextConfig[periodKey];
  } else {
    nextConfig[periodKey] = { planFromMonth };
  }

  return normalizeMonthDisplayConfig(nextConfig, fiscalMonths);
}

/** ${jp(0x8a2d, 0x5b9a, 0x753b, 0x9762, 0x3067, 0x7de8, 0x96c6, 0x4e0d, 0x53ef, 0x306a, 0x6708, 0xff08, 0x5b9f, 0x7e3e, 0x8868, 0x793a, 0x306e, 0x6708, 0xff09)} */
export function getSettingsLockedMonths({
  config,
  businessStartYear,
  fiscalPeriod,
  fiscalMonths = FISCAL_MONTHS,
  currentFiscalPeriod,
  date = new Date(),
}) {
  const displayMode = getFiscalPeriodDisplayMode(businessStartYear, fiscalPeriod, date);
  if (fiscalPeriod === currentFiscalPeriod && displayMode === 'budget-actual') {
    return buildBudgetActualMonthSets({
      config,
      businessStartYear,
      fiscalPeriod,
      fiscalMonths,
      date,
    }).actualMonthSet;
  }
  if (fiscalPeriod === currentFiscalPeriod) {
    return buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths, date);
  }
  return new Set();
}

export function getMonthDisplayModeLabel(mode) {
  return mode === 'plan' ? ${JSON.stringify(jp(0x8a08, 0x753b))} : ${JSON.stringify(jp(0x5b9f, 0x7e3e))};
}

/** ${jp(0x6708, 0x30af, 0x30ea, 0x30c3, 0x30af, 0x6642, 0x306e, 0x30c4, 0x30fc, 0x30eb, 0x30c1, 0x30c3, 0x30d7, 0x6587, 0x5b57, 0x3092, 0x8fd4, 0x3059, 0x3002)} */
export function getMonthDisplayClickHint(mode) {
  if (mode === 'plan') {
    return ${JSON.stringify(jp(0x30af, 0x30ea, 0x30c3, 0x30af, 0x3067, 0x3053, 0x306e, 0x6708, 0x307e, 0x3067, 0x5b9f, 0x7e3e, 0x8868, 0x793a, 0x306b, 0x5207, 0x308a, 0x66ff, 0x3048))};
  }
  return ${JSON.stringify(jp(0x30af, 0x30ea, 0x30c3, 0x30af, 0x3067, 0x3053, 0x306e, 0x6708, 0x4ee5, 0x964d, 0x3092, 0x8a08, 0x753b, 0x8868, 0x793a, 0x306b, 0x5207, 0x308a, 0x66ff, 0x3048))};
}
`;

writeFileSync(path, content, { encoding: 'utf8' });
console.log('Wrote src/config/monthDisplayConfig.js');
