import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(repoRoot, 'src/ui/uiColorPanel.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const L = {
  emDash: jp(0x2014),
  default: jp(0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8),
  panelTitle: jp(0x4e88, 0x5b9f, 0x8868, 0x5168, 0x4f53),
  colItem: jp(0x9805, 0x76ee),
  colBg: jp(0x5857, 0x308a, 0x8272),
  colText: jp(0x6587, 0x5b57, 0x8272),
  colPreview: jp(0x30d7, 0x30ec, 0x30d3, 0x30e5, 0x30fc),
  colAction: jp(0x64cd, 0x4f5c),
  layoutComment: jp(0x4e88, 0x5b9f, 0x8868, 0x30ec, 0x30a4, 0x30a2, 0x30a6, 0x30c8, 0x9806),
  browserBg: jp(0x30d6, 0x30e9, 0x30a6, 0x30b6, 0xff08, 0x80cc, 0x666f, 0xff09),
  normalText: jp(0x901a, 0x5e38, 0x6587, 0x5b57, 0x8272),
  settingsInputBg: jp(0x5165, 0x529b, 0x6b04, 0xff08, 0x80cc, 0x666f, 0xff09),
  settingsInputBorder: jp(0x5165, 0x529b, 0x6b04, 0xff08, 0x67a0, 0x7dda, 0xff09),
  miscBtn: jp(0x305d, 0x306e, 0x4ed6, 0x30dc, 0x30bf, 0x30f3),
  settingsButtonPreview: jp(0x2191),
  bgPreview: jp(0x80cc, 0x666f),
  sampleText: jp(0x30b5, 0x30f3, 0x30d7, 0x30eb, 0x6587, 0x5b57),
  normalTextPreview: jp(0x901a, 0x5e38, 0x6587, 0x5b57),
  dimTextPreview: jp(0x8584, 0x3044, 0x6587, 0x5b57),
  borderPreview: jp(0x67a0, 0x7dda),
  yearRow: jp(0x5e74, 0x884c, 0xff08, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0xff09),
  yearPreview: jp(0x3232, 0x30e5, 0x5e74).replace('32', '2025'),
  monthRow: jp(0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x884c),
  monthPreview: jp(0x36, 0x6708),
  currentMonth: jp(0x5f53, 0x6708, 0x5217, 0xff08, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  settlementMonth: jp(0x6c7a, 0x7b97, 0x6574, 0x7406, 0x5217, 0xff08, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  settlementPreview: jp(0x6c7a, 0x7b97, 0x6574, 0x7406),
  cellRow: jp(0x30bb, 0x30eb, 0xff08, 0x660e, 0x7d30, 0x884c, 0xff09),
  cellPreview: jp(0xa5, 0x31, 0x2c, 0x32, 0x33, 0x34),
  noteText: jp(0x6ce8, 0x91c8, 0x6587, 0x30fb, 0x8aac, 0x660e, 0x6587),
  notePreview: jp(0x8aac, 0x660e, 0x6587, 0x306e, 0x30b5, 0x30f3, 0x30d7, 0x30eb),
  hintText: jp(0x30d2, 0x30f3, 0x30c8, 0x6587),
  hintPreview: jp(0x88dc, 0x8db3, 0x30c6, 0x30ad, 0x30b9, 0x30c8),
  dimText: jp(0x8584, 0x3044, 0x6587, 0x5b57, 0x8272),
  dimPreview: jp(0x8584, 0x3044, 0x6587, 0x5b57, 0x306e, 0x30b5, 0x30f3, 0x30d7, 0x30eb),
  negative: jp(0x30de, 0x30a4, 0x30ca, 0x30b9, 0x5024, 0xff08, 0x91d1, 0x984d, 0xff09),
  planAmount: jp(0x8a08, 0x753b, 0x91d1, 0x984d),
  planAmountPreview: jp(0xa5, 0x31, 0x2c, 0x32, 0x33, 0x34),
  variance: jp(0x91d1, 0x984d, 0x5dee, 0x7570),
  fill1: jp(0x5857, 0x308a, 0x8272, 0x31, 0xff08, 0x6ce8, 0x76ee, 0xff09),
  fill1Preview: jp(0x6ce8, 0x76ee, 0x884c),
  fill2: jp(0x5857, 0x308a, 0x8272, 0x32, 0xff08, 0x6ce8, 0x610f, 0xff09),
  fill2Preview: jp(0x6ce8, 0x610f, 0x884c),
  revAr: jp(0x58f2, 0x4e0a, 0x9ad8, 0xff0d, 0x58f2, 0x639b, 0x91d1),
  revArBgTitle: jp(
    0x80cc, 0x666f, 0x8272, 0x306f, 0x5927, 0x9805, 0x76ee, 0x8272, 0xff08, 0x58f2, 0x4e0a, 0x9ad8, 0x5dee, 0x7570, 0xff09, 0x3092, 0x53c2, 0x7167,
  ),
  warning: jp(0x8b66, 0x544a, 0x6587, 0x5b57, 0x8272),
  warningPreview: jp(0x8b66, 0x544a),
  expandable: jp(0x5c55, 0x958b, 0x53ef, 0x80fd, 0x9805, 0x76ee, 0x30fb, 0x4ed5, 0x8a33, 0x30bb, 0x30eb, 0xff08, 0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0xff09),
  expandablePreview: jp(0x25b6, 0x20, 0x52d8, 0x5b9a, 0x79d1, 0x76ee),
  hover: jp(0x30de, 0x30a6, 0x30b9, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0xff08, 0x884c, 0xff09),
  hoverPreview: jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee),
  selection: jp(0x884c, 0x9078, 0x629e, 0xff08, 0x67a0, 0x7dda, 0xff09),
  selectionPreview: jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee),
  accentColor: jp(0x30a2, 0x30af, 0x30bb, 0x30f3, 0x30c8, 0xff08, 0x9078, 0x629e, 0x30de, 0x30fc, 0x30af, 0x7b49, 0xff09),
  accentPreview: jp(0x2713),
  deleteBtn: jp(0x524a, 0x9664, 0x30dc, 0x30bf, 0x30f3),
  deletePreview: jp(0x524a, 0x9664),
  contextMenuBg: jp(0x30dd, 0x30c3, 0x30d7, 0x30a2, 0x30c3, 0x30d7, 0xff08, 0x80cc, 0x666f, 0xff09),
  contextMenuPreview: jp(0x30d1, 0x30cd, 0x30eb),
  popupShadow: jp(0x30dd, 0x30c3, 0x30d7, 0x30a2, 0x30c3, 0x30d7, 0xff08, 0x5f71, 0xff09),
  popupRowHover: jp(0x30dd, 0x30c3, 0x30d7, 0x30a2, 0x30c3, 0x30d7, 0xff08, 0x884c, 0x30db, 0x30d0, 0x30fc, 0xff09),
  periodModeBudgetActual: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x300c, 0x4e88, 0x5b9f, 0x300d),
  periodModeActual: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x300c, 0x5b9f, 0x7e3e, 0x300d),
  periodModePlan: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x300c, 0x8a08, 0x753b, 0x300d),
  periodModePreviewBudgetActual: jp(0x4e88, 0x5b9f, 0x8868, 0x793a),
  periodModePreviewActual: jp(0x5b9f, 0x7e3e, 0x8868, 0x793a),
  periodModePreviewPlan: jp(0x8a08, 0x753b, 0x8868, 0x793a),
  dashboardNav: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x901a, 0x5e38, 0xff09),
  dashboardNavBorder: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x67a0, 0x7dda, 0x30fb, 0x901a, 0x5e38, 0xff09),
  dashboardNavHover: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x30db, 0x30d0, 0x30fc, 0x30fb, 0x901a, 0x5e38, 0xff09),
  dashboardNavPreview: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x3092, 0x8868, 0x793a),
  planTableNavPreview: jp(0x4e88, 0x5b9f, 0x8868, 0x3092, 0x8868, 0x793a),
  planReturnNavActive: jp(0x4e88, 0x5b9f, 0x8868, 0x8868, 0x793a, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x8868, 0x793a, 0x4e2d, 0xff09),
  planReturnNavActiveBorder: jp(0x4e88, 0x5b9f, 0x8868, 0x8868, 0x793a, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x67a0, 0x7dda, 0x30fb, 0x8868, 0x793a, 0x4e2d, 0xff09),
  dashboardNavActive: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x8868, 0x793a, 0x4e2d, 0xff09),
  dashboardNavActiveHover: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x30db, 0x30d0, 0x30fc, 0x30fb, 0x8868, 0x793a, 0x4e2d, 0xff09),
  dashboardNavActiveBorder: jp(0x30c0, 0x30c3, 0x30b7, 0x30e5, 0x30dc, 0x30fc, 0x30c9, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x67a0, 0x7dda, 0x30fb, 0x8868, 0x793a, 0x4e2d, 0xff09),
  settingsNavActive: jp(0x8a2d, 0x5b9a, 0x753b, 0x9762, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x8868, 0x793a, 0x4e2d, 0xff09),
  settingsNavActiveHover: jp(0x8a2d, 0x5b9a, 0x753b, 0x9762, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x30db, 0x30d0, 0x30fc, 0x30fb, 0x8868, 0x793a, 0x4e2d, 0xff09),
  settingsNavActiveBorder: jp(0x8a2d, 0x5b9a, 0x753b, 0x9762, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x67a0, 0x7dda, 0x30fb, 0x8868, 0x793a, 0x4e2d, 0xff09),
  shortcutKbd: `${jp(0x30b7, 0x30e7, 0x30fc, 0x30c8, 0x30ab, 0x30c3, 0x30c8, 0x30ad, 0x30fc)}（kbd）`,
  shortcutKbdBorder: `${jp(0x30b7, 0x30e7, 0x30fc, 0x30c8, 0x30ab, 0x30c3, 0x30c8, 0x30ad, 0x30fc)}（kbd・${jp(0x67a0, 0x7dda)}）`,
  kbdPreviewHtml: '<kbd>F10</kbd>',
  loadingOverlay: jp(0x8aad, 0x307f, 0x8fbc, 0x307f, 0x4e2d, 0xff08, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  loadingPreview: jp(0x8aad, 0x307f, 0x8fbc, 0x307f),
  statusOk: jp(0x6210, 0x529f, 0x30fb, 0x4f, 0x4b, 0x8868, 0x793a),
  statusError: jp(0x30a8, 0x30e9, 0x30fc, 0x8868, 0x793a),
  statusOkPreview: jp(0x4f, 0x4b),
  statusErrorPreview: jp(0x4e, 0x47),
  primaryBtn: jp(0x4e3b, 0x8981, 0x30dc, 0x30bf, 0x30f3),
  primaryBtnPreview: jp(0x958b, 0x304f),
  buttonBorder: jp(0x30dc, 0x30bf, 0x30f3, 0xff08, 0x67a0, 0x7dda, 0xff09),
  journalOverlay: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x80cc, 0x9762, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  journalModal: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x30e2, 0x30fc, 0x30c0, 0x30eb, 0x80cc, 0x666f, 0xff09),
  journalText: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x6587, 0x5b57, 0x8272, 0xff09),
  journalHint: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x88dc, 0x8db3, 0x6587, 0xff09),
  journalTextPreview: jp(0x4ed5, 0x8a33, 0x660e, 0x7d30),
  journalHintPreview: jp(0x4ef6, 0x6570, 0x30fb, 0x7a7a, 0x6b04, 0x30e1, 0x30c3, 0x30bb, 0x30fc, 0x30b8),
  journalModalPreview: jp(0x30e2, 0x30fc, 0x30c0, 0x30eb),
  journalBackPreview: jp(0x80cc, 0x9762),
  journalRowPreview: jp(0x884c),
  journalShadowPreview: jp(0x5f71),
  modeLabel: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9),
  modeDark: jp(0x30c0, 0x30fc, 0x30af, 0x30e2, 0x30fc, 0x30c9),
  modeLight: jp(0x30e9, 0x30a4, 0x30c8, 0x30e2, 0x30fc, 0x30c9),
  modeSystem: jp(0x30b7, 0x30b9, 0x30c6, 0x30e0),
  hoverBoostLabel: jp(0x30db, 0x30d0, 0x30fc, 0x660e, 0x308b, 0x3055),
  headerControl: jp(0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x30b3, 0x30f3, 0x30c8, 0x30ed, 0x30fc, 0x30eb, 0xff08, 0x671f, 0x9078, 0x629e, 0x7b49, 0xff09),
  headerControlHover: jp(0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x30b3, 0x30f3, 0x30c8, 0x30ed, 0x30fc, 0x30eb, 0xff08, 0x30db, 0x30d0, 0x30fc, 0xff09),
  headerControlActiveBorder: jp(0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x30b3, 0x30f3, 0x30c8, 0x30ed, 0x30fc, 0x30eb, 0xff08, 0x9078, 0x629e, 0x6642, 0x30fb, 0x67a0, 0x7dda, 0xff09),
  headerControlPreviewHtml: jp(0x30e1, 0x30cb, 0x30e5, 0x30fc) + ' <kbd>F10</kbd>',
  planEditableCellHover: jp(0x7de8, 0x96c6, 0x53ef, 0x80fd, 0x30bb, 0x30eb, 0xff08, 0x30db, 0x30d0, 0x30fc, 0xff09),
};

