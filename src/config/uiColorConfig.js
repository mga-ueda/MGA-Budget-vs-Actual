const UI_COLOR_STORAGE_KEY = 'mga-ui-colors';

export const DEFAULT_HOVER_BOOST_PERCENT = 20;

const SETTLEMENT_MONTH_OVERLAY_ALPHA = 0.28;
const SETTLEMENT_MONTH_RING_ALPHA = 0.45;
const SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA = 0.34;
const SETTLEMENT_MONTH_OVERLAY_TOTAL_ALPHA = 0.32;

const JOURNAL_OVERLAY_ALPHA = 0.65;

const POPUP_SHADOW_ALPHA = 0.45;
export const DASHBOARD_CHART_SHADOW_ALPHA = 0.22;
const POPUP_ROW_HOVER_ALPHA = 0.08;
const LOADING_OVERLAY_ALPHA = 0.38;
const PLAN_EDITABLE_CELL_HOVER_ALPHA = 0.14;
const HEADER_CONTROL_FOCUS_RING_ALPHA = 0.22;

export const UI_COLOR_MODES = ['dark', 'light'];
export const UI_COLOR_MODE_SETTINGS = ['dark', 'light', 'system'];
export const DEFAULT_UI_COLOR_MODE_SETTING = 'system';

const SHARED_UI_COLORS = {
  periodHeaderBg: '#ff8000',
  periodHeaderText: '#ffffff',
  amountVarianceColor: '#ff6600',
  negativeAmountColor: '#ff3838',
};

export const DEFAULT_UI_COLORS_DARK = {
  browserBg: '#2d2d2d',
  settingsInputBg: '#353535',
  settingsInputBorder: '#565656',
  settingsButtonBg: '#262626',
  settingsButtonTextColor: '#ffffff',
  monthRowBg: '#424242',
  monthRowText: '#ffffff',
  currentMonthBorder: '#ff0000',
  settlementMonthBg: '#000000',
  cellBg: '#262626',
  textColor: '#ffffff',
  textDimColor: '#929292',
  planAmountColor: '#00bbff',
  planEditableCellHoverBg: '#00a7b3',
  headerControlBg: '#262626',
  headerControlActiveBorder: '#00ffff',
  dashboardNavBg: '#16a34a',
  dashboardNavText: '#ffffff',
  dashboardNavActiveBg: '#0891b2',
  dashboardNavActiveText: '#ffffff',
  dashboardSidebarRevenueBg: '#004fa8',
  dashboardSidebarRevenueText: '#ffffff',
  dashboardSidebarExpenseBg: '#990000',
  dashboardSidebarExpenseText: '#ffffff',
  dashboardSidebarBarBg: '#ff8000',
  dashboardProfitLineLow: '#ff0000',
  dashboardProfitLineHigh: '#008ae0',
  dashboardCashLineLow: '#ff0000',
  dashboardCashLineHigh: '#00c749',
  dashboardChartShadowColor: '#000000',
  kbdBg: '#373737',
  kbdTextColor: '#ffffff',
  kbdBorderColor: '#636363',
  fillColor1: '#363636',
  fillColor2: '#521414',
  warningTextColor: '#FFFF00',
  expandableHighlight: '#00ffff',
  rowHoverBorder: '#00ffff',
  rowSelectionRing: '#ffff00',
  journalOverlayBg: '#000000',
  accentColor: '#00ffff',
  deleteBtnBg: '#ff4848',
  deleteBtnText: '#ffffff',
  contextMenuBg: '#1e1e28',
  contextMenuShadowBg: '#000000',
  contextMenuItemHoverBg: '#5385f9',
  periodModeBudgetActualBg: '#0891b2',
  periodModeActualBg: '#16a34a',
  periodModePlanBg: '#ea580c',
  periodModeBudgetActualText: '#ffffff',
  periodModeActualText: '#ffffff',
  periodModePlanText: '#ffffff',
  loadingOverlayBg: '#08080e',
  statusOkColor: '#86efac',
  statusErrorColor: '#ff4848',
  primaryButtonBg: '#3b82f6',
  primaryButtonTextColor: '#ffffff',
  buttonBorderColor: '#8a8a8a',
  ...SHARED_UI_COLORS,
};

