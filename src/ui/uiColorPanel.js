import {
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
  onRefreshDashboard,
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
  let refreshDashboardRaf = null;

  const applyLive = () => {
    applyUiColors(getConfig());
  };

  const scheduleRefreshDashboard = () => {
    if (!onRefreshDashboard || !document.querySelector('.dashboard-wrap')) return;
    if (refreshDashboardRaf != null) cancelAnimationFrame(refreshDashboardRaf);
    refreshDashboardRaf = requestAnimationFrame(() => {
      onRefreshDashboard();
      refreshDashboardRaf = null;
    });
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
    scheduleRefreshDashboard();
  };

  const modeRow = document.createElement('div');
  modeRow.className = 'ui-color-mode-row';
  const modeLabel = document.createElement('label');
  modeLabel.className = 'ui-color-mode-label';
  modeLabel.textContent = '表示モード';
  const modeSelect = document.createElement('select');
  modeSelect.className = 'ui-color-mode-select app-settings-input';
  modeSelect.setAttribute('aria-label', '表示モード');
  for (const [value, label] of [['system', 'システム'], ['dark', 'ダークモード'], ['light', 'ライトモード']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    modeSelect.appendChild(option);
  }
  modeSelect.value = getUiColorModeSetting(getConfig());
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

  const applyPreviewKbdStyles = (span, merged) => {
    const kbd = span.querySelector('kbd');
    if (!kbd) return;
    kbd.style.backgroundColor = opaqueHex(merged.kbdBg);
    kbd.style.color = opaqueHex(merged.kbdTextColor);
    kbd.style.border = `1px solid ${opaqueHex(merged.kbdBorderColor)}`;
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
      preview.span.style.border = `1px solid ${opaqueHex(colors[key])}`;
    }
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [dashTd(), text.td, preview.td, reset.td]);
    const previewKeys = previewTextColorKey ? [key, 'cellBg', previewTextColorKey] : [key, 'cellBg'];
    const syncPreview = (merged) => {
      const color = opaqueHex(merged[key]);
      preview.span.style.background = merged.cellBg;
      preview.span.style.color = previewTextColorKey ? merged[previewTextColorKey] : color;
      if (noBorder) preview.span.style.border = 'none';
      else preview.span.style.border = `1px solid ${color}`;
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

  const registerBorderRow = (label, key, previewBgKey, previewText = '枠線', previewTextKey = 'textColor', previewHtml = null, withKbdPreview = false) => {
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
      preview.span.style.border = `1px solid ${colors[key]}`;
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
        preview.span.style.border = `1px solid ${merged[key]}`;
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
  const DASHBOARD_CHART_SHADOW_ALPHA = 0.22;
  const POPUP_ROW_HOVER_ALPHA = 0.08;
  const LOADING_OVERLAY_ALPHA = 0.38;
  const PLAN_EDITABLE_CELL_HOVER_ALPHA = 0.14;
  const SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA = 0.34;

  const tintPreviewBackground = (hex, alpha, underHex) =>
    `linear-gradient(${hexToRgba(hex, alpha)}, ${hexToRgba(hex, alpha)}), ${opaqueHex(underHex)}`;

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
      preview.span.style.boxShadow = `inset 0 0 0 1px ${hexToRgba(colors[previewBgKey] ?? colors.cellBg, 1)}`;
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
        ? `inset 0 0 0 1px ${opaqueHex(merged[previewBgKey] ?? merged.cellBg)}`
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

  // 予実表レイアウト順
  registerBgRow('ブラウザ（背景）', 'browserBg', 'サンプル文字');
  registerBgTextRow('通常文字色', 'cellBg', 'textColor', '通常文字', true);
  registerTextRow('薄い文字色', 'textDimColor', '薄い文字', {
    previewBgKey: 'browserBg',
  });
  registerBgTextRow('表示モード「予実」', 'periodModeBudgetActualBg', 'periodModeBudgetActualText', '予実表示', false);
  registerBgTextRow('表示モード「実績」', 'periodModeActualBg', 'periodModeActualText', '実績表示', false);
  registerBgTextRow('表示モード「計画」', 'periodModePlanBg', 'periodModePlanText', '計画表示', false);
  registerBgRow('ヘッダーコントロール（期選択等）', 'headerControlBg', null, null, 'textColor', 'メニュー <kbd>F10</kbd>', true);
  registerBorderRow('ヘッダーコントロール（選択時・枠線）', 'headerControlActiveBorder', 'headerControlBg', null, 'textColor', 'メニュー <kbd>F10</kbd>', true);
  registerNavBtnBgTextRow('ダッシュボードボタン（通常）', 'dashboardNavBg', 'dashboardNavText', 'ダッシュボードを表示');
  registerNavBtnBgTextRow('予実表表示ボタン（表示中）', 'dashboardNavActiveBg', 'dashboardNavActiveText', '予実表を表示');
  registerBgTextRow('ダッシュボード・収益サイドバー（ヘッダー）', 'dashboardSidebarRevenueBg', 'dashboardSidebarRevenueText', '収益合計', false);
  registerBgTextRow('ダッシュボード・支出サイドバー（ヘッダー）', 'dashboardSidebarExpenseBg', 'dashboardSidebarExpenseText', '支出合計', false);
  registerBgRow('ダッシュボード・サイドバー（棒グラフ）', 'dashboardSidebarBarBg', '56.77%', null);
  registerBgRow('ダッシュボード・利益率推移（低）', 'dashboardProfitLineLow', '低');
  registerBgRow('ダッシュボード・利益率推移（高）', 'dashboardProfitLineHigh', '高');
  registerBgRow('ダッシュボード・預金残高推移（低）', 'dashboardCashLineLow', '低');
  registerBgRow('ダッシュボード・預金残高推移（高）', 'dashboardCashLineHigh', '高');
  registerJournalTintRow('ダッシュボード・グラフ（影）', 'dashboardChartShadowColor', DASHBOARD_CHART_SHADOW_ALPHA, 'サンプル', 'browserBg');

  registerBgTextRow('年行（ヘッダー）', 'yearRowBg', 'yearRowText', `${new Date().getFullYear()}年`, false);
  registerBgTextRow('ヘッダー行', 'monthRowBg', 'monthRowText', `${new Date().getMonth() + 1}月`, false);
  registerBorderRow('当月列（オーバーレイ）', 'currentMonthBorder', 'monthRowBg', `${new Date().getMonth() + 1}月`, 'monthRowText');
  registerJournalTintRow('決算整理列（オーバーレイ）', 'settlementMonthBg', SETTLEMENT_MONTH_OVERLAY_HEAD_ALPHA, '決算整理', 'monthRowBg', 'monthRowText', true, true);
  registerTextRow('マイナス値（金額）', 'negativeAmountColor', null, {
    html: '<span class="amount-yen amount-negative amount-has-prefix"><span class="amount-prefix">-¥</span>1,234</span>',
  });
  registerTextRow('計画金額', 'planAmountColor', '¥1,234');
  registerTextRow('金額差異', 'amountVarianceColor', '¥1,234');
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

  registerAccentRow('展開可能項目・仕訳セル（ハイライト）', 'expandableHighlight', '▶ 勘定科目', { noBorder: true });
  registerAccentRow('マウスオーバー（行）', 'rowHoverBorder', '勘定科目', { previewTextColorKey: 'textColor' });
  registerAccentRow('行選択（枠線）', 'rowSelectionRing', '勘定科目', { previewTextColorKey: 'textColor' });
  registerJournalTintRow('編集可能セル（ホバー）', 'planEditableCellHoverBg', PLAN_EDITABLE_CELL_HOVER_ALPHA, '¥1,234', 'cellBg', 'planAmountColor');
  registerBgRow('ポップアップ（背景）', 'contextMenuBg', 'サンプル文字');
  registerJournalTintRow('ポップアップ（影）', 'contextMenuShadowBg', POPUP_SHADOW_ALPHA, 'サンプル文字', 'contextMenuBg');
  registerJournalTintRow('ポップアップ（行ホバー）', 'contextMenuItemHoverBg', POPUP_ROW_HOVER_ALPHA, 'サンプル文字', 'contextMenuBg');
  registerJournalTintRow('仕訳詳細（背面オーバーレイ）', 'journalOverlayBg', JOURNAL_OVERLAY_ALPHA, 'サンプル文字', 'browserBg', 'textColor', false);
  registerJournalTintRow('読み込み中（オーバーレイ）', 'loadingOverlayBg', LOADING_OVERLAY_ALPHA, '読み込み', 'browserBg');
  registerBgRow('入力欄（背景）', 'settingsInputBg', 'サンプル文字');
  registerBorderRow('入力欄（枠線）', 'settingsInputBorder', 'monthRowBg', 'サンプル文字');
  registerBgTextRow('ショートカットキー（kbd）', 'kbdBg', 'kbdTextColor', null, false, 'ui-color-preview-cell', '<kbd>F10</kbd>', true, 'headerControlBg', 'textColor');
  registerBorderRow('ショートカットキー（kbd・枠線）', 'kbdBorderColor', 'headerControlBg', null, 'textColor', '<kbd>F10</kbd>', true);
  registerTextRow('成功・OK表示', 'statusOkColor', 'OK', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('エラー表示', 'statusErrorColor', 'NG', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerBgTextRow('主要ボタン', 'primaryButtonBg', 'primaryButtonTextColor', '開く', false, 'ui-color-preview-cell ui-color-preview-action-btn');
  registerBgTextRow('その他ボタン', 'settingsButtonBg', 'settingsButtonTextColor', '↑', false, 'ui-color-preview-cell ui-color-preview-action-btn');
  registerBgTextRow('削除ボタン', 'deleteBtnBg', 'deleteBtnText', '削除', false, 'ui-color-preview-cell ui-color-preview-action-btn');
  registerBorderRow('ボタン（枠線）', 'buttonBorderColor', 'primaryButtonBg', '開く', 'primaryButtonTextColor');
  registerAccentRow('アクセント（選択マーク等）', 'accentColor', '✓', { noBorder: true });

  table.appendChild(tbody);
  panel.appendChild(table);
  container.appendChild(panel);
}
