const UI_COLOR_STORAGE_KEY = 'mga-ui-colors';

const CURRENT_MONTH_OVERLAY_ALPHA = 0.28;
const CURRENT_MONTH_RING_ALPHA = 0.45;
const CURRENT_MONTH_OVERLAY_HEAD_ALPHA = 0.34;
const CURRENT_MONTH_OVERLAY_HOVER_ALPHA = 0.22;
const CURRENT_MONTH_OVERLAY_TOTAL_ALPHA = 0.32;

export const DEFAULT_UI_COLORS = {
  appBg: '#262626',
  cellBg: '#262626',
  textColor: '#ffffff',
  negativeAmountColor: '#ff0000',
  yearRowBg: '#c65911',
  yearRowText: '#ffffff',
  monthRowBg: '#595959',
  monthRowText: '#ffffff',
  currentMonthBg: '#800000',
  currentMonthBorder: '#ff0000',
  rowHoverBorder: '#00ffff',
  expandableHighlight: '#00ffff',
  fillColor1: '#404040',
  fillColor2: '#3F1B1B',
  planAmountColor: '#00B0F0',
  amountVarianceColor: '#C65911',
  warningTextColor: '#FFFF00',
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

/** 補助科目行など、セル背景より一段暗い色 */
export function darkenHex(hex, ratio = 0.12) {
  const rgb = parseHex(hex);
  if (!rgb) return DEFAULT_UI_COLORS.cellBg;
  const factor = 1 - ratio;
  return `#${toHex(rgb.r * factor)}${toHex(rgb.g * factor)}${toHex(rgb.b * factor)}`;
}

export function loadUiColorConfig() {
  try {
    const raw = localStorage.getItem(UI_COLOR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUiColorConfig(config) {
  localStorage.setItem(UI_COLOR_STORAGE_KEY, JSON.stringify(config));
}

export function getUiColors(config = {}) {
  return {
    appBg: config.appBg ?? DEFAULT_UI_COLORS.appBg,
    cellBg: config.cellBg ?? DEFAULT_UI_COLORS.cellBg,
    textColor: config.textColor ?? DEFAULT_UI_COLORS.textColor,
    negativeAmountColor: config.negativeAmountColor ?? DEFAULT_UI_COLORS.negativeAmountColor,
    yearRowBg: config.yearRowBg ?? DEFAULT_UI_COLORS.yearRowBg,
    yearRowText: config.yearRowText ?? DEFAULT_UI_COLORS.yearRowText,
    monthRowBg: config.monthRowBg ?? DEFAULT_UI_COLORS.monthRowBg,
    monthRowText: config.monthRowText ?? DEFAULT_UI_COLORS.monthRowText,
    currentMonthBg: config.currentMonthBg ?? DEFAULT_UI_COLORS.currentMonthBg,
    currentMonthBorder: config.currentMonthBorder ?? DEFAULT_UI_COLORS.currentMonthBorder,
    rowHoverBorder: config.rowHoverBorder ?? DEFAULT_UI_COLORS.rowHoverBorder,
    expandableHighlight: config.expandableHighlight ?? DEFAULT_UI_COLORS.expandableHighlight,
    fillColor1: config.fillColor1 ?? DEFAULT_UI_COLORS.fillColor1,
    fillColor2: config.fillColor2 ?? DEFAULT_UI_COLORS.fillColor2,
    planAmountColor: config.planAmountColor ?? DEFAULT_UI_COLORS.planAmountColor,
    amountVarianceColor: config.amountVarianceColor ?? DEFAULT_UI_COLORS.amountVarianceColor,
    warningTextColor: config.warningTextColor ?? DEFAULT_UI_COLORS.warningTextColor,
  };
}

export function applyUiColors(config = {}) {
  const {
    appBg, cellBg, textColor, negativeAmountColor,
    yearRowBg, yearRowText, monthRowBg, monthRowText,
    currentMonthBg, currentMonthBorder,
    rowHoverBorder,
    expandableHighlight,
    fillColor1,
    fillColor2,
    planAmountColor,
    amountVarianceColor,
    warningTextColor,
  } = getUiColors(config);
  const root = document.querySelector('.plan-app');
  if (!root) return;

  root.style.setProperty('--plan-bg', appBg);
  root.style.setProperty('--plan-cell-bg', cellBg);
  root.style.setProperty('--plan-cell-bg-sub', darkenHex(cellBg, 0.12));
  root.style.setProperty('--plan-text', textColor);
  root.style.setProperty('--plan-muted', textColor);
  root.style.setProperty('--plan-text-dim', hexToRgba(textColor, 0.5));
  root.style.setProperty('--plan-text-faint', hexToRgba(textColor, 0.35));
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
  root.style.setProperty('--row-hover-border', opaqueHex(rowHoverBorder));
  root.style.setProperty('--plan-expandable-highlight', opaqueHex(expandableHighlight));
  root.style.setProperty('--plan-fill-color-1', opaqueHex(fillColor1));
  root.style.setProperty('--plan-fill-color-2', opaqueHex(fillColor2));
  root.style.setProperty('--plan-amount-color', opaqueHex(planAmountColor));
  root.style.setProperty('--plan-amount-variance-color', opaqueHex(amountVarianceColor));
  root.style.setProperty('--plan-warning-text', opaqueHex(warningTextColor));
}

export function isUiColorCustom(config = {}) {
  const current = getUiColors(config);
  return (
    current.appBg !== DEFAULT_UI_COLORS.appBg
    || current.cellBg !== DEFAULT_UI_COLORS.cellBg
    || current.textColor !== DEFAULT_UI_COLORS.textColor
    || current.negativeAmountColor !== DEFAULT_UI_COLORS.negativeAmountColor
    || current.yearRowBg !== DEFAULT_UI_COLORS.yearRowBg
    || current.yearRowText !== DEFAULT_UI_COLORS.yearRowText
    || current.monthRowBg !== DEFAULT_UI_COLORS.monthRowBg
    || current.monthRowText !== DEFAULT_UI_COLORS.monthRowText
    || current.currentMonthBg !== DEFAULT_UI_COLORS.currentMonthBg
    || current.currentMonthBorder !== DEFAULT_UI_COLORS.currentMonthBorder
    || current.rowHoverBorder !== DEFAULT_UI_COLORS.rowHoverBorder
    || current.expandableHighlight !== DEFAULT_UI_COLORS.expandableHighlight
    || current.fillColor1 !== DEFAULT_UI_COLORS.fillColor1
    || current.fillColor2 !== DEFAULT_UI_COLORS.fillColor2
    || current.planAmountColor !== DEFAULT_UI_COLORS.planAmountColor
    || current.amountVarianceColor !== DEFAULT_UI_COLORS.amountVarianceColor
    || current.warningTextColor !== DEFAULT_UI_COLORS.warningTextColor
  );
}
