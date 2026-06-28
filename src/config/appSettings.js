import {
  DEFAULT_CONSUMPTION_TAX_RATES,
  normalizeConsumptionTaxRates,
} from './consumptionTaxRateConfig.js';
import {
  DEFAULT_WITHHOLDING_TAX_RATES,
  normalizeWithholdingTaxRates,
} from './withholdingTaxRateConfig.js';
import {
  DEFAULT_LEGAL_WELFARE_RATE,
  normalizeLegalWelfareRate,
} from './legalWelfareRateConfig.js';

const APP_SETTINGS_STORAGE_KEY = 'mga-app-settings';

export const DEFAULT_BUSINESS_START_YEAR = 2018;

/** 会計期の決算月（1〜12） */
export const DEFAULT_FISCAL_END_MONTH = 12;

/** 設定 UI で 100% と表示するときの実際の CSS 倍率 */
export const DESIGN_FONT_BASELINE = 0.85;

/** 設定 UI 上の倍率（100% = DESIGN_FONT_BASELINE） */
export const DEFAULT_FONT_SCALE = 1;
export const MIN_FONT_SCALE = 0.5;
export const MAX_FONT_SCALE = 1.5;

/** 予実表 tbody 上下 padding の UI 倍率（1 = デフォルト） */
export const DEFAULT_ROW_PADDING_SCALE = 1;
export const MIN_ROW_PADDING_SCALE = 0.5;
export const MAX_ROW_PADDING_SCALE = 1.5;

/** 補助科目の法人等判定に使う文字列マーカー（カンマ区切り） */
export const DEFAULT_CORP_ENTITY_MARKERS = '\u3231,\u3232,(\u540c)';

export const DEFAULT_APP_SETTINGS = {
  businessStartYear: DEFAULT_BUSINESS_START_YEAR,
  fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,
  fiscalPeriod: null,
  fontScale: DEFAULT_FONT_SCALE,
  rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
  corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
  consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
  withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
  legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
};

export function normalizeFontScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_FONT_SCALE;
  const clamped = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, n));
  return Math.round(clamped * 100) / 100;
}

export function fontScaleUiToActual(uiScale) {
  return Math.round(normalizeFontScale(uiScale) * DESIGN_FONT_BASELINE * 100) / 100;
}

export function formatFontScaleLabel(uiScale) {
  return `${Math.round(normalizeFontScale(uiScale) * 100)}%`;
}

export function formatFontScaleMultiplier(uiScale) {
  return `×${normalizeFontScale(uiScale).toFixed(2).replace(/(\.\d)0$/, '$1')}`;
}

export function applyFontScale(uiScale) {
  document.documentElement.style.setProperty(
    '--plan-font-scale',
    String(fontScaleUiToActual(uiScale)),
  );
}

export function normalizeRowPaddingScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ROW_PADDING_SCALE;
  const clamped = Math.min(MAX_ROW_PADDING_SCALE, Math.max(MIN_ROW_PADDING_SCALE, n));
  return Math.round(clamped * 100) / 100;
}

export function formatRowPaddingScaleMultiplier(uiScale) {
  return formatFontScaleMultiplier(normalizeRowPaddingScale(uiScale));
}

export function applyRowPaddingScale(uiScale) {
  document.documentElement.style.setProperty(
    '--plan-row-padding-scale',
    String(normalizeRowPaddingScale(uiScale)),
  );
}

function loadFontScale(parsed) {
  const raw = parsed?.fontScale;
  if (parsed?.fontScaleUi) {
    return normalizeFontScale(raw);
  }
  const actual = Number(raw);
  if (!Number.isFinite(actual)) return DEFAULT_FONT_SCALE;
  return normalizeFontScale(actual / DESIGN_FONT_BASELINE);
}

function loadRowPaddingScale(parsed) {
  return normalizeRowPaddingScale(parsed?.rowPaddingScale);
}

/** 法人等判定マーカーを配列に分解（未設定はデフォルト） */
export function parseCorpEntityMarkers(value) {
  const raw = value == null || String(value).trim() === ''
    ? DEFAULT_CORP_ENTITY_MARKERS
    : String(value);
  return raw.split(/[,、，]/).map((s) => s.trim()).filter(Boolean);
}

