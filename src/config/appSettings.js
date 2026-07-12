import {
  DEFAULT_CONSUMPTION_TAX_RATES,
  DEFAULT_ACCOUNTING_TAX_BASIS,
  normalizeConsumptionTaxRates,
  normalizeAccountingTaxBasis,
} from './consumptionTaxRateConfig.js';
import {
  DEFAULT_WITHHOLDING_TAX_RATES,
  normalizeWithholdingTaxRates,
} from './withholdingTaxRateConfig.js';
import {
  DEFAULT_LEGAL_WELFARE_RATE,
  normalizeLegalWelfareRate,
} from './legalWelfareRateConfig.js';
import {
  DEFAULT_TAX_SIMULATION,
  normalizeTaxSimulation,
} from './taxSimulationConfig.js';

import { getViewportScale, getContentFitScale } from './viewportScale.js';
import {
  DEFAULT_FISCAL_END_MONTH,
  SETTLEMENT_MONTH_LABEL,
  buildFiscalYearMonths,
  getFiscalYearStartMonth,
  getLastRegularFiscalMonth,
  monthLabelToNumber,
  normalizeFiscalEndMonth,
} from './fiscalCalendar.js';

export { DEFAULT_FISCAL_END_MONTH, normalizeFiscalEndMonth } from './fiscalCalendar.js';

const APP_SETTINGS_STORAGE_KEY = 'mga-app-settings';

export const DEFAULT_BUSINESS_START_YEAR = 2018;

/** 設定 UI で 100% と表示するときの実際の CSS 倍率 */
export const DESIGN_FONT_BASELINE = 0.85;

/** 設定 UI 上の倍率（100% = DESIGN_FONT_BASELINE） */
export const DEFAULT_FONT_SCALE = 1;
export const MIN_FONT_SCALE = 0.5;
export const MAX_FONT_SCALE = 1.5;

/** 予実表 tbody 上下 padding の UI 倍率（1 = デフォルト） */
export const DEFAULT_ROW_PADDING_SCALE = 1;
export const MIN_ROW_PADDING_SCALE = 1;
export const MAX_ROW_PADDING_SCALE = 5;

/** 補助科目の法人等判定に使う文字列マーカー（カンマ区切り） */
export const DEFAULT_CORP_ENTITY_MARKERS = '㈱,㈲,(同),株式会社,有限会社,合同会社';

export const DEFAULT_COMPANY_NAME = 'サウンド株式会社';
export const DEFAULT_BRAND_ICON_TEXT = 'SKK';
export const DEFAULT_BRAND_FILL_COLOR = '#2563eb';
export const DEFAULT_BRAND_TEXT_COLOR = '#ffffff';
export const DEFAULT_BRAND_LOGO_OUTLINE_COLOR = '#a6a6a6';
export const DEFAULT_BRAND_LOGO_OUTLINE_WIDTH = 0;
export const MIN_BRAND_LOGO_OUTLINE_WIDTH = 0;
export const MAX_BRAND_LOGO_OUTLINE_WIDTH = 5;
export const DEFAULT_BRAND_LOGO_SHADOW_ENABLED = false;
export const DEFAULT_BRAND_LOGO_SHADOW_COLOR = '#000000';
export const DEFAULT_BRAND_LOGO_SHADOW_STRENGTH = 1;

/** ダークモード用ロゴ画像スタイルの初期値 */
const DEFAULT_BRAND_LOGO_IMAGE_DARK = {
  outlineColor: '#a6a6a6',
  outlineWidth: 0,
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowStrength: 1,
};

/** ライトモード用ロゴ画像スタイルの初期値 */
const DEFAULT_BRAND_LOGO_IMAGE_LIGHT = {
  outlineColor: '#a6a6a6',
  outlineWidth: 0.4,
  shadowEnabled: true,
  shadowColor: '#000000',
  shadowStrength: 1,
};
export const MIN_BRAND_LOGO_SHADOW_STRENGTH = 0;
export const MAX_BRAND_LOGO_SHADOW_STRENGTH = 5;
const BRAND_LOGO_SHADOW_ALPHA = 0.4;
const BRAND_LOGO_SHADOW_OFFSET_PX = 2;
const BRAND_LOGO_SHADOW_BLUR_PX = 3;

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

