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

const JOURNAL_OVERLAY_ALPHA = 0.65;
const JOURNAL_MODAL_SHADOW_ALPHA = 0.45;
const JOURNAL_ROW_HOVER_ALPHA = 0.03;
const JOURNAL_CLOSE_HOVER_ALPHA = 0.08;

const CONTEXT_MENU_SHADOW_ALPHA = 0.45;
const CONTEXT_MENU_ITEM_HOVER_ALPHA = 0.08;
const LOADING_OVERLAY_ALPHA = 0.38;
const CSV_DROP_ACTIVE_BG_ALPHA = 0.08;
const BONUS_MONTH_COLUMN_ALPHA = 0.08;

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
  journalOverlayBg: '#000000',
  journalModalBg: '#1e1e28',
  journalModalShadowBg: '#000000',
  journalRowHoverBg: '#ffffff',
  journalCloseHoverBg: '#ffffff',
  journalTextColor: '#ffffff',
  journalHintTextColor: '#B3B3B3',
  journalTableHeaderBg: '#262626',
  accentColor: '#ff0000',
  deleteBtnBg: '#dc2626',
  deleteBtnBgHover: '#b91c1c',
  deleteBtnBorder: '#b91c1c',
  deleteBtnText: '#ffffff',
  tableHeaderBg: '#1e1e28',
  contextMenuBg: '#1e1e28',
  contextMenuShadowBg: '#000000',
  contextMenuItemHoverBg: '#ffffff',
  periodModeBudgetActualBg: '#0891b2',
  periodModeActualBg: '#16a34a',
  periodModePlanBg: '#ea580c',
  periodModeTextColor: '#ffffff',
  loadingOverlayBg: '#08080e',
  statusOkColor: '#86efac',
  statusErrorColor: '#fca5a5',
  statusInvalidColor: '#ef4444',
  primaryButtonBgStart: '#3b82f6',
  primaryButtonBgEnd: '#2563eb',
  primaryButtonTextColor: '#ffffff',
  interactiveAccentColor: '#2563eb',
  bonusMonthColumnBg: '#86efac',
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
  journalOverlayBg: '#000000',
  journalModalBg: '#FFFFFF',
  journalModalShadowBg: '#000000',
  journalRowHoverBg: '#000000',
  journalCloseHoverBg: '#000000',
  journalTextColor: '#1A1A1A',
  journalHintTextColor: '#5C5C5C',
  journalTableHeaderBg: '#FFFFFF',
  accentColor: '#0078D4',
  deleteBtnBg: '#dc2626',
  deleteBtnBgHover: '#b91c1c',
  deleteBtnBorder: '#b91c1c',
  deleteBtnText: '#ffffff',
  tableHeaderBg: '#E8E8E8',
  contextMenuBg: '#FFFFFF',
  contextMenuShadowBg: '#000000',
  contextMenuItemHoverBg: '#000000',
  periodModeBudgetActualBg: '#0891b2',
  periodModeActualBg: '#16a34a',
  periodModePlanBg: '#ea580c',
  periodModeTextColor: '#ffffff',
  loadingOverlayBg: '#000000',
  statusOkColor: '#15803d',
  statusErrorColor: '#dc2626',
  statusInvalidColor: '#ef4444',
  primaryButtonBgStart: '#3b82f6',
  primaryButtonBgEnd: '#2563eb',
  primaryButtonTextColor: '#ffffff',
  interactiveAccentColor: '#2563eb',
  bonusMonthColumnBg: '#86efac',
  ...SHARED_UI_COLORS,
  negativeAmountColor: '#C00000',
};

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
    journalOverlayBg, journalModalBg, journalModalShadowBg,
    journalRowHoverBg, journalCloseHoverBg,
    journalTextColor, journalHintTextColor, journalTableHeaderBg,
    accentColor,
    deleteBtnBg, deleteBtnBgHover, deleteBtnBorder, deleteBtnText,
    tableHeaderBg,
    contextMenuBg, contextMenuShadowBg, contextMenuItemHoverBg,
    periodModeBudgetActualBg, periodModeActualBg, periodModePlanBg, periodModeTextColor,
    loadingOverlayBg,
    statusOkColor, statusErrorColor, statusInvalidColor,
    primaryButtonBgStart, primaryButtonBgEnd, primaryButtonTextColor,
    interactiveAccentColor,
    bonusMonthColumnBg,
    fillColor1, fillColor2,
    planAmountColor, amountVarianceColor,
    warningTextColor,
  } = colors;

  const doc = document.documentElement;
  const borderMix = `color-mix(in srgb, ${opaqueHex(textColor)} 14%, ${opaqueHex(browserBg)})`;

  doc.style.setProperty('--plan-browser-bg', browserBg);
  doc.dataset.planColorMode = getUiColorMode(config);
  doc.style.setProperty('--plan-border', borderMix);
  doc.style.setProperty('--plan-text', textColor);
  doc.style.setProperty('--plan-text-dim', opaqueHex(textDimColor));
  doc.style.setProperty('--plan-accent', opaqueHex(accentColor));
  doc.style.setProperty(
    '--plan-journal-overlay',
    hexToRgba(journalOverlayBg, JOURNAL_OVERLAY_ALPHA),
  );
  doc.style.setProperty('--plan-journal-modal-bg', opaqueHex(journalModalBg));
  doc.style.setProperty(
    '--plan-journal-modal-shadow',
    hexToRgba(journalModalShadowBg, JOURNAL_MODAL_SHADOW_ALPHA),
  );
  doc.style.setProperty(
    '--plan-journal-row-hover',
    hexToRgba(journalRowHoverBg, JOURNAL_ROW_HOVER_ALPHA),
  );
  doc.style.setProperty(
    '--plan-journal-close-hover',
    hexToRgba(journalCloseHoverBg, JOURNAL_CLOSE_HOVER_ALPHA),
  );
  doc.style.setProperty('--plan-journal-text', opaqueHex(journalTextColor));
  doc.style.setProperty('--plan-journal-hint-text', opaqueHex(journalHintTextColor));
  doc.style.setProperty('--plan-journal-table-header-bg', opaqueHex(journalTableHeaderBg));
  doc.style.setProperty('--plan-context-menu-bg', opaqueHex(contextMenuBg));
  doc.style.setProperty(
    '--plan-context-menu-shadow',
    hexToRgba(contextMenuShadowBg, CONTEXT_MENU_SHADOW_ALPHA),
  );
  doc.style.setProperty(
    '--plan-context-menu-item-hover',
    hexToRgba(contextMenuItemHoverBg, CONTEXT_MENU_ITEM_HOVER_ALPHA),
  );
  doc.style.setProperty(
    '--plan-loading-overlay',
    hexToRgba(loadingOverlayBg, LOADING_OVERLAY_ALPHA),
  );

  const root = document.querySelector('.plan-app');
  if (!root) return;

  root.dataset.planColorMode = getUiColorMode(config);
  root.style.setProperty('--plan-browser-bg', browserBg);
  root.style.setProperty('--plan-border', borderMix);
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
  root.style.setProperty('--plan-accent', opaqueHex(accentColor));
  root.style.setProperty('--plan-delete-btn-bg', opaqueHex(deleteBtnBg));
  root.style.setProperty('--plan-delete-btn-bg-hover', opaqueHex(deleteBtnBgHover));
  root.style.setProperty('--plan-delete-btn-border', opaqueHex(deleteBtnBorder));
  root.style.setProperty('--plan-delete-btn-text', opaqueHex(deleteBtnText));
  root.style.setProperty('--plan-table-header-bg', opaqueHex(tableHeaderBg));
  root.style.setProperty('--plan-period-mode-budget-actual-bg', opaqueHex(periodModeBudgetActualBg));
  root.style.setProperty('--plan-period-mode-actual-bg', opaqueHex(periodModeActualBg));
  root.style.setProperty('--plan-period-mode-plan-bg', opaqueHex(periodModePlanBg));
  root.style.setProperty('--plan-period-mode-text', opaqueHex(periodModeTextColor));
  root.style.setProperty('--plan-status-ok', opaqueHex(statusOkColor));
  root.style.setProperty('--plan-status-error', opaqueHex(statusErrorColor));
  root.style.setProperty('--plan-status-invalid', opaqueHex(statusInvalidColor));
  root.style.setProperty('--plan-primary-btn-start', opaqueHex(primaryButtonBgStart));
  root.style.setProperty('--plan-primary-btn-end', opaqueHex(primaryButtonBgEnd));
  root.style.setProperty('--plan-primary-btn-text', opaqueHex(primaryButtonTextColor));
  root.style.setProperty('--plan-interactive-accent', opaqueHex(interactiveAccentColor));
  root.style.setProperty(
    '--plan-csv-drop-active-bg',
    hexToRgba(interactiveAccentColor, CSV_DROP_ACTIVE_BG_ALPHA),
  );
  root.style.setProperty(
    '--plan-bonus-month-column-bg',
    hexToRgba(bonusMonthColumnBg, BONUS_MONTH_COLUMN_ALPHA),
  );
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
