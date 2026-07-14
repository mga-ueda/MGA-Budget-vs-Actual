import {
  parseSalaryPlanAmountInputWithFillForward,
  salaryPlanAmountDiffersFromPrevious,
} from '../config/salaryPlanConfig.js';
import {
  getMonthDisplayMode,
  getMonthDisplayClickHint,
  isMonthDisplayToggleTarget,
} from '../config/monthDisplayConfig.js';
import {
  getFiscalPeriodDisplayMode,
  getCurrentFiscalMonthLabel,
} from '../config/appSettings.js';
import { handlePlanAmountCellKeydown, tagPlanEditableCell } from '../config/planCellEdit.js';

export const planAmountCellConfigs = new WeakMap();

function applyPlanAmountVarianceClass(td, monthIndex, value, prevValue) {
  if (monthIndex === 0) {
    td.classList.add('salary-plan-amount-start-month');
  } else if (prevValue !== undefined && salaryPlanAmountDiffersFromPrevious(prevValue, value)) {
    td.classList.add('salary-plan-amount-changed');
  }
}

export function createPlanMonthDisplayUi({
  appSettings,
  currentPeriod,
  fiscalMonths,
  getMonthDisplayConfig,
  getPastMonthsForPeriod,
  onToggleMonthDisplay,
}) {
  function isMonthEditable(fiscalPeriod, month) {
    return !getPastMonthsForPeriod(fiscalPeriod).has(month);
  }

  function isBudgetActualCurrentPeriod(fiscalPeriod) {
    return fiscalPeriod === currentPeriod
      && getFiscalPeriodDisplayMode(appSettings.businessStartYear, fiscalPeriod) === 'budget-actual';
  }

  function getMonthDisplayModeForPeriod(month) {
    return getMonthDisplayMode(
      getMonthDisplayConfig(),
      currentPeriod,
      month,
      appSettings.businessStartYear,
      fiscalMonths,
    );
  }

  function monthPlanActualClass(fiscalPeriod, month) {
    const displayMode = getFiscalPeriodDisplayMode(appSettings.businessStartYear, fiscalPeriod);
    if (displayMode === 'plan') return 'salary-plan-month-plan';
    if (displayMode === 'actual') return 'salary-plan-month-actual';
    return isMonthEditable(fiscalPeriod, month) ? 'salary-plan-month-plan' : 'salary-plan-month-actual';
  }

  function getHighlightFiscalMonthForTable(fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) return null;
    if (getFiscalPeriodDisplayMode(appSettings.businessStartYear, fiscalPeriod) !== 'budget-actual') {
      return null;
    }
    return getCurrentFiscalMonthLabel(
      appSettings.businessStartYear,
      fiscalPeriod,
      fiscalMonths,
    );
  }

  function syncMonthHighlightClasses(el, month, fiscalPeriod) {
    if (!el) return;
    const highlightFiscalMonth = getHighlightFiscalMonthForTable(fiscalPeriod);
    el.classList.toggle('current-month', highlightFiscalMonth != null && month === highlightFiscalMonth);
  }

  function configureMonthHeaderTh(th, month, fiscalPeriod) {
    th.className = 'salary-plan-col-month';
    th.textContent = month;
    syncMonthHighlightClasses(th, month, fiscalPeriod);
    if (!isBudgetActualCurrentPeriod(fiscalPeriod) || !isMonthDisplayToggleTarget(month)) return;

    const mode = getMonthDisplayModeForPeriod(month);
    th.classList.add('month-display-toggle', `month-display-${mode}`);
    th.title = getMonthDisplayClickHint(mode);
    th.tabIndex = 0;
    th.setAttribute('role', 'button');

    const activate = () => {
      if (typeof onToggleMonthDisplay === 'function') onToggleMonthDisplay(month);
    };
    th.addEventListener('click', activate);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  }

  function updateMonthHeaderTh(th, month, fiscalPeriod) {
    syncMonthHighlightClasses(th, month, fiscalPeriod);
    if (!isBudgetActualCurrentPeriod(fiscalPeriod) || !isMonthDisplayToggleTarget(month)) return;
    const mode = getMonthDisplayModeForPeriod(month);
    th.classList.add('month-display-toggle');
    th.classList.toggle('month-display-actual', mode === 'actual');
    th.classList.toggle('month-display-plan', mode === 'plan');
    th.title = getMonthDisplayClickHint(mode);
    th.setAttribute('aria-pressed', mode === 'plan' ? 'true' : 'false');
  }

  function bindPlanAmountCellDblClick(td, startNumericCellEdit) {
    if (td.dataset.planAmountEditBound === '1') return;
    td.dataset.planAmountEditBound = '1';
    td.addEventListener('dblclick', () => {
      const config = planAmountCellConfigs.get(td);
      if (config?.editable) startNumericCellEdit(td, config);
    });
  }

  function setPlanAmountCellContent(td, {
    month,
    monthIndex,
    value,
    prevValue,
    editable,
    fiscalPeriod,
    title = '',
    formatValue,
    rawValue,
    parseValue,
    onSave,
    extraClass = '',
    allowShiftFillForward = false,
    tabScopeId,
    onEditClose,
    forcePlanMonthColor = false,
  }, startNumericCellEdit) {
    if (td.querySelector('input')) return;

    const colorClass = forcePlanMonthColor
      ? 'salary-plan-month-plan'
      : monthPlanActualClass(fiscalPeriod, month);
    td.className = `salary-plan-amount-cell ${colorClass} ${extraClass}`.trim();
    tagPlanEditableCell(td, { month });
    td.dataset.planMonth = month;
    td.classList.remove(
      'salary-plan-cell-editable',
      'salary-plan-cell-disabled',
      'salary-plan-amount-start-month',
      'salary-plan-amount-changed',
    );
    applyPlanAmountVarianceClass(td, monthIndex, value, prevValue);
    td.textContent = formatValue(value);
    syncMonthHighlightClasses(td, month, fiscalPeriod);

    if (editable) {
      td.classList.add('salary-plan-cell-editable');
      td.title = title;
      planAmountCellConfigs.set(td, {
        rawValue,
        editable: true,
        formatValue,
        parseValue,
        onSave,
        allowShiftFillForward,
        tabScopeId,
        onEditClose,
      });
      bindPlanAmountCellDblClick(td, startNumericCellEdit);
      return;
    }

    td.classList.add('salary-plan-cell-disabled');
    td.removeAttribute('title');
    planAmountCellConfigs.delete(td);
  }

  return {
    isMonthEditable,
    monthPlanActualClass,
    configureMonthHeaderTh,
    updateMonthHeaderTh,
    syncMonthHighlightClasses,
    setPlanAmountCellContent,
    getHighlightFiscalMonthForTable,
  };
}

