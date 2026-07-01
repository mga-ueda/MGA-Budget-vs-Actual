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
  colBg: jp(0x80cc, 0x666f, 0x8272),
  colText: jp(0x6587, 0x5b57, 0x8272),
  colPreview: jp(0x30d7, 0x30ec, 0x30d3, 0x30e5, 0x30fc),
  colAction: jp(0x64cd, 0x4f5c),
  layoutComment: jp(0x4e88, 0x5b9f, 0x8868, 0x30ec, 0x30a4, 0x30a2, 0x30a6, 0x30c8, 0x9806),
  browserBg: jp(0x30d6, 0x30e9, 0x30a6, 0x30b6, 0xff08, 0x80cc, 0x666f, 0xff09),
  settingsSurfaceBg: jp(0x8a2d, 0x5b9a, 0x30d1, 0x30cd, 0x30eb, 0xff08, 0x80cc, 0x666f, 0xff09),
  settingsInputBg: jp(0x5165, 0x529b, 0x6b04, 0xff08, 0x80cc, 0x666f, 0xff09),
  settingsInputBorder: jp(0x5165, 0x529b, 0x6b04, 0xff08, 0x67a0, 0x7dda, 0xff09),
  settingsButtonBg: jp(0x30dc, 0x30bf, 0x30f3, 0xff08, 0x80cc, 0x666f, 0xff09),
  settingsRowHoverBg: jp(0x8a2d, 0x5b9a, 0x8868, 0x884c, 0xff08, 0x30db, 0x30d0, 0x30fc, 0xff09),
  bgPreview: jp(0x80cc, 0x666f),
  borderPreview: jp(0x67a0, 0x7dda),
  yearRow: jp(0x5e74, 0x884c, 0xff08, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0xff09),
  yearPreview: jp(0x3232, 0x30e5, 0x5e74).replace('32', '2025'),
  monthRow: jp(0x6708, 0x884c, 0xff08, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0xff09),
  monthPreview: jp(0x36, 0x6708),
  currentMonth: jp(0x5f53, 0x6708, 0x5217, 0xff08, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  settlementMonth: jp(0x6c7a, 0x7b97, 0x6574, 0x7406, 0x5217, 0xff08, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  settlementPreview: jp(0x33, 0x6708),
  cellRow: jp(0x30bb, 0x30eb, 0xff08, 0x660e, 0x7d30, 0x884c, 0xff09),
  cellPreview: jp(0xa5, 0x31, 0x2c, 0x32, 0x33, 0x34),
  noteText: jp(0x6ce8, 0x91c8, 0x6587, 0x30fb, 0x8aac, 0x660e, 0x6587),
  notePreview: jp(0x8aac, 0x660e, 0x6587, 0x306e, 0x30b5, 0x30f3, 0x30d7, 0x30eb),
  hintText: jp(0x30d2, 0x30f3, 0x30c8, 0x6587),
  hintPreview: jp(0x88dc, 0x8db3, 0x30c6, 0x30ad, 0x30b9, 0x30c8),
  dimText: jp(0x8584, 0x3044, 0x30fb, 0x6de1, 0x3044, 0x6587, 0x5b57),
  dimPreview: jp(0x30d5, 0x30c3, 0x30bf, 0x30fc, 0x30fb, 0x30d2, 0x30f3, 0x30c8, 0x7b49),
  negative: jp(0x30de, 0x30a4, 0x30ca, 0x30b9, 0x5024, 0xff08, 0x91d1, 0x984d, 0xff09),
  planAmount: jp(0x8a08, 0x753b, 0x91d1, 0x984d),
  planAmountPreview: jp(0xa5, 0x31, 0x2c, 0x32, 0x33, 0x34, 0x2c, 0x35, 0x36, 0x37),
  variance: jp(0x91d1, 0x984d, 0x5dee, 0x7570),
  fill1: jp(0x5857, 0x308a, 0x8272, 0x31, 0xff08, 0x6ce8, 0x76ee, 0xff09),
  fill1Preview: jp(0x6ce8, 0x76ee, 0x884c),
  fill2: jp(0x5857, 0x308a, 0x8272, 0x32, 0xff08, 0x6ce8, 0x610f, 0xff09),
  fill2Preview: jp(0x6ce8, 0x610f, 0x884c),
  warning: jp(0x8b66, 0x544a, 0x6587, 0x5b57, 0x8272),
  warningBgTitle: jp(
    0x80cc, 0x666f, 0x8272, 0x306f, 0x5927, 0x9805, 0x76ee, 0x8272, 0xff08, 0x58f2, 0x4e0a, 0x9ad8, 0x5dee, 0x7570, 0xff09, 0x3092, 0x53c2, 0x7167,
  ),
  warningPreview: jp(0x58f2, 0x4e0a, 0x9ad8, 0xff0d, 0x58f2, 0x639b, 0x91d1),
  expandable: jp(0x5c55, 0x958b, 0x53ef, 0x80fd, 0x9805, 0x76ee, 0x30fb, 0x4ed5, 0x8a33, 0x30bb, 0x30eb, 0xff08, 0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0xff09),
  expandablePreview: jp(0x25b6, 0x20, 0x52d8, 0x5b9a, 0x79d1, 0x76ee),
  hover: jp(0x30de, 0x30a6, 0x30b9, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0xff08, 0x884c, 0xff09),
  hoverPreview: jp(0x30db, 0x30d0, 0x30fc),
  selection: jp(0x884c, 0x9078, 0x629e, 0xff08, 0x67a0, 0x7dda, 0xff09),
  selectionPreview: jp(0x9078, 0x629e, 0x4e2d),
  accentColor: jp(0x30a2, 0x30af, 0x30bb, 0x30f3, 0x30f3, 0x30c8, 0xff08, 0x9078, 0x629e, 0x30de, 0x30fc, 0x30af, 0x7b49, 0xff09),
  accentPreview: jp(0x2713, 0x20, 0x9078, 0x629e),
  deleteBtnBg: jp(0x524a, 0x9664, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x80cc, 0x666f, 0xff09),
  deleteBtnHover: jp(0x524a, 0x9664, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x30db, 0x30d0, 0x30fc, 0xff09),
  deleteBtnBorder: jp(0x524a, 0x9664, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x67a0, 0x7dda, 0xff09),
  deleteBtnText: jp(0x524a, 0x9664, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x6587, 0x5b57, 0xff09),
  deletePreview: jp(0x524a, 0x9664),
  tableHeaderBg: jp(0x4e88, 0x5b9f, 0x8868, 0xff08, 0x56fa, 0x5b9a, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x80cc, 0x666f, 0xff09),
  tableHeaderPreview: jp(0x898b, 0x51fa, 0x3057),
  contextMenuBg: jp(0x53f3, 0x30af, 0x30ea, 0x30c3, 0x30af, 0x30e1, 0x30cb, 0x30e5, 0x30fc, 0xff08, 0x80cc, 0x666f, 0xff09),
  contextMenuShadow: jp(0x53f3, 0x30af, 0x30ea, 0x30c3, 0x30af, 0x30e1, 0x30cb, 0x30e5, 0x30fc, 0xff08, 0x5f71, 0xff09),
  contextMenuHover: jp(0x53f3, 0x30af, 0x30ea, 0x30c3, 0x30af, 0x30e1, 0x30cb, 0x30e5, 0x30fc, 0xff08, 0x884c, 0x30db, 0x30d0, 0x30fc, 0xff09),
  contextMenuPreview: jp(0x30e1, 0x30cb, 0x30e5, 0x30fc),
  periodModeBudgetActual: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x300c, 0x4e88, 0x5b9f, 0x300d, 0xff08, 0x80cc, 0x666f, 0xff09),
  periodModeActual: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x300c, 0x5b9f, 0x7e3e, 0x300d, 0xff08, 0x80cc, 0x666f, 0xff09),
  periodModePlan: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x300c, 0x8a08, 0x753b, 0x300d, 0xff08, 0x80cc, 0x666f, 0xff09),
  periodModeText: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9, 0x30d0, 0x30c3, 0x30b8, 0xff08, 0x6587, 0x5b57, 0xff09),
  periodModePreview: jp(0x4e88, 0x5b9f),
  loadingOverlay: jp(0x8aad, 0x307f, 0x8fbc, 0x307f, 0x4e2d, 0xff08, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  loadingPreview: jp(0x8aad, 0x307f, 0x8fbc, 0x307f),
  statusOk: jp(0x6210, 0x529f, 0x30fb, 0x4f, 0x4b, 0x8868, 0x793a),
  statusError: jp(0x30a8, 0x30e9, 0x30fc, 0x8868, 0x793a),
  statusInvalid: jp(0x5165, 0x529b, 0x30a8, 0x30e9, 0x30fc, 0xff08, 0x67a0, 0x7dda, 0xff09),
  statusOkPreview: jp(0x4f, 0x4b),
  statusErrorPreview: jp(0x4e, 0x47),
  primaryBtnStart: jp(0x4e3b, 0x8981, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x30b0, 0x30e9, 0x30c7, 0x958b, 0x59cb, 0xff09),
  primaryBtnEnd: jp(0x4e3b, 0x8981, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x30b0, 0x30e9, 0x30c7, 0x7d42, 0x4e86, 0xff09),
  primaryBtnText: jp(0x4e3b, 0x8981, 0x30dc, 0x30bf, 0x30f3, 0xff08, 0x6587, 0x5b57, 0xff09),
  primaryBtnPreview: jp(0x958b, 0x304f),
  interactiveAccent: jp(0x64cd, 0x4f5c, 0x5f37, 0x8abf, 0xff08, 0x30b9, 0x30e9, 0x30a4, 0x30c0, 0x30fc, 0x30fb, 0x44, 0x26, 0x44, 0x7b49, 0xff09),
  interactivePreview: jp(0x5f37, 0x8abf),
  bonusMonthColumn: jp(0x8cde, 0x4e0e, 0x6708, 0x5217, 0xff08, 0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0xff09),
  bonusPreview: jp(0x8cde, 0x4e0e, 0x6708),
  journalOverlay: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x80cc, 0x9762, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30ec, 0x30a4, 0xff09),
  journalModal: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x30e2, 0x30fc, 0x30c0, 0x30eb, 0x80cc, 0x666f, 0xff09),
  journalText: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x6587, 0x5b57, 0x8272, 0xff09),
  journalHint: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x88dc, 0x8db3, 0x6587, 0xff09),
  journalTableHeader: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x8868, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x80cc, 0x666f, 0xff09),
  journalShadow: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x30e2, 0x30fc, 0x30c0, 0x30eb, 0x5f71, 0xff09),
  journalRowHover: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x884c, 0x30db, 0x30d0, 0x30fc, 0xff09),
  journalCloseHover: jp(0x4ed5, 0x8a33, 0x8a73, 0x7d30, 0xff08, 0x9589, 0x3058, 0x308b, 0x30fb, 0x30db, 0x30d0, 0x30fc, 0xff09),
  journalTextPreview: jp(0x4ed5, 0x8a33, 0x660e, 0x7d30),
  journalHintPreview: jp(0x4ef6, 0x6570, 0x30fb, 0x7a7a, 0x6b04, 0x30e1, 0x30c3, 0x30bb, 0x30fc, 0x30b8),
  journalHeaderPreview: jp(0x898b, 0x51fa, 0x3057),
  journalModalPreview: jp(0x30e2, 0x30fc, 0x30c0, 0x30eb),
  journalBackPreview: jp(0x80cc, 0x9762),
  journalRowPreview: jp(0x884c),
  journalClosePreview: jp(0x00d7),
  journalShadowPreview: jp(0x5f71),
  modeLabel: jp(0x8868, 0x793a, 0x30e2, 0x30fc, 0x30c9),
  modeDark: jp(0x30c0, 0x30fc, 0x30af, 0x30e2, 0x30fc, 0x30c9),
  modeLight: jp(0x30e9, 0x30a4, 0x30c8, 0x30e2, 0x30fc, 0x30c9),
};

