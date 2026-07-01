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
  onReRender,
}) {
  const panel = document.createElement('div');
  panel.className = 'ui-color-panel';

  const title = document.createElement('h2');
  title.className = 'ui-color-panel-title';
  title.textContent = '予実表全体';
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
  table.innerHTML = `
    <thead>
      <tr>
        <th>項目</th>
        <th class="col-color-input">背景色</th>
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
    preview.span.style.border = `1px solid ${opaqueHex(colors[key])}`;
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
      preview.span.style.border = `1px solid ${color}`;
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
      preview.span.style.border = `1px solid ${color}`;
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
      text: '枠線',
      className: 'ui-color-preview-cell',
    });
    preview.span.style.border = `2px solid ${colors[key]}`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [border.td, dashTd(), preview.td, reset.td]);
    const sync = (value) => {
      setConfig(setUiColorKey(getConfig(), key, value));
      persist();
      border.input.value = value;
      border.input.title = value;
      const merged = getUiColors(getConfig());
      preview.span.style.background = merged[previewBgKey];
      preview.span.style.border = `2px solid ${value}`;
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
      preview.span.style.border = `2px solid ${value}`;
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
    preview.span.style.boxShadow = `inset 0 0 0 1px ${hexToRgba(colors[previewBgKey] ?? colors.cellBg, 1)}`;
    const reset = resetBtnTd(keysMatchDefaults(getConfig(), [key]));
    addRow(label, [bg.td, dashTd(), preview.td, reset.td]);
    const syncPreview = (merged) => {
      bg.input.value = merged[key];
      bg.input.title = merged[key];
      preview.span.style.background = hexToRgba(merged[key], alpha);
      preview.span.style.color = merged.textColor;
      preview.span.style.boxShadow = `inset 0 0 0 1px ${opaqueHex(merged[previewBgKey] ?? merged.cellBg)}`;
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

  // 予実表レイアウト順
  registerBgRow('ブラウザ（背景）', 'browserBg', '背景');
  registerBgRow('設定パネル（背景）', 'settingsSurfaceBg', '背景');
  registerBgRow('入力欄（背景）', 'settingsInputBg', '背景');
  registerBorderRow('入力欄（枠線）', 'settingsInputBorder', 'settingsSurfaceBg');
  registerBgRow('ボタン（背景）', 'settingsButtonBg', '背景');
  registerBgRow('設定表行（ホバー）', 'settingsRowHoverBg', '背景');
  registerBgTextRow('年行（ヘッダー）', 'yearRowBg', 'yearRowText', '2025年');
  registerBgTextRow('月行（ヘッダー）', 'monthRowBg', 'monthRowText', '6月');
  registerBgTextRow('当月列（オーバーレイ）', 'currentMonthBg', 'currentMonthBorder', '6月');
  registerBgRow('決算整理列（オーバーレイ）', 'settlementMonthBg', '3月');
  registerBgTextRow('セル（明細行）', 'cellBg', 'textColor', '¥1,234');
  registerTextRow('注釈文・説明文', 'noteTextColor', '説明文のサンプル', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('ヒント文', 'hintTextColor', '補足テキスト', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('薄い・淡い文字', 'textDimColor', 'フッター・ヒント等', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
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

  registerAccentRow('展開可能項目・仕訳セル（ハイライト）', 'expandableHighlight', '▶ 勘定科目');
  registerJournalTintRow('仕訳詳細（背面オーバーレイ）', 'journalOverlayBg', JOURNAL_OVERLAY_ALPHA, '背面', 'browserBg');
  registerBgRow('仕訳詳細（モーダル背景）', 'journalModalBg', 'モーダル');
  registerTextRow('仕訳詳細（文字色）', 'journalTextColor', '仕訳明細', {
    previewBgKey: 'journalModalBg',
    refresh: false,
  });
  registerTextRow('仕訳詳細（補足文）', 'journalHintTextColor', '件数・空欄メッセージ', {
    previewBgKey: 'journalModalBg',
    refresh: false,
  });
  registerBgRow('仕訳詳細（表ヘッダー背景）', 'journalTableHeaderBg', '見出し');
  registerJournalTintRow('仕訳詳細（モーダル影）', 'journalModalShadowBg', JOURNAL_MODAL_SHADOW_ALPHA, '影');
  registerJournalTintRow('仕訳詳細（行ホバー）', 'journalRowHoverBg', JOURNAL_ROW_HOVER_ALPHA, '行');
  registerJournalTintRow('仕訳詳細（閉じる・ホバー）', 'journalCloseHoverBg', JOURNAL_CLOSE_HOVER_ALPHA, '×');
  registerBgRow('予実表（固定ヘッダー背景）', 'tableHeaderBg', '見出し');
  registerBgRow('右クリックメニュー（背景）', 'contextMenuBg', 'メニュー');
  registerJournalTintRow('右クリックメニュー（影）', 'contextMenuShadowBg', CONTEXT_MENU_SHADOW_ALPHA, '影', 'contextMenuBg');
  registerJournalTintRow('右クリックメニュー（行ホバー）', 'contextMenuItemHoverBg', CONTEXT_MENU_ITEM_HOVER_ALPHA, '行', 'contextMenuBg');
  registerBgRow('表示モード「予実」（背景）', 'periodModeBudgetActualBg', '予実');
  registerBgRow('表示モード「実績」（背景）', 'periodModeActualBg', '予実');
  registerBgRow('表示モード「計画」（背景）', 'periodModePlanBg', '予実');
  registerTextRow('表示モードバッジ（文字）', 'periodModeTextColor', '予実', {
    previewBgKey: 'periodModeBudgetActualBg',
    refresh: false,
  });
  registerJournalTintRow('読み込み中（オーバーレイ）', 'loadingOverlayBg', LOADING_OVERLAY_ALPHA, '読み込み', 'browserBg');
  registerTextRow('成功・OK表示', 'statusOkColor', 'OK', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerTextRow('エラー表示', 'statusErrorColor', 'NG', {
    previewBgKey: 'browserBg',
    refresh: false,
  });
  registerBorderRow('入力エラー（枠線）', 'statusInvalidColor', 'settingsSurfaceBg');
  registerBgRow('主要ボタン（グラデ開始）', 'primaryButtonBgStart', '開く');
  registerBgRow('主要ボタン（グラデ終了）', 'primaryButtonBgEnd', '開く');
  registerTextRow('主要ボタン（文字）', 'primaryButtonTextColor', '開く', {
    previewBgKey: 'primaryButtonBgStart',
    previewTextKey: 'primaryButtonTextColor',
    refresh: false,
  });
  registerAccentRow('操作強調（スライダー・D&D等）', 'interactiveAccentColor', '強調');
  registerJournalTintRow('賞与月列（ハイライト）', 'bonusMonthColumnBg', 0.08, '賞与月', 'cellBg');
  registerBgRow('削除ボタン（背景）', 'deleteBtnBg', '削除', '#ffffff');
  registerBgRow('削除ボタン（ホバー）', 'deleteBtnBgHover', '削除', '#ffffff');
  registerBorderRow('削除ボタン（枠線）', 'deleteBtnBorder', 'cellBg');
  registerTextRow('削除ボタン（文字）', 'deleteBtnText', '削除', {
    previewBgKey: 'deleteBtnBg',
    previewTextKey: 'deleteBtnText',
    refresh: false,
  });
  registerAccentRow('アクセンント（選択マーク等）', 'accentColor', '✓ 選択');
  registerAccentRow('マウスオーバー（行）', 'rowHoverBorder', 'ホバー');
  registerAccentRow('行選択（枠線）', 'rowSelectionRing', '選択中');

  table.appendChild(tbody);
  panel.appendChild(table);
  container.appendChild(panel);
}