export function normalizeBrandLogoOutlineWidth(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BRAND_LOGO_OUTLINE_WIDTH;
  const clamped = Math.min(MAX_BRAND_LOGO_OUTLINE_WIDTH, Math.max(MIN_BRAND_LOGO_OUTLINE_WIDTH, n));
  return Math.round(clamped * 10) / 10;
}

export function formatBrandLogoOutlineWidth(value) {
  return normalizeBrandLogoOutlineWidth(value).toFixed(1);
}

export function normalizeBrandLogoShadowEnabled(value) {
  return Boolean(value);
}

export function normalizeBrandLogoShadowStrength(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BRAND_LOGO_SHADOW_STRENGTH;
  const clamped = Math.min(
    MAX_BRAND_LOGO_SHADOW_STRENGTH,
    Math.max(MIN_BRAND_LOGO_SHADOW_STRENGTH, n),
  );
  return Math.round(clamped * 10) / 10;
}

export function formatBrandLogoShadowStrength(value) {
  return normalizeBrandLogoShadowStrength(value).toFixed(1);
}

function normalizeBrandLogoImageModeBucket(raw = {}) {
  return {
    outlineColor: normalizeBrandColor(raw.outlineColor, DEFAULT_BRAND_LOGO_OUTLINE_COLOR),
    outlineWidth: normalizeBrandLogoOutlineWidth(raw.outlineWidth),
    shadowEnabled: normalizeBrandLogoShadowEnabled(raw.shadowEnabled),
    shadowColor: normalizeBrandColor(raw.shadowColor, DEFAULT_BRAND_LOGO_SHADOW_COLOR),
    shadowStrength: normalizeBrandLogoShadowStrength(raw.shadowStrength),
  };
}

function normalizeBrandLogoImageByMode(raw = {}) {
  return {
    dark: normalizeBrandLogoImageModeBucket(raw.dark ?? {}),
    light: normalizeBrandLogoImageModeBucket(raw.light ?? {}),
  };
}

export function createDefaultBrandLogoImageByMode() {
  return {
    dark: normalizeBrandLogoImageModeBucket(DEFAULT_BRAND_LOGO_IMAGE_DARK),
    light: normalizeBrandLogoImageModeBucket(DEFAULT_BRAND_LOGO_IMAGE_LIGHT),
  };
}

export function getBrandLogoImageSettings(settings, mode = 'dark') {
  const normalized = normalizeBrandLogoImageByMode(settings?.brandLogoImage ?? {});
  return normalized[mode === 'light' ? 'light' : 'dark'];
}

export function setBrandLogoImageModeSettings(settings, mode, patch) {
  const key = mode === 'light' ? 'light' : 'dark';
  const normalized = normalizeBrandLogoImageByMode(settings?.brandLogoImage ?? {});
  return {
    ...settings,
    brandLogoImage: {
      ...normalized,
      [key]: normalizeBrandLogoImageModeBucket({
        ...normalized[key],
        ...patch,
      }),
    },
  };
}

export function resolveBrandLogoVisualSettings(settings, mode = 'dark') {
  const img = getBrandLogoImageSettings(settings, mode);
  return {
    brandLogoOutlineColor: img.outlineColor,
    brandLogoOutlineWidth: img.outlineWidth,
    brandLogoShadowEnabled: img.shadowEnabled,
    brandLogoShadowColor: img.shadowColor,
    brandLogoShadowStrength: img.shadowStrength,
  };
}

export function getBrandLogoImageModeLabel(mode = 'dark') {
  return mode === 'light' ? 'ライトモード' : 'ダークモード';
}