/** ダブルクリック前にセルへ表示していた値から編集用の初期文字列を決める。
    保存値（rawValue）が未設定でも、表示中の値をそのまま入力欄へ引き継ぐ */
export function resolvePlanAmountEditInitialValue(rawValue, displayedText, parseValue) {
  // 0 は表示上は空でも編集欄には "0" を入れ，Shift+Enter で 0 後続反映できるようにする
  if (rawValue != null) return String(rawValue);
  if (typeof parseValue === 'function') {
    const parsedDisplayed = parseValue(displayedText ?? '');
    if (parsedDisplayed != null) return String(parsedDisplayed);
  }
  return '';
}

export function createPlanAmountCellEditor({ onEditClose }) {
  return function startNumericCellEdit(td, {
    rawValue,
    editable,
    formatValue,
    parseValue,
    onSave,
    allowShiftFillForward = false,
    tabScopeId,
    onEditClose: cellOnEditClose,
  }) {
    if (!editable) return;
    if (td.querySelector('input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'salary-plan-amount-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    // ダブルクリック前の設定値をそのまま初期表示する（空欄で開かない）
    input.value = resolvePlanAmountEditInitialValue(rawValue, td.textContent, parseValue);

    let editClosed = false;

    const finish = (save, fillForward = false) => {
      if (editClosed) return;
      editClosed = true;
      // 再描画時の編集状態退避（capturePlanSectionActiveEdit）の対象から外す
      input.dataset.planEditClosed = '1';
      if (save) {
        const parsed = allowShiftFillForward && fillForward
          ? parseSalaryPlanAmountInputWithFillForward(input.value, true, rawValue)
          : parseValue(input.value);
        onSave(parsed, allowShiftFillForward && fillForward);
      }
      const closeHandler = cellOnEditClose ?? onEditClose;
      if (closeHandler) closeHandler();
    };

    input.addEventListener('keydown', (e) => {
      handlePlanAmountCellKeydown(e, {
        finish,
        td,
        scopeId: tabScopeId,
        allowShiftFillForward,
      });
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!editClosed) finish(true, false);
      }, 0);
    });

    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
  };
}

/** 再描画の直前に、編集中セルの状態（行キー・月・入力途中の文字列）を退避する。
    finish 済み（保存して閉じる途中）の入力は対象外 */
