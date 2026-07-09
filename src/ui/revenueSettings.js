import {
  parseSalaryPlanAmountInput,
  parseSalaryPlanAmountInputWithFillForward,
  formatSalaryPlanYen,
  salaryPlanAmountDiffersFromPrevious,
  buildFiscalYearMonths,
  applyAmountFromMonthForwardSkippingPast,
} from '../config/salaryPlanConfig.js';
import {
  DEFAULT_REVENUE_PLAN_YEARS,
  getRevenuePlanYears,
  setRevenuePlanYears,
  buildRevenuePlanPeriodEntries,
  buildMiscIncomePlanPeriodEntries,
  getPeriodClientEntries,
  setClientEntry,
  removeClientEntry,
  createManualClient,
  mergeClientsFromSubaccounts,
  syncClientListFromReference,
  moveClientEntry,
  renameManualClientEntry,
  computeClientMonthlyRevenue,
  getEffectiveUnitPrice,
  parseManMonthInput,
  formatManMonths,
  cloneClientMonthly,
  applyManMonthsFromMonthForward,
  MISC_INCOME_ACCOUNT,
  getMiscIncomeMonthly,
  setMiscIncomeMonthly,
} from '../config/revenuePlanConfig.js';
import {
  handlePlanAmountCellKeydown,
  resumePlanCellTabEdit,
  tagPlanEditableCell,
  tagPlanEditableRow,
} from '../config/planCellEdit.js';
import {
  collectRevenueSubaccountsFromPlanData,
  collectRevenueActualAmountsFromPlanData,
} from '../enrich/planRevenueRows.js';
import { buildMonthYearMap, formatFiscalPeriodLabel, getFiscalPeriodDisplayMode, getCurrentFiscalMonthLabel } from '../config/appSettings.js';
import {
  getSettingsLockedMonths,
  getMonthDisplayMode,
  getMonthDisplayClickHint,
  isMonthDisplayToggleTarget,
} from '../config/monthDisplayConfig.js';
import {
  planAmountCellConfigs,
  resetPlanSettingsUiScale,
  applyPlanSettingsUiScale,
  getPlanSettingsWrapAvailableWidth,
  buildProbeFontFromStyle,
  measureMaxCellTextWidth,
  createPlanAmountCellEditor,
  capturePlanSectionActiveEdit,
  restorePlanSectionActiveEdit,
  applySectionFilterTitleStyle,
} from './planSettingsTableUi.js';

const REVENUE_ACCOUNT = '売上高';
const ROW_MAN_MONTHS = '人月';
const ROW_UNIT_PRICE = '人月単価';
const ROW_REVENUE = '売上';

function sumMonthlyMap(map, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) total += map[month] ?? 0;
  return total;
}

function setMonthlyUnitPrice(client, month, price, fiscalMonths) {
  const monthlyUnitPrice = cloneClientMonthly(client.monthlyUnitPrice, fiscalMonths);
  monthlyUnitPrice[month] = price;
  return monthlyUnitPrice;
}

const REVENUE_COL_KIND_PX = 68;
const REVENUE_COL_TOTAL_PX = 84;
const REVENUE_COL_ACTIONS_PX = 104;
const REVENUE_COL_CLIENT_MIN_PX = 64;
const REVENUE_COL_MONTH_MIN_PX = 52;
/* box-sizing: border-box のセル内余白（0.45rem×2 ≒ 12px）と罫線ぶんの余裕 */
const REVENUE_CELL_PADDING_PX = 14;

function measureExtraDigitWidthBeforeYen(wrap) {
  const table = wrap.querySelector('.revenue-plan-table, .misc-income-plan-table');
  const style = table ? getComputedStyle(table) : getComputedStyle(wrap);
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;';
  probe.style.font = buildProbeFontFromStyle(style);
  probe.textContent = '9';
  wrap.appendChild(probe);
  const width = Math.ceil(probe.getBoundingClientRect().width);
  probe.remove();
  return width;
}

function buildRevenueTableColgroup(monthCount) {
  const colgroup = document.createElement('colgroup');
  const colClasses = [
    'revenue-col-client',
    'revenue-col-kind',
    ...Array.from({ length: monthCount }, () => 'revenue-col-month'),
    'revenue-col-total',
    'revenue-col-actions',
  ];
  for (const className of colClasses) {
    const col = document.createElement('col');
    col.className = className;
    colgroup.appendChild(col);
  }
  return colgroup;
}

function measureRevenueClientColumnWidth(wrap, scale = 1) {
  // ラベルは display: block でセル幅いっぱいに広がるため、矩形幅ではなく文字幅を実測する
  // （矩形幅だと現在の列幅を測ってしまい、長い受注先名が見切れたままになる）。
  // 名前の長さは可変なので上限キャップは設けず、超過分はページ全体の縮小で吸収する
  const font = measureRevenueTableFont(wrap);
  const contentW = measureMaxCellTextWidth(wrap, '.revenue-client-name-label', font);
  return Math.max(
    REVENUE_COL_CLIENT_MIN_PX * scale,
    contentW + REVENUE_CELL_PADDING_PX * scale,
  );
}

function measureRevenueTableFont(wrap) {
  const table = wrap.querySelector('.revenue-plan-table, .misc-income-plan-table');
  const style = table ? getComputedStyle(table) : getComputedStyle(wrap);
  return buildProbeFontFromStyle(style);
}

/** アクション列の幅を実測する。ボタンの枠線などスケールに比例しない成分があるため固定値では収まらない */
function measureRevenueActionsColumnWidth(wrap, scale = 1) {
  let width = REVENUE_COL_ACTIONS_PX * scale;
  wrap.querySelectorAll('.revenue-plan-table td.col-out-actions .revenue-client-actions-wrap').forEach((el) => {
    width = Math.max(width, Math.ceil(el.getBoundingClientRect().width) + 8 * scale + 2);
  });
  return width;
}

/**
 * 受注テーブルの列幅を実測する。
 * scale には適用中の UI スケールを渡す（px 定数もフォントと同率で縮小・拡大させ、
 * 縮小時に最小幅が邪魔をして収まらない問題を防ぐ）。文字実測はフォント経由で自動追従する。
 */
function measureRevenueTableLayout(wrap, monthCount, availableW, scale = 1) {
  const font = measureRevenueTableFont(wrap);
  const extraDigitW = measureExtraDigitWidthBeforeYen(wrap);

  // 金額・種別は下限定数だけでなく実際のセル内容も測る（桁数が増えても見切れない）
  const monthContentW = measureMaxCellTextWidth(
    wrap,
    '.revenue-plan-table td.salary-plan-amount-cell, .revenue-plan-table th.salary-plan-col-month,'
      + ' .misc-income-plan-table td.salary-plan-amount-cell, .misc-income-plan-table th.salary-plan-col-month',
    font,
  );
  const totalContentW = measureMaxCellTextWidth(
    wrap,
    '.revenue-plan-table td.salary-plan-col-total, .revenue-plan-table th.salary-plan-col-total,'
      + ' .misc-income-plan-table td.salary-plan-col-total, .misc-income-plan-table th.salary-plan-col-total',
    font,
  );
  const kindContentW = measureMaxCellTextWidth(
    wrap,
    '.revenue-plan-table .revenue-plan-col-kind, .misc-income-plan-table .revenue-plan-col-kind',
    font,
  );

  const monthMinW = Math.max(
    REVENUE_COL_MONTH_MIN_PX * scale + extraDigitW,
    monthContentW + REVENUE_CELL_PADDING_PX * scale,
  );
  const totalW = Math.max(
    REVENUE_COL_TOTAL_PX * scale + extraDigitW,
    totalContentW + REVENUE_CELL_PADDING_PX * scale,
  );
  const kindW = Math.max(
    REVENUE_COL_KIND_PX * scale,
    kindContentW + REVENUE_CELL_PADDING_PX * scale,
  );
  const clientW = measureRevenueClientColumnWidth(wrap, scale);
  const actionsW = measureRevenueActionsColumnWidth(wrap, scale);
  const fixedW = clientW + kindW + totalW + actionsW;
  // +2 は border-collapse の外周罫線ぶん（列幅の合計よりテーブルが僅かに広くなる）
  const naturalW = fixedW + monthCount * monthMinW + 2;
  const monthW = Math.max(monthMinW, (availableW - fixedW - 2) / monthCount);
  return { clientW, kindW, totalW, monthW, actionsW, naturalW };
}