const yearSuffix = jp(0x5e74);
const monthSuffix = jp(0x6708);

const content = `import {
  getUiColors,
  getUiColorMode,
  getUiColorModeSetting,
  getDefaultUiColors,
  switchUiColorMode,
  setUiColorKey,
  setUiColorKeys,
  resetUiColorKey,
  isUiColorKeyCustom,
  saveUiColorConfig,
  applyUiColors,
  opaqueHex,
  hexToRgba,
  getHoverBoostPercent,
  setHoverBoostPercent,
  resetHoverBoostPercent,
  isHoverBoostPercentCustom,
  DEFAULT_HOVER_BOOST_PERCENT,
} from '../config/uiColorConfig.js';
import { getSectionBarColor } from '../config/sectionColorConfig.js';

function dashTd(className = 'col-color-none') {
  const td = document.createElement('td');
  td.className = className;
  td.textContent = '${L.emDash}';
  return td;
}

function colorInputTd(value) {
  const td = document.createElement('td');
  td.className = 'col-color-input';
  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'section-color-input';
  input.value = value;
  input.title = value;
  td.appendChild(input);
  return { td, input };
}

function setColorInput(field, value) {
  field.input.value = value;
  field.input.title = value;
}

function bindColorInput(field, sync) {
  field.input.addEventListener('input', () => sync(field.input.value, false));
  field.input.addEventListener('change', () => sync(field.input.value, true));
}

function previewTd({ background, color, text, className = 'ui-color-preview-cell', html = null }) {
  const td = document.createElement('td');
  td.className = 'col-color-preview';
  const span = document.createElement('span');
  span.className = className;
  if (background != null) span.style.background = background;
  if (color != null) span.style.color = color;
  if (html != null) span.innerHTML = html;
  else span.textContent = text;
  td.appendChild(span);
  return { td, span };
}

function applyNavBtnPreview(span, { background, borderColor, color }) {
  if (background != null) span.style.backgroundColor = background;
  if (color != null) span.style.color = color;
  if (borderColor != null) {
    span.style.borderColor = borderColor;
    span.style.borderStyle = 'solid';
    span.style.borderWidth = '1px';
  }
}

function previewNavBtnTd({ background, borderColor, color, label }) {
  const td = document.createElement('td');
  td.className = 'col-color-preview';
  const span = document.createElement('span');
  span.className = 'ui-color-preview-cell ui-color-preview-nav-btn';
  span.textContent = label;
  applyNavBtnPreview(span, { background, borderColor, color });
  td.appendChild(span);
  return { td, span };
}

function resetBtnTd(disabled) {
  const td = document.createElement('td');
  td.className = 'col-color-action';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'section-color-reset-btn';
  btn.textContent = '${L.default}';
  btn.disabled = disabled;
  td.appendChild(btn);
  return { td, btn };
}

function keysMatchDefaults(config, keys) {
  const defaults = getDefaultUiColors(getUiColorMode(config));
  return keys.every((key) => !isUiColorKeyCustom(config, key) && getUiColors(config)[key] === defaults[key]);
}

function applyKeys(config, keys, values) {
  return setUiColorKeys(config, keys, values);
}

export function mountUiColorPanel(container, {
  getConfig,
  setConfig,
  data,
  sectionColorConfig,
  getSectionColorConfig,
  onRefreshPlanView,
  onRefreshToolbar,
  onReRender,
}) {
  const resolveSectionColorConfig = () => (
    typeof getSectionColorConfig === 'function' ? getSectionColorConfig() : sectionColorConfig
  );
  const panel = document.createElement('div');
  panel.className = 'ui-color-panel';

  const title = document.createElement('h2');
  title.className = 'ui-color-panel-title';
  title.textContent = '${L.panelTitle}';
  panel.appendChild(title);

  let saveTimer = null;
  let refreshToolbarTimer = null;
  let refreshViewTimer = null;

  const applyLive = () => {
    applyUiColors(getConfig());
  };

  const flushSave = () => {
    if (saveTimer != null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveUiColorConfig(getConfig());
  };

  const scheduleSave = () => {
    if (saveTimer != null) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 300);
  };

  const scheduleRefreshToolbar = () => {
    if (refreshToolbarTimer != null) clearTimeout(refreshToolbarTimer);
    refreshToolbarTimer = setTimeout(() => {
      onRefreshToolbar?.();
      refreshToolbarTimer = null;
    }, 150);
  };

  const scheduleRefreshView = () => {
    if (refreshViewTimer != null) clearTimeout(refreshViewTimer);
    refreshViewTimer = setTimeout(() => {
      onRefreshPlanView?.();
      refreshViewTimer = null;
    }, 200);
  };

  const persist = ({ flush = false, refreshToolbar = false, refreshView = false } = {}) => {
    applyLive();
    if (flush) flushSave();
    else scheduleSave();
    if (refreshToolbar) scheduleRefreshToolbar();
    if (refreshView) scheduleRefreshView();
  };

  const modeRow = document.createElement('div');
  modeRow.className = 'ui-color-mode-row';
  const modeLabel = document.createElement('label');
  modeLabel.className = 'ui-color-mode-label';
  modeLabel.textContent = '${L.modeLabel}';
  const modeSelect = document.createElement('select');
  modeSelect.className = 'ui-color-mode-select app-settings-input';
  modeSelect.setAttribute('aria-label', '${L.modeLabel}');
  for (const [value, label] of [['system', '${L.modeSystem}'], ['dark', '${L.modeDark}'], ['light', '${L.modeLight}']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    modeSelect.appendChild(option);
  }
  modeSelect.value = getUiColorModeSetting(getConfig());
  const hoverBoostLabel = document.createElement('label');
  hoverBoostLabel.className = 'ui-color-mode-label ui-color-hover-boost-label';
  hoverBoostLabel.textContent = '${L.hoverBoostLabel}';
  const hoverBoostWrap = document.createElement('span');
  hoverBoostWrap.className = 'ui-color-hover-boost-wrap';
  const hoverBoostInput = document.createElement('input');
  hoverBoostInput.type = 'number';
  hoverBoostInput.className = 'ui-color-hover-boost-input app-settings-input';
  hoverBoostInput.min = '0';
  hoverBoostInput.max = '100';
  hoverBoostInput.step = '1';
  hoverBoostInput.setAttribute('aria-label', '${L.hoverBoostLabel}');
  hoverBoostInput.value = String(getHoverBoostPercent(getConfig()));
  const hoverBoostSuffix = document.createElement('span');
  hoverBoostSuffix.className = 'ui-color-hover-boost-suffix';
  hoverBoostSuffix.textContent = '%';
  const hoverBoostReset = document.createElement('button');
  hoverBoostReset.type = 'button';
  hoverBoostReset.className = 'section-color-reset-btn ui-color-hover-boost-reset';
  hoverBoostReset.textContent = '${L.default}';
  hoverBoostReset.disabled = !isHoverBoostPercentCustom(getConfig());
  hoverBoostWrap.append(hoverBoostInput, hoverBoostSuffix);
  modeRow.append(modeLabel, modeSelect, hoverBoostLabel, hoverBoostWrap, hoverBoostReset);
  panel.appendChild(modeRow);

  const syncHoverBoostReset = () => {
    hoverBoostReset.disabled = !isHoverBoostPercentCustom(getConfig());
  };

  const applyHoverBoostValue = (rawValue, { flush = false } = {}) => {
    setConfig(setHoverBoostPercent(getConfig(), rawValue));
    hoverBoostInput.value = String(getHoverBoostPercent(getConfig()));
    syncHoverBoostReset();
    persist({ flush, refreshToolbar: true });
  };

  hoverBoostInput.addEventListener('input', () => {
    applyHoverBoostValue(hoverBoostInput.value, { flush: false });
  });
  hoverBoostInput.addEventListener('change', () => {
    applyHoverBoostValue(hoverBoostInput.value, { flush: true });
  });
  hoverBoostReset.addEventListener('click', () => {
    setConfig(resetHoverBoostPercent(getConfig()));
    hoverBoostInput.value = String(DEFAULT_HOVER_BOOST_PERCENT);
    syncHoverBoostReset();
    persist({ flush: true, refreshToolbar: true });
  });

  modeSelect.addEventListener('change', () => {
    setConfig(switchUiColorMode(getConfig(), modeSelect.value));
    persist({ flush: true, refreshToolbar: true });
    onReRender?.();
  });

  const table = document.createElement('table');
  table.className = 'expand-settings-table ui-color-table';
  table.innerHTML = \`
    <thead>
      <tr>
        <th>${L.colItem}</th>
        <th class="col-color-input">${L.colBg}</th>
        <th class="col-color-input">${L.colText}</th>
        <th class="col-color-preview">${L.colPreview}</th>
        <th class="col-color-action">${L.colAction}</th>
      </tr>
    </thead>
  \`;

  const tbody = document.createElement('tbody');

  const addRow = (label, cells) => {
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.textContent = label;
    tr.appendChild(labelTd);
    for (const cell of cells) tr.appendChild(cell);
    tbody.appendChild(tr);
  };

  const previewByKey = new Map();

  const subscribePreview = (keys, fn) => {
    for (const key of keys) {
      if (!previewByKey.has(key)) previewByKey.set(key, new Set());
      previewByKey.get(key).add(fn);
    }
    fn(getUiColors(getConfig()));
  };

  const refreshPreviewsForKeys = (...keys) => {
    const merged = getUiColors(getConfig());
    const seen = new Set();
    for (const key of keys) {
      for (const fn of previewByKey.get(key) ?? []) {
        if (seen.has(fn)) continue;
        seen.add(fn);
        fn(merged);
      }
    }
  };

  const resolveBgRowPreviewColor = (merged, previewTextColor, previewTextKey) => {
    if (previewTextKey) return merged[previewTextKey];
    if (previewTextColor == null) return merged.textColor;
    return previewTextColor;
  };

  const applyPreviewKbdStyles = (span, merged) => {
    const kbd = span.querySelector('kbd');
    if (!kbd) return;
    kbd.style.backgroundColor = opaqueHex(merged.kbdBg);
    kbd.style.color = opaqueHex(merged.kbdTextColor);
    kbd.style.border = \`1px solid \${opaqueHex(merged.kbdBorderColor)}\`;
  };

  const PREVIEW_KBD_KEYS = ['kbdBg', 'kbdTextColor', 'kbdBorderColor'];

  const registerBgRow = (label, key, previewText, previewTextColor = '#ffffff', previewTextKey = null, previewHtml = null, withKbdPreview = false) => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[key],
      color: resolveBgRowPreviewColor(colors, previewTextColor, previewTextKey),
      text: previewHtml ? null : previewText,
      html: previewHtml,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const previewKeys = previewTextKey
      ? [key, previewTextKey]
      : (previewTextColor == null ? [key, 'textColor'] : [key]);
    if (withKbdPreview) previewKeys.push(...PREVIEW_KBD_KEYS);
    const syncPreview = (merged) => {
      preview.span.style.background = merged[key];
      preview.span.style.color = resolveBgRowPreviewColor(merged, previewTextColor, previewTextKey);
      if (withKbdPreview) applyPreviewKbdStyles(preview.span, merged);
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (value, flush = false) => {
      setConfig(setUiColorKey(getConfig(), key, value));
      persist({ flush });
      setColorInput(bg, value);
      refreshPreviewsForKeys(...previewKeys);
    };
    bindColorInput(bg, sync);
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist({ flush: true });
      const value = getDefaultUiColors(getUiColorMode(getConfig()))[key];
      setColorInput(bg, value);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const registerBgTextRow = (label, bgKey, textKey, previewText, refreshToolbar = false, previewClassName = 'ui-color-preview-cell', previewHtml = null, withKbdPreview = false, previewBgKey = 'cellBg', previewTextKey = 'textColor') => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[bgKey]);
    const text = colorInputTd(colors[textKey]);
    const preview = previewTd({
      background: withKbdPreview ? colors[previewBgKey] : colors[bgKey],
      color: withKbdPreview ? colors[previewTextKey] : colors[textKey],
      text: previewHtml ? null : previewText,
      html: previewHtml,
      className: previewClassName,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [bgKey, textKey]));
    addRow(label, [bg.td, text.td, preview.td, reset.td]);
    const previewKeys = [bgKey, textKey];
    if (withKbdPreview) previewKeys.push(...PREVIEW_KBD_KEYS, previewBgKey, previewTextKey);
    const syncPreview = (merged) => {
      if (withKbdPreview) {
        preview.span.style.background = merged[previewBgKey];
        preview.span.style.color = merged[previewTextKey];
        applyPreviewKbdStyles(preview.span, merged);
      } else {
        preview.span.style.background = merged[bgKey];
        preview.span.style.color = merged[textKey];
      }
      reset.btn.disabled = keysMatchDefaults(getConfig(), [bgKey, textKey]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (bgVal, textVal, flush = false) => {
      setConfig(applyKeys(getConfig(), [bgKey, textKey], [bgVal, textVal]));
      persist({ flush, refreshToolbar });
      setColorInput(bg, bgVal);
      setColorInput(text, textVal);
      refreshPreviewsForKeys(...previewKeys);
    };
    const emitSync = (_value, flush) => sync(bg.input.value, text.input.value, flush);
    bindColorInput(bg, emitSync);
    bindColorInput(text, emitSync);
    reset.btn.addEventListener('click', () => {
      let next = resetUiColorKey(getConfig(), bgKey);
      next = resetUiColorKey(next, textKey);
      setConfig(next);
      persist({ flush: true, refreshToolbar });
      const defaults = getDefaultUiColors(getUiColorMode(getConfig()));
      setColorInput(bg, defaults[bgKey]);
      setColorInput(text, defaults[textKey]);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const registerTextRow = (label, key, previewText, {
    previewBgKey = 'cellBg',
    previewTextKey = null,
    html = null,
    opaque = true,
  } = {}) => {
    const colors = getUiColors(getConfig());
    const text = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[previewBgKey],
      color: previewTextKey ? colors[previewTextKey] : colors[key],
      text: previewText,
      html,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [dashTd(), text.td, preview.td, reset.td]);
    const previewKeys = previewTextKey ? [key, previewTextKey, previewBgKey] : [key, previewBgKey];
    const syncPreview = (merged) => {
      const nextVal = merged[key];
      if (previewTextKey) preview.span.style.color = merged[previewTextKey];
      else preview.span.style.color = nextVal;
      preview.span.style.background = merged[previewBgKey];
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (value, flush = false) => {
      const nextVal = opaque ? opaqueHex(value) : value;
      setConfig(setUiColorKey(getConfig(), key, nextVal));
      persist({ flush });
      setColorInput(text, nextVal);
      refreshPreviewsForKeys(...previewKeys);
    };
    bindColorInput(text, sync);
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist({ flush: true });
      const defaults = getDefaultUiColors(getUiColorMode(getConfig()));
      const nextVal = defaults[key];
      setColorInput(text, nextVal);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const registerAccentRow = (label, key, previewText, { noBorder = false, previewTextColorKey = null } = {}) => {
    const colors = getUiColors(getConfig());
    const text = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors.cellBg,
      color: previewTextColorKey ? colors[previewTextColorKey] : opaqueHex(colors[key]),
      text: previewText,
      className: 'ui-color-preview-cell ui-color-preview-hover',
    });
    preview.span.style.boxShadow = 'none';
    if (!noBorder) {
      preview.span.style.border = \`1px solid \${opaqueHex(colors[key])}\`;
    }
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [dashTd(), text.td, preview.td, reset.td]);
    const previewKeys = previewTextColorKey ? [key, 'cellBg', previewTextColorKey] : [key, 'cellBg'];
    const syncPreview = (merged) => {
      const color = opaqueHex(merged[key]);
      preview.span.style.background = merged.cellBg;
      preview.span.style.color = previewTextColorKey ? merged[previewTextColorKey] : color;
      if (noBorder) preview.span.style.border = 'none';
      else preview.span.style.border = \`1px solid \${color}\`;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (value, flush = false) => {
      const color = opaqueHex(value);
      setConfig(setUiColorKey(getConfig(), key, color));
      persist({ flush });
      setColorInput(text, color);
      refreshPreviewsForKeys(...previewKeys);
    };
    bindColorInput(text, sync);
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist({ flush: true });
      const color = getDefaultUiColors(getUiColorMode(getConfig()))[key];
      setColorInput(text, color);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const registerNavBtnBgTextRow = (label, bgKey, textKey, buttonLabel) => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[bgKey]);
    const text = colorInputTd(colors[textKey]);
    const preview = previewNavBtnTd({
      background: colors[bgKey],
      borderColor: colors[textKey],
      color: colors[textKey],
      label: buttonLabel,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [bgKey, textKey]));
    addRow(label, [bg.td, text.td, preview.td, reset.td]);
    const previewKeys = [bgKey, textKey];
    const syncPreview = (merged) => {
      applyNavBtnPreview(preview.span, {
        background: merged[bgKey],
        borderColor: merged[textKey],
        color: merged[textKey],
      });
      reset.btn.disabled = keysMatchDefaults(getConfig(), [bgKey, textKey]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (bgVal, textVal, flush = false) => {
      setConfig(applyKeys(getConfig(), [bgKey, textKey], [bgVal, textVal]));
      persist({ flush });
      setColorInput(bg, bgVal);
      setColorInput(text, textVal);
      refreshPreviewsForKeys(...previewKeys);
    };
    const emitSync = (_value, flush) => sync(bg.input.value, text.input.value, flush);
    bindColorInput(bg, emitSync);
    bindColorInput(text, emitSync);
    reset.btn.addEventListener('click', () => {
      let next = resetUiColorKey(getConfig(), bgKey);
      next = resetUiColorKey(next, textKey);
      setConfig(next);
      persist({ flush: true });
      const defaults = getDefaultUiColors(getUiColorMode(getConfig()));
      setColorInput(bg, defaults[bgKey]);
      setColorInput(text, defaults[textKey]);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const registerBorderRow = (label, key, previewBgKey, previewText = '${L.borderPreview}', previewTextKey = 'textColor', previewHtml = null, withKbdPreview = false) => {
    const colors = getUiColors(getConfig());
    const border = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[previewBgKey],
      color: colors[previewTextKey],
      text: previewHtml ? null : previewText,
      html: previewHtml,
      className: 'ui-color-preview-cell',
    });
    if (withKbdPreview && key === 'kbdBorderColor') {
      preview.span.style.border = 'none';
    } else {
      preview.span.style.border = \`1px solid \${colors[key]}\`;
    }
    if (withKbdPreview) applyPreviewKbdStyles(preview.span, colors);
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [border.td, dashTd(), preview.td, reset.td]);
    const previewKeys = [key, previewBgKey, previewTextKey];
    if (withKbdPreview) previewKeys.push(...PREVIEW_KBD_KEYS);
    const syncPreview = (merged) => {
      preview.span.style.background = merged[previewBgKey];
      preview.span.style.color = merged[previewTextKey];
      if (withKbdPreview && key === 'kbdBorderColor') {
        preview.span.style.border = 'none';
        applyPreviewKbdStyles(preview.span, merged);
      } else {
        preview.span.style.border = \`1px solid \${merged[key]}\`;
        if (withKbdPreview) applyPreviewKbdStyles(preview.span, merged);
      }
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (value, flush = false) => {
      setConfig(setUiColorKey(getConfig(), key, value));
      persist({ flush });
      setColorInput(border, value);
      refreshPreviewsForKeys(...previewKeys);
    };
    bindColorInput(border, sync);
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist({ flush: true });
      const merged = getUiColors(getConfig());
      setColorInput(border, merged[key]);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const registerFillRow = (label, key, previewText) => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[key],
      color: colors.textColor,
      text: previewText,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const previewKeys = [key, 'textColor'];
    const syncPreview = (merged) => {
      preview.span.style.background = merged[key];
      preview.span.style.color = merged.textColor;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (value, flush = false) => {
      const color = opaqueHex(value);
      setConfig(setUiColorKey(getConfig(), key, color));
      persist({ flush });
      setColorInput(bg, color);
      refreshPreviewsForKeys(...previewKeys);
    };
    bindColorInput(bg, sync);
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist({ flush: true });
      const color = getDefaultUiColors(getUiColorMode(getConfig()))[key];
      setColorInput(bg, color);
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  const JOURNAL_OVERLAY_ALPHA = 0.65;
  const POPUP_SHADOW_ALPHA = 0.45;
  const POPUP_ROW_HOVER_ALPHA = 0.08;
  const LOADING_OVERLAY_ALPHA = 0.38;
  const PLAN_EDITABLE_CELL_HOVER_ALPHA = 0.14;
  const SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA = 0.34;

  const tintPreviewBackground = (hex, alpha, underHex) =>
    \`linear-gradient(\${hexToRgba(hex, alpha)}, \${hexToRgba(hex, alpha)}), \${opaqueHex(underHex)}\`;

  const registerJournalTintRow = (label, key, alpha, previewText, previewBgKey = 'contextMenuBg', previewTextKey = 'textColor', withPreviewBorder = true, layerOverlay = false) => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const under = colors[previewBgKey] ?? colors.cellBg;
    const preview = previewTd({
      background: layerOverlay ? under : tintPreviewBackground(colors[key], alpha, under),
      color: colors[previewTextKey] ?? colors.textColor,
      text: previewText,
    });
    let overlayLayer = null;
    if (layerOverlay) {
      preview.span.style.position = 'relative';
      overlayLayer = document.createElement('span');
      overlayLayer.className = 'ui-color-preview-overlay-layer';
      overlayLayer.style.background = hexToRgba(colors[key], alpha);
      preview.span.appendChild(overlayLayer);
    }
    if (withPreviewBorder) {
      preview.span.style.boxShadow = \`inset 0 0 0 1px \${hexToRgba(colors[previewBgKey] ?? colors.cellBg, 1)}\`;
    }
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const previewKeys = [key, previewBgKey, previewTextKey];
    const syncPreview = (merged) => {
      setColorInput(bg, merged[key]);
      if (layerOverlay) {
        preview.span.style.background = merged[previewBgKey] ?? merged.cellBg;
        preview.span.style.color = merged[previewTextKey] ?? merged.textColor;
        overlayLayer.style.background = hexToRgba(merged[key], alpha);
      } else {
        preview.span.style.background = tintPreviewBackground(merged[key], alpha, merged[previewBgKey] ?? merged.cellBg);
        preview.span.style.color = merged[previewTextKey] ?? merged.textColor;
      }
      preview.span.style.boxShadow = withPreviewBorder
        ? \`inset 0 0 0 1px \${opaqueHex(merged[previewBgKey] ?? merged.cellBg)}\`
        : 'none';
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    subscribePreview(previewKeys, syncPreview);
    const sync = (value, flush = false) => {
      const color = opaqueHex(value);
      setConfig(setUiColorKey(getConfig(), key, color));
      persist({ flush });
      refreshPreviewsForKeys(...previewKeys);
    };
    bindColorInput(bg, sync);
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist({ flush: true });
      refreshPreviewsForKeys(...previewKeys);
    });
  };

  // ${L.layoutComment}
  registerBgRow('${L.browserBg}', 'browserBg', '${L.sampleText}');
  registerBgTextRow('${L.normalText}', 'cellBg', 'textColor', '${L.normalTextPreview}', true);
  registerTextRow('${L.dimText}', 'textDimColor', '${L.dimTextPreview}', {
    previewBgKey: 'browserBg',
  });
  registerBgTextRow('${L.periodModeBudgetActual}', 'periodModeBudgetActualBg', 'periodModeBudgetActualText', '${L.periodModePreviewBudgetActual}', false);
  registerBgTextRow('${L.periodModeActual}', 'periodModeActualBg', 'periodModeActualText', '${L.periodModePreviewActual}', false);
  registerBgTextRow('${L.periodModePlan}', 'periodModePlanBg', 'periodModePlanText', '${L.periodModePreviewPlan}', false);
  registerBgRow('${L.headerControl}', 'headerControlBg', null, null, 'textColor', '${L.headerControlPreviewHtml}', true);
  registerBorderRow('${L.headerControlActiveBorder}', 'headerControlActiveBorder', 'headerControlBg', null, 'textColor', '${L.headerControlPreviewHtml}', true);
  registerNavBtnBgTextRow('${L.dashboardNav}', 'dashboardNavBg', 'dashboardNavText', '${L.dashboardNavPreview}');
  registerNavBtnBgTextRow('${L.planReturnNavActive}', 'dashboardNavActiveBg', 'dashboardNavActiveText', '${L.planTableNavPreview}');
  registerBgTextRow('${L.yearRow}', 'yearRowBg', 'yearRowText', \`\${new Date().getFullYear()}${yearSuffix}\`, false);
  registerBgTextRow('${L.monthRow}', 'monthRowBg', 'monthRowText', \`\${new Date().getMonth() + 1}${monthSuffix}\`, false);
  registerBorderRow('${L.currentMonth}', 'currentMonthBorder', 'monthRowBg', \`\${new Date().getMonth() + 1}${monthSuffix}\`, 'monthRowText');
  registerJournalTintRow('${L.settlementMonth}', 'settlementMonthBg', SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA, '${L.settlementPreview}', 'monthRowBg', 'monthRowText', true, true);
  registerTextRow('${L.negative}', 'negativeAmountColor', null, {
    html: '<span class="amount-yen amount-negative amount-has-prefix"><span class="amount-prefix">-\u00a5</span>1,234</span>',
  });
  registerTextRow('${L.planAmount}', 'planAmountColor', '${L.planAmountPreview}');
  registerTextRow('${L.variance}', 'amountVarianceColor', '${L.planAmountPreview}');
  registerFillRow('${L.fill1}', 'fillColor1', '${L.fill1Preview}');
  registerFillRow('${L.fill2}', 'fillColor2', '${L.fill2Preview}');

  const revArColors = getUiColors(getConfig());
  const revArText = colorInputTd(revArColors.revArTextColor);
  const revArPreview = previewTd({
    background: getSectionBarColor('revenueVariance', data?.sections, resolveSectionColorConfig(), getUiColorMode(getConfig())),
    color: revArColors.revArTextColor,
    text: '${L.revAr}',
  });
  const revArReset = resetBtnTd(keysMatchDefaults(getConfig(), ['revArTextColor']));
  const revArBgTd = dashTd();
  revArBgTd.title = '${L.revArBgTitle}';
  revArPreview.span.dataset.sectionBarRef = 'revenueVariance';
  addRow('${L.revAr}', [revArBgTd, revArText.td, revArPreview.td, revArReset.td]);
  bindColorInput(revArText, (value, flush) => {
    const text = opaqueHex(value);
    setConfig(setUiColorKey(getConfig(), 'revArTextColor', text));
    persist({ flush });
    setColorInput(revArText,text);
    revArPreview.span.style.color = text;
    revArReset.btn.disabled = keysMatchDefaults(getConfig(), ['revArTextColor']);
  });
  revArReset.btn.addEventListener('click', () => {
    setConfig(resetUiColorKey(getConfig(), 'revArTextColor'));
    persist({ flush: true });
    const text = getDefaultUiColors(getUiColorMode(getConfig())).revArTextColor;
    setColorInput(revArText,text);
    revArPreview.span.style.color = text;
    revArReset.btn.disabled = true;
  });
  registerTextRow('${L.warning}', 'warningTextColor', '${L.warningPreview}');

  registerAccentRow('${L.expandable}', 'expandableHighlight', '${L.expandablePreview}', { noBorder: true });
  registerAccentRow('${L.hover}', 'rowHoverBorder', '${L.hoverPreview}', { previewTextColorKey: 'textColor' });
  registerAccentRow('${L.selection}', 'rowSelectionRing', '${L.selectionPreview}', { previewTextColorKey: 'textColor' });
  registerJournalTintRow('${L.planEditableCellHover}', 'planEditableCellHoverBg', PLAN_EDITABLE_CELL_HOVER_ALPHA, '${L.planAmountPreview}', 'cellBg', 'planAmountColor');
  registerBgRow('${L.contextMenuBg}', 'contextMenuBg', '${L.sampleText}');
  registerJournalTintRow('${L.popupShadow}', 'contextMenuShadowBg', POPUP_SHADOW_ALPHA, '${L.sampleText}', 'contextMenuBg');
  registerJournalTintRow('${L.popupRowHover}', 'contextMenuItemHoverBg', POPUP_ROW_HOVER_ALPHA, '${L.sampleText}', 'contextMenuBg');
  registerJournalTintRow('${L.journalOverlay}', 'journalOverlayBg', JOURNAL_OVERLAY_ALPHA, '${L.sampleText}', 'browserBg', 'textColor', false);
  registerJournalTintRow('${L.loadingOverlay}', 'loadingOverlayBg', LOADING_OVERLAY_ALPHA, '${L.loadingPreview}', 'browserBg');
  registerBgRow('${L.settingsInputBg}', 'settingsInputBg', '${L.sampleText}');
  registerBorderRow('${L.settingsInputBorder}', 'settingsInputBorder', 'monthRowBg', '${L.sampleText}');
  registerBgTextRow('${L.shortcutKbd}', 'kbdBg', 'kbdTextColor', null, false, 'ui-color-preview-cell', '${L.kbdPreviewHtml}', true, 'headerControlBg', 'textColor');
  registerBorderRow('${L.shortcutKbdBorder}', 'kbdBorderColor', 'headerControlBg', null, 'textColor', '${L.kbdPreviewHtml}', true);
  registerTextRow('${L.statusOk}', 'statusOkColor', '${L.statusOkPreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('${L.statusError}', 'statusErrorColor', '${L.statusErrorPreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerBgTextRow('${L.primaryBtn}', 'primaryButtonBg', 'primaryButtonTextColor', '${L.primaryBtnPreview}', false, 'ui-color-preview-cell ui-color-preview-action-btn');
  registerBgTextRow('${L.miscBtn}', 'settingsButtonBg', 'settingsButtonTextColor', '${L.settingsButtonPreview}', false, 'ui-color-preview-cell ui-color-preview-action-btn');
  registerBgTextRow('${L.deleteBtn}', 'deleteBtnBg', 'deleteBtnText', '${L.deletePreview}', false, 'ui-color-preview-cell ui-color-preview-action-btn');
  registerBorderRow('${L.buttonBorder}', 'buttonBorderColor', 'primaryButtonBg', '${L.primaryBtnPreview}', 'primaryButtonTextColor');
  registerAccentRow('${L.accentColor}', 'accentColor', '${L.accentPreview}', { noBorder: true });

  table.appendChild(tbody);
  panel.appendChild(table);
  container.appendChild(panel);
}
`;

writeFileSync(outPath, content, { encoding: 'utf8' });
console.log('Wrote', outPath);