export function capturePlanSectionActiveEdit(container) {
  const input = document.activeElement;
  if (!(input instanceof HTMLInputElement)) return null;
  if (!input.classList.contains('salary-plan-amount-input')) return null;
  if (input.dataset.planEditClosed === '1') return null;
  if (container && !container.contains(input)) return null;

  const td = input.closest('td');
  const tr = td?.closest('tr');
  const rowKey = td?.dataset.planRowKey ?? tr?.dataset.planRowKey;
  const month = td?.dataset.planMonth;
  if (rowKey == null || month == null) return null;
  const fiscalPeriod = td?.closest('table')?.dataset.fiscalPeriod;
  return {
    rowKey: String(rowKey),
    month: String(month),
    fiscalPeriod: fiscalPeriod != null ? String(fiscalPeriod) : null,
    value: input.value,
    selectionStart: input.selectionStart,
    selectionEnd: input.selectionEnd,
  };
}

/** 再描画後に退避した編集状態を復元する（同じセルで編集を再開し、入力途中の文字列を戻す）。
    再描画で編集中の入力欄が初期化されるのを防ぐ */
export function restorePlanSectionActiveEdit(container, state) {
  if (!container || !state) return;
  const tableSelector = state.fiscalPeriod != null
    ? `table[data-fiscal-period="${CSS.escape(state.fiscalPeriod)}"]`
    : 'table';
  for (const table of container.querySelectorAll(tableSelector)) {
    const row = table.querySelector(`tr[data-plan-row-key="${CSS.escape(state.rowKey)}"]`);
    const cell = row?.querySelector(`td[data-plan-month="${CSS.escape(state.month)}"]`)
      ?? table.querySelector(
        `td[data-plan-row-key="${CSS.escape(state.rowKey)}"][data-plan-month="${CSS.escape(state.month)}"]`,
      );
    if (!cell?.classList.contains('salary-plan-cell-editable')) continue;
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = cell.querySelector('input.salary-plan-amount-input');
    if (input) {
      input.value = state.value;
      try {
        input.setSelectionRange(state.selectionStart, state.selectionEnd);
      } catch {
        /* 選択範囲の復元に失敗しても編集は継続できる */
      }
    }
    return;
  }
}

function applyPlanSettingsColumnPlateRect(plate, monthRect, topY, bottomY, clipRect) {
  const clippedTop = Math.max(topY, clipRect.top);
  const clippedBottom = Math.min(bottomY, clipRect.bottom);
  if (clippedBottom <= clippedTop + 0.5) {
    plate.hidden = true;
    return;
  }
  const left = Math.round(monthRect.left);
  const top = Math.round(clippedTop);
  const width = Math.round(monthRect.right) - left;
  const height = Math.round(clippedBottom - clippedTop);
  plate.hidden = false;
  plate.style.position = 'fixed';
  plate.style.zIndex = '25';
  plate.style.left = `${left}px`;
  plate.style.width = `${width}px`;
  plate.style.top = `${top}px`;
  plate.style.height = `${height}px`;
}

export function syncPlanSettingsTableColumnPlates(tableWrap, table, highlightMonth, fiscalMonths) {
  if (!tableWrap || !table?.isConnected) return;

  const plateHost = tableWrap;
  tableWrap.parentElement?.querySelectorAll(':scope > .plan-settings-column-plate-layer').forEach((el) => {
    el.remove();
  });
  let layer = plateHost.querySelector(':scope > .plan-settings-column-plate-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'plan-settings-column-plate-layer plan-column-plate-layer';
    layer.setAttribute('aria-hidden', 'true');
    plateHost.appendChild(layer);
  }

  let headerPlate = layer.querySelector('.plan-settings-column-plate--current-header');
  if (!headerPlate) {
    headerPlate = document.createElement('div');
    headerPlate.className = 'plan-column-plate plan-column-plate--current-header plan-settings-column-plate--current-header';
    layer.appendChild(headerPlate);
  }

  let bodyPlate = layer.querySelector('.plan-settings-column-plate--current');
  if (!bodyPlate) {
    bodyPlate = document.createElement('div');
    bodyPlate.className = 'plan-column-plate plan-column-plate--current plan-settings-column-plate--current';
    layer.appendChild(bodyPlate);
  }

  const monthIndex = highlightMonth ? fiscalMonths.indexOf(highlightMonth) : -1;
  if (monthIndex < 0) {
    headerPlate.hidden = true;
    bodyPlate.hidden = true;
    return;
  }

  const monthThs = table.querySelectorAll('thead th.salary-plan-col-month');
  const monthTh = monthThs[monthIndex];
  if (!monthTh) {
    headerPlate.hidden = true;
    bodyPlate.hidden = true;
    return;
  }

  const clipRect = tableWrap.getBoundingClientRect();
  const monthRect = monthTh.getBoundingClientRect();
  applyPlanSettingsColumnPlateRect(headerPlate, monthRect, monthRect.top, monthRect.bottom, clipRect);

  let bottomY = monthRect.bottom;
  for (const tr of table.tBodies[0]?.querySelectorAll('tr') ?? []) {
    const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
    const td = amountCells[monthIndex];
    if (td) bottomY = Math.max(bottomY, td.getBoundingClientRect().bottom);
  }
  applyPlanSettingsColumnPlateRect(bodyPlate, monthRect, monthRect.bottom, bottomY, clipRect);
}