function brandColorToRgba(hex, alpha) {
  const normalized = normalizeBrandColor(hex, DEFAULT_BRAND_LOGO_SHADOW_COLOR);
  const h = normalized.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildBrandLogoShadowFilter(settings, viewportScale = getViewportScale()) {
  if (!normalizeBrandLogoShadowEnabled(settings?.brandLogoShadowEnabled)) return '';
  const strength = normalizeBrandLogoShadowStrength(settings?.brandLogoShadowStrength);
  if (strength <= 0) return '';
  const color = brandColorToRgba(
    settings?.brandLogoShadowColor,
    Math.min(1, BRAND_LOGO_SHADOW_ALPHA * strength),
  );
  const offset = Math.round(BRAND_LOGO_SHADOW_OFFSET_PX * strength * viewportScale * 100) / 100;
  const blur = Math.round(BRAND_LOGO_SHADOW_BLUR_PX * strength * viewportScale * 100) / 100;
  return `drop-shadow(${offset}px ${offset}px ${blur}px ${color})`;
}

export function buildBrandLogoImageFilter(settings, viewportScale = getViewportScale()) {
  const parts = [];
  const outline = buildBrandLogoOutlineFilter(settings, viewportScale);
  if (outline !== 'none') parts.push(outline);
  const shadow = buildBrandLogoShadowFilter(settings, viewportScale);
  if (shadow) parts.push(shadow);
  return parts.length ? parts.join(' ') : 'none';
}

const PLAN_LOGO_OUTLINE_FILTER_ID = 'plan-logo-outline-filter';
const PLAN_LOGO_OUTLINE_MORPH_ID = 'plan-logo-outline-morph';
const PLAN_LOGO_OUTLINE_FLOOD_ID = 'plan-logo-outline-flood';
const SVG_NS = 'http://www.w3.org/2000/svg';

function ensurePlanLogoOutlineSvgFilter() {
  if (typeof document === 'undefined') return PLAN_LOGO_OUTLINE_FILTER_ID;
  if (document.getElementById(PLAN_LOGO_OUTLINE_FILTER_ID)) {
    return PLAN_LOGO_OUTLINE_FILTER_ID;
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';

  const defs = document.createElementNS(SVG_NS, 'defs');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = PLAN_LOGO_OUTLINE_FILTER_ID;
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.setAttribute('primitiveUnits', 'userSpaceOnUse');

  const morph = document.createElementNS(SVG_NS, 'feMorphology');
  morph.id = PLAN_LOGO_OUTLINE_MORPH_ID;
  morph.setAttribute('in', 'SourceAlpha');
  morph.setAttribute('operator', 'dilate');
  morph.setAttribute('radius', '1');
  morph.setAttribute('result', 'dilated');

  const flood = document.createElementNS(SVG_NS, 'feFlood');
  flood.id = PLAN_LOGO_OUTLINE_FLOOD_ID;
  flood.setAttribute('flood-color', DEFAULT_BRAND_LOGO_OUTLINE_COLOR);
  flood.setAttribute('result', 'flood');

  const composite = document.createElementNS(SVG_NS, 'feComposite');
  composite.setAttribute('in', 'flood');
  composite.setAttribute('in2', 'dilated');
  composite.setAttribute('operator', 'in');
  composite.setAttribute('result', 'outline');

  const merge = document.createElementNS(SVG_NS, 'feMerge');
  const outlineNode = document.createElementNS(SVG_NS, 'feMergeNode');
  outlineNode.setAttribute('in', 'outline');
  const sourceNode = document.createElementNS(SVG_NS, 'feMergeNode');
  sourceNode.setAttribute('in', 'SourceGraphic');
  merge.appendChild(outlineNode);
  merge.appendChild(sourceNode);

  filter.appendChild(morph);
  filter.appendChild(flood);
  filter.appendChild(composite);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return PLAN_LOGO_OUTLINE_FILTER_ID;
}

function updatePlanLogoOutlineSvgFilter(radius, color) {
  ensurePlanLogoOutlineSvgFilter();
  document.getElementById(PLAN_LOGO_OUTLINE_MORPH_ID)?.setAttribute('radius', String(radius));
  document.getElementById(PLAN_LOGO_OUTLINE_FLOOD_ID)?.setAttribute('flood-color', color);
}

export function buildBrandLogoOutlineFilter(settings, viewportScale = getViewportScale()) {
  const width = normalizeBrandLogoOutlineWidth(settings?.brandLogoOutlineWidth);
  if (width <= 0) return 'none';
  const color = normalizeBrandColor(
    settings?.brandLogoOutlineColor,
    DEFAULT_BRAND_LOGO_OUTLINE_COLOR,
  );
  const radius = Math.round(width * viewportScale * 100) / 100;
  updatePlanLogoOutlineSvgFilter(radius, color);
  return `url(#${PLAN_LOGO_OUTLINE_FILTER_ID})`;
}

function applyBrandLogoImageFilterToElement(img, filter) {
  if (!img) return;
  if (!filter || filter === 'none') {
    img.style.filter = 'none';
    return;
  }
  img.style.filter = 'none';
  void img.offsetWidth;
  img.style.filter = filter;
}

export function applyBrandLogoImageFilters(settings, mode = 'dark') {
  if (!hasBrandLogo(settings)) return;
  const withVisual = { ...settings, ...resolveBrandLogoVisualSettings(settings, mode) };
  const filter = buildBrandLogoImageFilter(withVisual);
  document.querySelectorAll('.plan-logo-image img').forEach((img) => {
    applyBrandLogoImageFilterToElement(img, filter);
  });
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
    if (img.src !== dataUrl) {
      img.src = dataUrl;
    }
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

export function applyBrandSettings(settings, mode = 'dark') {
  document.querySelectorAll('.plan-logo').forEach((logo) => {
    applyBrandToLogoElement(logo, settings);
  });
  applyBrandLogoImageFilters(settings, mode);
  document.querySelectorAll('.plan-company').forEach((company) => {
    company.textContent = normalizeCompanyName(settings.companyName);
  });
}

export const DEFAULT_APP_SETTINGS = {
  fiscalPeriod: null,
  fontScale: DEFAULT_FONT_SCALE,
  rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
  corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
  companyName: DEFAULT_COMPANY_NAME,
  brandIconText: DEFAULT_BRAND_ICON_TEXT,
  brandFillColor: DEFAULT_BRAND_FILL_COLOR,
  brandTextColor: DEFAULT_BRAND_TEXT_COLOR,
  brandLogoImage: createDefaultBrandLogoImageByMode(),
  accountingTaxBasis: DEFAULT_ACCOUNTING_TAX_BASIS,
  consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
  withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
  legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
  taxSimulation: normalizeTaxSimulation(DEFAULT_TAX_SIMULATION),
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

export function formatFontScaleMultiplier(uiScale) {
  return `×${normalizeFontScale(uiScale).toFixed(2).replace(/(\.\d)0$/, '$1')}`;
}

export function applyFontScale(uiScale, contentFitScale = getContentFitScale()) {
  const viewportScale = getViewportScale();
  const actual = Math.round(fontScaleUiToActual(uiScale) * viewportScale * contentFitScale * 100) / 100;
  document.documentElement.style.setProperty(
    '--plan-font-scale',
    String(actual),
  );
}

export function normalizeRowPaddingScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ROW_PADDING_SCALE;
  const clamped = Math.min(MAX_ROW_PADDING_SCALE, Math.max(MIN_ROW_PADDING_SCALE, n));
  return Math.round(clamped * 10) / 10;
}

export function formatRowPaddingScaleMultiplier(uiScale) {
  const n = normalizeRowPaddingScale(uiScale);
  return `行間 ×${n.toFixed(1)}`;
}

export function applyRowPaddingScale(uiScale, contentFitScale = getContentFitScale()) {
  const viewportScale = getViewportScale();
  const actual = Math.round(normalizeRowPaddingScale(uiScale) * viewportScale * contentFitScale * 100) / 100;
  document.documentElement.style.setProperty(
    '--plan-row-padding-scale',
    String(actual),
  );
}

function loadFontScale(parsed) {
  return normalizeFontScale(parsed?.fontScale);
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

/** 第 N 期の月→年ラベル */
export function buildMonthYearMap(businessStartYear, fiscalPeriod, fiscalEndMonth = DEFAULT_FISCAL_END_MONTH) {
  const startMonth = getFiscalYearStartMonth(fiscalEndMonth);
  const startYear = businessStartYear + fiscalPeriod - 1;
  const endYear = businessStartYear + fiscalPeriod;
  const map = {};
  for (const label of buildFiscalYearMonths(fiscalEndMonth)) {
    const num = monthLabelToNumber(label);
    if (num == null) continue;
    if (startMonth === 12) {
      map[label] = num === 12 ? startYear : endYear;
    } else {
      map[label] = num >= startMonth ? startYear : endYear;
    }
  }
  map[SETTLEMENT_MONTH_LABEL] = endYear;
  return map;
}

function parseMonthLabelNumber(label) {
  return monthLabelToNumber(label);
}

/** 今日より前の会計月（fiscalMonths 内の月ラベル） */
export function buildPastFiscalMonthSet(
  businessStartYear,
  fiscalPeriod,
  fiscalMonths,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const monthYearMap = buildMonthYearMap(businessStartYear, fiscalPeriod, fiscalEndMonth);
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

/** 表示中期における本日の会計月ラベル（該当なしは null） */
export function getCurrentFiscalMonthLabel(
  businessStartYear,
  fiscalPeriod,
  fiscalMonths,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const monthYearMap = buildMonthYearMap(businessStartYear, fiscalPeriod, fiscalEndMonth);
  const refYear = date.getFullYear();
  const refMonth = date.getMonth() + 1;

  for (const monthLabel of fiscalMonths) {
    const year = monthYearMap[monthLabel];
    if (year == null) continue;
    const monthNum = parseMonthLabelNumber(monthLabel);
    if (monthNum == null) continue;
    if (year === refYear && monthNum === refMonth) {
      return monthLabel;
    }
  }
  return null;
}

export function getFiscalPeriodForDate(
  businessStartYear,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startMonth = getFiscalYearStartMonth(fiscalEndMonth);
  if (startMonth === 12) {
    const anchorYear = m === 12 ? y : y - 1;
    return anchorYear - businessStartYear + 1;
  }
  const endYear = m >= startMonth ? y + 1 : y;
  return endYear - businessStartYear;
}

export function getMaxSelectablePeriod(
  businessStartYear,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  return Math.max(1, getFiscalPeriodForDate(businessStartYear, date, fiscalEndMonth) + 1);
}

/** 選択期が来期（実績 CSV なし・計画表示のみ）か */
export function isPlanOnlyPeriod(
  businessStartYear,
  fiscalPeriod,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  return fiscalPeriod > getFiscalPeriodForDate(businessStartYear, date, fiscalEndMonth);
}

export function getFiscalPeriodDisplayMode(
  businessStartYear,
  fiscalPeriod,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const currentPeriod = getFiscalPeriodForDate(businessStartYear, date, fiscalEndMonth);
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

export function getDefaultFiscalPeriod(
  businessStartYear,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  return getFiscalPeriodForDate(businessStartYear, date, fiscalEndMonth);
}

export function normalizeFiscalPeriod(
  businessStartYear,
  fiscalPeriod,
  date = new Date(),
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const max = getMaxSelectablePeriod(businessStartYear, date, fiscalEndMonth);
  const n = Number(fiscalPeriod);
  if (!Number.isInteger(n) || n < 1) return getDefaultFiscalPeriod(businessStartYear, date, fiscalEndMonth);
  return Math.min(max, Math.max(1, n));
}

function toFullWidthAsciiDigits(value) {
  return String(value).replace(/\d/g, (digit) => String.fromCodePoint(0xFF10 + Number(digit)));
}

function normalizeFullWidthAsciiDigits(text) {
  return String(text).replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
}

export function formatFiscalPeriodLabel(fiscalPeriod) {
  return `第${toFullWidthAsciiDigits(fiscalPeriod)}期`;
}

export function parseFiscalPeriod(label) {
  const normalized = normalizeFullWidthAsciiDigits(label);
  const m = normalized.match(/第(\d+)期/);
  return m ? parseInt(m[1], 10) : 8;
}

export function fiscalPeriodJournalBounds(
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const startMonth = getFiscalYearStartMonth(fiscalEndMonth);
  const lastMonth = monthLabelToNumber(getLastRegularFiscalMonth(fiscalEndMonth));
  const startYear = businessStartYear + fiscalPeriod - 1;
  const endYear = businessStartYear + fiscalPeriod;
  return {
    startPrefix: `${startYear}-${String(startMonth).padStart(2, '0')}`,
    endPrefix: `${endYear}-${String(lastMonth).padStart(2, '0')}`,
  };
}

/** 仕訳データCSVのファイル名から期間の開始・終了日を解析する */
export function parseJournalCsvFileName(fileName) {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  const m = base.match(/^仕訳データ_(\d{4})-(\d{2})-\d{2}_(\d{4})-(\d{2})-\d{2}\.csv$/);
  if (!m) return null;
  return {
    startYear: parseInt(m[1], 10),
    startMonth: parseInt(m[2], 10),
    endYear: parseInt(m[3], 10),
    endMonth: parseInt(m[4], 10),
  };
}

/** 仕訳CSVの終了日から決算月を推定 */
export function inferFiscalEndMonthFromJournalFileName(fileName) {
  const parsed = parseJournalCsvFileName(fileName);
  if (!parsed) return null;
  return normalizeFiscalEndMonth(parsed.endMonth);
}

/** 仕訳CSV群のうち開始日が最古のファイル名を返す */
export function pickOldestJournalCsvFileName(journalItems) {
  if (!journalItems?.length) return null;
  const sorted = [...journalItems].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : a.name;
    const nameB = typeof b === 'string' ? b : b.name;
    const pa = parseJournalCsvFileName(nameA);
    const pb = parseJournalCsvFileName(nameB);
    if (!pa && !pb) return nameA.localeCompare(nameB, 'ja');
    if (!pa) return 1;
    if (!pb) return -1;
    if (pa.startYear !== pb.startYear) return pa.startYear - pb.startYear;
    if (pa.startMonth !== pb.startMonth) return pa.startMonth - pb.startMonth;
    return nameA.localeCompare(nameB, 'ja');
  });
  const first = sorted[0];
  return typeof first === 'string' ? first : first.name;
}

/** 最古の仕訳CSVを第1期として事業開始年を推定 */
export function inferBusinessStartYearFromJournalFileName(fileName) {
  const parsed = parseJournalCsvFileName(fileName);
  if (!parsed) return null;
  const fiscalEndMonth = inferFiscalEndMonthFromJournalFileName(fileName);
  if (fiscalEndMonth == null) return null;
  const fromEndYear = parsed.endYear - 1;
  if (journalFileMatchesFiscalPeriod(fileName, fromEndYear, 1, fiscalEndMonth)) {
    return fromEndYear;
  }
  if (journalFileMatchesFiscalPeriod(fileName, parsed.startYear, 1, fiscalEndMonth)) {
    return parsed.startYear;
  }
  return fromEndYear;
}

/** 仕訳CSVの配列から事業開始年を推定 */
export function inferBusinessStartYearFromJournalItems(journalItems) {
  const fileName = pickOldestJournalCsvFileName(journalItems);
  if (!fileName) return null;
  return inferBusinessStartYearFromJournalFileName(fileName);
}

/** 仕訳CSVの期間が選択期と一致するか（決算月はファイル名から判定） */
export function journalFileMatchesFiscalPeriodByDates(fileName, businessStartYear, fiscalPeriod) {
  const fiscalEndMonth = inferFiscalEndMonthFromJournalFileName(fileName);
  if (fiscalEndMonth == null) return false;
  return journalFileMatchesFiscalPeriod(fileName, businessStartYear, fiscalPeriod, fiscalEndMonth);
}

/** 仕訳 CSV の期間が選択期と一致するか */
export function journalFileMatchesFiscalPeriod(
  fileName,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  const m = base.match(/^仕訳データ_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$/);
  if (!m) return false;
  const { startPrefix, endPrefix } = fiscalPeriodJournalBounds(
    businessStartYear,
    fiscalPeriod,
    fiscalEndMonth,
  );
  return m[1].startsWith(startPrefix) && m[2].startsWith(endPrefix);
}

export function csvDirname(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? '' : normalized.slice(0, idx);
}

/** ファイル名の出力日時（_YYYYMMDD_HHMM.csv）が選択期の範囲内か */
export function csvExportDateMatchesFiscalPeriod(
  fileName,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth = DEFAULT_FISCAL_END_MONTH,
) {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  const m = base.match(/_(\d{4})(\d{2})(\d{2})_\d{4}\.csv$/);
  if (!m) return false;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const startMonth = getFiscalYearStartMonth(fiscalEndMonth);
  const lastMonth = monthLabelToNumber(getLastRegularFiscalMonth(fiscalEndMonth));
  const startYear = businessStartYear + fiscalPeriod - 1;
  const endYear = businessStartYear + fiscalPeriod;
  if (y === startYear && mo >= startMonth && mo <= 12) return true;
  if (y === endYear && mo >= 1 && mo <= lastMonth) return true;
  return false;
}

function loadCorpEntityMarkers(stored) {
  if (stored == null || String(stored).trim() === '') {
    return DEFAULT_CORP_ENTITY_MARKERS;
  }
  return normalizeCorpEntityMarkers(stored);
}

function loadBrandSettings(parsed) {
  const companyName = parsed && Object.prototype.hasOwnProperty.call(parsed, 'companyName')
    ? normalizeCompanyName(parsed.companyName)
    : DEFAULT_COMPANY_NAME;
  const hasBrandLogoImage = parsed?.brandLogoImage
    && (parsed.brandLogoImage.dark || parsed.brandLogoImage.light);
  return {
    companyName,
    brandIconText: normalizeBrandIconText(parsed?.brandIconText),
    brandFillColor: normalizeBrandColor(parsed?.brandFillColor, DEFAULT_BRAND_FILL_COLOR),
    brandTextColor: normalizeBrandColor(parsed?.brandTextColor, DEFAULT_BRAND_TEXT_COLOR),
    brandLogoImage: hasBrandLogoImage
      ? normalizeBrandLogoImageByMode(parsed.brandLogoImage)
      : createDefaultBrandLogoImageByMode(),
    brandLogoDataUrl: normalizeBrandLogoDataUrl(parsed?.brandLogoDataUrl),
  };
}

export function loadAppSettings() {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        fiscalPeriod: getDefaultFiscalPeriod(DEFAULT_BUSINESS_START_YEAR),
        fontScale: DEFAULT_FONT_SCALE,
        rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
        corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
        ...loadBrandSettings(null),
        accountingTaxBasis: DEFAULT_ACCOUNTING_TAX_BASIS,
        consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
        withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
        legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
        taxSimulation: normalizeTaxSimulation(DEFAULT_TAX_SIMULATION),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      fiscalPeriod: normalizeFiscalPeriod(DEFAULT_BUSINESS_START_YEAR, parsed?.fiscalPeriod),
      fontScale: loadFontScale(parsed),
      rowPaddingScale: loadRowPaddingScale(parsed),
      corpEntityMarkers: loadCorpEntityMarkers(parsed?.corpEntityMarkers),
      ...loadBrandSettings(parsed),
      accountingTaxBasis: normalizeAccountingTaxBasis(parsed?.accountingTaxBasis),
      consumptionTaxRates: normalizeConsumptionTaxRates(parsed?.consumptionTaxRates),
      withholdingTaxRates: normalizeWithholdingTaxRates(parsed?.withholdingTaxRates),
      legalWelfareRate: normalizeLegalWelfareRate(parsed?.legalWelfareRate),
      taxSimulation: normalizeTaxSimulation(parsed?.taxSimulation),
    };
  } catch {
    return {
      fiscalPeriod: getDefaultFiscalPeriod(DEFAULT_BUSINESS_START_YEAR),
      fontScale: DEFAULT_FONT_SCALE,
      rowPaddingScale: DEFAULT_ROW_PADDING_SCALE,
      corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
      ...loadBrandSettings(null),
      accountingTaxBasis: DEFAULT_ACCOUNTING_TAX_BASIS,
      consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
      withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
      legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
      taxSimulation: normalizeTaxSimulation(DEFAULT_TAX_SIMULATION),
    };
  }
}

export function saveAppSettings(settings) {
  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

/** その他設定タブの項目のみデフォルトに戻す（フォント・行パディング等は維持） */
export function resetOtherAppSettings(current) {
  return {
    ...current,
    fiscalPeriod: normalizeFiscalPeriod(DEFAULT_BUSINESS_START_YEAR, current.fiscalPeriod),
    corpEntityMarkers: DEFAULT_CORP_ENTITY_MARKERS,
    companyName: DEFAULT_COMPANY_NAME,
    brandIconText: DEFAULT_BRAND_ICON_TEXT,
    brandFillColor: DEFAULT_BRAND_FILL_COLOR,
    brandTextColor: DEFAULT_BRAND_TEXT_COLOR,
    brandLogoImage: createDefaultBrandLogoImageByMode(),
    brandLogoDataUrl: null,
  };
}