export const DEFAULT_UI_COLORS_LIGHT = {
  browserBg: '#ffffff',
  settingsInputBg: '#ededed',
  settingsInputBorder: '#e0e0e0',
  settingsButtonBg: '#dedede',
  settingsButtonTextColor: '#000000',
  monthRowBg: '#dedede',
  monthRowText: '#000000',
  currentMonthBorder: '#ff8a8a',
  settlementMonthBg: '#c2c2c2',
  cellBg: '#ffffff',
  textColor: '#000000',
  textDimColor: '#8a8a8a',
  planAmountColor: '#00a5e0',
  planEditableCellHoverBg: '#52bfc7',
  headerControlBg: '#c9c9c9',
  headerControlActiveBorder: '#005aad',
  dashboardNavBg: '#16a34a',
  dashboardNavText: '#ffffff',
  dashboardNavActiveBg: '#0891b2',
  dashboardNavActiveText: '#ffffff',
  dashboardSidebarRevenueBg: '#2f7ed8',
  dashboardSidebarRevenueText: '#ffffff',
  dashboardSidebarExpenseBg: '#c42525',
  dashboardSidebarExpenseText: '#ffffff',
  dashboardSidebarBarBg: '#ffb35c',
  dashboardProfitLineLow: '#ff0000',
  dashboardProfitLineHigh: '#2eafff',
  dashboardCashLineLow: '#ff0000',
  dashboardCashLineHigh: '#5ef394',
  dashboardChartShadowColor: '#000000',
  kbdBg: '#fafafa',
  kbdTextColor: '#000000',
  kbdBorderColor: '#636363',
  fillColor1: '#e8e8e8',
  fillColor2: '#ffdbdb',
  warningTextColor: '#FFFF00',
  expandableHighlight: '#005aad',
  rowHoverBorder: '#005aad',
  rowSelectionRing: '#ff8000',
  journalOverlayBg: '#ffffff',
  accentColor: '#005aad',
  deleteBtnBg: '#ff4848',
  deleteBtnText: '#ffffff',
  contextMenuBg: '#ffffff',
  contextMenuShadowBg: '#000000',
  contextMenuItemHoverBg: '#004cff',
  periodModeBudgetActualBg: '#0891b2',
  periodModeActualBg: '#16a34a',
  periodModePlanBg: '#ea580c',
  periodModeBudgetActualText: '#ffffff',
  periodModeActualText: '#ffffff',
  periodModePlanText: '#ffffff',
  loadingOverlayBg: '#08080e',
  statusOkColor: '#00b341',
  statusErrorColor: '#ff4d4d',
  primaryButtonBg: '#3b82f6',
  primaryButtonTextColor: '#ffffff',
  buttonBorderColor: '#919191',
  ...SHARED_UI_COLORS,
  periodHeaderBg: '#f09c47',
  amountVarianceColor: '#ff6600',
  negativeAmountColor: '#ff0000',
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

export function getSystemPreferredColorMode() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

/** 保存されている表示モード設定（dark / light / system） */
export function getUiColorModeSetting(config = {}) {
  const mode = config.colorMode;
  if (mode === 'light' || mode === 'system' || mode === 'dark') return mode;
  return DEFAULT_UI_COLOR_MODE_SETTING;
}

/** 適用する表示モード（system の場合は OS 設定を解決） */
export function getUiColorMode(config = {}) {
  const setting = getUiColorModeSetting(config);
  if (setting === 'system') return getSystemPreferredColorMode();
  return setting;
}

/** ダッシュボードグラフ影の不透明度（ダークモードは倍） */
export function getDashboardChartShadowAlpha(config = {}) {
  return getUiColorMode(config) === 'dark'
    ? DASHBOARD_CHART_SHADOW_ALPHA * 2
    : DASHBOARD_CHART_SHADOW_ALPHA;
}

/** OS の配色モード変更を監視（system 選択時に使用） */
export function subscribeSystemColorMode(onChange) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(getSystemPreferredColorMode());
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }
  media.addListener(handler);
  return () => media.removeListener(handler);
}