export function syncAllPlanSettingsTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings) {
  if (!wrap?.isConnected || !appSettings || !fiscalMonths) return;
  const highlightMonth = getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    currentPeriod,
  ) === 'budget-actual'
    ? getCurrentFiscalMonthLabel(
      appSettings.businessStartYear,
      currentPeriod,
      fiscalMonths,
    )
    : null;

  wrap.querySelectorAll('.salary-plan-table-wrap').forEach((tableWrap) => {
    const table = tableWrap.querySelector('table[data-fiscal-period]');
    if (!table) return;
    const fiscalPeriod = Number(table.dataset.fiscalPeriod);
    const tableHighlight = fiscalPeriod === currentPeriod ? highlightMonth : null;
    syncPlanSettingsTableColumnPlates(tableWrap, table, tableHighlight, fiscalMonths);
  });
}

function bindPlanSettingsTableWrapScrollSync(wrap, sync) {
  wrap?.querySelectorAll('.salary-plan-table-wrap').forEach((el) => {
    if (el.__planSettingsPlateScrollBound) return;
    el.__planSettingsPlateScrollBound = true;
    el.addEventListener('scroll', sync, { passive: true });
  });
}

export function refreshPlanSettingsColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings) {
  if (!wrap?.isConnected) return;
  const sync = wrap.__planSettingsPlateWindowSync
    ?? (() => syncAllPlanSettingsTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    syncAllPlanSettingsTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
    bindPlanSettingsTableWrapScrollSync(wrap, sync);
  }));
}

export function bindPlanSettingsColumnPlateSync(wrap, fiscalMonths, currentPeriod, appSettings) {
  if (wrap.__planSettingsPlateWindowSync) {
    window.removeEventListener('scroll', wrap.__planSettingsPlateWindowSync, true);
  }
  const sync = () => syncAllPlanSettingsTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
  wrap.__planSettingsPlateWindowSync = sync;
  bindPlanSettingsTableWrapScrollSync(wrap, sync);
  window.addEventListener('scroll', sync, true);
  sync();
}

export function bindPlanSettingsTableUi(wrap, fiscalMonths, currentPeriod, appSettings) {
  bindPlanSettingsScalableLayout(wrap, { fiscalMonths, currentPeriod, appSettings });
}

export const PLAN_SETTINGS_UI_SCALE_VAR = '--plan-settings-ui-scale';
export const PLAN_SETTINGS_UI_SCALE_MAX = 1.45;
/** 縮小側の下限。収まりを最優先し、極端な狭さでも追従できるよう小さめに取る */
export const PLAN_SETTINGS_UI_SCALE_MIN = 0.2;
const PLAN_SETTINGS_UI_SCALE_FIT_THRESHOLD = 0.97;
/** 予実表と同じく、丸め・サブピクセル誤差の安全マージン（横スクロール防止） */
const PLAN_SETTINGS_UI_SCALE_SAFETY = 0.99;

