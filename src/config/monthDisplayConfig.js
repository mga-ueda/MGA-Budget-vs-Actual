import { FISCAL_MONTHS, SETTLEMENT_MONTH_LABEL } from './fiscalCalendar.js';
import {
  buildPastFiscalMonthSet,
  getFiscalPeriodDisplayMode,
} from './appSettings.js';

/** @typedef {'actual' | 'plan'} MonthDisplayMode */

const MONTH_DISPLAY_STORAGE_KEY = 'mga-month-display';

/**
 * 期ごとの実績/計画の境界。
 * planFromMonth 以降の月が計画表示。未設定は当月の前月まで実績（当月が期首なら全月計画）。
 * planFromMonth: null は全月実績（決終整理除く）。
 * @type {Record<string, { planFromMonth: string | null }>}
 */
export const EMPTY_MONTH_DISPLAY_CONFIG = {};

const MONTH_DISPLAY_NON_TOGGLE_MONTHS = new Set(["決算整理"]);

/** 月ヘッダーの実績/計画切り替え対象か（決算整理は対象外） */
export function isMonthDisplayToggleTarget(monthLabel) {
  return !MONTH_DISPLAY_NON_TOGGLE_MONTHS.has(monthLabel);
}

function getLastToggleMonthIndex(fiscalMonths = FISCAL_MONTHS) {
  for (let i = fiscalMonths.length - 1; i >= 0; i -= 1) {
    if (isMonthDisplayToggleTarget(fiscalMonths[i])) return i;
  }
  return -1;
}

/**
 * 未設定時の計画開始月。
 * 当月の前月までを実績とするため、計画開始は当月。
 * 当月が期首（最初のトグル対象月）なら全月計画のまま。
 */
function getDefaultPlanFromMonth(fiscalMonths = FISCAL_MONTHS, date = new Date()) {
  const idx = fiscalMonths.findIndex((m) => isMonthDisplayToggleTarget(m));
  const firstToggle = idx >= 0 ? fiscalMonths[idx] : fiscalMonths[0];
  const currentLabel = `${date.getMonth() + 1}月`;
  if (!isMonthDisplayToggleTarget(currentLabel)) return firstToggle;
  const currentIdx = fiscalMonths.indexOf(currentLabel);
  if (currentIdx < 0 || currentIdx === idx) return firstToggle;
  return currentLabel;
}

/** 計画表示が始まる月の会計月インデックス（未設定は当月。期首なら全月計画） */
export function getFirstPlanMonthIndex(
  config,
  fiscalPeriod,
  fiscalMonths = FISCAL_MONTHS,
  date = new Date(),
) {
  const periodKey = String(fiscalPeriod);
  const entry = config?.[periodKey];
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'planFromMonth')) {
    return fiscalMonths.indexOf(getDefaultPlanFromMonth(fiscalMonths, date));
  }
  if (entry.planFromMonth === null) {
    return getLastToggleMonthIndex(fiscalMonths) + 1;
  }
  const idx = fiscalMonths.indexOf(entry.planFromMonth);
  if (idx < 0) return fiscalMonths.indexOf(getDefaultPlanFromMonth(fiscalMonths, date));
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

/** 保存値を正規化（デフォルト状態は期エントリを省略） */
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

/** 月の表示モード（境界より実績か計画かを判別） */
export function getMonthDisplayMode(
  config,
  fiscalPeriod,
  monthLabel,
  _businessStartYear,
  fiscalMonths = FISCAL_MONTHS,
  date = new Date(),
) {
  if (!isMonthDisplayToggleTarget(monthLabel)) return 'actual';
  const idx = fiscalMonths.indexOf(monthLabel);
  if (idx < 0) return 'plan';
  const firstPlanIdx = getFirstPlanMonthIndex(config, fiscalPeriod, fiscalMonths, date);
  return idx >= firstPlanIdx ? 'plan' : 'actual';
}

