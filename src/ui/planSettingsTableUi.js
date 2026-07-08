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
    input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

    let editClosed = false;

    const finish = (save, fillForward = false) => {
      if (editClosed) return;
      editClosed = true;
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
const PLAN_SETTINGS_UI_SCALE_FIT_THRESHOLD = 0.97;

const PLAN_SETTINGS_TABLE_COL_LABEL_PX = 64;
const PLAN_SETTINGS_TABLE_COL_SUB_PX = 64;
const PLAN_SETTINGS_TABLE_COL_MONTH_MIN_PX = 52;
const PLAN_SETTINGS_TABLE_COL_TOTAL_PX = 84;
const PLAN_SETTINGS_TABLE_COL_ACTIONS_PX = 104;

function measureExtraDigitWidthFromWrap(wrap) {
  const table = wrap?.querySelector(
    '.revenue-plan-table, .tax-payment-plan-table, .outsourcing-plan-table, .expense-plan-override-table, .salary-plan-table',
  );
  const style = table ? getComputedStyle(table) : getComputedStyle(wrap);
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;';
  probe.style.font = style.font;
  probe.textContent = '9';
  wrap.appendChild(probe);
  const width = Math.ceil(probe.getBoundingClientRect().width);
  probe.remove();
  return width;
}

/** 受注計画と同様、列最小幅から表の自然幅を見積もる（scrollWidth は容器幅に引き伸ばされるため使わない） */
export function measureSalaryPlanTableNaturalWidth(wrap, monthCount, {
  subColumns = 1,
  actionsColumn = false,
  leadingColumnsPx = 0,
} = {}) {
  const extraDigitW = measureExtraDigitWidthFromWrap(wrap);
  const monthMinW = PLAN_SETTINGS_TABLE_COL_MONTH_MIN_PX + extraDigitW;
  const totalW = PLAN_SETTINGS_TABLE_COL_TOTAL_PX + extraDigitW;
  const labelW = leadingColumnsPx > 0
    ? leadingColumnsPx
    : PLAN_SETTINGS_TABLE_COL_LABEL_PX + (subColumns > 0 ? PLAN_SETTINGS_TABLE_COL_SUB_PX : 0);
  const actionsW = actionsColumn ? PLAN_SETTINGS_TABLE_COL_ACTIONS_PX : 0;
  return labelW + monthCount * monthMinW + totalW + actionsW;
}

/** 描画済みテーブルの内容に基づく幅（一時的に max-content で計測） */
export function measureTableIntrinsicWidth(table) {
  if (!table?.isConnected) return 0;
  const host = table.closest('.salary-plan-table-wrap, .employee-settings-column-list') ?? table.parentElement;
  const prev = {
    tableWidth: table.style.width,
    tableMinWidth: table.style.minWidth,
    hostWidth: host?.style.width,
    hostMinWidth: host?.style.minWidth,
  };
  if (host) {
    host.style.width = 'max-content';
    host.style.minWidth = 'max-content';
  }
  table.style.width = 'max-content';
  table.style.minWidth = 'max-content';
  const width = Math.ceil(table.getBoundingClientRect().width);
  table.style.width = prev.tableWidth;
  table.style.minWidth = prev.tableMinWidth;
  if (host) {
    host.style.width = prev.hostWidth;
    host.style.minWidth = prev.hostMinWidth;
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

export function measurePlanSettingsPageNaturalWidth(wrap, monthCount, variants = []) {
  const defaults = [{ subColumns: 1, actionsColumn: false }];
  const configs = variants.length > 0 ? variants : defaults;
  let maxW = 0;
  for (const config of configs) {
    maxW = Math.max(maxW, measureSalaryPlanTableNaturalWidth(wrap, monthCount, config));
  }
  return maxW;
}

const EMPLOYEE_COL_NO_MIN_PX = 36;
const EMPLOYEE_COL_NO_MAX_PX = 48;
const EMPLOYEE_COL_KIND_MIN_PX = 40;
const EMPLOYEE_COL_KIND_MAX_PX = 56;
const EMPLOYEE_COL_NAME_MIN_PX = 52;
const EMPLOYEE_COL_NAME_MAX_PX = 96;
const EMPLOYEE_COL_SUB_MIN_PX = 80;
const EMPLOYEE_COL_SUB_MAX_PX = 132;
const EMPLOYEE_COL_MONTH_MIN_PX = 52;
const EMPLOYEE_COL_TOTAL_MIN_PX = 84;
const EMPLOYEE_COL_INCREASE_PX = 68;
const EMPLOYEE_AMOUNT_CELL_PADDING_PX = 12;
const EMPLOYEE_LEADING_CELL_PADDING_PX = 10;

function measureEmployeeTableFont(wrap) {
  const table = wrap?.querySelector('.employee-salary-plan-table, .salary-overtime-plan-table');
  const style = table ? getComputedStyle(table) : getComputedStyle(wrap);
  return style.font;
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

function measureMaxCellTextWidth(wrap, selector, font) {
  let maxW = 0;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;';
  probe.style.font = font;
  wrap.appendChild(probe);
  wrap.querySelectorAll(selector).forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    probe.textContent = text;
    maxW = Math.max(maxW, Math.ceil(probe.getBoundingClientRect().width));
  });
  probe.remove();
  return maxW;
}

function measureEmployeeLeadingColumnWidth(wrap, cellSelector, font, headerLabels, minPx, maxPx) {
  let maxW = minPx;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
  probe.style.font = font;
  wrap.appendChild(probe);

  for (const label of headerLabels) {
    probe.textContent = label;
    maxW = Math.max(maxW, Math.ceil(probe.getBoundingClientRect().width));
  }

  wrap.querySelectorAll(cellSelector).forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    probe.textContent = text;
    maxW = Math.max(maxW, Math.ceil(probe.getBoundingClientRect().width));
  });

  probe.remove();
  return Math.min(maxPx, maxW + EMPLOYEE_LEADING_CELL_PADDING_PX);
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

function measureEmployeeSettingsTableLayout(wrap, monthCount, availableW) {
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
    EMPLOYEE_COL_MONTH_MIN_PX + extraDigitW,
    monthContentW + EMPLOYEE_AMOUNT_CELL_PADDING_PX,
  );
  let totalW = Math.max(
    EMPLOYEE_COL_TOTAL_MIN_PX + extraDigitW * 2,
    totalContentW + EMPLOYEE_AMOUNT_CELL_PADDING_PX,
  );

  const noW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.employee-salary-plan-table .salary-plan-col-no',
    font,
    ['番号'],
    EMPLOYEE_COL_NO_MIN_PX,
    EMPLOYEE_COL_NO_MAX_PX,
  );
  const nameW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.employee-salary-plan-table .salary-plan-col-name',
    font,
    ['氏名'],
    EMPLOYEE_COL_NAME_MIN_PX,
    EMPLOYEE_COL_NAME_MAX_PX,
  );
  const subW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.employee-salary-plan-table .salary-plan-col-sub',
    font,
    ['市区町村'],
    EMPLOYEE_COL_SUB_MIN_PX,
    EMPLOYEE_COL_SUB_MAX_PX,
  );
  const kindW = measureEmployeeLeadingColumnWidth(
    wrap,
    '.salary-plan-table .salary-plan-col-kind',
    font,
    ['種別', '月額', '賞与', '残業手当'],
    EMPLOYEE_COL_KIND_MIN_PX,
    EMPLOYEE_COL_KIND_MAX_PX,
  );
  const hasIncrease = wrap.querySelector('.employee-salary-plan-table .salary-plan-col-increase') != null;
  const increaseW = hasIncrease ? EMPLOYEE_COL_INCREASE_PX : 0;

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
  applyPlanSettingsUiScale(wrap, layout.naturalW, availableW);
  layout = measureEmployeeSettingsTableLayout(wrap, monthCount, availableW);

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

export function applyPlanSettingsUiScale(wrap, naturalW, availableW) {
  resetPlanSettingsUiScale(wrap);
  if (!wrap || availableW <= 0 || naturalW <= 0) return 1;
  let scale = 1;
  if (naturalW < availableW * PLAN_SETTINGS_UI_SCALE_FIT_THRESHOLD) {
    scale = Math.min(PLAN_SETTINGS_UI_SCALE_MAX, availableW / naturalW);
    wrap.style.setProperty(PLAN_SETTINGS_UI_SCALE_VAR, String(Math.round(scale * 100) / 100));
  }
  return scale;
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
  const naturalW = typeof measureNaturalWidth === 'function'
    ? measureNaturalWidth(wrap, availableW)
    : measurePlanSettingsTablesNaturalWidth(wrap);
  return applyPlanSettingsUiScale(wrap, naturalW, availableW);
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