export function getDefaultUiColors(mode = 'dark') {
  const key = mode === 'light' ? 'light' : 'dark';
  return { ...DEFAULTS_BY_MODE[key] };
}

/** 現行キーのみ残す */
function sanitizeUiColorBucket(bucket = {}) {
  const next = {};
  if (!bucket || typeof bucket !== 'object') return next;
  for (const key of UI_COLOR_KEYS) {
    if (bucket[key] != null) next[key] = bucket[key];
  }
  return next;
}

/** localStorage / エクスポート用の正規形（モード別上書き） */
export function normalizeUiColorConfig(config = {}) {
  if (!config || typeof config !== 'object') {
    return { colorMode: DEFAULT_UI_COLOR_MODE_SETTING, dark: {}, light: {} };
  }

  const colorMode = getUiColorModeSetting(config);
  const dark = sanitizeUiColorBucket(
    typeof config.dark === 'object' && config.dark !== null ? config.dark : {},
  );
  const light = sanitizeUiColorBucket(
    typeof config.light === 'object' && config.light !== null ? config.light : {},
  );

  const normalized = { colorMode, dark, light };
  if (typeof config.hoverBoostPercent === 'number' && Number.isFinite(config.hoverBoostPercent)) {
    const value = Math.max(0, Math.min(100, Math.round(config.hoverBoostPercent)));
    if (value !== DEFAULT_HOVER_BOOST_PERCENT) {
      normalized.hoverBoostPercent = value;
    }
  }
  return normalized;
}

function getUiColorModeBucket(config, mode = getUiColorMode(config)) {
  const normalized = normalizeUiColorConfig(config);
  return normalized[mode === 'light' ? 'light' : 'dark'] ?? {};
}