/**
 * 予実表示時のenrich / UI用月集合を構築する。
 */
export function buildBudgetActualMonthSets({
  config,
  businessStartYear,
  fiscalPeriod,
  fiscalMonths = FISCAL_MONTHS,
  date = new Date(),
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
      date,
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
 * 月クリックで実績/計画の境界を移動する。
 * 計画状態の月を押す→その月以降を計画、前を実績。
 * 実績状態の月を押す→その月まで実績、以降を計画。
 */
export function toggleMonthDisplayMode(
  config,
  fiscalPeriod,
  monthLabel,
  _businessStartYear,
  fiscalMonths = FISCAL_MONTHS,
  date = new Date(),
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
    date,
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
  const defaultPlanFromMonth = getDefaultPlanFromMonth(fiscalMonths, date);

  if (planFromMonth === defaultPlanFromMonth) {
    delete nextConfig[periodKey];
  } else {
    nextConfig[periodKey] = { planFromMonth };
  }

  return normalizeMonthDisplayConfig(nextConfig, fiscalMonths);
}

/** 予実境界を1か月ずつ前後する。 delta > 0: 計画開始を後へ（実績月を増やす）。 delta < 0: 計画開始を前へ（計画月を増やす）。 */
export function shiftMonthDisplayBoundary(
  config,
  fiscalPeriod,
  delta,
  fiscalMonths = FISCAL_MONTHS,
  date = new Date(),
) {
  const step = delta > 0 ? 1 : delta < 0 ? -1 : 0;
  if (!step) return null;

  const normalized = normalizeMonthDisplayConfig(config, fiscalMonths);
  const periodKey = String(fiscalPeriod);
  const firstPlanIdx = getFirstPlanMonthIndex(normalized, fiscalPeriod, fiscalMonths, date);
  const firstToggleIdx = fiscalMonths.findIndex((m) => isMonthDisplayToggleTarget(m));
  const lastToggleIdx = getLastToggleMonthIndex(fiscalMonths);
  if (firstToggleIdx < 0 || lastToggleIdx < 0) return null;

  const minIdx = firstToggleIdx;
  const maxIdx = lastToggleIdx + 1;
  const nextIdx = Math.min(maxIdx, Math.max(minIdx, firstPlanIdx + step));
  if (nextIdx === firstPlanIdx) return null;

  const planFromMonth = nextIdx > lastToggleIdx ? null : fiscalMonths[nextIdx];
  const nextConfig = { ...normalized };
  const defaultPlanFromMonth = getDefaultPlanFromMonth(fiscalMonths, date);

  if (planFromMonth === defaultPlanFromMonth) {
    delete nextConfig[periodKey];
  } else {
    nextConfig[periodKey] = { planFromMonth };
  }

  return normalizeMonthDisplayConfig(nextConfig, fiscalMonths);
}

/** 設定画面で編集不可な月（実績表示の月） */
export function getSettingsLockedMonths({
  config,
  businessStartYear,
  fiscalPeriod,
  fiscalMonths = FISCAL_MONTHS,
  fiscalEndMonth,
  currentFiscalPeriod,
  date = new Date(),
}) {
  const displayMode = getFiscalPeriodDisplayMode(
    businessStartYear,
    fiscalPeriod,
    date,
    fiscalEndMonth,
  );
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
    return buildPastFiscalMonthSet(
      businessStartYear,
      fiscalPeriod,
      fiscalMonths,
      date,
      fiscalEndMonth,
    );
  }
  return new Set();
}

/** 月クリック時のツールチップ文字を返す。 */
export function getMonthDisplayClickHint(mode) {
  if (mode === 'plan') {
    return "クリックでこの月まで実績表示に切り替え（Ctrl+←→ で境界を1か月ずつ移動）";
  }
  return "クリックでこの月以降を計画表示に切り替え（Ctrl+←→ で境界を1か月ずつ移動）";
}