/** 描画済みテーブルの内容に基づく幅（一時的に max-content で計測） */
export function measureTableIntrinsicWidth(table) {
  if (!table?.isConnected) return 0;
  const host = table.closest('.salary-plan-table-wrap, .employee-settings-column-list') ?? table.parentElement;
  const prev = {
    tableWidth: table.style.width,
    tableMinWidth: table.style.minWidth,
    tableMaxWidth: table.style.maxWidth,
    hostWidth: host?.style.width,
    hostMinWidth: host?.style.minWidth,
    hostMaxWidth: host?.style.maxWidth,
  };
  if (host) {
    host.style.width = 'max-content';
    host.style.minWidth = 'max-content';
    host.style.maxWidth = 'none';
  }
  // CSS の max-width: 100% で容器幅に丸められると自然幅にならないため一時的に外す
  table.style.width = 'max-content';
  table.style.minWidth = 'max-content';
  table.style.maxWidth = 'none';
  const width = Math.ceil(table.getBoundingClientRect().width);
  table.style.width = prev.tableWidth;
  table.style.minWidth = prev.tableMinWidth;
  table.style.maxWidth = prev.tableMaxWidth;
  if (host) {
    host.style.width = prev.hostWidth;
    host.style.minWidth = prev.hostMinWidth;
    host.style.maxWidth = prev.hostMaxWidth;
  }
  return width;
}

/** rem を px に変換する（自然幅見積もりの CSS px 基準） */
export function planSettingsRemToPx(rem) {
  const base = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rem * base;
}

/** 要素を一時的に max-content 幅にして自然幅を計測する（折り返し・伸縮の影響を除外） */
export function measureElementIntrinsicWidth(el) {
  if (!el?.isConnected) return 0;
  const prev = {
    width: el.style.width,
    minWidth: el.style.minWidth,
    maxWidth: el.style.maxWidth,
  };
  el.style.width = 'max-content';
  el.style.minWidth = 'max-content';
  el.style.maxWidth = 'none';
  const width = Math.ceil(el.getBoundingClientRect().width);
  el.style.width = prev.width;
  el.style.minWidth = prev.minWidth;
  el.style.maxWidth = prev.maxWidth;
  return width;
}

/**
 * 設定ページ内テーブルの自然幅の最大値（実測）。
 * 列幅は CSS で固定のため内容に依存せず、同じ class 構成のテーブルは同幅になる。
 * 期ごとの重複計測を避けるため className 単位で 1 回だけ計測する。
 */
export function measurePlanSettingsTablesIntrinsicWidth(wrap, tableSelector = '.salary-plan-table') {
  if (!wrap?.isConnected) return 0;
  let maxW = 0;
  const measuredClassNames = new Set();
  wrap.querySelectorAll(tableSelector).forEach((table) => {
    if (measuredClassNames.has(table.className)) return;
    measuredClassNames.add(table.className);
    maxW = Math.max(maxW, measureTableIntrinsicWidth(table));
  });
  return maxW;
}

/* 月列を均等幅にするときのセル内余白（padding 0.45rem×2 ≒ 12px と罫線ぶんの余裕） */
const PLAN_MONTH_COL_UNIFORM_PADDING_PX = 14;
export const PLAN_MONTH_COL_UNIFORM_WIDTH_VAR = '--plan-month-col-uniform-w';

/**
 * 支払い計画表・外注費支払い計画表: 月列の幅を全セル中の最大内容幅に統一する。
 * 桁数の多い月だけ列幅が広がって月ごとにバラつくのを防ぐ。
 * スケール 1 相当の px 値を CSS 変数へ入れ、CSS 側で UI スケールを乗算する。
 * 自然幅計測（layoutPlanSettingsScalableWrap の measure）内から呼ぶこと。
 */
export function applyUniformPlanMonthColumnWidth(wrap, tableSelector) {
  if (!wrap?.isConnected) return;
  const table = wrap.querySelector(tableSelector);
  if (!table) {
    wrap.style.removeProperty(PLAN_MONTH_COL_UNIFORM_WIDTH_VAR);
    return;
  }
  // フォントは UI スケール込みで実測されるため、現在のスケールで割ってスケール 1 相当に戻す
  const scale = parseFloat(
    getComputedStyle(wrap).getPropertyValue(PLAN_SETTINGS_UI_SCALE_VAR),
  ) || 1;
  const font = buildProbeFontFromStyle(getComputedStyle(table));
  const contentW = measureMaxCellTextWidth(
    wrap,
    `${tableSelector} th.salary-plan-col-month, ${tableSelector} td.salary-plan-amount-cell`,
    font,
  );
  if (contentW <= 0) {
    wrap.style.removeProperty(PLAN_MONTH_COL_UNIFORM_WIDTH_VAR);
    return;
  }
  const baseW = Math.ceil(contentW / scale) + PLAN_MONTH_COL_UNIFORM_PADDING_PX;
  wrap.style.setProperty(PLAN_MONTH_COL_UNIFORM_WIDTH_VAR, `${baseW}px`);
}