export function layoutRevenueSettingsTables(wrap, monthCount) {
  if (!wrap?.isConnected || monthCount <= 0) return;

  const availableW = getPlanSettingsWrapAvailableWidth(wrap);
  if (availableW <= 0) return;

  resetPlanSettingsUiScale(wrap);
  let layout = measureRevenueTableLayout(wrap, monthCount, availableW);
  let scale = applyPlanSettingsUiScale(wrap, layout.naturalW, availableW);
  layout = measureRevenueTableLayout(wrap, monthCount, availableW, scale);
  // フォントメトリクスは倍率に厳密比例しないため、適用後の実測でまだ収まらなければ数回補正する
  for (let retry = 0; retry < 3 && layout.naturalW > availableW && scale > 0; retry += 1) {
    scale = applyPlanSettingsUiScale(wrap, layout.naturalW / scale, availableW);
    layout = measureRevenueTableLayout(wrap, monthCount, availableW, scale);
  }

  wrap.style.setProperty('--revenue-col-client-w', `${layout.clientW}px`);
  wrap.style.setProperty('--revenue-col-kind-w', `${layout.kindW}px`);
  wrap.style.setProperty('--revenue-col-month-w', `${layout.monthW}px`);
  wrap.style.setProperty('--revenue-col-total-w', `${layout.totalW}px`);
  wrap.style.setProperty('--revenue-col-actions-w', `${layout.actionsW}px`);
}

function bindRevenueSettingsLayout(wrap, monthCount, currentPeriod, appSettings, fiscalMonths) {
  wrap.__revenueLayoutObserver?.disconnect();
  const run = () => {
    layoutRevenueSettingsTables(wrap, monthCount);
    syncAllRevenueTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  const observer = new ResizeObserver(run);
  observer.observe(wrap);
  wrap.__revenueLayoutObserver = observer;
  bindRevenueColumnPlateSync(wrap, fiscalMonths, currentPeriod, appSettings);
}

function scheduleRevenueSettingsLayout(wrap, monthCount, currentPeriod, appSettings, fiscalMonths) {
  bindRevenueSettingsLayout(wrap, monthCount, currentPeriod, appSettings, fiscalMonths);
}

function applyRevenueColumnPlateRect(plate, monthRect, topY, bottomY, clipRect) {
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

function syncRevenueTableColumnPlates(tableWrap, table, highlightMonth, fiscalMonths) {
  if (!tableWrap || !table?.isConnected) return;

  const plateHost = tableWrap;
  tableWrap.parentElement?.querySelectorAll(':scope > .revenue-column-plate-layer').forEach((el) => {
    el.remove();
  });
  let layer = plateHost.querySelector(':scope > .revenue-column-plate-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'revenue-column-plate-layer plan-column-plate-layer';
    layer.setAttribute('aria-hidden', 'true');
    plateHost.appendChild(layer);
  }

  let headerPlate = layer.querySelector('.revenue-column-plate--current-header');
  if (!headerPlate) {
    headerPlate = document.createElement('div');
    headerPlate.className = 'plan-column-plate plan-column-plate--current-header revenue-column-plate--current-header';
    layer.appendChild(headerPlate);
  }

  let bodyPlate = layer.querySelector('.revenue-column-plate--current');
  if (!bodyPlate) {
    bodyPlate = document.createElement('div');
    bodyPlate.className = 'plan-column-plate plan-column-plate--current revenue-column-plate--current';
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
  applyRevenueColumnPlateRect(headerPlate, monthRect, monthRect.top, monthRect.bottom, clipRect);

  let bottomY = monthRect.bottom;
  for (const tr of table.tBodies[0]?.querySelectorAll('tr') ?? []) {
    const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
    const td = amountCells[monthIndex];
    if (td) bottomY = Math.max(bottomY, td.getBoundingClientRect().bottom);
  }
  applyRevenueColumnPlateRect(bodyPlate, monthRect, monthRect.bottom, bottomY, clipRect);
}

function syncAllRevenueTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings) {
  if (!wrap?.isConnected) return;
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
    syncRevenueTableColumnPlates(tableWrap, table, tableHighlight, fiscalMonths);
  });
}

function bindRevenueColumnPlateSync(wrap, fiscalMonths, currentPeriod, appSettings) {
  if (wrap.__revenuePlateWindowSync) {
    window.removeEventListener('scroll', wrap.__revenuePlateWindowSync, true);
  }
  const sync = () => syncAllRevenueTableColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
  wrap.__revenuePlateWindowSync = sync;
  wrap.querySelectorAll('.salary-plan-table-wrap').forEach((el) => {
    if (el.__revenuePlateScrollBound) return;
    el.__revenuePlateScrollBound = true;
    el.addEventListener('scroll', sync, { passive: true });
  });
  window.addEventListener('scroll', sync, true);
  sync();
}

function refreshRevenueSettingsSectionTitles(getSectionFilterColors) {
  if (!getSectionFilterColors) return;
  document.querySelectorAll(
    '.revenue-settings-wrap [data-section-filter], .expense-plan-override-section [data-section-filter], .employee-settings-wrap [data-section-filter], .outsourcing-settings-wrap [data-section-filter], .tax-payment-settings-wrap [data-section-filter], .journal-definition-settings-wrap [data-section-filter]',
  ).forEach((el) => {
    applySectionFilterTitleStyle(el, el.dataset.sectionFilter, getSectionFilterColors);
  });
}

export { refreshRevenueSettingsSectionTitles };

let revenueSettingsMonthDisplayApplier = null;

export function applyRevenueSettingsMonthDisplayDom() {
  revenueSettingsMonthDisplayApplier?.();
}