/** 保存用カンマ区切り文字列に正規化 */
export function normalizeCorpEntityMarkers(value) {
  const parsed = parseCorpEntityMarkers(value);
  return parsed.length > 0 ? parsed.join(',') : DEFAULT_CORP_ENTITY_MARKERS;
}

/** 補助科目が法人等に該当するか判定 */
export function isCorporateSubLabel(subLabel, markers = parseCorpEntityMarkers()) {
  const text = String(subLabel ?? '');
  if (!text) return false;
  return markers.some((marker) => text.includes(marker));
}

/** 第 N 期の月→年ラベル（12月=開始年+N-1、1〜11月・決算整理=その翌年） */
export function buildMonthYearMap(businessStartYear, fiscalPeriod) {
  const decYear = businessStartYear + fiscalPeriod - 1;
  const nextYear = decYear + 1;
  return {
    '12\u6708': decYear,
    '1\u6708': nextYear,
    '2\u6708': nextYear,
    '3\u6708': nextYear,
    '4\u6708': nextYear,
    '5\u6708': nextYear,
    '6\u6708': nextYear,
    '7\u6708': nextYear,
    '8\u6708': nextYear,
    '9\u6708': nextYear,
    '10\u6708': nextYear,
    '11\u6708': nextYear,
    '\u6c7a\u7b97\u6574\u7406': nextYear,
  };
}

function parseMonthLabelNumber(label) {
  const m = String(label).match(/^(\d{1,2})\u6708$/);
  return m ? parseInt(m[1], 10) : null;
}

/** 今日より前の会計月（fiscalMonths 内の月ラベル） */
export function buildPastFiscalMonthSet(
  businessStartYear,
  fiscalPeriod,
  fiscalMonths,
  date = new Date(),
) {
  const monthYearMap = buildMonthYearMap(businessStartYear, fiscalPeriod);
  const refYear = date.getFullYear();
  const refMonth = date.getMonth() + 1;
  const past = new Set();

  for (const monthLabel of fiscalMonths) {
    const year = monthYearMap[monthLabel];
    if (year == null) continue;
    const monthNum = parseMonthLabelNumber(monthLabel);
    if (monthNum == null) continue;
    if (year < refYear || (year === refYear && monthNum < refMonth)) {
      past.add(monthLabel);
    }
  }
  return past;
}

export function getFiscalPeriodForDate(businessStartYear, date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const decYear = m === 12 ? y : y - 1;
  return decYear - businessStartYear + 1;
}

export function getMaxSelectablePeriod(businessStartYear, date = new Date()) {
  return Math.max(1, getFiscalPeriodForDate(businessStartYear, date) + 1);
}

/** 選択期が来期（実績 CSV なし・計画表示のみ）か */
export function isPlanOnlyPeriod(businessStartYear, fiscalPeriod, date = new Date()) {
  return fiscalPeriod > getFiscalPeriodForDate(businessStartYear, date);
}

export function getFiscalPeriodDisplayMode(businessStartYear, fiscalPeriod, date = new Date()) {
  const currentPeriod = getFiscalPeriodForDate(businessStartYear, date);
  if (fiscalPeriod > currentPeriod) return 'plan';
  if (fiscalPeriod === currentPeriod) return 'budget-actual';
  return 'actual';
}

export function getFiscalPeriodDisplayModeLabel(mode) {
  switch (mode) {
    case 'plan':
      return '計画表示モード';
    case 'budget-actual':
      return '予実表示モード';
    case 'actual':
      return '実績表示モード';
    default:
      return '';
  }
}

export function getDefaultFiscalPeriod(businessStartYear, date = new Date()) {
  return getFiscalPeriodForDate(businessStartYear, date);
}

export function normalizeFiscalEndMonth(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 12) return DEFAULT_FISCAL_END_MONTH;
  return n;
}

export function normalizeFiscalPeriod(businessStartYear, fiscalPeriod, date = new Date()) {
  const max = getMaxSelectablePeriod(businessStartYear, date);
  const n = Number(fiscalPeriod);
  if (!Number.isInteger(n) || n < 1) return getDefaultFiscalPeriod(businessStartYear, date);
  return Math.min(max, Math.max(1, n));
}

export function formatFiscalPeriodLabel(fiscalPeriod) {
  return `\u7b2c${fiscalPeriod}\u671f`;
}