L.yearPreview = '2025' + jp(0x5e74);

const content = `import {
  getUiColors,
  getUiColorMode,
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
} from '../config/uiColorConfig.js';
import { getSectionBarColor } from '../config/sectionColorConfig.js';

function dashTd(className = 'col-color-input') {
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
  onRefreshPlanView,
  onReRender,
}) {
  const panel = document.createElement('div');
  panel.className = 'ui-color-panel';

  const title = document.createElement('h2');
  title.className = 'ui-color-panel-title';
  title.textContent = '${L.panelTitle}';
  panel.appendChild(title);

  const persist = () => {
    const config = getConfig();
    saveUiColorConfig(config);
    applyUiColors(config);
  };

  const refreshPlan = () => {
    onRefreshPlanView?.();
  };

  const modeRow = document.createElement('div');
  modeRow.className = 'ui-color-mode-row';
  const modeLabel = document.createElement('label');
  modeLabel.className = 'ui-color-mode-label';
  modeLabel.textContent = '${L.modeLabel}';
  const modeSelect = document.createElement('select');
  modeSelect.className = 'ui-color-mode-select app-settings-input';
  modeSelect.setAttribute('aria-label', '${L.modeLabel}');
  for (const [value, label] of [['dark', '${L.modeDark}'], ['light', '${L.modeLight}']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    modeSelect.appendChild(option);
  }
  modeSelect.value = getUiColorMode(getConfig());
  modeRow.append(modeLabel, modeSelect);
  panel.appendChild(modeRow);

  modeSelect.addEventListener('change', () => {
    setConfig(switchUiColorMode(getConfig(), modeSelect.value));
    persist();
    refreshPlan();
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

  const registerBgRow = (label, key, previewText, previewTextColor = '#ffffff') => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[key],
      color: previewTextColor,
      text: previewText,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const sync = (value) => {
      setConfig(setUiColorKey(getConfig(), key, value));
      persist();
      bg.input.value = value;
      bg.input.title = value;
      preview.span.style.background = value;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    bg.input.addEventListener('input', () => sync(bg.input.value));
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist();
      const value = getDefaultUiColors(getUiColorMode(getConfig()))[key];
      bg.input.value = value;
      bg.input.title = value;
      preview.span.style.background = value;
      reset.btn.disabled = true;
    });
  };

  const registerBgTextRow = (label, bgKey, textKey, previewText) => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[bgKey]);
    const text = colorInputTd(colors[textKey]);
    const preview = previewTd({
      background: colors[bgKey],
      color: colors[textKey],
      text: previewText,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [bgKey, textKey]));
    addRow(label, [bg.td, text.td, preview.td, reset.td]);
    const sync = (bgVal, textVal) => {
      setConfig(applyKeys(getConfig(), [bgKey, textKey], [bgVal, textVal]));
      persist();
      bg.input.value = bgVal;
      bg.input.title = bgVal;
      text.input.value = textVal;
      text.input.title = textVal;
      preview.span.style.background = bgVal;
      preview.span.style.color = textVal;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [bgKey, textKey]);
      refreshPlan();
    };
    bg.input.addEventListener('input', () => sync(bg.input.value, text.input.value));
    text.input.addEventListener('input', () => sync(bg.input.value, text.input.value));
    reset.btn.addEventListener('click', () => {
      let next = resetUiColorKey(getConfig(), bgKey);
      next = resetUiColorKey(next, textKey);
      setConfig(next);
      persist();
      const defaults = getDefaultUiColors(getUiColorMode(getConfig()));
      bg.input.value = defaults[bgKey];
      bg.input.title = defaults[bgKey];
      text.input.value = defaults[textKey];
      text.input.title = defaults[textKey];
      preview.span.style.background = defaults[bgKey];
      preview.span.style.color = defaults[textKey];
      reset.btn.disabled = true;
      refreshPlan();
    });
  };

  const registerTextRow = (label, key, previewText, {
    previewBgKey = 'cellBg',
    previewTextKey = null,
    html = null,
    opaque = true,
    refresh = true,
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
    const sync = (value) => {
      const nextVal = opaque ? opaqueHex(value) : value;
      setConfig(setUiColorKey(getConfig(), key, nextVal));
      persist();
      text.input.value = nextVal;
      text.input.title = nextVal;
      const merged = getUiColors(getConfig());
      if (previewTextKey) preview.span.style.color = merged[previewTextKey];
      else preview.span.style.color = nextVal;
      preview.span.style.background = merged[previewBgKey];
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
      if (refresh) refreshPlan();
    };
    text.input.addEventListener('input', () => sync(text.input.value));
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist();
      const defaults = getDefaultUiColors(getUiColorMode(getConfig()));
      const nextVal = defaults[key];
      text.input.value = nextVal;
      text.input.title = nextVal;
      const merged = getUiColors(getConfig());
      if (previewTextKey) preview.span.style.color = merged[previewTextKey];
      else preview.span.style.color = nextVal;
      preview.span.style.background = merged[previewBgKey];
      reset.btn.disabled = true;
      if (refresh) refreshPlan();
    });
  };

  const registerAccentRow = (label, key, previewText) => {
    const colors = getUiColors(getConfig());
    const text = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors.cellBg,
      color: opaqueHex(colors[key]),
      text: previewText,
      className: 'ui-color-preview-cell ui-color-preview-hover',
    });
    preview.span.style.boxShadow = 'none';
    preview.span.style.border = \`1px solid \${opaqueHex(colors[key])}\`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [dashTd(), text.td, preview.td, reset.td]);
    const sync = (value) => {
      const color = opaqueHex(value);
      setConfig(setUiColorKey(getConfig(), key, color));
      persist();
      text.input.value = color;
      text.input.title = color;
      const { cellBg } = getUiColors(getConfig());
      preview.span.style.background = cellBg;
      preview.span.style.color = color;
      preview.span.style.border = \`1px solid \${color}\`;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
      refreshPlan();
    };
    text.input.addEventListener('input', () => sync(text.input.value));
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist();
      const color = getDefaultUiColors(getUiColorMode(getConfig()))[key];
      text.input.value = color;
      text.input.title = color;
      const { cellBg } = getUiColors(getConfig());
      preview.span.style.background = cellBg;
      preview.span.style.color = color;
      preview.span.style.border = \`1px solid \${color}\`;
      reset.btn.disabled = true;
      refreshPlan();
    });
  };

  const registerBorderRow = (label, key, previewBgKey) => {
    const colors = getUiColors(getConfig());
    const border = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[previewBgKey],
      color: colors.textColor,
      text: '${L.borderPreview}',
      className: 'ui-color-preview-cell',
    });
    preview.span.style.border = \`2px solid \${colors[key]}\`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [border.td, dashTd(), preview.td, reset.td]);
    const sync = (value) => {
      setConfig(setUiColorKey(getConfig(), key, value));
      persist();
      border.input.value = value;
      border.input.title = value;
      const merged = getUiColors(getConfig());
      preview.span.style.background = merged[previewBgKey];
      preview.span.style.border = \`2px solid \${value}\`;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    border.input.addEventListener('input', () => sync(border.input.value));
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist();
      const merged = getUiColors(getConfig());
      const value = merged[key];
      border.input.value = value;
      border.input.title = value;
      preview.span.style.background = merged[previewBgKey];
      preview.span.style.border = \`2px solid \${value}\`;
      reset.btn.disabled = true;
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
    const sync = (value) => {
      const color = opaqueHex(value);
      setConfig(setUiColorKey(getConfig(), key, color));
      persist();
      bg.input.value = color;
      bg.input.title = color;
      preview.span.style.background = color;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
      refreshPlan();
    };
    bg.input.addEventListener('input', () => sync(bg.input.value));
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist();
      const color = getDefaultUiColors(getUiColorMode(getConfig()))[key];
      bg.input.value = color;
      bg.input.title = color;
      preview.span.style.background = color;
      reset.btn.disabled = true;
      refreshPlan();
    });
  };

  const JOURNAL_OVERLAY_ALPHA = 0.65;
  const JOURNAL_MODAL_SHADOW_ALPHA = 0.45;
  const JOURNAL_ROW_HOVER_ALPHA = 0.03;
  const JOURNAL_CLOSE_HOVER_ALPHA = 0.08;
  const CONTEXT_MENU_SHADOW_ALPHA = 0.45;
  const CONTEXT_MENU_ITEM_HOVER_ALPHA = 0.08;
  const LOADING_OVERLAY_ALPHA = 0.38;

  const registerJournalTintRow = (label, key, alpha, previewText, previewBgKey = 'journalModalBg') => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const preview = previewTd({
      background: hexToRgba(colors[key], alpha),
      color: colors.textColor,
      text: previewText,
    });
    preview.span.style.boxShadow = \`inset 0 0 0 1px \${hexToRgba(colors[previewBgKey] ?? colors.cellBg, 1)}\`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const syncPreview = (merged) => {
      bg.input.value = merged[key];
      bg.input.title = merged[key];
      preview.span.style.background = hexToRgba(merged[key], alpha);
      preview.span.style.color = merged.textColor;
      preview.span.style.boxShadow = \`inset 0 0 0 1px \${opaqueHex(merged[previewBgKey] ?? merged.cellBg)}\`;
      reset.btn.disabled = keysMatchDefaults(getConfig(), [key]);
    };
    const sync = (value) => {
      const color = opaqueHex(value);
      setConfig(setUiColorKey(getConfig(), key, color));
      persist();
      syncPreview(getUiColors(getConfig()));
    };
    bg.input.addEventListener('input', () => sync(bg.input.value));
    reset.btn.addEventListener('click', () => {
      setConfig(resetUiColorKey(getConfig(), key));
      persist();
      syncPreview(getUiColors(getConfig()));
    });
  };

  // ${L.layoutComment}
  registerBgRow('${L.browserBg}', 'browserBg', '${L.bgPreview}');
  registerBgRow('${L.settingsSurfaceBg}', 'settingsSurfaceBg', '${L.bgPreview}');
  registerBgRow('${L.settingsInputBg}', 'settingsInputBg', '${L.bgPreview}');
  registerBorderRow('${L.settingsInputBorder}', 'settingsInputBorder', 'settingsSurfaceBg');
  registerBgRow('${L.settingsButtonBg}', 'settingsButtonBg', '${L.bgPreview}');
  registerBgRow('${L.settingsRowHoverBg}', 'settingsRowHoverBg', '${L.bgPreview}');
  registerBgTextRow('${L.yearRow}', 'yearRowBg', 'yearRowText', '${L.yearPreview}');
  registerBgTextRow('${L.monthRow}', 'monthRowBg', 'monthRowText', '${L.monthPreview}');
  registerBgTextRow('${L.currentMonth}', 'currentMonthBg', 'currentMonthBorder', '${L.monthPreview}');
  registerBgRow('${L.settlementMonth}', 'settlementMonthBg', '${L.settlementPreview}');
  registerBgTextRow('${L.cellRow}', 'cellBg', 'textColor', '${L.cellPreview}');
  registerTextRow('${L.noteText}', 'noteTextColor', '${L.notePreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('${L.hintText}', 'hintTextColor', '${L.hintPreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('${L.dimText}', 'textDimColor', '${L.dimPreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('${L.negative}', 'negativeAmountColor', null, {
    html: '<span class="amount-yen amount-negative amount-has-prefix"><span class="amount-prefix">-\u00a5</span>1,234</span>',
  });
  registerTextRow('${L.planAmount}', 'planAmountColor', '${L.planAmountPreview}');
  registerTextRow('${L.variance}', 'amountVarianceColor', '${L.planAmountPreview}');
  registerFillRow('${L.fill1}', 'fillColor1', '${L.fill1Preview}');
  registerFillRow('${L.fill2}', 'fillColor2', '${L.fill2Preview}');

  const warningColors = getUiColors(getConfig());
  const warningText = colorInputTd(warningColors.warningTextColor);
  const warningPreview = previewTd({
    background: getSectionBarColor('revenueVariance', data?.sections, sectionColorConfig, getUiColorMode(getConfig())),
    color: warningColors.warningTextColor,
    text: '${L.warningPreview}',
  });
  const warningReset = resetBtnTd(keysMatchDefaults(getConfig(), ['warningTextColor']));
  const warningBgTd = dashTd();
  warningBgTd.title = '${L.warningBgTitle}';
  addRow('${L.warning}', [warningBgTd, warningText.td, warningPreview.td, warningReset.td]);
  warningText.input.addEventListener('input', () => {
    const text = opaqueHex(warningText.input.value);
    setConfig(setUiColorKey(getConfig(), 'warningTextColor', text));
    persist();
    warningText.input.value = text;
    warningText.input.title = text;
    warningPreview.span.style.color = text;
    warningReset.btn.disabled = keysMatchDefaults(getConfig(), ['warningTextColor']);
    refreshPlan();
  });
  warningReset.btn.addEventListener('click', () => {
    setConfig(resetUiColorKey(getConfig(), 'warningTextColor'));
    persist();
    const text = getDefaultUiColors(getUiColorMode(getConfig())).warningTextColor;
    warningText.input.value = text;
    warningText.input.title = text;
    warningPreview.span.style.color = text;
    warningReset.btn.disabled = true;
    refreshPlan();
  });

  registerAccentRow('${L.expandable}', 'expandableHighlight', '${L.expandablePreview}');
  registerJournalTintRow('${L.journalOverlay}', 'journalOverlayBg', JOURNAL_OVERLAY_ALPHA, '${L.journalBackPreview}', 'browserBg');
  registerBgRow('${L.journalModal}', 'journalModalBg', '${L.journalModalPreview}');
  registerTextRow('${L.journalText}', 'journalTextColor', '${L.journalTextPreview}', {
    previewBgKey: 'journalModalBg',
    refresh: false,
  });
  registerTextRow('${L.journalHint}', 'journalHintTextColor', '${L.journalHintPreview}', {
    previewBgKey: 'journalModalBg',
    refresh: false,
  });
  registerBgRow('${L.journalTableHeader}', 'journalTableHeaderBg', '${L.journalHeaderPreview}');
  registerJournalTintRow('${L.journalShadow}', 'journalModalShadowBg', JOURNAL_MODAL_SHADOW_ALPHA, '${L.journalShadowPreview}');
  registerJournalTintRow('${L.journalRowHover}', 'journalRowHoverBg', JOURNAL_ROW_HOVER_ALPHA, '${L.journalRowPreview}');
  registerJournalTintRow('${L.journalCloseHover}', 'journalCloseHoverBg', JOURNAL_CLOSE_HOVER_ALPHA, '${L.journalClosePreview}');
  registerBgRow('${L.tableHeaderBg}', 'tableHeaderBg', '${L.tableHeaderPreview}');
  registerBgRow('${L.contextMenuBg}', 'contextMenuBg', '${L.contextMenuPreview}');
  registerJournalTintRow('${L.contextMenuShadow}', 'contextMenuShadowBg', CONTEXT_MENU_SHADOW_ALPHA, '${L.journalShadowPreview}', 'contextMenuBg');
  registerJournalTintRow('${L.contextMenuHover}', 'contextMenuItemHoverBg', CONTEXT_MENU_ITEM_HOVER_ALPHA, '${L.journalRowPreview}', 'contextMenuBg');
  registerBgRow('${L.periodModeBudgetActual}', 'periodModeBudgetActualBg', '${L.periodModePreview}');
  registerBgRow('${L.periodModeActual}', 'periodModeActualBg', '${L.periodModePreview}');
  registerBgRow('${L.periodModePlan}', 'periodModePlanBg', '${L.periodModePreview}');
  registerTextRow('${L.periodModeText}', 'periodModeTextColor', '${L.periodModePreview}', {
    previewBgKey: 'periodModeBudgetActualBg',
    refresh: false,
  });
  registerJournalTintRow('${L.loadingOverlay}', 'loadingOverlayBg', LOADING_OVERLAY_ALPHA, '${L.loadingPreview}', 'browserBg');
  registerTextRow('${L.statusOk}', 'statusOkColor', '${L.statusOkPreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('${L.statusError}', 'statusErrorColor', '${L.statusErrorPreview}', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerBorderRow('${L.statusInvalid}', 'statusInvalidColor', 'settingsSurfaceBg');
  registerBgRow('${L.primaryBtnStart}', 'primaryButtonBgStart', '${L.primaryBtnPreview}');
  registerBgRow('${L.primaryBtnEnd}', 'primaryButtonBgEnd', '${L.primaryBtnPreview}');
  registerTextRow('${L.primaryBtnText}', 'primaryButtonTextColor', '${L.primaryBtnPreview}', {
    previewBgKey: 'primaryButtonBgStart',
    previewTextKey: 'primaryButtonTextColor',
    refresh: false,
  });
  registerAccentRow('${L.interactiveAccent}', 'interactiveAccentColor', '${L.interactivePreview}');
  registerJournalTintRow('${L.bonusMonthColumn}', 'bonusMonthColumnBg', 0.08, '${L.bonusPreview}', 'cellBg');
  registerBgRow('${L.deleteBtnBg}', 'deleteBtnBg', '${L.deletePreview}', '#ffffff');
  registerBgRow('${L.deleteBtnHover}', 'deleteBtnBgHover', '${L.deletePreview}', '#ffffff');
  registerBorderRow('${L.deleteBtnBorder}', 'deleteBtnBorder', 'cellBg');
  registerTextRow('${L.deleteBtnText}', 'deleteBtnText', '${L.deletePreview}', {
    previewBgKey: 'deleteBtnBg',
    previewTextKey: 'deleteBtnText',
    refresh: false,
  });
  registerAccentRow('${L.accentColor}', 'accentColor', '${L.accentPreview}');
  registerAccentRow('${L.hover}', 'rowHoverBorder', '${L.hoverPreview}');
  registerAccentRow('${L.selection}', 'rowSelectionRing', '${L.selectionPreview}');

  table.appendChild(tbody);
  panel.appendChild(table);
  container.appendChild(panel);
}
`;

writeFileSync(outPath, content, { encoding: 'utf8' });
console.log('Wrote', outPath);