const EMPLOYEE_COL_NO_MIN_PX = 36;
const EMPLOYEE_COL_KIND_MIN_PX = 40;
const EMPLOYEE_COL_NAME_MIN_PX = 52;
const EMPLOYEE_COL_SUB_MIN_PX = 80;
const EMPLOYEE_COL_MONTH_MIN_PX = 52;
const EMPLOYEE_COL_TOTAL_MIN_PX = 84;
const EMPLOYEE_COL_INCREASE_PX = 68;
/* box-sizing: border-box のセル内余白（0.45rem×2 ≒ 12px）と罫線ぶんの余裕 */
const EMPLOYEE_AMOUNT_CELL_PADDING_PX = 14;
const EMPLOYEE_LEADING_CELL_PADDING_PX = 14;

/** 計測プローブ用のフォント指定を組み立てる。
    computedStyle.font ショートハンドは Chrome で空文字になることがあるため、個別値から合成する */
export function buildProbeFontFromStyle(style) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function measureEmployeeTableFont(wrap) {
  const table = wrap?.querySelector('.employee-salary-plan-table, .salary-overtime-plan-table');
  const style = table ? getComputedStyle(table) : getComputedStyle(wrap);
  return buildProbeFontFromStyle(style);
}

function measureEmployeeAmountDigitWidth(wrap) {
  const font = measureEmployeeTableFont(wrap);
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;';
  probe.style.font = font;
  probe.textContent = '9';
  wrap.appendChild(probe);
  const width = Math.ceil(probe.getBoundingClientRect().width);
  probe.remove();
  return width;
}

export function measureMaxCellTextWidth(wrap, selector, font) {
  let maxW = 0;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;';
  probe.style.font = font;
  wrap.appendChild(probe);
  wrap.querySelectorAll(selector).forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    // ヘッダー（th）は太字で描画されるため、実際のフォントウェイトで測る
    probe.style.fontWeight = getComputedStyle(el).fontWeight;
    probe.textContent = text;
    maxW = Math.max(maxW, Math.ceil(probe.getBoundingClientRect().width));
  });
  probe.remove();
  return maxW;
}

/** 列の内容（ヘッダーラベル・セル文字列）に合わせた幅を実測する。
    文字数が変わっても見切れないよう、上限キャップは設けない */
function measureEmployeeLeadingColumnWidth(wrap, cellSelector, font, headerLabels, minPx, scale = 1) {
  let maxW = minPx * scale;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
  probe.style.font = font;
  wrap.appendChild(probe);

  // ヘッダーは太字（600 相当）で描画される前提で測る
  probe.style.fontWeight = '700';
  for (const label of headerLabels) {
    probe.textContent = label;
    maxW = Math.max(maxW, Math.ceil(probe.getBoundingClientRect().width));
  }

  wrap.querySelectorAll(cellSelector).forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    probe.style.fontWeight = getComputedStyle(el).fontWeight;
    probe.textContent = text;
    maxW = Math.max(maxW, Math.ceil(probe.getBoundingClientRect().width));
  });

  probe.remove();
  return maxW + EMPLOYEE_LEADING_CELL_PADDING_PX * scale;
}

export function buildEmployeePlanTableColgroup({ variant, monthCount, hasIncrease = false }) {
  const colgroup = document.createElement('colgroup');
  const colClasses = [];
  if (variant === 'overtime') {
    colClasses.push('employee-col-kind');
  } else {
    colClasses.push('employee-col-no', 'employee-col-name', 'employee-col-sub', 'employee-col-kind');
  }
  for (let i = 0; i < monthCount; i += 1) {
    colClasses.push('employee-col-month');
  }
  colClasses.push('employee-col-total');
  if (hasIncrease) colClasses.push('employee-col-increase');
  for (const className of colClasses) {
    const col = document.createElement('col');
    col.className = className;
    colgroup.appendChild(col);
  }
  return colgroup;
}

/**
 * 人件費テーブルの列幅を実測する。
 * scale には適用中の UI スケールを渡す（px 定数もフォントと同率で縮小・拡大させ、
 * 縮小時に最小幅が邪魔をして収まらない問題を防ぐ）。文字実測はフォント経由で自動追従する。
 */