export function parseFiscalPeriod(label) {
  const m = String(label ?? '').match(/\u7b2c(\d+)\u671f/);
  return m ? parseInt(m[1], 10) : 8;
}

export function fiscalPeriodJournalBounds(businessStartYear, fiscalPeriod) {
  const decYear = businessStartYear + fiscalPeriod - 1;
  const nextYear = decYear + 1;
  return {
    startPrefix: `${decYear}-12`,
    endPrefix: `${nextYear}-11`,
  };
}

/** 仕訳 CSV の期間が選択期と一致するか */
export function journalFileMatchesFiscalPeriod(fileName, businessStartYear, fiscalPeriod) {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  const m = base.match(/^\u4ed5\u8a33\u30c7\u30fc\u30bf_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$/);
  if (!m) return false;
  const { startPrefix, endPrefix } = fiscalPeriodJournalBounds(businessStartYear, fiscalPeriod);
  return m[1].startsWith(startPrefix) && m[2].startsWith(endPrefix);
}

export function csvDirname(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? '' : normalized.slice(0, idx);
}

/** ファイル名の出力日時（_YYYYMMDD_HHMM.csv）が選択期の範囲内か */
export function csvExportDateMatchesFiscalPeriod(fileName, businessStartYear, fiscalPeriod) {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  const m = base.match(/_(\d{4})(\d{2})(\d{2})_\d{4}\.csv$/);
  if (!m) return false;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const decYear = businessStartYear + fiscalPeriod - 1;
  const nextYear = decYear + 1;
  if (y === decYear && mo === 12) return true;
  if (y === nextYear && mo >= 1 && mo <= 11) return true;
  return false;
}

function loadCorpEntityMarkers(stored) {
  if (stored == null || String(stored).trim() === '') {
    return DEFAULT_CORP_ENTITY_MARKERS;
  }
  const s = String(stored);
  if (s.includes('??')) {
    return DEFAULT_CORP_ENTITY_MARKERS;
  }
  return normalizeCorpEntityMarkers(stored);
}

export function loadAppSettings() {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) {
      const businessStartYear = DEFAULT_BUSINESS_START_YEAR;
      return {
        businessStartYear,
        fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,
        fiscalPeriod: getDefaultFiscalPeriod(businessStartYear),
        fontScale: DEFAULT_FONT_SCALE,
        rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
        corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
        consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
        withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
        legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
      };
    }
    const parsed = JSON.parse(raw);
    const year = Number(parsed?.businessStartYear);
    const businessStartYear = Number.isInteger(year) ? year : DEFAULT_BUSINESS_START_YEAR;
    return {
      businessStartYear,
      fiscalEndMonth: normalizeFiscalEndMonth(parsed?.fiscalEndMonth),
      fiscalPeriod: normalizeFiscalPeriod(businessStartYear, parsed?.fiscalPeriod),
      fontScale: loadFontScale(parsed),
      rowPaddingScale: loadRowPaddingScale(parsed),
      corpEntityMarkers: loadCorpEntityMarkers(parsed?.corpEntityMarkers),
      consumptionTaxRates: normalizeConsumptionTaxRates(parsed?.consumptionTaxRates),
      withholdingTaxRates: normalizeWithholdingTaxRates(parsed?.withholdingTaxRates),
      legalWelfareRate: normalizeLegalWelfareRate(parsed?.legalWelfareRate),
    };
  } catch {
    const businessStartYear = DEFAULT_BUSINESS_START_YEAR;
    return {
      businessStartYear,
      fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,
      fiscalPeriod: getDefaultFiscalPeriod(businessStartYear),
      fontScale: DEFAULT_FONT_SCALE,
      rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
      corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
      consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
      withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
      legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
    };
  }
}

export function saveAppSettings(settings) {
  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({
    ...settings,
    fontScaleUi: true,
  }));
}

export function resetAppSettings() {
  localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
  const businessStartYear = DEFAULT_BUSINESS_START_YEAR;
  return {
    businessStartYear,
    fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,
    fiscalPeriod: getDefaultFiscalPeriod(businessStartYear),
    fontScale: DEFAULT_FONT_SCALE,
    rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
    corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
    consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
    withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
    legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
  };
}
