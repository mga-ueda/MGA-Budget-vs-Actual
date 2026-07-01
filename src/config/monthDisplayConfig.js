import { FISCAL_MONTHS } from '../parse/parseJournal.js';
import {
  buildPastFiscalMonthSet,
  getFiscalPeriodDisplayMode,
} from './appSettings.js';

/** @typedef {'actual' | 'plan'} MonthDisplayMode */

const MONTH_DISPLAY_STORAGE_KEY = 'mga-month-display';

/**
 * 期ごとの実績/計画の境界。
 * planFromMonth 以降の月が計画表示。未設定は全月計画。
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

function getDefaultPlanFromMonth(fiscalMonths = FISCAL_MONTHS) {
  const idx = fiscalMonths.findIndex((m) => isMonthDisplayToggleTarget(m));
  return idx >= 0 ? fiscalMonths[idx] : fiscalMonths[0];
}

/** 計画表示が始まる月の会計月インデックス（未設定は最初のトグル対象月） */
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
) {
  if (!isMonthDisplayToggleTarget(monthLabel)) return 'actual';
  const idx = fiscalMonths.indexOf(monthLabel);
  if (idx < 0) return 'plan';
  const firstPlanIdx = getFirstPlanMonthIndex(config, fiscalPeriod, fiscalMonths);
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

/** 設定画面で編集不可な月（実績表示の月） */
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
  return mode === 'plan' ? "計画" : "実績";
}

/** 月クリック時のツールチップ文字を返す。 */
export function getMonthDisplayClickHint(mode) {
  if (mode === 'plan') {
    return "クリックでこの月まで実績表示に切り替え";
  }
  return "クリックでこの月以降を計画表示に切り替え";
}