function measureEmployeeSettingsTableLayout(wrap, monthCount, availableW, scale = 1) {
  const font = measureEmployeeTableFont(wrap);
  const extraDigitW = measureEmployeeAmountDigitWidth(wrap);
  const monthContentW = measureMaxCellTextWidth(
    wrap,
    '.salary-plan-table td.salary-plan-amount-cell, .salary-plan-table th.salary-plan-col-month',
    font,
  );
  const totalContentW = measureMaxCellTextWidth(
    wrap,
    '.salary-plan-table td.salary-plan-col-total',
    font,
  );

  let monthW = Math.max(
    EMPLOYEE_COL_MONTH_MIN_PX * scale + extraDigitW,
    monthContentW + EMPLOYEE_AMOUNT_CELL_PADDING_PX * scale,
  );
  let totalW = Math.max(
    EMPLOYEE_COL_TOTAL_MIN_PX * scale + extraDigitW * 2,
    totalContentW + EMPLOYEE_AMOUNT_CELL_PADDING_PX * scale,
  );

  const noW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.employee-salary-plan-table .salary-plan-col-no',
    font,
    ['番号'],
    EMPLOYEE_COL_NO_MIN_PX,
    scale,
  );
  const nameW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.employee-salary-plan-table .salary-plan-col-name',
    font,
    ['氏名'],
    EMPLOYEE_COL_NAME_MIN_PX,
    scale,
  );
  const subW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.employee-salary-plan-table .salary-plan-col-sub',
    font,
    ['市区町村'],
    EMPLOYEE_COL_SUB_MIN_PX,
    scale,
  );
  const kindW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.salary-plan-table .salary-plan-col-kind',
    font,
    ['種別', '月額', '賞与', '残業手当'],
    EMPLOYEE_COL_KIND_MIN_PX,
    scale,
  );
  const hasIncrease = wrap.querySelector('.employee-salary-plan-table .salary-plan-col-increase') != null;
  const increaseW = hasIncrease ? EMPLOYEE_COL_INCREASE_PX * scale : 0;

  const overtimeFixedW = kindW + totalW;
  const salaryFixedW = noW + nameW + subW + kindW + totalW + increaseW;
  const naturalW = Math.max(
    overtimeFixedW + monthCount * monthW,
    salaryFixedW + monthCount * monthW,
  );

  if (availableW > 0 && availableW > salaryFixedW + monthCount * monthW) {
    monthW = Math.max(monthW, (availableW - salaryFixedW) / monthCount);
  }

  return {
    noW,
    nameW,
    subW,
    kindW,
    monthW,
    totalW,
    increaseW,
    naturalW,
  };
}

export function layoutEmployeeSettingsTables(wrap, monthCount) {
  if (!wrap?.isConnected || monthCount <= 0) return;

  const availableW = getPlanSettingsWrapAvailableWidth(wrap);
  if (availableW <= 0) return;

  resetPlanSettingsUiScale(wrap);
  let layout = measureEmployeeSettingsTableLayout(wrap, monthCount, availableW);
  // 従業員一覧（2 カラム）も計画表と同じスケールで縮むため、ページ全体の自然幅は両者の最大
  const listNaturalW = measureElementIntrinsicWidth(wrap.querySelector('.employee-settings-columns'));
  let scale = applyPlanSettingsUiScale(wrap, Math.max(layout.naturalW, listNaturalW), availableW);
  layout = measureEmployeeSettingsTableLayout(wrap, monthCount, availableW, scale);
  // フォントメトリクスは倍率に厳密比例しないため、適用後の実測でまだ収まらなければ一度だけ補正する
  if (layout.naturalW > availableW && scale > 0) {
    scale = applyPlanSettingsUiScale(wrap, layout.naturalW / scale, availableW);
    layout = measureEmployeeSettingsTableLayout(wrap, monthCount, availableW, scale);
  }

  wrap.style.setProperty('--employee-col-no-w', `${layout.noW}px`);
  wrap.style.setProperty('--employee-col-name-w', `${layout.nameW}px`);
  wrap.style.setProperty('--employee-col-sub-w', `${layout.subW}px`);
  wrap.style.setProperty('--employee-col-kind-w', `${layout.kindW}px`);
  wrap.style.setProperty('--employee-col-month-w', `${layout.monthW}px`);
  wrap.style.setProperty('--employee-col-total-w', `${layout.totalW}px`);
  wrap.style.setProperty('--employee-col-increase-w', `${layout.increaseW}px`);
  wrap.style.setProperty('--employee-plan-table-w', `${Math.ceil(layout.naturalW)}px`);
}

