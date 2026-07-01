const UI_COLOR_STORAGE_KEY = 'mga-ui-colors';

const CURRENT_MONTH_OVERLAY_ALPHA = 0.28;
const CURRENT_MONTH_RING_ALPHA = 0.45;
const CURRENT_MONTH_OVERLAY_HEAD_ALPHA = 0.34;
const CURRENT_MONTH_OVERLAY_HOVER_ALPHA = 0.22;
const CURRENT_MONTH_OVERLAY_TOTAL_ALPHA = 0.32;

const SETTLEMENT_MONTH_OVERLAY_ALPHA = CURRENT_MONTH_OVERLAY_ALPHA;
const SETTLEMENT_MONTH_RING_ALPHA = CURRENT_MONTH_RING_ALPHA;
const SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA = CURRENT_MONTH_OVERLAY_HEAD_ALPHA;
const SETTLEMENT_MONTH_OVERLAY_TOTAL_ALPHA = CURRENT_MONTH_OVERLAY_TOTAL_ALPHA;

export const UI_COLOR_MODES = ['dark', 'light'];

const SHARED_UI_COLORS = {
  yearRowBg: '#c65911',
  yearRowText: '#ffffff',
  amountVarianceColor: '#C65911',
  negativeAmountColor: '#ff0000',
};

export const DEFAULT_UI_COLORS_DARK = {
  browserBg: '#262626',
  settingsSurfaceBg: '#19191A',
  settingsInputBg: '#353535',
  settingsInputBorder: '#565656',
  settingsButtonBg: '#262626',
  settingsRowHoverBg: '#2E2E2E',
  monthRowBg: '#595959',
  monthRowText: '#ffffff',
  currentMonthBg: '#800000',
  currentMonthBorder: '#ff0000',
  settlementMonthBg: '#000000',
  cellBg: '#262626',
  textColor: '#ffffff',
  noteTextColor: '#C9C9C9',
  hintTextColor: '#B3B3B3',
  textDimColor: '#929292',
  planAmountColor: '#00B0F0',
  fillColor1: '#404040',
  fillColor2: '#3F1B1B',
  warningTextColor: '#FFFF00',
  expandableHighlight: '#00ffff',
  rowHoverBorder: '#00ffff',
  rowSelectionRing: '#ffff00',
  ...SHARED_UI_COLORS,
};

export const DEFAULT_UI_COLORS_LIGHT = {
  browserBg: '#E8E8E8',
  settingsSurfaceBg: '#D9D9D9',
  settingsInputBg: '#FFFFFF',
  settingsInputBorder: '#B8B8B8',
  settingsButtonBg: '#FFFFFF',
  settingsRowHoverBg: '#EFEFEF',
  monthRowBg: '#D9D9D9',
  monthRowText: '#1A1A1A',
  currentMonthBg: '#CC6666',
  currentMonthBorder: '#CC0000',
  settlementMonthBg: '#B0B0B0',
  cellBg: '#FFFFFF',
  textColor: '#1A1A1A',
  noteTextColor: '#4A4A4A',
  hintTextColor: '#5C5C5C',
  textDimColor: '#757575',
  planAmountColor: '#0078D4',
  fillColor1: '#E8EEF4',
  fillColor2: '#F5E8E8',
  warningTextColor: '#8B6914',
  expandableHighlight: '#0078D4',
  rowHoverBorder: '#0078D4',
  rowSelectionRing: '#E6B800',
  ...SHARED_UI_COLORS,
  negativeAmountColor: '#C00000',
};

/** @deprecated DEFAULT_UI_COLORS_DARK と同義 */
export const DEFAULT_UI_COLORS = DEFAULT_UI_COLORS_DARK;

export const UI_COLOR_KEYS = Object.keys(DEFAULT_UI_COLORS_DARK);

const DEFAULTS_BY_MODE = {
  dark: DEFAULT_UI_COLORS_DARK,
  light: DEFAULT_UI_COLORS_LIGHT,
};

