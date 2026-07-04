import {
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
  getHoverBoostPercent,
  setHoverBoostPercent,
  resetHoverBoostPercent,
  isHoverBoostPercentCustom,
  DEFAULT_HOVER_BOOST_PERCENT,
} from '../config/uiColorConfig.js';
import { getSectionBarColor } from '../config/sectionColorConfig.js';

function dashTd(className = 'col-color-input') {
  const td = document.createElement('td');
  td.className = className;
  td.textContent = '—';
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
  btn.textContent = 'デフォルト';
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
  onRefreshToolbar,
  onReRender,
}) {
  const panel = document.createElement('div');
  panel.className = 'ui-color-panel';

  const title = document.createElement('h2');
  title.className = 'ui-color-panel-title';
  title.textContent = '予実表全体';
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
  modeLabel.textContent = '表示モード';
  const modeSelect = document.createElement('select');
  modeSelect.className = 'ui-color-mode-select app-settings-input';
  modeSelect.setAttribute('aria-label', '表示モード');
  for (const [value, label] of [['dark', 'ダークモード'], ['light', 'ライトモード']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    modeSelect.appendChild(option);
  }
  modeSelect.value = getUiColorMode(getConfig());
  const hoverBoostLabel = document.createElement('label');
  hoverBoostLabel.className = 'ui-color-mode-label ui-color-hover-boost-label';
  hoverBoostLabel.textContent = 'ホバー明るさ';
  const hoverBoostWrap = document.createElement('span');
  hoverBoostWrap.className = 'ui-color-hover-boost-wrap';
  const hoverBoostInput = document.createElement('input');
  hoverBoostInput.type = 'number';
  hoverBoostInput.className = 'ui-color-hover-boost-input app-settings-input';
  hoverBoostInput.min = '0';
  hoverBoostInput.max = '100';
  hoverBoostInput.step = '1';
  hoverBoostInput.setAttribute('aria-label', 'ホバー明るさ');
  hoverBoostInput.value = String(getHoverBoostPercent(getConfig()));
  const hoverBoostSuffix = document.createElement('span');
  hoverBoostSuffix.className = 'ui-color-hover-boost-suffix';
  hoverBoostSuffix.textContent = '%';
  const hoverBoostReset = document.createElement('button');
  hoverBoostReset.type = 'button';
  hoverBoostReset.className = 'section-color-reset-btn ui-color-hover-boost-reset';
  hoverBoostReset.textContent = 'デフォルト';
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
  table.innerHTML = `
    <thead>
      <tr>
        <th>項目</th>
        <th class="col-color-input">塗り色</th>
        <th class="col-color-input">文字色</th>
        <th class="col-color-preview">プレビュー</th>
        <th class="col-color-action">操作</th>
      </tr>
    </thead>
  `;

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

  const registerBgRow = (label, key, previewText, previewTextColor = '#ffffff', previewTextKey = null) => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[key],
      color: resolveBgRowPreviewColor(colors, previewTextColor, previewTextKey),
      text: previewText,
    });
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const previewKeys = previewTextKey
      ? [key, previewTextKey]
      : (previewTextColor == null ? [key, 'textColor'] : [key]);
    const syncPreview = (merged) => {
      preview.span.style.background = merged[key];
      preview.span.style.color = resolveBgRowPreviewColor(merged, previewTextColor, previewTextKey);
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

  const registerBgTextRow = (label, bgKey, textKey, previewText, refreshToolbar = false) => {
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
    const previewKeys = [bgKey, textKey];
    const syncPreview = (merged) => {
      preview.span.style.background = merged[bgKey];
      preview.span.style.color = merged[textKey];
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
    preview.span.style.border = `1px solid ${opaqueHex(colors[key])}`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [dashTd(), text.td, preview.td, reset.td]);
    const previewKeys = [key, 'cellBg'];
    const syncPreview = (merged) => {
      const color = opaqueHex(merged[key]);
      preview.span.style.background = merged.cellBg;
      preview.span.style.color = color;
      preview.span.style.border = `1px solid ${color}`;
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

  const registerBorderRow = (label, key, previewBgKey, previewText = '枠線', previewTextKey = 'textColor') => {
    const colors = getUiColors(getConfig());
    const border = colorInputTd(colors[key]);
    const preview = previewTd({
      background: colors[previewBgKey],
      color: colors[previewTextKey],
      text: previewText,
      className: 'ui-color-preview-cell',
    });
    preview.span.style.border = `2px solid ${colors[key]}`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [border.td, dashTd(), preview.td, reset.td]);
    const previewKeys = [key, previewBgKey, previewTextKey];
    const syncPreview = (merged) => {
      preview.span.style.background = merged[previewBgKey];
      preview.span.style.color = merged[previewTextKey];
      preview.span.style.border = `2px solid ${merged[key]}`;
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
  const JOURNAL_MODAL_SHADOW_ALPHA = 0.45;
  const JOURNAL_ROW_HOVER_ALPHA = 0.03;
  const JOURNAL_CLOSE_HOVER_ALPHA = 0.08;
  const CONTEXT_MENU_SHADOW_ALPHA = 0.45;
  const CONTEXT_MENU_ITEM_HOVER_ALPHA = 0.08;
  const LOADING_OVERLAY_ALPHA = 0.38;
  const PLAN_EDITABLE_CELL_HOVER_ALPHA = 0.14;

  const registerJournalTintRow = (label, key, alpha, previewText, previewBgKey = 'journalModalBg') => {
    const colors = getUiColors(getConfig());
    const bg = colorInputTd(colors[key]);
    const preview = previewTd({
      background: hexToRgba(colors[key], alpha),
      color: colors.textColor,
      text: previewText,
    });
    preview.span.style.boxShadow = `inset 0 0 0 1px ${hexToRgba(colors[previewBgKey] ?? colors.cellBg, 1)}`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const previewKeys = [key, previewBgKey, 'textColor'];
    const syncPreview = (merged) => {
      setColorInput(bg, merged[key]);
      preview.span.style.background = hexToRgba(merged[key], alpha);
      preview.span.style.color = merged.textColor;
      preview.span.style.boxShadow = `inset 0 0 0 1px ${opaqueHex(merged[previewBgKey] ?? merged.cellBg)}`;
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

  // 予実表レイアウト順
  registerBgRow('ブラウザ（背景）', 'browserBg', '背景');
  registerBgTextRow('通常文字色', 'cellBg', 'textColor', '¥1,234', true);
  registerTextRow('薄い文字色', 'textDimColor', '薄い文字のサンプル', {
    previewBgKey: 'browserBg',
  });
  registerBgTextRow('表示モード「予実」', 'periodModeBudgetActualBg', 'periodModeBudgetActualText', '予実表示', false);
  registerBgTextRow('表示モード「実績」', 'periodModeActualBg', 'periodModeActualText', '実績表示', false);
  registerBgTextRow('表示モード「計画」', 'periodModePlanBg', 'periodModePlanText', '計画表示', false);
  registerBgRow('ヘッダーコントロール（期選択等）', 'headerControlBg', 'メニュー F10', null, 'textColor');
  registerBorderRow('ヘッダーコントロール（枠線）', 'headerControlBorder', 'headerControlBg', 'メニュー F10', 'textColor');
  registerBorderRow('ヘッダーコントロール（選択時・枠線）', 'headerControlActiveBorder', 'headerControlBg', 'メニュー F10', 'textColor');
  registerNavBtnBgTextRow('ダッシュボードボタン（通常）', 'dashboardNavBg', 'dashboardNavText', 'ダッシュボードを表示');
  registerNavBtnBgTextRow('予実表表示ボタン（表示中）', 'dashboardNavActiveBg', 'dashboardNavActiveText', '予実表を表示');
  registerBgTextRow('年行（ヘッダー）', 'yearRowBg', 'yearRowText', '2025年');
  registerBgTextRow('月行（ヘッダー）', 'monthRowBg', 'monthRowText', '6月');
  registerBorderRow('当月列（オーバーレイ）', 'currentMonthBorder', 'monthRowBg', '6月', 'monthRowText');
  registerBgRow('決算整理列（オーバーレイ）', 'settlementMonthBg', '3月');
  registerTextRow('マイナス値（金額）', 'negativeAmountColor', null, {
    html: '<span class="amount-yen amount-negative amount-has-prefix"><span class="amount-prefix">-¥</span>1,234</span>',
  });
  registerTextRow('計画金額', 'planAmountColor', '¥1,234,567');
  registerTextRow('金額差異', 'amountVarianceColor', '¥1,234,567');
  registerFillRow('塗り色1（注目）', 'fillColor1', '注目行');
  registerFillRow('塗り色2（注意）', 'fillColor2', '注意行');

  const warningColors = getUiColors(getConfig());
  const warningText = colorInputTd(warningColors.warningTextColor);
  const warningPreview = previewTd({
    background: getSectionBarColor('revenueVariance', data?.sections, sectionColorConfig, getUiColorMode(getConfig())),
    color: warningColors.warningTextColor,
    text: '売上高－売掛金',
  });
  const warningReset = resetBtnTd(keysMatchDefaults(getConfig(), ['warningTextColor']));
  const warningBgTd = dashTd();
  warningBgTd.title = '背景色は大項目色（売上高差異）を参照';
  addRow('警告文字色', [warningBgTd, warningText.td, warningPreview.td, warningReset.td]);
  bindColorInput(warningText, (value, flush) => {
    const text = opaqueHex(value);
    setConfig(setUiColorKey(getConfig(), 'warningTextColor', text));
    persist({ flush });
    setColorInput(warningText,text);
    warningPreview.span.style.color = text;
    warningReset.btn.disabled = keysMatchDefaults(getConfig(), ['warningTextColor']);
  });
  warningReset.btn.addEventListener('click', () => {
    setConfig(resetUiColorKey(getConfig(), 'warningTextColor'));
    persist({ flush: true });
    const text = getDefaultUiColors(getUiColorMode(getConfig())).warningTextColor;
    setColorInput(warningText,text);
    warningPreview.span.style.color = text;
    warningReset.btn.disabled = true;
  });

  registerAccentRow('展開可能項目・仕訳セル（ハイライト）', 'expandableHighlight', '▶ 勘定科目');
  registerAccentRow('マウスオーバー（行）', 'rowHoverBorder', 'ホバー');
  registerAccentRow('行選択（枠線）', 'rowSelectionRing', '選択中');
  registerJournalTintRow('編集可能セル（ホバー）', 'planEditableCellHoverBg', PLAN_EDITABLE_CELL_HOVER_ALPHA, '編集中', 'cellBg');
  registerBgRow('右クリックメニュー（背景）', 'contextMenuBg', 'メニュー');
  registerJournalTintRow('右クリックメニュー（影）', 'contextMenuShadowBg', CONTEXT_MENU_SHADOW_ALPHA, '影', 'contextMenuBg');
  registerJournalTintRow('右クリックメニュー（行ホバー）', 'contextMenuItemHoverBg', CONTEXT_MENU_ITEM_HOVER_ALPHA, '行', 'contextMenuBg');
  registerJournalTintRow('仕訳詳細（背面オーバーレイ）', 'journalOverlayBg', JOURNAL_OVERLAY_ALPHA, '背面', 'browserBg');
  registerBgRow('仕訳詳細（モーダル背景）', 'journalModalBg', 'モーダル');
  registerBgRow('仕訳詳細（表ヘッダー背景）', 'journalTableHeaderBg', '見出し');
  registerJournalTintRow('仕訳詳細（モーダル影）', 'journalModalShadowBg', JOURNAL_MODAL_SHADOW_ALPHA, '影');
  registerJournalTintRow('仕訳詳細（行ホバー）', 'journalRowHoverBg', JOURNAL_ROW_HOVER_ALPHA, '行');
  registerJournalTintRow('仕訳詳細（閉じる・ホバー）', 'journalCloseHoverBg', JOURNAL_CLOSE_HOVER_ALPHA, '×');
  registerJournalTintRow('読み込み中（オーバーレイ）', 'loadingOverlayBg', LOADING_OVERLAY_ALPHA, '読み込み', 'browserBg');
  registerBgRow('設定パネル（背景）', 'settingsSurfaceBg', '背景');
  registerBgRow('入力欄（背景）', 'settingsInputBg', '背景');
  registerBorderRow('入力欄（枠線）', 'settingsInputBorder', 'settingsSurfaceBg');
  registerBgRow('ボタン（背景）', 'settingsButtonBg', '背景');
  registerBgRow('設定表行（ホバー）', 'settingsRowHoverBg', '背景');
  registerBgTextRow('ショートカットキー（kbd）', 'kbdBg', 'kbdTextColor', 'F10');
  registerBorderRow('ショートカットキー（kbd・枠線）', 'kbdBorderColor', 'kbdBg');
  registerBgRow('ショートカットキー（kbd・影）', 'kbdShadowColor', 'F10', '#ffffff');
  registerTextRow('成功・OK表示', 'statusOkColor', 'OK', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('エラー表示', 'statusErrorColor', 'NG', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerBorderRow('入力エラー（枠線）', 'statusInvalidColor', 'settingsSurfaceBg');
  registerBgTextRow('主要ボタン', 'primaryButtonBg', 'primaryButtonTextColor', '開く', false);
  registerAccentRow('操作強調（スライダー・D&D等）', 'interactiveAccentColor', '強調');
  registerBgTextRow('削除ボタン', 'deleteBtnBg', 'deleteBtnText', '削除', false);
  registerAccentRow('アクセンント（選択マーク等）', 'accentColor', '✓ 選択');

  table.appendChild(tbody);
  panel.appendChild(table);
  container.appendChild(panel);
}