export function bindEmployeeSettingsLayout(wrap, {
  monthCount,
  fiscalMonths,
  currentPeriod,
  appSettings,
} = {}) {
  wrap.__employeeLayoutObserver?.disconnect();
  const run = () => {
    layoutEmployeeSettingsTables(wrap, monthCount);
    syncAllPlanSettingsTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  const observer = new ResizeObserver(run);
  observer.observe(wrap);
  wrap.__employeeLayoutObserver = observer;
  bindPlanSettingsColumnPlateSync(wrap, fiscalMonths, currentPeriod, appSettings);
}

export function resetPlanSettingsUiScale(wrap) {
  if (wrap) wrap.style.setProperty(PLAN_SETTINGS_UI_SCALE_VAR, '1');
}

/**
 * 自然幅と使える幅の比率で UI スケールを決める（予実表と同じフィット方針）。
 * 余白があれば拡大し、収まらないときは縮小する。横スクロールバーは出さない。
 * 適用した値（CSS 変数と同じ丸め済みの倍率）を返す。
 */
export function applyPlanSettingsUiScale(wrap, naturalW, availableW) {
  resetPlanSettingsUiScale(wrap);
  if (!wrap || availableW <= 0 || naturalW <= 0) return 1;
  let scale = 1;
  if (naturalW > availableW) {
    scale = Math.max(
      PLAN_SETTINGS_UI_SCALE_MIN,
      (availableW / naturalW) * PLAN_SETTINGS_UI_SCALE_SAFETY,
    );
  } else if (naturalW < availableW * PLAN_SETTINGS_UI_SCALE_FIT_THRESHOLD) {
    scale = Math.min(PLAN_SETTINGS_UI_SCALE_MAX, availableW / naturalW);
  }
  // 切り捨て丸めで「収まる側」に倒す（切り上げると 1px 単位のはみ出しが起こり得る）
  const applied = Math.floor(scale * 100) / 100;
  wrap.style.setProperty(PLAN_SETTINGS_UI_SCALE_VAR, String(applied));
  return applied;
}

export function getPlanSettingsWrapAvailableWidth(wrap) {
  const refWrap = wrap?.querySelector('.salary-plan-table-wrap') ?? wrap;
  return refWrap?.clientWidth ?? 0;
}

export function measurePlanSettingsTablesNaturalWidth(wrap, tableSelector = 'table') {
  let maxNaturalW = 0;
  wrap?.querySelectorAll(tableSelector).forEach((table) => {
    maxNaturalW = Math.max(maxNaturalW, table.scrollWidth);
  });
  return maxNaturalW;
}

export function layoutPlanSettingsScalableWrap(wrap, measureNaturalWidth) {
  if (!wrap?.isConnected) return 1;
  const availableW = getPlanSettingsWrapAvailableWidth(wrap);
  if (availableW <= 0) return 1;
  // 計測前にスケールを戻し、拡大後のフォント幅が自然幅に乗らないようにする
  resetPlanSettingsUiScale(wrap);
  const measure = (w) => (typeof measureNaturalWidth === 'function'
    ? measureNaturalWidth(w, availableW)
    : measurePlanSettingsTablesNaturalWidth(w));
  const naturalW = measure(wrap);
  let scale = applyPlanSettingsUiScale(wrap, naturalW, availableW);
  // フォント幅は倍率に厳密比例しない（ヒンティング等）ため、適用後に実測して
  // まだ収まらなければ一度だけ補正する（末尾の桁が 1 文字見切れる問題の防止）
  if (scale > 0) {
    const actualW = measure(wrap);
    if (actualW > availableW) {
      scale = applyPlanSettingsUiScale(wrap, actualW / scale, availableW);
    }
  }
  return scale;
}

export function bindPlanSettingsScalableLayout(wrap, {
  measureNaturalWidth,
  fiscalMonths,
  currentPeriod,
  appSettings,
  onAfterLayout,
} = {}) {
  wrap.__planSettingsScalableLayoutObserver?.disconnect();
  const run = () => {
    layoutPlanSettingsScalableWrap(wrap, measureNaturalWidth);
    onAfterLayout?.();
    syncAllPlanSettingsTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  const observer = new ResizeObserver(run);
  observer.observe(wrap);
  wrap.__planSettingsScalableLayoutObserver = observer;
  bindPlanSettingsColumnPlateSync(wrap, fiscalMonths, currentPeriod, appSettings);
}

export function applySectionFilterTitleStyle(titleEl, sectionId, getSectionFilterColors) {
  if (!titleEl || !getSectionFilterColors) return;
  titleEl.classList.add('salary-plan-title--section-filter');
  titleEl.dataset.sectionFilter = sectionId;
  const { background, color } = getSectionFilterColors(sectionId);
  titleEl.style.setProperty('--filter-btn-bg', background);
  titleEl.style.color = color;
}