function parseHex(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

export function hexToRgba(hex, alpha) {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** 色設定を不透明な #rrggbb に正規化 */
export function opaqueHex(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function getUiColorMode(config = {}) {
  return config.colorMode === 'light' ? 'light' : 'dark';
}

export function getDefaultUiColors(mode = 'dark') {
  const key = mode === 'light' ? 'light' : 'dark';
  return { ...DEFAULTS_BY_MODE[key] };
}

const UI_COLOR_LEGACY_KEYS = [...UI_COLOR_KEYS, 'textFaintColor', 'appBg'];

function migrateUiColorBucket(bucket = {}) {
  const next = { ...bucket };
  if (next.textFaintColor != null && next.textDimColor == null) {
    next.textDimColor = next.textFaintColor;
  }
  delete next.textFaintColor;
  if (next.appBg != null && next.settingsInputBg == null) {
    next.settingsInputBg = next.appBg;
  }
  delete next.appBg;
  return next;
}

function hasLegacyUiColorFlatKeys(config) {
  return UI_COLOR_LEGACY_KEYS.some((key) => config[key] != null);
}

/** localStorage / エクスポート用の正規形（モード別上書き） */
export function normalizeUiColorConfig(config = {}) {
  if (!config || typeof config !== 'object') {
    return { colorMode: 'dark', dark: {}, light: {} };
  }

  const colorMode = config.colorMode === 'light' ? 'light' : 'dark';
  let dark = migrateUiColorBucket(
    typeof config.dark === 'object' && config.dark !== null ? { ...config.dark } : {},
  );
  let light = migrateUiColorBucket(
    typeof config.light === 'object' && config.light !== null ? { ...config.light } : {},
  );

  if (hasLegacyUiColorFlatKeys(config)) {
    const bucket = colorMode === 'light' ? light : dark;
    for (const key of UI_COLOR_LEGACY_KEYS) {
      if (config[key] != null) bucket[key] = config[key];
    }
    if (colorMode === 'light') {
      light = migrateUiColorBucket(bucket);
    } else {
      dark = migrateUiColorBucket(bucket);
    }
  }

  return { colorMode, dark, light };
}

function getUiColorModeBucket(config, mode = getUiColorMode(config)) {
  const normalized = normalizeUiColorConfig(config);
  return normalized[mode === 'light' ? 'light' : 'dark'] ?? {};
}

/** 表示モード切替（各モードの上書きは保持） */
export function switchUiColorMode(config, mode) {
  const normalized = normalizeUiColorConfig(config);
  return {
    ...normalized,
    colorMode: mode === 'light' ? 'light' : 'dark',
  };
}

/** @deprecated switchUiColorMode({}, mode) と同義 */
export function createUiColorConfigForMode(mode) {
  return switchUiColorMode({}, mode);
}

export function setUiColorKey(config, key, value) {
  const normalized = normalizeUiColorConfig(config);
  const mode = getUiColorMode(normalized);
  const modeKey = mode === 'light' ? 'light' : 'dark';
  return {
    ...normalized,
    [modeKey]: { ...normalized[modeKey], [key]: value },
  };
}

export function setUiColorKeys(config, keys, values) {
  let next = config;
  keys.forEach((key, index) => {
    next = setUiColorKey(next, key, values[index]);
  });
  return next;
}

export function resetUiColorKey(config, key) {
  const normalized = normalizeUiColorConfig(config);
  const mode = getUiColorMode(normalized);
  const modeKey = mode === 'light' ? 'light' : 'dark';
  const bucket = { ...normalized[modeKey] };
  delete bucket[key];
  return { ...normalized, [modeKey]: bucket };
}

/** 指定モードの UI 色上書きをすべて削除 */
export function resetUiColorModeOverrides(config, mode = getUiColorMode(config)) {
  const normalized = normalizeUiColorConfig(config);
  const modeKey = mode === 'light' ? 'light' : 'dark';
  return { ...normalized, [modeKey]: {} };
}

/** 補助科目行など、セル背景より一段暗い色 */
export function darkenHex(hex, ratio = 0.12) {
  const rgb = parseHex(hex);
  if (!rgb) return DEFAULT_UI_COLORS_DARK.cellBg;
  const factor = 1 - ratio;
  return `#${toHex(rgb.r * factor)}${toHex(rgb.g * factor)}${toHex(rgb.b * factor)}`;
}

export function loadUiColorConfig() {
  try {
    const raw = localStorage.getItem(UI_COLOR_STORAGE_KEY);
    return normalizeUiColorConfig(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeUiColorConfig({});
  }
}

export function saveUiColorConfig(config) {
  localStorage.setItem(UI_COLOR_STORAGE_KEY, JSON.stringify(normalizeUiColorConfig(config)));
}

export function getUiColors(config = {}) {
  const normalized = normalizeUiColorConfig(config);
  const mode = getUiColorMode(normalized);
  const defaults = getDefaultUiColors(mode);
  const result = { ...defaults };
  const bucket = getUiColorModeBucket(normalized, mode);
  for (const key of UI_COLOR_KEYS) {
    if (bucket[key] != null) result[key] = bucket[key];
  }
  return result;
}

export function isUiColorKeyCustom(config, key) {
  const normalized = normalizeUiColorConfig(config);
  const mode = getUiColorMode(normalized);
  const bucket = getUiColorModeBucket(normalized, mode);
  if (bucket[key] == null) return false;
  return bucket[key] !== getDefaultUiColors(mode)[key];
}

export function applyUiColors(config = {}) {
  const colors = getUiColors(config);
  const {
    browserBg,
    settingsSurfaceBg, settingsInputBg, settingsInputBorder,
    settingsButtonBg, settingsRowHoverBg,
    cellBg, textColor,
    noteTextColor, hintTextColor, textDimColor,
    negativeAmountColor,
    yearRowBg, yearRowText, monthRowBg, monthRowText,
    currentMonthBg, currentMonthBorder, settlementMonthBg,
    rowHoverBorder, rowSelectionRing,
    expandableHighlight,
    fillColor1, fillColor2,
    planAmountColor, amountVarianceColor,
    warningTextColor,
  } = colors;

  document.documentElement.style.setProperty('--plan-browser-bg', browserBg);
  document.documentElement.dataset.planColorMode = getUiColorMode(config);

  const root = document.querySelector('.plan-app');
  if (!root) return;

  root.dataset.planColorMode = getUiColorMode(config);
  root.style.setProperty('--plan-browser-bg', browserBg);
  root.style.setProperty('--plan-surface', opaqueHex(settingsSurfaceBg));
  root.style.setProperty('--plan-editor-bg', opaqueHex(settingsInputBg));
  root.style.setProperty('--plan-editor-border', opaqueHex(settingsInputBorder));
  root.style.setProperty('--plan-settings-button-bg', opaqueHex(settingsButtonBg));
  root.style.setProperty('--plan-settings-row-hover', opaqueHex(settingsRowHoverBg));
  root.style.setProperty('--plan-bg', opaqueHex(settingsInputBg));
  root.style.setProperty('--plan-cell-bg', cellBg);
  root.style.setProperty('--plan-text', textColor);
  root.style.setProperty('--plan-muted', textColor);
  root.style.setProperty('--plan-note-text', opaqueHex(noteTextColor));
  root.style.setProperty('--plan-hint-text', opaqueHex(hintTextColor));
  root.style.setProperty('--plan-text-dim', opaqueHex(textDimColor));
  root.style.setProperty('--plan-negative-amount', negativeAmountColor);
  root.style.setProperty('--plan-year-row-bg', yearRowBg);
  root.style.setProperty('--plan-year-row-text', yearRowText);
  root.style.setProperty('--plan-month-row-bg', monthRowBg);
  root.style.setProperty('--plan-month-row-text', monthRowText);
  root.style.setProperty('--current-month-overlay', hexToRgba(currentMonthBg, CURRENT_MONTH_OVERLAY_ALPHA));
  root.style.setProperty('--current-month-ring', hexToRgba(currentMonthBorder, CURRENT_MONTH_RING_ALPHA));
  root.style.setProperty('--current-month-overlay-head', hexToRgba(currentMonthBg, CURRENT_MONTH_OVERLAY_HEAD_ALPHA));
  root.style.setProperty('--current-month-overlay-hover', hexToRgba(currentMonthBg, CURRENT_MONTH_OVERLAY_HOVER_ALPHA));
  root.style.setProperty('--current-month-overlay-total', hexToRgba(currentMonthBg, CURRENT_MONTH_OVERLAY_TOTAL_ALPHA));
  root.style.setProperty('--settlement-month-overlay', hexToRgba(settlementMonthBg, SETTLEMENT_MONTH_OVERLAY_ALPHA));
  root.style.setProperty('--settlement-month-ring', hexToRgba(settlementMonthBg, SETTLEMENT_MONTH_RING_ALPHA));
  root.style.setProperty('--settlement-month-overlay-head', hexToRgba(settlementMonthBg, SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA));
  root.style.setProperty('--settlement-month-overlay-total', hexToRgba(settlementMonthBg, SETTLEMENT_MONTH_OVERLAY_TOTAL_ALPHA));
  root.style.setProperty('--row-hover-border', opaqueHex(rowHoverBorder));
  root.style.setProperty('--row-selection-ring', opaqueHex(rowSelectionRing));
  root.style.setProperty('--plan-expandable-highlight', opaqueHex(expandableHighlight));
  root.style.setProperty('--plan-fill-color-1', opaqueHex(fillColor1));
  root.style.setProperty('--plan-fill-color-2', opaqueHex(fillColor2));
  root.style.setProperty('--plan-amount-color', opaqueHex(planAmountColor));
  root.style.setProperty('--plan-amount-variance-color', opaqueHex(amountVarianceColor));
  root.style.setProperty('--plan-warning-text', opaqueHex(warningTextColor));
}

export function isUiColorCustom(config = {}) {
  const normalized = normalizeUiColorConfig(config);
  const mode = getUiColorMode(normalized);
  const bucket = getUiColorModeBucket(normalized, mode);
  const defaults = getDefaultUiColors(mode);
  return UI_COLOR_KEYS.some((key) => bucket[key] != null && bucket[key] !== defaults[key]);
}