export function mountRevenueSettingsPanel({
  replaceRootPanel,
  refreshPlanKpi,
  appSettings,
  rawPlanData,
  getRevenuePlans,
  setRevenuePlans,
  getRevenuePlanSettings,
  setRevenuePlanSettings,
  refreshPlanTableIfNeeded,
  getMonthDisplayConfig,
  onToggleMonthDisplay,
  getSectionFilterColors,
}) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const currentPeriod = appSettings.fiscalPeriod;

  let revenuePlans = getRevenuePlans();
  let revenuePlanSettings = getRevenuePlanSettings();

  const planPeriodEntries = () => buildRevenuePlanPeriodEntries(
    currentPeriod,
    getRevenuePlanYears(revenuePlanSettings),
  );

  if (rawPlanData) {
    const subaccounts = collectRevenueSubaccountsFromPlanData(rawPlanData);
    revenuePlans = mergeClientsFromSubaccounts(
      revenuePlans,
      currentPeriod,
      subaccounts,
      fiscalMonths,
    );
    setRevenuePlans(revenuePlans);
  }
  for (const { period } of planPeriodEntries()) {
    if (period === currentPeriod) continue;
    revenuePlans = syncClientListFromReference(
      revenuePlans,
      period,
      currentPeriod,
      fiscalMonths,
    );
  }
  setRevenuePlans(revenuePlans);

  const actualAmountsByClient = rawPlanData
    ? collectRevenueActualAmountsFromPlanData(rawPlanData, fiscalMonths)
    : new Map();

  const journalClientKeys = new Set();
  if (rawPlanData) {
    for (const { accountLabel, subLabel } of collectRevenueSubaccountsFromPlanData(rawPlanData)) {
      const account = String(accountLabel ?? '').trim();
      const sub = String(subLabel ?? '').trim();
      if (!account || !sub) continue;
      journalClientKeys.add(`${account}\x00${sub}`);
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap revenue-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header tax-payment-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">
      売上高の受注計画を人月で入力します。受注先ごとに月ごとの人月単価を入力します。売上は実績月は仕訳CSVの実績、それ以外は人月\u00d7単価の計画（消費税込）です。人月は Shift+Enter で入力月以降に同値を引き継ぎます（0 も可）。Enter はその月のみ反映します。今期の実績月は仕訳実績月として編集不可です。設定はブラウザに保存され、予実表の「売上高」に反映されます。
    </p>
    <div class="tax-payment-settings-controls">
      <div class="tax-payment-plan-years-row">
        <span class="app-settings-label">計画年数</span>
        <input
          type="number"
          class="app-settings-input tax-payment-plan-years-input"
          id="revenue-plan-years-input"
          min="1"
          max="30"
          step="1"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          aria-label="計画年数"
        />
        <p class="tax-payment-plan-years-hint">今期を含む年数です。デフォルトは ${DEFAULT_REVENUE_PLAN_YEARS} 年です。</p>
      </div>
    </div>
  `;
  wrap.appendChild(header);

  const planYearsInput = header.querySelector('#revenue-plan-years-input');
  planYearsInput.value = String(getRevenuePlanYears(revenuePlanSettings));
  planYearsInput.addEventListener('change', () => {
    revenuePlanSettings = setRevenuePlanYears(revenuePlanSettings, planYearsInput.value);
    setRevenuePlanSettings(revenuePlanSettings);
    planYearsInput.value = String(getRevenuePlanYears(revenuePlanSettings));
    renderPlanSection();
  });
  planYearsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      planYearsInput.blur();
    }
  });

  const statusEl = document.createElement('p');
  statusEl.className = 'employee-status-msg';
  statusEl.hidden = true;
  wrap.appendChild(statusEl);

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
    statusEl.classList.toggle('employee-status-error', isError);
  }

  function persistClient(entry, fiscalPeriod) {
    revenuePlans = setClientEntry(revenuePlans, fiscalPeriod, entry, fiscalMonths);
    setRevenuePlans(revenuePlans);
    refreshPlanTableIfNeeded();
  }

  function getClientsForPeriod(fiscalPeriod) {
    return getPeriodClientEntries(revenuePlans, fiscalPeriod, fiscalMonths);
  }

  function getPastMonthsForPeriod(fiscalPeriod) {
    return getSettingsLockedMonths({
      config: getMonthDisplayConfig(),
      businessStartYear: appSettings.businessStartYear,
      fiscalPeriod,
      fiscalMonths,
      currentFiscalPeriod: currentPeriod,
    });
  }

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

  function syncRevenueMonthHighlightClasses(el, month, fiscalPeriod) {
    if (!el) return;
    const highlightFiscalMonth = getHighlightFiscalMonthForTable(fiscalPeriod);
    el.classList.toggle('current-month', highlightFiscalMonth != null && month === highlightFiscalMonth);
  }

  function configureMonthHeaderTh(th, month, fiscalPeriod) {
    th.className = 'salary-plan-col-month';
    th.textContent = month;
    syncRevenueMonthHighlightClasses(th, month, fiscalPeriod);
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

  function updateRevenueMonthHeaderTh(th, month, fiscalPeriod) {
    if (!isBudgetActualCurrentPeriod(fiscalPeriod) || !isMonthDisplayToggleTarget(month)) return;
    const mode = getMonthDisplayModeForPeriod(month);
    th.classList.add('month-display-toggle');
    th.classList.toggle('month-display-actual', mode === 'actual');
    th.classList.toggle('month-display-plan', mode === 'plan');
    th.title = getMonthDisplayClickHint(mode);
    th.setAttribute('aria-pressed', mode === 'plan' ? 'true' : 'false');
    syncRevenueMonthHighlightClasses(th, month, fiscalPeriod);
  }

  let startNumericCellEdit;

  function bindPlanAmountCellDblClick(td) {
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
  }) {
    if (td.querySelector('input')) return;

    td.className = `salary-plan-amount-cell ${monthPlanActualClass(fiscalPeriod, month)} ${extraClass}`.trim();
    tagPlanEditableCell(td, { month });
    td.classList.remove(
      'salary-plan-cell-editable',
      'salary-plan-cell-disabled',
      'salary-plan-amount-start-month',
      'salary-plan-amount-changed',
    );
    applyPlanAmountVarianceClass(td, monthIndex, value, prevValue);
    td.textContent = formatValue(value);
    syncRevenueMonthHighlightClasses(td, month, fiscalPeriod);

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
      bindPlanAmountCellDblClick(td);
      return;
    }

    td.classList.add('salary-plan-cell-disabled');
    td.removeAttribute('title');
    planAmountCellConfigs.delete(td);
  }

  function syncRevenuePlanTableMonthDisplay(table, fiscalPeriod) {
    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th) => {
      const month = th.textContent.trim();
      if (fiscalMonths.includes(month)) updateRevenueMonthHeaderTh(th, month, fiscalPeriod);
    });

    const clients = getClientsForPeriod(fiscalPeriod);
    const tabScopeId = `revenue-settings-${fiscalPeriod}`;

    for (const client of clients) {
      const displayRevenue = buildDisplayRevenueMonthly(client, fiscalPeriod);
      const displayManMonths = buildDisplayManMonthsMonthly(client, fiscalPeriod);
      const displayUnitPrice = buildDisplayUnitPriceMonthly(client, fiscalPeriod);
      const trMan = table.querySelector(
        `tr.revenue-plan-row--manMonths[data-revenue-client-group="${CSS.escape(client.id)}"]`,
      );
      if (trMan) {
        for (let i = 0; i < fiscalMonths.length; i += 1) {
          const month = fiscalMonths[i];
          const td = trMan.querySelector(`td[data-plan-month="${CSS.escape(month)}"]`);
          if (!td) continue;
          const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
          const prevValue = prevMonth != null ? displayManMonths[prevMonth] : undefined;
          setPlanAmountCellContent(td, {
            month,
            monthIndex: i,
            value: displayManMonths[month],
            prevValue,
            editable: isMonthEditable(fiscalPeriod, month),
            fiscalPeriod,
            title: 'ダブルクリックで編集（Shift+Enter で後続月へ同値を反映　0 も可）',
            formatValue: formatManMonths,
            rawValue: client.manMonths[month],
            parseValue: parseManMonthInput,
            allowShiftFillForward: true,
            tabScopeId,
            onSave: (parsed, fillForward) => {
              const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
              const nextManMonths = fillForward
                ? applyManMonthsFromMonthForward(
                  client.manMonths,
                  month,
                  parsed,
                  pastMonths,
                  fiscalMonths,
                )
                : { ...cloneClientMonthly(client.manMonths, fiscalMonths), [month]: parsed };
              persistClient({ ...client, manMonths: nextManMonths }, fiscalPeriod);
            },
          });
        }
        const manMonthTotalTd = trMan.querySelector('td.salary-plan-col-total');
        if (manMonthTotalTd) {
          manMonthTotalTd.textContent = formatManMonths(sumMonthlyMap(displayManMonths, fiscalMonths));
        }
      }

      const trUnit = table.querySelector(
        `tr.revenue-plan-row--unitPrice[data-revenue-client-group="${CSS.escape(client.id)}"]`,
      );
      if (trUnit) {
        for (let i = 0; i < fiscalMonths.length; i += 1) {
          const month = fiscalMonths[i];
          const td = trUnit.querySelector(`td[data-plan-month="${CSS.escape(month)}"]`);
          if (!td) continue;
          const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
          const prevUnitPrice = prevMonth != null ? displayUnitPrice[prevMonth] : undefined;
          setPlanAmountCellContent(td, {
            month,
            monthIndex: i,
            value: displayUnitPrice[month],
            prevValue: prevUnitPrice,
            editable: isMonthEditable(fiscalPeriod, month),
            fiscalPeriod,
            title: 'ダブルクリックで編集（人月単価）',
            formatValue: formatSalaryPlanYen,
            rawValue: getEffectiveUnitPrice(client, month),
            parseValue: parseSalaryPlanAmountInput,
            tabScopeId,
            onSave: (parsed) => {
              const nextUnitPrices = setMonthlyUnitPrice(client, month, parsed, fiscalMonths);
              persistClient({ ...client, monthlyUnitPrice: nextUnitPrices }, fiscalPeriod);
            },
          });
        }
      }

      const trRevenue = table.querySelector(
        `tr.revenue-plan-row--revenue[data-revenue-client-group="${CSS.escape(client.id)}"]`,
      );
      if (trRevenue) {
        for (let i = 0; i < fiscalMonths.length; i += 1) {
          const month = fiscalMonths[i];
          const td = trRevenue.querySelector(`td[data-plan-month="${CSS.escape(month)}"]`);
          if (!td) continue;
          const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
          const prevDisplay = prevMonth != null ? displayRevenue[prevMonth] : undefined;
          setPlanAmountCellContent(td, {
            month,
            monthIndex: i,
            value: displayRevenue[month],
            prevValue: prevDisplay,
            editable: false,
            fiscalPeriod,
            formatValue: formatSalaryPlanYen,
            extraClass: 'revenue-plan-revenue-cell',
          });
        }
      }
    }

    const manMonthMonthlyTotals = {};
    const displayMonthlyTotals = {};
    for (const month of fiscalMonths) {
      manMonthMonthlyTotals[month] = 0;
      displayMonthlyTotals[month] = 0;
    }
    for (const client of clients) {
      const displayRevenue = buildDisplayRevenueMonthly(client, fiscalPeriod);
      const displayManMonths = buildDisplayManMonthsMonthly(client, fiscalPeriod);
      for (const month of fiscalMonths) {
        manMonthMonthlyTotals[month] += displayManMonths[month] ?? 0;
        displayMonthlyTotals[month] = (displayMonthlyTotals[month] ?? 0) + (displayRevenue[month] ?? 0);
      }
    }

    const trManMonthTotal = table.querySelector('tr.revenue-plan-total-row--manMonths');
    if (trManMonthTotal) {
      let manMonthGrand = 0;
      const amountCells = trManMonthTotal.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const val = manMonthMonthlyTotals[month] ?? 0;
        const prevVal = i > 0 ? (manMonthMonthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
        manMonthGrand += val;
        setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: val,
          prevValue: prevVal,
          editable: false,
          fiscalPeriod,
          formatValue: formatManMonths,
        });
      }
      const manMonthGrandTd = trManMonthTotal.querySelector('td.salary-plan-col-total');
      if (manMonthGrandTd) manMonthGrandTd.textContent = formatManMonths(manMonthGrand);
    }

    const trTotal = table.querySelector('tr.revenue-plan-total-row--revenue');
    if (trTotal) {
      let grand = 0;
      const amountCells = trTotal.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const val = displayMonthlyTotals[month] ?? 0;
        const prevVal = i > 0 ? (displayMonthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
        grand += val;
        setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: val,
          prevValue: prevVal,
          editable: false,
          fiscalPeriod,
          formatValue: formatSalaryPlanYen,
        });
      }
      const grandTd = trTotal.querySelector('td.salary-plan-col-total');
      if (grandTd) grandTd.textContent = formatSalaryPlanYen(grand);
    }
  }

  function syncMiscIncomeTableMonthDisplay(table, fiscalPeriod) {
    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th) => {
      const month = th.textContent.trim();
      if (fiscalMonths.includes(month)) updateRevenueMonthHeaderTh(th, month, fiscalPeriod);
    });

    const displayMonthly = getMiscIncomeMonthly(revenuePlans, fiscalPeriod, fiscalMonths);
    const tr = table.querySelector('tbody tr[data-plan-row-key]');
    if (!tr) return;

    let rowTotal = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const td = tr.querySelector(`td[data-plan-month="${CSS.escape(month)}"]`);
      if (!td) continue;
      const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
      const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
      const value = displayMonthly[month];
      rowTotal += value ?? 0;
      setPlanAmountCellContent(td, {
        month,
        monthIndex: i,
        value,
        prevValue,
        editable: isMonthEditable(fiscalPeriod, month),
        fiscalPeriod,
        title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額を反映）',
        formatValue: formatSalaryPlanYen,
        rawValue: displayMonthly[month],
        parseValue: parseSalaryPlanAmountInput,
        tabScopeId: `misc-income-${fiscalPeriod}`,
        onSave: (parsed, fillForward) => {
          const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
          const next = fillForward
            ? applyAmountFromMonthForwardSkippingPast(
              displayMonthly,
              fiscalMonths,
              month,
              parsed,
              pastMonths,
            )
            : { ...displayMonthly, [month]: parsed };
          revenuePlans = setMiscIncomeMonthly(revenuePlans, fiscalPeriod, next, fiscalMonths);
          setRevenuePlans(revenuePlans);
          refreshPlanTableIfNeeded();
        },
        onEditClose: () => renderMiscIncomePlanSection(),
      });
    }

    const totalTd = tr.querySelector('td.salary-plan-col-total');
    if (totalTd) totalTd.textContent = formatSalaryPlanYen(rowTotal);
  }

  function applyMonthDisplayToWrap(rootWrap) {
    if (!rootWrap?.isConnected) return;
    rootWrap.querySelectorAll('.revenue-plan-table[data-fiscal-period]').forEach((table) => {
      const fiscalPeriod = Number(table.dataset.fiscalPeriod);
      if (fiscalPeriod !== currentPeriod) return;
      syncRevenuePlanTableMonthDisplay(table, fiscalPeriod);
    });
    rootWrap.querySelectorAll('.misc-income-plan-table[data-fiscal-period]').forEach((table) => {
      const fiscalPeriod = Number(table.dataset.fiscalPeriod);
      if (fiscalPeriod !== currentPeriod) return;
      syncMiscIncomeTableMonthDisplay(table, fiscalPeriod);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      syncAllRevenueTableColumnPlates(rootWrap, fiscalMonths, currentPeriod, appSettings);
    }));
  }

  function getClientActualMonthly(client) {
    return actualAmountsByClient.get(`${client.accountLabel}\x00${client.subLabel}`) ?? {};
  }

  function getRevenueTaxOptions(fiscalPeriod) {
    if (!appSettings.consumptionTaxRates) return null;
    return {
      consumptionTaxRates: appSettings.consumptionTaxRates,
      monthYearMap: buildMonthYearMap(appSettings.businessStartYear, fiscalPeriod),
      fiscalEndMonth: appSettings.fiscalEndMonth,
    };
  }

  function buildPlannedRevenueMonthly(client, fiscalPeriod) {
    return computeClientMonthlyRevenue(client, fiscalMonths, getRevenueTaxOptions(fiscalPeriod));
  }

  function buildCsvRevenueMonthly(client, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) {
      const empty = {};
      for (const month of fiscalMonths) empty[month] = null;
      return empty;
    }
    const actualMonthly = getClientActualMonthly(client);
    const display = {};
    for (const month of fiscalMonths) {
      display[month] = actualMonthly[month] ?? null;
    }
    return display;
  }

  function buildDisplayRevenueMonthly(client, fiscalPeriod) {
    const planned = buildPlannedRevenueMonthly(client, fiscalPeriod);
    const actual = buildCsvRevenueMonthly(client, fiscalPeriod);
    const display = {};
    for (const month of fiscalMonths) {
      if (isMonthEditable(fiscalPeriod, month)) {
        display[month] = planned[month] ?? null;
      } else {
        display[month] = actual[month] ?? null;
      }
    }
    return display;
  }

  function buildDisplayManMonthsMonthly(client, fiscalPeriod) {
    const display = {};
    for (const month of fiscalMonths) {
      if (isMonthEditable(fiscalPeriod, month)) {
        display[month] = client.manMonths[month] ?? null;
      } else {
        display[month] = null;
      }
    }
    return display;
  }

  function buildDisplayUnitPriceMonthly(client, fiscalPeriod) {
    const display = {};
    for (const month of fiscalMonths) {
      if (isMonthEditable(fiscalPeriod, month)) {
        display[month] = getEffectiveUnitPrice(client, month);
      } else {
        display[month] = null;
      }
    }
    return display;
  }

  function applyPlanAmountVarianceClass(td, monthIndex, value, prevValue) {
    if (monthIndex === 0) {
      td.classList.add('salary-plan-amount-start-month');
    } else if (prevValue !== undefined && salaryPlanAmountDiffersFromPrevious(prevValue, value)) {
      td.classList.add('salary-plan-amount-changed');
    }
  }

  function appendPlanAmountCell(tr, {
    month,
    monthIndex,
    value,
    prevValue,
    editable,
    fiscalPeriod,
    title,
    formatValue,
    rawValue,
    parseValue,
    onSave,
    extraClass = '',
    allowShiftFillForward = false,
    tabScopeId,
  }) {
    const td = document.createElement('td');
    setPlanAmountCellContent(td, {
      month,
      monthIndex,
      value,
      prevValue,
      editable,
      fiscalPeriod,
      title,
      formatValue,
      rawValue,
      parseValue,
      onSave,
      extraClass,
      allowShiftFillForward,
      tabScopeId,
    });
    tr.appendChild(td);
  }

  function canDeleteClient(client) {
    if (client.manual) return true;
    const key = `${client.accountLabel}\x00${client.subLabel}`;
    return !journalClientKeys.has(key);
  }

  function deleteClient(client, fiscalPeriod) {
    revenuePlans = removeClientEntry(revenuePlans, fiscalPeriod, client.id, fiscalMonths);
    setRevenuePlans(revenuePlans);
    renderPlanSection();
    refreshPlanTableIfNeeded();
  }

  function moveClient(client, fiscalPeriod, direction) {
    revenuePlans = moveClientEntry(
      revenuePlans,
      fiscalPeriod,
      client.id,
      direction,
      fiscalMonths,
    );
    setRevenuePlans(revenuePlans);
    renderPlanSection();
  }

  function buildClientOrderWrap(client, fiscalPeriod, clientIndex, clientCount) {
    const orderWrap = document.createElement('div');
    orderWrap.className = 'revenue-client-order-wrap';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'revenue-client-order-btn';
    upBtn.textContent = '\u2191';
    upBtn.title = '上に移動';
    upBtn.disabled = clientIndex <= 0;
    upBtn.addEventListener('click', () => moveClient(client, fiscalPeriod, -1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'revenue-client-order-btn';
    downBtn.textContent = '\u2193';
    downBtn.title = '下に移動';
    downBtn.disabled = clientIndex >= clientCount - 1;
    downBtn.addEventListener('click', () => moveClient(client, fiscalPeriod, 1));

    orderWrap.append(upBtn, downBtn);
    return orderWrap;
  }

  function appendClientActionsCell(tr, client, fiscalPeriod, clientIndex, clientCount, rowSpan = 1) {
    const td = document.createElement('td');
    td.className = 'col-out-actions';
    if (rowSpan > 1) td.rowSpan = rowSpan;
    td.dataset.revenueClientGroup = client.id;

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'employee-actions-wrap revenue-client-actions-wrap';

    function buildDefaultActions() {
      actionsWrap.replaceChildren();
      actionsWrap.classList.remove('employee-actions-confirm');

      if (canDeleteClient(client)) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'settings-delete-btn';
        deleteBtn.textContent = '削除';
        deleteBtn.addEventListener('click', () => {
          actionsWrap.replaceChildren();
          actionsWrap.classList.add('employee-actions-confirm');

          const prompt = document.createElement('span');
          prompt.className = 'employee-delete-prompt';
          prompt.textContent = '削除しますか？';

          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'settings-delete-btn';
          confirmBtn.textContent = '削除する';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'settings-delete-cancel-btn';
          cancelBtn.textContent = 'キャンセル';

          confirmBtn.addEventListener('click', () => deleteClient(client, fiscalPeriod));
          cancelBtn.addEventListener('click', buildDefaultActions);

          actionsWrap.append(prompt, confirmBtn, cancelBtn);
        });
        actionsWrap.appendChild(deleteBtn);
      }

      actionsWrap.appendChild(buildClientOrderWrap(client, fiscalPeriod, clientIndex, clientCount));
    }

    buildDefaultActions();
    td.appendChild(actionsWrap);
    tr.appendChild(td);
  }

  function startClientNameEdit(nameLabel, client, fiscalPeriod) {
    if (!client.manual) return;
    if (nameLabel.querySelector('input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'app-settings-input revenue-client-name-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = client.subLabel;

    let editClosed = false;

    const finish = (save) => {
      if (editClosed) return;
      editClosed = true;
      if (save) {
        const nextName = input.value.trim();
        if (!nextName) {
          showStatus('受注先名を入力してください。', true);
          renderPlanSection();
          return;
        }
        if (nextName === client.subLabel) {
          renderPlanSection();
          return;
        }
        const result = renameManualClientEntry(
          revenuePlans,
          fiscalPeriod,
          client.id,
          nextName,
          fiscalMonths,
        );
        if (!result.ok) {
          if (result.reason === 'duplicate') {
            showStatus('同じ受注先名が既に登録されています。', true);
          } else {
            showStatus('受注先名の変更に失敗しました。', true);
          }
          renderPlanSection();
          return;
        }
        revenuePlans = result.plans;
        setRevenuePlans(revenuePlans);
        showStatus(`受注先名を「${nextName}」に変更しました。`);
        refreshPlanTableIfNeeded();
      }
      renderPlanSection();
    };

    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        finish(true);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!editClosed) finish(true);
      }, 0);
    });

    nameLabel.replaceChildren(input);
    input.focus();
    input.select();
  }

  function setRevenueClientGroupHover(tbody, groupId) {
    tbody.querySelectorAll('.is-revenue-client-group-hover').forEach((el) => {
      el.classList.remove('is-revenue-client-group-hover');
    });
    if (!groupId) return;
    tbody.querySelectorAll('[data-revenue-client-group]').forEach((el) => {
      if (el.dataset.revenueClientGroup === groupId) {
        el.classList.add('is-revenue-client-group-hover');
      }
    });
  }

  function bindRevenueClientGroupRowHover(table) {
    const tbody = table.tBodies[0];
    if (!tbody || tbody.dataset.revenueGroupHoverBound) return;
    tbody.dataset.revenueGroupHoverBound = '1';

    tbody.addEventListener('mouseover', (ev) => {
      const groupEl = ev.target.closest('[data-revenue-client-group]');
      if (!groupEl || !tbody.contains(groupEl)) return;
      const groupId = groupEl.dataset.revenueClientGroup;
      if (tbody.dataset.hoverClientGroup === groupId) return;
      tbody.dataset.hoverClientGroup = groupId;
      setRevenueClientGroupHover(tbody, groupId);
    });

    tbody.addEventListener('mouseout', (ev) => {
      const groupEl = ev.target.closest('[data-revenue-client-group]');
      if (!groupEl) return;
      const groupId = groupEl.dataset.revenueClientGroup;
      const related = ev.relatedTarget;
      if (related?.closest?.('[data-revenue-client-group]')?.dataset?.revenueClientGroup === groupId) return;
      if (tbody.dataset.hoverClientGroup === groupId) {
        delete tbody.dataset.hoverClientGroup;
        setRevenueClientGroupHover(tbody, null);
      }
    });

    tbody.addEventListener('mouseleave', () => {
      delete tbody.dataset.hoverClientGroup;
      setRevenueClientGroupHover(tbody, null);
    });
  }

  function appendClientNameCell(tr, client, fiscalPeriod, rowSpan) {
    const nameTd = document.createElement('td');
    nameTd.className = 'salary-plan-col-name revenue-plan-col-client';
    nameTd.rowSpan = rowSpan;
    nameTd.dataset.revenueClientGroup = client.id;

    const nameLabel = document.createElement('span');
    nameLabel.className = 'revenue-client-name-label';
    nameLabel.textContent = client.subLabel;
    if (client.manual) {
      nameLabel.classList.add('revenue-client-name-editable', 'salary-plan-cell-editable');
      nameLabel.title = 'ダブルクリックで名前を編集';
      nameLabel.addEventListener('dblclick', () => {
        startClientNameEdit(nameLabel, client, fiscalPeriod);
      });
    }

    nameTd.appendChild(nameLabel);
    tr.appendChild(nameTd);
  }

  function appendClientRows(tbody, client, fiscalPeriod, clientIndex, clientCount) {
    const displayRevenue = buildDisplayRevenueMonthly(client, fiscalPeriod);
    const displayManMonths = buildDisplayManMonthsMonthly(client, fiscalPeriod);
    const displayUnitPrice = buildDisplayUnitPriceMonthly(client, fiscalPeriod);
    const rowKinds = [
      { kind: ROW_UNIT_PRICE, key: 'unitPrice' },
      { kind: ROW_MAN_MONTHS, key: 'manMonths' },
      { kind: ROW_REVENUE, key: 'revenue' },
    ];

    for (let rowIndex = 0; rowIndex < rowKinds.length; rowIndex += 1) {
      const { kind, key } = rowKinds[rowIndex];
      const tr = document.createElement('tr');
      tr.className = `salary-plan-row-monthly revenue-plan-row revenue-plan-row--${key}`;
      tr.dataset.revenueClientGroup = client.id;
      tagPlanEditableRow(tr, `${client.id}:${key}`);

      if (rowIndex === 0) {
        appendClientNameCell(tr, client, fiscalPeriod, rowKinds.length);
      }

      const kindTd = document.createElement('td');
      kindTd.className = 'salary-plan-col-sub revenue-plan-col-kind';
      kindTd.textContent = kind;
      tr.appendChild(kindTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;

        if (key === 'manMonths') {
          const prevValue = prevMonth != null ? displayManMonths[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            month,
            monthIndex: i,
            value: displayManMonths[month],
            prevValue,
            editable,
            fiscalPeriod,
            rawValue: client.manMonths[month],
            tabScopeId: `revenue-settings-${fiscalPeriod}`,
            title: 'ダブルクリックで編集（Shift+Enter で後続月へ同値を反映　0 も可）',
            formatValue: formatManMonths,
            parseValue: parseManMonthInput,
            allowShiftFillForward: true,
            onSave: (parsed, fillForward) => {
              const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
              const nextManMonths = fillForward
                ? applyManMonthsFromMonthForward(
                  client.manMonths,
                  month,
                  parsed,
                  pastMonths,
                  fiscalMonths,
                )
                : { ...cloneClientMonthly(client.manMonths, fiscalMonths), [month]: parsed };
              persistClient({ ...client, manMonths: nextManMonths }, fiscalPeriod);
            },
          });
        } else if (key === 'unitPrice') {
          const prevUnitPrice = prevMonth != null ? displayUnitPrice[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            month,
            monthIndex: i,
            value: displayUnitPrice[month],
            prevValue: prevUnitPrice,
            editable,
            fiscalPeriod,
            rawValue: getEffectiveUnitPrice(client, month),
            tabScopeId: `revenue-settings-${fiscalPeriod}`,
            title: 'ダブルクリックで編集（人月単価）',
            formatValue: formatSalaryPlanYen,
            parseValue: parseSalaryPlanAmountInput,
            onSave: (parsed) => {
              const nextUnitPrices = setMonthlyUnitPrice(client, month, parsed, fiscalMonths);
              persistClient({ ...client, monthlyUnitPrice: nextUnitPrices }, fiscalPeriod);
            },
          });
        } else if (key === 'revenue') {
          const prevDisplay = prevMonth != null ? displayRevenue[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            month,
            monthIndex: i,
            value: displayRevenue[month],
            prevValue: prevDisplay,
            editable: false,
            fiscalPeriod,
            tabScopeId: `revenue-settings-${fiscalPeriod}`,
            formatValue: formatSalaryPlanYen,
            extraClass: 'revenue-plan-revenue-cell',
          });
        }
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      if (key === 'manMonths') {
        totalTd.textContent = formatManMonths(sumMonthlyMap(displayManMonths, fiscalMonths));
      } else if (key === 'unitPrice') {
        totalTd.textContent = '';
      } else if (key === 'revenue') {
        totalTd.textContent = formatSalaryPlanYen(sumMonthlyMap(displayRevenue, fiscalMonths));
      }
      tr.appendChild(totalTd);

      if (rowIndex === 0) {
        appendClientActionsCell(tr, client, fiscalPeriod, clientIndex, clientCount, rowKinds.length);
      }

      tbody.appendChild(tr);
    }
  }

  function buildRevenuePlanTable(fiscalPeriod) {
    const clients = getClientsForPeriod(fiscalPeriod);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table revenue-plan-table';
    table.dataset.fiscalPeriod = String(fiscalPeriod);
    table.appendChild(buildRevenueTableColgroup(fiscalMonths.length));

    const headerLabels = [
      '受注先',
      '項目',
      ...fiscalMonths,
      '合計',
      '',
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      if (label === '受注先') {
        th.className = 'salary-plan-col-name revenue-plan-col-client';
        th.textContent = label;
      } else if (label === '項目') {
        th.className = 'salary-plan-col-sub revenue-plan-col-kind';
        th.textContent = label;
      } else if (label === '合計') {
        th.className = 'salary-plan-col-total';
        th.textContent = label;
      } else if (label === '') {
        th.className = 'col-out-actions';
        th.textContent = label;
      } else {
        configureMonthHeaderTh(th, label, fiscalPeriod);
      }
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (clients.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = headerLabels.length;
      emptyTd.className = 'expand-settings-empty';
      emptyTd.textContent = '受注先が登録されていません。今期の仕訳に補助科目がある場合は自動追加されます。手動追加も可能です。';
      emptyRow.appendChild(emptyTd);
      tbody.appendChild(emptyRow);
      table.appendChild(tbody);
      return table;
    }

    for (let i = 0; i < clients.length; i += 1) {
      appendClientRows(tbody, clients[i], fiscalPeriod, i, clients.length);
    }

    const manMonthMonthlyTotals = {};
    const displayMonthlyTotals = {};
    for (const month of fiscalMonths) {
      manMonthMonthlyTotals[month] = 0;
      displayMonthlyTotals[month] = 0;
    }
    for (const client of clients) {
      const displayRevenue = buildDisplayRevenueMonthly(client, fiscalPeriod);
      const displayManMonths = buildDisplayManMonthsMonthly(client, fiscalPeriod);
      for (const month of fiscalMonths) {
        manMonthMonthlyTotals[month] += displayManMonths[month] ?? 0;
        displayMonthlyTotals[month] = (displayMonthlyTotals[month] ?? 0) + (displayRevenue[month] ?? 0);
      }
    }

    const trManMonthTotal = document.createElement('tr');
    trManMonthTotal.className = 'salary-plan-total-row salary-plan-row-monthly revenue-plan-total-row revenue-plan-total-row--manMonths';
    const manMonthTotalLabel = document.createElement('td');
    manMonthTotalLabel.colSpan = 2;
    manMonthTotalLabel.className = 'salary-plan-total-label';
    manMonthTotalLabel.textContent = '合計（人月）';
    trManMonthTotal.appendChild(manMonthTotalLabel);

    let manMonthGrand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const td = document.createElement('td');
      td.className = `salary-plan-amount-cell ${monthPlanActualClass(fiscalPeriod, month)}`.trim();
      const val = manMonthMonthlyTotals[month] ?? 0;
      const prevVal = i > 0 ? (manMonthMonthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
      manMonthGrand += val;
      applyPlanAmountVarianceClass(td, i, val, prevVal);
      td.textContent = formatManMonths(val);
      syncRevenueMonthHighlightClasses(td, month, fiscalPeriod);
      trManMonthTotal.appendChild(td);
    }

    const manMonthGrandTd = document.createElement('td');
    manMonthGrandTd.className = 'salary-plan-col-total';
    manMonthGrandTd.textContent = formatManMonths(manMonthGrand);
    trManMonthTotal.appendChild(manMonthGrandTd);

    const manMonthActionsTd = document.createElement('td');
    manMonthActionsTd.className = 'col-out-actions';
    trManMonthTotal.appendChild(manMonthActionsTd);
    tbody.appendChild(trManMonthTotal);

    const trTotal = document.createElement('tr');
    trTotal.className = 'salary-plan-total-row salary-plan-row-monthly revenue-plan-total-row revenue-plan-total-row--revenue';
    const totalLabel = document.createElement('td');
    totalLabel.colSpan = 2;
    totalLabel.className = 'salary-plan-total-label';
    totalLabel.textContent = '合計（売上）';
    trTotal.appendChild(totalLabel);

    let grand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const td = document.createElement('td');
      td.className = `salary-plan-amount-cell ${monthPlanActualClass(fiscalPeriod, month)}`.trim();
      const val = displayMonthlyTotals[month] ?? 0;
      const prevVal = i > 0 ? (displayMonthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
      grand += val;
      applyPlanAmountVarianceClass(td, i, val, prevVal);
      td.textContent = formatSalaryPlanYen(val);
      syncRevenueMonthHighlightClasses(td, month, fiscalPeriod);
      trTotal.appendChild(td);
    }

    const grandTd = document.createElement('td');
    grandTd.className = 'salary-plan-col-total';
    grandTd.textContent = formatSalaryPlanYen(grand);
    trTotal.appendChild(grandTd);

    const actionsTd = document.createElement('td');
    actionsTd.className = 'col-out-actions';
    trTotal.appendChild(actionsTd);

    tbody.appendChild(trTotal);
    table.appendChild(tbody);
    bindRevenueClientGroupRowHover(table);
    return table;
  }

  function buildPeriodAddForm(fiscalPeriod) {
    const form = document.createElement('div');
    form.className = 'employee-add-form outsourcing-add-form outsourcing-period-add-form revenue-period-add-form';

    const row = document.createElement('div');
    row.className = 'outsourcing-add-form-row';

    const label = document.createElement('span');
    label.className = 'outsourcing-add-label';
    label.textContent = '受注先名';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'app-settings-input outsourcing-add-input';
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'plan-csv-btn';
    submitBtn.textContent = '追加';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'expand-reset-btn';
    cancelBtn.textContent = 'キャンセル';

    cancelBtn.addEventListener('click', () => {
      nameInput.value = '';
      nameInput.focus();
    });

    submitBtn.addEventListener('click', () => {
      const subLabel = nameInput.value.trim();
      if (!subLabel) {
        showStatus('受注先名を入力してください。', true);
        nameInput.focus();
        return;
      }
      const client = createManualClient({
        accountLabel: REVENUE_ACCOUNT,
        subLabel,
      });
      if (!client) {
        showStatus('受注先の追加に失敗しました。', true);
        return;
      }
      const existing = getClientsForPeriod(fiscalPeriod).some(
        (v) => v.accountLabel === client.accountLabel && v.subLabel === client.subLabel,
      );
      if (existing) {
        showStatus('同じ補助科目が既に登録されています。', true);
        nameInput.focus();
        return;
      }
      revenuePlans = setClientEntry(revenuePlans, fiscalPeriod, client, fiscalMonths);
      setRevenuePlans(revenuePlans);
      nameInput.value = '';
      renderPlanSection();
      refreshPlanTableIfNeeded();
    });

    row.append(label, nameInput, submitBtn, cancelBtn);
    form.appendChild(row);
    return form;
  }

  function renderPlanSection() {
    let section = wrap.querySelector('.salary-plan-section');
    let periodsContainer = wrap.querySelector('.revenue-plan-periods');

    if (!section) {
      section = document.createElement('div');
      section.className = 'salary-plan-section';

      const planHeader = document.createElement('div');
      planHeader.className = 'salary-plan-header';
      planHeader.innerHTML = `
        <h3 class="salary-plan-title" data-section-filter="revenue">売上高計画表</h3>
        <p class="salary-plan-desc">
          決算月 ${appSettings.fiscalEndMonth}月 を基準とした12か月分です。各受注先は人月・人月単価・売上（自動計算）の3行で表示します。
        </p>
      `;
      applySectionFilterTitleStyle(planHeader.querySelector('.salary-plan-title'), 'revenue', getSectionFilterColors);
      section.appendChild(planHeader);

      periodsContainer = document.createElement('div');
      periodsContainer.className = 'revenue-plan-periods outsourcing-plan-periods';
      section.appendChild(periodsContainer);

      wrap.appendChild(section);
    } else {
      applySectionFilterTitleStyle(
        section.querySelector('.salary-plan-title'),
        'revenue',
        getSectionFilterColors,
      );
    }

    const activeEdit = capturePlanSectionActiveEdit(periodsContainer);
    periodsContainer.replaceChildren();

    for (const { period } of planPeriodEntries()) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = formatFiscalPeriodLabel(period);
      block.appendChild(blockTitle);

      block.appendChild(buildPeriodAddForm(period));

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildRevenuePlanTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `revenue-settings-${period}`);

      periodsContainer.appendChild(block);
    }

    restorePlanSectionActiveEdit(periodsContainer, activeEdit);
    scheduleRevenueSettingsLayout(wrap, fiscalMonths.length, currentPeriod, appSettings, fiscalMonths);
  }

  function renderMiscIncomePlanSection() {
    const miscPeriodEntries = buildMiscIncomePlanPeriodEntries(currentPeriod);

    function persistMiscIncomeMonthly(monthly, fiscalPeriod) {
      revenuePlans = setMiscIncomeMonthly(revenuePlans, fiscalPeriod, monthly, fiscalMonths);
      setRevenuePlans(revenuePlans);
      refreshPlanTableIfNeeded();
    }

    function appendMiscIncomeAmountCell(tr, {
      month,
      monthIndex,
      value,
      prevValue,
      editable,
      fiscalPeriod,
      displayMonthly,
    }) {
      const td = document.createElement('td');
      setPlanAmountCellContent(td, {
        month,
        monthIndex,
        value,
        prevValue,
        editable,
        fiscalPeriod,
        title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額を反映）',
        formatValue: formatSalaryPlanYen,
        rawValue: displayMonthly[month],
        parseValue: parseSalaryPlanAmountInput,
        tabScopeId: `misc-income-${fiscalPeriod}`,
        onSave: (parsed, fillForward) => {
          const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
          const next = fillForward
            ? applyAmountFromMonthForwardSkippingPast(
              displayMonthly,
              fiscalMonths,
              month,
              parsed,
              pastMonths,
            )
            : { ...displayMonthly, [month]: parsed };
          persistMiscIncomeMonthly(next, fiscalPeriod);
        },
        onEditClose: () => renderMiscIncomePlanSection(),
      });
      tr.appendChild(td);
    }

    function buildMiscIncomeTable(fiscalPeriod) {
      const displayMonthly = getMiscIncomeMonthly(revenuePlans, fiscalPeriod, fiscalMonths);
      const table = document.createElement('table');
      table.className = 'expand-settings-table salary-plan-table misc-income-plan-table';
      table.dataset.fiscalPeriod = String(fiscalPeriod);
      table.appendChild(buildRevenueTableColgroup(fiscalMonths.length));

      const headerLabels = [
        { label: '', className: 'revenue-plan-col-client revenue-plan-col-spacer' },
        { label: '項目', className: 'salary-plan-col-sub revenue-plan-col-kind' },
        ...fiscalMonths.map((month) => ({ label: month, className: 'salary-plan-col-month' })),
        { label: '合計', className: 'salary-plan-col-total' },
        { label: '', className: 'col-out-actions revenue-plan-col-spacer' },
      ];

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const { label, className } of headerLabels) {
        const th = document.createElement('th');
        if (fiscalMonths.includes(label)) {
          configureMonthHeaderTh(th, label, fiscalPeriod);
        } else {
          th.textContent = label;
          th.className = className;
        }
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const tr = document.createElement('tr');
      tr.className = 'salary-plan-row-monthly';
      tagPlanEditableRow(tr, `misc-income-${fiscalPeriod}`);

      const clientSpacerTd = document.createElement('td');
      clientSpacerTd.className = 'revenue-plan-col-client revenue-plan-col-spacer';
      clientSpacerTd.setAttribute('aria-hidden', 'true');
      tr.appendChild(clientSpacerTd);

      const accountTd = document.createElement('td');
      accountTd.className = 'salary-plan-col-sub revenue-plan-col-kind';
      accountTd.textContent = MISC_INCOME_ACCOUNT;
      tr.appendChild(accountTd);

      let rowTotal = 0;
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        const value = displayMonthly[month];
        rowTotal += value ?? 0;

        appendMiscIncomeAmountCell(tr, {
          month,
          monthIndex: i,
          value,
          prevValue,
          editable,
          fiscalPeriod,
          displayMonthly,
        });
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      totalTd.textContent = formatSalaryPlanYen(rowTotal);
      tr.appendChild(totalTd);

      const actionsSpacerTd = document.createElement('td');
      actionsSpacerTd.className = 'col-out-actions revenue-plan-col-spacer';
      actionsSpacerTd.setAttribute('aria-hidden', 'true');
      tr.appendChild(actionsSpacerTd);

      tbody.appendChild(tr);
      table.appendChild(tbody);
      return table;
    }

    const previousMiscSection = wrap.querySelector('.misc-income-plan-section');
    const activeEdit = capturePlanSectionActiveEdit(previousMiscSection);
    previousMiscSection?.remove();

    const section = document.createElement('div');
    section.className = 'salary-plan-section misc-income-plan-section';

    const planHeader = document.createElement('div');
    planHeader.className = 'salary-plan-header';
    planHeader.innerHTML = `
      <h3 class="salary-plan-title" data-section-filter="nonOperating">雑収入計画表</h3>
      <p class="salary-plan-desc">
        営業外収益の「雑収入」の月次計画を入力します。今期・来期のみ設定できます。今期の実績表示月は編集できません。設定は予実表の「営業外収益」に反映されます。
      </p>
    `;
    applySectionFilterTitleStyle(planHeader.querySelector('.salary-plan-title'), 'nonOperating', getSectionFilterColors);
    section.appendChild(planHeader);

    const periodsContainer = document.createElement('div');
    periodsContainer.className = 'misc-income-plan-periods outsourcing-plan-periods';

    for (const { period } of miscPeriodEntries) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = formatFiscalPeriodLabel(period);
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildMiscIncomeTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `misc-income-${period}`);
      periodsContainer.appendChild(block);
    }

    section.appendChild(periodsContainer);
    wrap.appendChild(section);

    restorePlanSectionActiveEdit(periodsContainer, activeEdit);
    scheduleRevenueSettingsLayout(wrap, fiscalMonths.length, currentPeriod, appSettings, fiscalMonths);
  }

  startNumericCellEdit = createPlanAmountCellEditor({ onEditClose: () => renderPlanSection() });

  renderPlanSection();
  renderMiscIncomePlanSection();
  bindRevenueSettingsLayout(wrap, fiscalMonths.length, currentPeriod, appSettings, fiscalMonths);
  revenueSettingsMonthDisplayApplier = () => applyMonthDisplayToWrap(wrap);
  replaceRootPanel(wrap);
  refreshPlanKpi?.();
}