/** 表示モード切替（各モードの上書きは保持） */
export function switchUiColorMode(config, mode) {
  const normalized = normalizeUiColorConfig(config);
  const colorMode = mode === 'light' ? 'light' : mode === 'system' ? 'system' : 'dark';
  return {
    ...normalized,
    colorMode,
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

export function getHoverBoostPercent(config = {}) {
  const normalized = normalizeUiColorConfig(config);
  const value = normalized.hoverBoostPercent;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return DEFAULT_HOVER_BOOST_PERCENT;
}

export function setHoverBoostPercent(config, percent) {
  const normalized = normalizeUiColorConfig(config);
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  if (value === DEFAULT_HOVER_BOOST_PERCENT) {
    const { hoverBoostPercent, ...rest } = normalized;
    return rest;
  }
  return { ...normalized, hoverBoostPercent: value };
}

export function resetHoverBoostPercent(config) {
  return setHoverBoostPercent(config, DEFAULT_HOVER_BOOST_PERCENT);
}

export function isHoverBoostPercentCustom(config = {}) {
  return normalizeUiColorConfig(config).hoverBoostPercent != null;
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
    settingsInputBg, settingsInputBorder,
    settingsButtonBg,
    settingsButtonTextColor,
    cellBg, textColor, textDimColor,
    negativeAmountColor,
    periodHeaderBg, periodHeaderText, monthRowBg, monthRowText,
    currentMonthBorder, settlementMonthBg,
    rowHoverBorder, rowSelectionRing,
    expandableHighlight,
    journalOverlayBg,
    accentColor,
    deleteBtnBg, deleteBtnText,
    contextMenuBg, contextMenuShadowBg, contextMenuItemHoverBg,
    periodModeBudgetActualBg, periodModeActualBg, periodModePlanBg,
    periodModeBudgetActualText, periodModeActualText, periodModePlanText,
    loadingOverlayBg,
    statusOkColor, statusErrorColor,
    primaryButtonBg, primaryButtonTextColor,
    buttonBorderColor,
    fillColor1, fillColor2,
    planAmountColor, planEditableCellHoverBg, amountVarianceColor,
    headerControlBg, headerControlActiveBorder,
    dashboardNavBg, dashboardNavText,
    dashboardNavActiveBg, dashboardNavActiveText,
    dashboardSidebarRevenueBg, dashboardSidebarExpenseBg,
    dashboardSidebarRevenueText, dashboardSidebarExpenseText,
    dashboardSidebarBarBg,
    dashboardProfitLineLow, dashboardProfitLineHigh,
    dashboardCashLineLow, dashboardCashLineHigh,
    dashboardChartShadowColor,
    kbdBg, kbdTextColor, kbdBorderColor,
    warningTextColor,
  } = colors;

  const hoverBoost = `${getHoverBoostPercent(config)}%`;

  const doc = document.documentElement;
  const borderMix = `color-mix(in srgb, ${opaqueHex(textColor)} 14%, ${opaqueHex(browserBg)})`;

  doc.style.setProperty('--plan-browser-bg', browserBg);
  doc.dataset.planColorMode = getUiColorMode(config);
  doc.style.setProperty('--plan-border', borderMix);
  doc.style.setProperty('--plan-text', textColor);
  doc.style.setProperty('--plan-text-dim', opaqueHex(textDimColor));
  doc.style.setProperty('--plan-accent', opaqueHex(accentColor));
  doc.style.setProperty('--plan-menu-check-color', opaqueHex(accentColor));
  doc.style.setProperty(
    '--plan-journal-overlay',
    hexToRgba(journalOverlayBg, JOURNAL_OVERLAY_ALPHA),
  );
  doc.style.setProperty('--plan-journal-text', opaqueHex(textColor));
  doc.style.setProperty('--plan-journal-table-header-bg', monthRowBg);
  doc.style.setProperty('--plan-context-menu-bg', opaqueHex(contextMenuBg));
  doc.style.setProperty('--plan-hover-boost', hoverBoost);
  doc.style.setProperty(
    '--plan-context-menu-shadow',
    hexToRgba(contextMenuShadowBg, POPUP_SHADOW_ALPHA),
  );
  const popupRowHover = hexToRgba(contextMenuItemHoverBg, POPUP_ROW_HOVER_ALPHA);
  doc.style.setProperty('--plan-popup-row-hover', popupRowHover);
  doc.style.setProperty(
    '--plan-loading-overlay',
    hexToRgba(loadingOverlayBg, LOADING_OVERLAY_ALPHA),
  );

  const root = document.querySelector('.plan-app');
  if (!root) return;

  root.dataset.planColorMode = getUiColorMode(config);
  root.style.setProperty('--plan-browser-bg', browserBg);
  root.style.setProperty('--plan-border', borderMix);
  root.style.setProperty('--plan-surface', monthRowBg);
  root.style.setProperty('--plan-editor-bg', opaqueHex(settingsInputBg));
  root.style.setProperty('--plan-editor-border', opaqueHex(settingsInputBorder));
  root.style.setProperty('--plan-settings-button-bg', opaqueHex(settingsButtonBg));
  root.style.setProperty('--plan-settings-button-text', opaqueHex(settingsButtonTextColor));
  root.style.setProperty('--plan-popup-row-hover', popupRowHover);
  root.style.setProperty('--plan-bg', opaqueHex(settingsInputBg));
  root.style.setProperty('--plan-cell-bg', cellBg);
  root.style.setProperty('--plan-text', textColor);
  root.style.setProperty('--plan-muted', textColor);
  root.style.setProperty('--plan-text-dim', opaqueHex(textDimColor));
  root.style.setProperty('--plan-negative-amount', negativeAmountColor);
  root.style.setProperty('--plan-accent', opaqueHex(accentColor));
  root.style.setProperty('--plan-menu-check-color', opaqueHex(accentColor));
  root.style.setProperty('--plan-hover-boost', hoverBoost);
  root.style.setProperty('--plan-delete-btn-bg', opaqueHex(deleteBtnBg));
  root.style.setProperty('--plan-delete-btn-text', opaqueHex(deleteBtnText));
  root.style.setProperty('--plan-period-mode-budget-actual-bg', opaqueHex(periodModeBudgetActualBg));
  root.style.setProperty('--plan-period-mode-actual-bg', opaqueHex(periodModeActualBg));
  root.style.setProperty('--plan-period-mode-plan-bg', opaqueHex(periodModePlanBg));
  root.style.setProperty('--plan-period-mode-budget-actual-text', opaqueHex(periodModeBudgetActualText));
  root.style.setProperty('--plan-period-mode-actual-text', opaqueHex(periodModeActualText));
  root.style.setProperty('--plan-period-mode-plan-text', opaqueHex(periodModePlanText));
  root.style.setProperty('--plan-status-ok', opaqueHex(statusOkColor));
  root.style.setProperty('--plan-status-error', opaqueHex(statusErrorColor));
  root.style.setProperty('--plan-primary-btn-bg', opaqueHex(primaryButtonBg));
  root.style.setProperty('--plan-primary-btn-text', opaqueHex(primaryButtonTextColor));
  root.style.setProperty('--plan-button-border', opaqueHex(buttonBorderColor));
  root.style.setProperty('--plan-header-control-bg', opaqueHex(headerControlBg));
  root.style.setProperty('--plan-header-control-border-active', opaqueHex(headerControlActiveBorder));
  root.style.setProperty(
    '--plan-header-control-focus-ring',
    hexToRgba(headerControlActiveBorder, HEADER_CONTROL_FOCUS_RING_ALPHA),
  );
  root.style.setProperty('--plan-dashboard-nav-bg', opaqueHex(dashboardNavBg));
  root.style.setProperty('--plan-dashboard-nav-text', opaqueHex(dashboardNavText));
  root.style.setProperty(
    '--plan-dashboard-nav-focus-ring',
    hexToRgba(dashboardNavText, HEADER_CONTROL_FOCUS_RING_ALPHA),
  );
  root.style.setProperty('--plan-dashboard-nav-active-bg', opaqueHex(dashboardNavActiveBg));
  root.style.setProperty('--plan-dashboard-nav-active-text', opaqueHex(dashboardNavActiveText));
  root.style.setProperty(
    '--plan-dashboard-nav-active-focus-ring',
    hexToRgba(dashboardNavActiveText, HEADER_CONTROL_FOCUS_RING_ALPHA),
  );
  root.style.setProperty('--dashboard-revenue-color', opaqueHex(dashboardSidebarRevenueBg));
  root.style.setProperty('--dashboard-revenue-text-color', opaqueHex(dashboardSidebarRevenueText));
  root.style.setProperty('--dashboard-expense-color', opaqueHex(dashboardSidebarExpenseBg));
  root.style.setProperty('--dashboard-expense-text-color', opaqueHex(dashboardSidebarExpenseText));
  root.style.setProperty('--dashboard-sidebar-bar-color', opaqueHex(dashboardSidebarBarBg));
  root.style.setProperty('--dashboard-profit-line-low', opaqueHex(dashboardProfitLineLow));
  root.style.setProperty('--dashboard-profit-line-high', opaqueHex(dashboardProfitLineHigh));
  root.style.setProperty('--dashboard-cash-line-low', opaqueHex(dashboardCashLineLow));
  root.style.setProperty('--dashboard-cash-line-high', opaqueHex(dashboardCashLineHigh));
  root.style.setProperty(
    '--dashboard-chart-drop-shadow',
    `0 4px 12px ${hexToRgba(dashboardChartShadowColor, getDashboardChartShadowAlpha(config))}`,
  );
  root.style.setProperty('--plan-kbd-bg', opaqueHex(kbdBg));
  root.style.setProperty('--plan-kbd-text', opaqueHex(kbdTextColor));
  root.style.setProperty('--plan-kbd-border', opaqueHex(kbdBorderColor));
  root.style.setProperty('--plan-period-header-bg', opaqueHex(periodHeaderBg));
  root.style.setProperty('--plan-period-header-text', opaqueHex(periodHeaderText));
  root.style.setProperty('--plan-month-row-bg', monthRowBg);
  root.style.setProperty('--plan-month-row-text', monthRowText);
  root.style.setProperty('--current-month-ring', opaqueHex(currentMonthBorder));
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
  root.style.setProperty(
    '--plan-editable-cell-hover-bg',
    hexToRgba(planEditableCellHoverBg, PLAN_EDITABLE_CELL_HOVER_ALPHA),
  );
  root.style.setProperty('--plan-amount-variance-color', opaqueHex(amountVarianceColor));
  root.style.setProperty('--plan-warning-text', opaqueHex(warningTextColor));
}
