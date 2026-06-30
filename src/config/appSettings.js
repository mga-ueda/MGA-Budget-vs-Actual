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
export const DEFAULT_CORP_ENTITY_MARKERS = '㈱,㈲,(同)';

export const DEFAULT_COMPANY_NAME = 'MIYABI GAME AUDIO INC.';
export const DEFAULT_BRAND_ICON_TEXT = 'MGA';
export const DEFAULT_BRAND_FILL_COLOR = '#2563eb';
export const DEFAULT_BRAND_TEXT_COLOR = '#ffffff';

/** ロゴ画像の最大サイズ（バイト） */
export const MAX_BRAND_LOGO_BYTES = 512 * 1024;

const BRAND_LOGO_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i;

function parseHexColor(hex) {
  const h = String(hex ?? '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `#${h.toLowerCase()}`;
}

/** コーポレートカラーを #rrggbb に正規化 */
export function normalizeBrandColor(hex, fallback) {
  return parseHexColor(hex) ?? fallback;
}

export function normalizeCompanyName(value) {
  return String(value ?? '').trim();
}

export function normalizeBrandIconText(value) {
  const s = String(value ?? '').trim();
  return s || DEFAULT_BRAND_ICON_TEXT;
}

/** ブランドロゴ画像（data URL）。不正な値は null */
export function normalizeBrandLogoDataUrl(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!BRAND_LOGO_DATA_URL_RE.test(s)) return null;
  return s;
}

export function hasBrandLogo(settings) {
  return normalizeBrandLogoDataUrl(settings?.brandLogoDataUrl) != null;
}

function applyBrandToLogoElement(logoEl, settings) {
  if (!logoEl) return;
  const dataUrl = normalizeBrandLogoDataUrl(settings.brandLogoDataUrl);
  if (dataUrl) {
    logoEl.textContent = '';
    logoEl.style.background = 'transparent';
    logoEl.style.color = '';
    logoEl.style.boxShadow = 'none';
    logoEl.classList.add('plan-logo-image');
    let img = logoEl.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      logoEl.appendChild(img);
    }
    img.src = dataUrl;
    return;
  }
  logoEl.classList.remove('plan-logo-image');
  const img = logoEl.querySelector('img');
  if (img) img.remove();
  const fillColor = normalizeBrandColor(settings.brandFillColor, DEFAULT_BRAND_FILL_COLOR);
  const textColor = normalizeBrandColor(settings.brandTextColor, DEFAULT_BRAND_TEXT_COLOR);
  logoEl.textContent = normalizeBrandIconText(settings.brandIconText);
  logoEl.style.background = fillColor;
  logoEl.style.color = textColor;
  logoEl.style.boxShadow = '';
}

export function applyBrandSettings(settings) {
  document.querySelectorAll('.plan-logo').forEach((logo) => {
    applyBrandToLogoElement(logo, settings);
  });
  const company = document.querySelector('.plan-company');
  if (company) {
    company.textContent = normalizeCompanyName(settings.companyName);
  }
}

export const DEFAULT_APP_SETTINGS = {
  businessStartYear: DEFAULT_BUSINESS_START_YEAR,
  fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,
  fiscalPeriod: null,
  fontScale: DEFAULT_FONT_SCALE,
  rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
  corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
  companyName: DEFAULT_COMPANY_NAME,
  brandIconText: DEFAULT_BRAND_ICON_TEXT,
  brandFillColor: DEFAULT_BRAND_FILL_COLOR,
  brandTextColor: DEFAULT_BRAND_TEXT_COLOR,
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
    '12月': decYear,
    '1月': nextYear,
    '2月': nextYear,
    '3月': nextYear,
    '4月': nextYear,
    '5月': nextYear,
    '6月': nextYear,
    '7月': nextYear,
    '8月': nextYear,
    '9月': nextYear,
    '10月': nextYear,
    '11月': nextYear,
    '決算整理': nextYear,
  };
}

function parseMonthLabelNumber(label) {
  const m = String(label).match(/^(\d{1,2})月$/);
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
      return '計画表示';
    case 'budget-actual':
      return '予実表示';
    case 'actual':
      return '実績表示';
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
  return `第${fiscalPeriod}期`;
}

export function parseFiscalPeriod(label) {
  const m = String(label ?? '').match(/第(\d+)期/);
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
  const m = base.match(/^仕訳データ_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$/);
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

function loadBrandSettings(parsed) {
  const companyName = parsed && Object.prototype.hasOwnProperty.call(parsed, 'companyName')
    ? normalizeCompanyName(parsed.companyName)
    : DEFAULT_COMPANY_NAME;
  return {
    companyName,
    brandIconText: normalizeBrandIconText(parsed?.brandIconText),
    brandFillColor: normalizeBrandColor(parsed?.brandFillColor, DEFAULT_BRAND_FILL_COLOR),
    brandTextColor: normalizeBrandColor(parsed?.brandTextColor, DEFAULT_BRAND_TEXT_COLOR),
    brandLogoDataUrl: normalizeBrandLogoDataUrl(parsed?.brandLogoDataUrl),
  };
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
        ...loadBrandSettings(null),
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
      ...loadBrandSettings(parsed),
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
      ...loadBrandSettings(null),
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
    companyName: DEFAULT_COMPANY_NAME,
    brandIconText: DEFAULT_BRAND_ICON_TEXT,
    brandFillColor: DEFAULT_BRAND_FILL_COLOR,
    brandTextColor: DEFAULT_BRAND_TEXT_COLOR,
    brandLogoDataUrl: null,
    consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
    withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
    legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
  };
}

/** その他設定タブの項目のみデフォルトに戻す（フォント・行パディング等は維持） */
export function resetOtherAppSettings(current) {
  const businessStartYear = DEFAULT_BUSINESS_START_YEAR;
  return {
    ...current,
    businessStartYear,
    fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,
    fiscalPeriod: normalizeFiscalPeriod(businessStartYear, current.fiscalPeriod),
    corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
    companyName: DEFAULT_COMPANY_NAME,
    brandIconText: DEFAULT_BRAND_ICON_TEXT,
    brandFillColor: DEFAULT_BRAND_FILL_COLOR,
    brandTextColor: DEFAULT_BRAND_TEXT_COLOR,
    brandLogoDataUrl: null,
  };
}
