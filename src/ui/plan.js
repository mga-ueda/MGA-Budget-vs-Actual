import { mountDashboardPanel, resetDashboardState } from './dashboard.js';
import { getPlanKpiTooltip } from '../config/planKpiConfig.js';
import {
  getAggregateFormulaLabel,
  getAggregateFormulaDetail,
  isAggregateRow,
} from '../parse/aggregateFormula.js';
import {
  formatYen,
  calcPlanKpiMetrics,
  calcPlanKpiMetricsAllPeriods,
  buildFullPlan,
  zeroOutPlanData,
  FISCAL_MONTHS,
  EXTRA_COLUMNS,
  BS_SECTION_IDS,
  APP_AGGREGATE_LABEL_PREFIX,
  buildRevenueReceivablesCrossVarianceContext,
  shouldShowCrossVarianceMonth,
  insertSgaSummarySections,
  rebuildProfitSectionInPlanData,
} from '../parse/parseJournal.js';
import {
  resolvePlanStartup,
  loadPlanDataFromPickedFolder,
  loadPlanDataFromDroppedFolder,
  loadPlanDataWithFolderAccess,
  reloadPlanDataFromSavedFolder,
  planDataFromCache,
  isFolderPickerSupported,
  isFolderDropSupported,
  bindDirectoryDropZone,
  CSV_KINDS,
  loadCsvNameConfig,
  saveCsvNameConfig,
  resetCsvNameConfig,
  testCsvNameExample,
  formatCsvNameHintLines,
} from '../csv/csvLoader.js';
import {
  loadAppSettings,
  saveAppSettings,
  resetOtherAppSettings,
  buildMonthYearMap,
  formatFiscalPeriodLabel,
  getMaxSelectablePeriod,
  getFiscalPeriodForDate,
  getFiscalPeriodDisplayMode,
  getFiscalPeriodDisplayModeLabel,
  buildPastFiscalMonthSet,
  getCurrentFiscalMonthLabel,
  isPlanOnlyPeriod,
  normalizeFiscalPeriod,
  normalizeFiscalEndMonth,
  applyFontScale,
  normalizeRowPaddingScale,
  formatRowPaddingScaleMultiplier,
  applyRowPaddingScale,
  MIN_ROW_PADDING_SCALE,
  MAX_ROW_PADDING_SCALE,
  normalizeCorpEntityMarkers,
  normalizeCompanyName,
  normalizeBrandIconText,
  normalizeBrandColor,
  normalizeBrandLogoOutlineWidth,
  formatBrandLogoOutlineWidth,
  normalizeBrandLogoShadowStrength,
  formatBrandLogoShadowStrength,
  normalizeBrandLogoDataUrl,
  hasBrandLogo,
  applyBrandSettings,
  applyBrandLogoImageFilters,
  getBrandLogoImageSettings,
  setBrandLogoImageModeSettings,
  getBrandLogoImageModeLabel,
  MAX_BRAND_LOGO_BYTES,
  DEFAULT_BRAND_FILL_COLOR,
  DEFAULT_BRAND_TEXT_COLOR,
  DEFAULT_BRAND_LOGO_OUTLINE_COLOR,
  DEFAULT_BRAND_LOGO_SHADOW_COLOR,
  MIN_BRAND_LOGO_OUTLINE_WIDTH,
  MAX_BRAND_LOGO_OUTLINE_WIDTH,
  MIN_BRAND_LOGO_SHADOW_STRENGTH,
  MAX_BRAND_LOGO_SHADOW_STRENGTH,
} from '../config/appSettings.js';
import {
  bindViewportScale,
  applyViewportScale,
  computeViewportScale,
  resetContentFitScale,
  setContentFitScale,
  getContentFitScale,
  getViewportScale,
  getLayoutViewportWidth,
} from '../config/viewportScale.js';
import {
  downloadSettingsExport,
  validateSettingsImportText,
  applyValidatedSettingsImport,
} from '../config/settingsExport.js';
import {
  normalizeConsumptionTaxRates,
  DEFAULT_CONSUMPTION_TAX_RATES,
} from '../config/consumptionTaxRateConfig.js';
import {
  normalizeWithholdingTaxRates,
  DEFAULT_WITHHOLDING_TAX_RATES,
  DEFAULT_WITHHOLDING_THRESHOLD_YEN,
} from '../config/withholdingTaxRateConfig.js';
import {
  DEFAULT_LEGAL_WELFARE_RATE,
  normalizeLegalWelfareRate,
  formatLegalWelfareRatePercent,
} from '../config/legalWelfareRateConfig.js';
import {
  loadExpandConfig,
  saveExpandConfig,
  isHideTotalWhenExpanded,
  getExpandEntry,
  setExpandEntry,
  expandConfigKey,
  ALWAYS_EXPAND_SECTION_IDS,
} from '../config/expandConfig.js';
import {
  loadVisibilityConfig,
  saveVisibilityConfig,
  isRowVisible,
  visibilityRowKey,
  isVisibilityFixedSection,
  isOutsourcingFixedDisplaySection,
  isOutsourcingBreakdownRow,
  isRevenueManMonthRow,
  collectVisibilityCandidates,
} from '../config/visibilityConfig.js';
import {
  loadRowDisplayConfig,
  saveRowDisplayConfig,
  getRowDisplayEntry,
  setRowDisplayEntry,
} from '../config/rowDisplayConfig.js';
import {
  loadExpenseSortConfig,
  saveExpenseSortConfig,
  getExpenseAccountSortOrderDisplay,
  setExpenseAccountSortOrder,
  applyExpenseSortToPlanData,
} from '../config/expenseSortConfig.js';
import {
  loadSectionColorConfig,
  saveSectionColorConfig,
  applySectionColors,
  collectSectionColorDefs,
  getSectionBarColor,
  getSectionTextColor,
  getSectionColors,
  setSectionColorOverride,
  resetSectionColorOverride,
  resetSectionColorModeOverrides,
} from '../config/sectionColorConfig.js';
import {
  loadSectionFilterConfig,
  saveSectionFilterConfig,
  defaultSectionFilterState,
  normalizeSectionFilterConfig,
  isAllSectionFiltersEnabled,
  isSoloSectionFilter,
  sectionMatchesFilter,
  getPlanSectionFilterIds,
  isPlanSectionFilterTarget,
} from '../config/sectionFilterConfig.js';
import {
  loadUiColorConfig,
  saveUiColorConfig,
  getUiColors,
  getUiColorMode,
  getUiColorModeSetting,
  subscribeSystemColorMode,
  resetUiColorModeOverrides,
  applyUiColors,
  hexToRgba,
  opaqueHex,
} from '../config/uiColorConfig.js';
import {
  loadMonthDisplayConfig,
  saveMonthDisplayConfig,
  getMonthDisplayMode,
  getMonthDisplayClickHint,
  getSettingsLockedMonths,
  toggleMonthDisplayMode,
  buildBudgetActualMonthSets,
  isMonthDisplayToggleTarget,
} from '../config/monthDisplayConfig.js';
import { purgeClosedPeriodPlanStorage } from '../config/planPeriodCleanup.js';
import { enrichPlanDataWithEmployeeSalaryRows, isVariableOvertimePlanTableRow } from '../enrich/planEmployeeSalaryRows.js';
import { enrichPlanDataWithTaxPaymentRows, collectPaymentActualAmountsFromPlanData, collectResidentTaxActualByMunicipality, collectResidentTaxSubaccountsFromPlanData } from '../enrich/planTaxPaymentRows.js';
import { enrichPlanDataWithOutsourcingRows, collectOutsourcingSubaccountsFromPlanData, collectOutsourcingActualAmountsFromPlanData } from '../enrich/planOutsourcingRows.js';
import { enrichPlanDataWithRevenueRows } from '../enrich/planRevenueRows.js';
import { enrichPlanDataWithMiscIncomeRows } from '../enrich/planMiscIncomeRows.js';
import { enrichPlanDataWithPeriodAverageFills } from '../enrich/planPeriodAverageFill.js';
import { enrichPlanDataWithCashFlowOpeningInflow } from '../enrich/planCashFlowOpening.js';
import { enrichPlanDataWithCashFlowForecast } from '../enrich/planCashFlowForecast.js';
import {
  parseJournalEntries,
  findRelatedJournalEntries,
  isDrilldownAvailable,
  buildDrilldownTitle,
  formatEntryAmount,
  buildDrilldownIndex,
  hasDrilldownEntries,
} from '../parse/journalDrilldown.js';
import {
  loadEmployees,
  saveEmployees,
  mergeEmployees,
  createManualEmployee,
  formatEmployeeName,
  buildEmployeeTableColumns,
  getEmployeeCellValue,
  computeTenure,
  isActiveEmployee,
  isSalaryPlanEmployee,
  computeEmployeeAmountTotals,
  getEmployeeAmountTotalValue,
  isDirectorEmployee,
  getEmployeeResidentTaxMunicipality,
} from '../config/employeeConfig.js';
import {
  buildFiscalYearMonths,
  loadSalaryPlans,
  saveSalaryPlans,
  saveSalaryPlanSettings,
  setEmployeeSalaryPlan,
  getEmployeeSalaryPlan,
  parseSalaryPlanAmountInput,
  parseSalaryPlanAmountInputWithFillForward,
  formatSalaryPlanYen,
  computeSalaryPlanEmployeeTotal,
  computeSalaryPlanMonthlyTotals,
  loadSalaryPlanSettings,
  getBonusPaymentMonths,
  setBonusPaymentMonths,
  bonusPaymentMonthLabels,
  monthLabelToNumber,
  prunePeriodSalaryPlanBonuses,
  applyAmountFromMonthForward,
  applyAmountFromMonthForwardSkippingPast,
  salaryPlanAmountDiffersFromPrevious,
  sumMonthlyPlanTotal,
  computeSalaryIncreaseRate,
  formatSalaryIncreaseRate,
  getOvertimePlan,
  setOvertimePlan,
  sumOvertimePlanTotal,
  getTravelAllowancePerPerson,
  setTravelAllowancePerPerson,
  DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON,
  MAX_BONUS_COUNT,
} from '../config/salaryPlanConfig.js';
import {
  handlePlanAmountCellKeydown,
  resumePlanCellTabEdit,
  tagPlanEditableCell,
  tagPlanEditableRow,
} from '../config/planCellEdit.js';
import {
  loadTaxPaymentPlans,
  saveTaxPaymentPlans,
  getPaymentPlansForPeriod,
  setPaymentPlanAccount,
  PAYMENT_PLAN_SIMPLE_ACCOUNTS,
  RESIDENT_TAX_ACCOUNT,
  PAYMENT_PLAN_ACCOUNT_SECTION_LABELS,
  TAX_PAY_OTHER_PAY_TOTAL_LABEL,
  loadPaymentPlanSettings,
  getPaymentPlanYears,
  setPaymentPlanYears,
  buildPaymentPlanPeriodEntries,
  DEFAULT_PAYMENT_PLAN_YEARS,
  getResidentTaxMunicipalityEntries,
  setResidentTaxMunicipalityEntry,
  mergeResidentTaxMunicipalitiesFromNames,
  syncResidentTaxMunicipalitiesFromReference,
  collectResidentTaxMunicipalityNamesFromEmployees,
  filterVisibleResidentTaxMunicipalities,
  PLAN_TABLE_TAX_PAYMENT_NO_SUB_LABEL,
  PLAN_TABLE_TAX_PAYMENT_OTHER_ACCOUNT,
  PLAN_TABLE_TAX_PAYMENT_OTHER_PAY_EDITABLE_ACCOUNTS,
} from '../config/taxPaymentConfig.js';
import {
  loadExpensePlanOverrides,
  saveExpensePlanOverrides,
} from '../config/expensePlanOverrideConfig.js';
import { mountExpensePlanOverrideSection } from './expensePlanOverrideSettings.js';
import {
  loadOutsourcingPlans,
  saveOutsourcingPlans,
  getPeriodVendorEntries,
  getVendorEntry,
  setVendorEntry,
  removeVendorEntry,
  createManualVendor,
  mergeVendorsFromSubaccounts,
  syncVendorListFromReference,
} from '../config/outsourcingPlanConfig.js';
import {
  loadRevenuePlans,
  saveRevenuePlans,
  loadRevenuePlanSettings,
  getPeriodClientEntries,
  setClientEntry,
  getClientEntry,
  parseManMonthInput,
  formatManMonths,
  applyManMonthsFromMonthForward,
} from '../config/revenuePlanConfig.js';
import { mountRevenueSettingsPanel, refreshRevenueSettingsSectionTitles, applyRevenueSettingsMonthDisplayDom } from './revenueSettings.js';
import {
  createPlanMonthDisplayUi,
  createPlanAmountCellEditor,
  bindPlanSettingsScalableLayout,
  syncAllPlanSettingsTableColumnPlates,
  refreshPlanSettingsColumnPlates,
  measurePlanSettingsPageNaturalWidth,
  layoutPlanSettingsScalableWrap,
  buildEmployeePlanTableColgroup,
  layoutEmployeeSettingsTables,
  bindEmployeeSettingsLayout,
  applySectionFilterTitleStyle,
  measureElementIntrinsicWidth,
  planSettingsRemToPx,
} from './planSettingsTableUi.js';

let taxPaymentSettingsMonthDisplayApplier = null;
let outsourcingSettingsMonthDisplayApplier = null;
let employeeSettingsMonthDisplayApplier = null;

function applyTaxPaymentSettingsMonthDisplayDom() {
  taxPaymentSettingsMonthDisplayApplier?.();
}

function applyOutsourcingSettingsMonthDisplayDom() {
  outsourcingSettingsMonthDisplayApplier?.();
}

function applyEmployeeSettingsMonthDisplayDom() {
  employeeSettingsMonthDisplayApplier?.();
}
import { mountUiColorPanel } from './uiColorPanel.js';
import { createColorSettingsWindow } from './colorSettingsWindow.js';
import { parseEmployeeCsv } from '../parse/parseEmployee.js';
import { readCsvFile } from '../parse/parser.js';

function getPeriodOptions() {
  return {
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod: appSettings.fiscalPeriod,
  };
}

/** CSV が存在する期向けの読み込みオプション（来期・計画のみの期は今期にフォールバック） */
function getCsvLoadPeriodOptions() {
  const { businessStartYear, fiscalPeriod } = appSettings;
  if (isPlanOnlyPeriod(businessStartYear, fiscalPeriod)) {
    return {
      businessStartYear,
      fiscalPeriod: getFiscalPeriodForDate(businessStartYear),
    };
  }
  return getPeriodOptions();
}

function getMonthYear() {
  return buildMonthYearMap(appSettings.businessStartYear, appSettings.fiscalPeriod);
}

function shouldHighlightCurrentMonth() {
  return getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    appSettings.fiscalPeriod,
  ) === 'budget-actual';
}

function getHighlightFiscalMonth(date = new Date()) {
  if (!shouldHighlightCurrentMonth()) return null;
  return getCurrentFiscalMonthLabel(
    appSettings.businessStartYear,
    appSettings.fiscalPeriod,
    FISCAL_MONTHS,
    date,
  );
}

const SETTLEMENT_FISCAL_MONTH = '決算整理';

function planTableMonthHighlightClass(month, highlightFiscalMonth) {
  if (month === SETTLEMENT_FISCAL_MONTH) return ' settlement-month';
  if (month === highlightFiscalMonth) return ' current-month';
  return '';
}

function syncPlanTableMonthHighlightClasses(el, month, highlightFiscalMonth) {
  if (!el) return;
  el.classList.toggle('settlement-month', month === SETTLEMENT_FISCAL_MONTH);
  el.classList.toggle(
    'current-month',
    month !== SETTLEMENT_FISCAL_MONTH && month === highlightFiscalMonth,
  );
}

function syncPlanTableHeaderMonthHighlights(table, highlightFiscalMonth) {
  const yearThs = table.querySelectorAll('thead .year-row th.col-amount-month');
  const monthThs = table.querySelectorAll('thead .month-row th.col-amount-month');
  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const month = FISCAL_MONTHS[mi];
    syncPlanTableMonthHighlightClasses(yearThs[mi], month, highlightFiscalMonth);
    syncPlanTableMonthHighlightClasses(monthThs[mi], month, highlightFiscalMonth);
  }
}

/** ダッシュボードの表示期間（from === to のとき単期表示） */
let dashboardPeriodRange = {
  from: 1,
  to: 1,
};
/** 複数期オーバーライド中はヘッダー期表示を一時的に差し替える */
const PLAN_PERIOD_OVERRIDE_LABEL = '－';

function isDashboardMultiPeriodView() {
  return dashboardPeriodRange.from !== dashboardPeriodRange.to;
}

function resetDashboardPeriodRange() {
  const period = appSettings.fiscalPeriod;
  dashboardPeriodRange.from = period;
  dashboardPeriodRange.to = period;
}

function getDashboardPeriodData(period) {
  if (period === appSettings.fiscalPeriod && data) return data;
  try {
    const cached = planDataFromCache(expandConfig, {
      businessStartYear: appSettings.businessStartYear,
      fiscalPeriod: period,
    });
    if (cached?.data) return applyPlanColors(cached.data, period);
  } catch {
    /* ignore */
  }
  // 来期など CSV 未用意の計画期は、テンプレートから計画データを組み立てる
  if (isPlanOnlyPeriod(appSettings.businessStartYear, period)) {
    return buildPlanOnlyPeriodDashboardData(period);
  }
  return null;
}

/** ダッシュボード用に、CSV なしの計画期データを生成する（グローバル状態は変更しない） */
function buildPlanOnlyPeriodDashboardData(period) {
  const template = rawPlanData
    ? zeroOutPlanData(rawPlanData)
    : buildFullPlan('', null, expandConfig);
  return applyPlanColors(template, period);
}

function getDashboardCachedPeriodData(period) {
  if (period < 1) return null;
  if (period === appSettings.fiscalPeriod) return data;
  try {
    const cached = planDataFromCache(expandConfig, {
      businessStartYear: appSettings.businessStartYear,
      fiscalPeriod: period,
    });
    return cached?.data ? applyPlanColors(cached.data, period) : null;
  } catch {
    return null;
  }
}

function setDashboardPeriodRange(from, to) {
  const max = getDashboardMaxPeriod();
  let rangeFrom = Math.min(max, Math.max(1, from));
  let rangeTo = Math.min(max, Math.max(1, to));
  if (rangeFrom > rangeTo) {
    const swap = rangeFrom;
    rangeFrom = rangeTo;
    rangeTo = swap;
  }
  if (
    dashboardPeriodRange.from === rangeFrom
    && dashboardPeriodRange.to === rangeTo
  ) {
    return;
  }
  dashboardPeriodRange.from = rangeFrom;
  dashboardPeriodRange.to = rangeTo;

  const singlePeriod = rangeFrom === rangeTo;
  if (
    activeTab === 'dashboard'
    && singlePeriod
    && rangeFrom !== appSettings.fiscalPeriod
  ) {
    setFiscalPeriod(rangeFrom);
    return;
  }

  syncPeriodControls();
  if (activeTab === 'dashboard') renderDashboardView();
  else refreshPlanKpi();
}

function getDashboardMaxPeriod() {
  // ヘッダーと同じく計画期（来期）も含める。CSV が無くても計画データで表示する
  return getMaxSelectablePeriod(appSettings.businessStartYear);
}

function getPeriodSelectElements() {
  return {
    menu: document.getElementById('plan-period-menu'),
    trigger: document.getElementById('plan-period-select-trigger'),
    panel: document.getElementById('plan-period-select-panel'),
  };
}

function getPeriodSelectItems() {
  const { panel } = getPeriodSelectElements();
  if (!panel) return [];
  return [...panel.querySelectorAll('.plan-period-select-item')];
}

function isPeriodSelectOpen() {
  const { panel } = getPeriodSelectElements();
  return panel != null && !panel.hidden;
}

function closePeriodSelect({ returnFocus = false } = {}) {
  const { trigger, panel } = getPeriodSelectElements();
  if (!trigger || !panel) return;
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (returnFocus) trigger.focus();
}

function openPeriodSelect({ focusCurrent = false } = {}) {
  closeMainMenu();
  const { trigger, panel } = getPeriodSelectElements();
  if (!trigger || !panel) return;
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  if (focusCurrent) {
    const current = panel.querySelector('[aria-selected="true"]');
    (current ?? panel.querySelector('.plan-period-select-item'))?.focus();
  }
}

function buildPeriodSelectPanel() {
  const { panel } = getPeriodSelectElements();
  if (!panel) return;

  const maxPeriod = getMaxSelectablePeriod(appSettings.businessStartYear);
  const existing = getPeriodSelectItems();
  if (
    existing.length === maxPeriod
    && existing.every((btn) => btn.dataset.period)
  ) {
    refreshPeriodSelectPanelSelection();
    return;
  }

  panel.replaceChildren();

  for (let p = 1; p <= maxPeriod; p += 1) {
    const label = formatFiscalPeriodLabel(p);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plan-main-menu-item plan-period-select-item';
    btn.role = 'option';
    btn.dataset.period = String(p);
    btn.setAttribute(
      'aria-selected',
      p === appSettings.fiscalPeriod ? 'true' : 'false',
    );

    const labelSpan = document.createElement('span');
    labelSpan.className = 'plan-main-menu-item-label';
    labelSpan.textContent = label;
    btn.appendChild(labelSpan);

    btn.addEventListener('mousedown', (e) => {
      // フォーカス移動によるパネル閉鎖を防ぎ、クリックで確実に選択させる
      e.preventDefault();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePeriodSelect({ returnFocus: true });
      setFiscalPeriod(p);
    });

    panel.appendChild(btn);
  }
}

function refreshPeriodSelectPanelSelection() {
  for (const btn of getPeriodSelectItems()) {
    const period = Number(btn.dataset.period);
    if (!period) continue;
    btn.setAttribute(
      'aria-selected',
      period === appSettings.fiscalPeriod ? 'true' : 'false',
    );
  }
}

function focusPeriodSelectItemByOffset(items, currentIndex, offset) {
  if (!items.length) return;
  const base = currentIndex < 0 ? (offset > 0 ? -1 : 0) : currentIndex;
  const next = (base + offset + items.length) % items.length;
  items[next].focus();
}

function handlePeriodSelectPanelKeydown(e) {
  const { panel } = getPeriodSelectElements();
  if (!panel || panel.hidden) return;

  const items = getPeriodSelectItems();
  if (!items.length) return;

  const currentIndex = items.indexOf(document.activeElement);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusPeriodSelectItemByOffset(items, currentIndex, 1);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusPeriodSelectItemByOffset(items, currentIndex, -1);
    return;
  }
  if (e.key === 'Home') {
    e.preventDefault();
    items[0].focus();
    return;
  }
  if (e.key === 'End') {
    e.preventDefault();
    items[items.length - 1].focus();
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (currentIndex >= 0) items[currentIndex].click();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closePeriodSelect({ returnFocus: true });
  }
}

function syncPeriodControls() {
  const { trigger } = getPeriodSelectElements();
  const prevBtn = document.getElementById('plan-period-prev');
  const nextBtn = document.getElementById('plan-period-next');
  const modeEl = document.getElementById('plan-period-mode');
  if (!trigger) return;

  const maxPeriod = getMaxSelectablePeriod(appSettings.businessStartYear);
  const showPeriodOverride = activeTab === 'dashboard' && isDashboardMultiPeriodView();
  trigger.textContent = showPeriodOverride
    ? PLAN_PERIOD_OVERRIDE_LABEL
    : formatFiscalPeriodLabel(appSettings.fiscalPeriod);

  if (isPeriodSelectOpen()) {
    refreshPeriodSelectPanelSelection();
  } else {
    buildPeriodSelectPanel();
  }

  if (prevBtn) prevBtn.disabled = appSettings.fiscalPeriod <= 1;
  if (nextBtn) nextBtn.disabled = appSettings.fiscalPeriod >= maxPeriod;

  if (modeEl) {
    modeEl.style.display = '';
    const mode = getFiscalPeriodDisplayMode(
      appSettings.businessStartYear,
      appSettings.fiscalPeriod,
    );
    modeEl.textContent = getFiscalPeriodDisplayModeLabel(mode);
    modeEl.className = `plan-period-mode plan-period-mode--${mode}`;
  }
}

async function setFiscalPeriod(nextPeriod) {
  const maxPeriod = getMaxSelectablePeriod(appSettings.businessStartYear);
  const clamped = Math.min(maxPeriod, Math.max(1, nextPeriod));
  const wasMultiPeriod = activeTab === 'dashboard' && isDashboardMultiPeriodView();
  if (clamped === appSettings.fiscalPeriod) {
    // 複数期オーバーライド中に同一期を選んだら、単期表示へ戻す
    if (wasMultiPeriod) {
      const dashboardMax = getDashboardMaxPeriod();
      const rangePeriod = Math.min(dashboardMax, clamped);
      dashboardPeriodRange.from = rangePeriod;
      dashboardPeriodRange.to = rangePeriod;
      syncPeriodControls();
      renderDashboardView();
      return;
    }
    syncPeriodControls();
    return;
  }

  appSettings = { ...appSettings, fiscalPeriod: clamped };
  // ダッシュボード表示中にヘッダーで期を選んだら、期間プルダウンもその単期に合わせる
  if (activeTab === 'dashboard') {
    const dashboardMax = getDashboardMaxPeriod();
    const rangePeriod = Math.min(dashboardMax, clamped);
    dashboardPeriodRange.from = rangePeriod;
    dashboardPeriodRange.to = rangePeriod;
  }
  saveAppSettings(appSettings);
  syncPeriodControls();

  if (activeTab === 'settings') {
    syncPlanDataToCurrentPeriod();
    renderOtherSettings();
    return;
  }

  if (activeTab === 'employees') {
    syncPlanDataToCurrentPeriod();
    renderEmployeeSettings();
    return;
  }

  if (activeTab === 'orders') {
    syncPlanDataToCurrentPeriod();
    renderRevenueSettings();
    return;
  }

  if (activeTab === 'taxpayments') {
    syncPlanDataToCurrentPeriod();
    renderTaxPaymentSettings();
    return;
  }

  if (activeTab === 'outsourcing') {
    syncPlanDataToCurrentPeriod();
    renderOutsourcingSettings();
    return;
  }

  if (isPlanOnlyPeriod(appSettings.businessStartYear, clamped)) {
    showPlanLoadingOverlay({ awaitLayout: true });
    loadPlanOnlyPeriodData({ measureColumnWidths: true });
    return;
  }

  if (!rawPlanData) {
    renderView();
    return;
  }

  try {
    const cached = planDataFromCache(expandConfig, getPeriodOptions());
    if (cached) {
      showPlanLoadingOverlay({ awaitLayout: true });
      loadData(cached, { measureColumnWidths: true });
      return;
    }
  } catch (err) {
    renderCsvLoadScreen(err instanceof Error ? err.message : 'CSV の読み込みに失敗しました。');
    return;
  }

  showPlanLoadingOverlay({ awaitLayout: true });

  try {
    const loaded = await reloadPlanDataFromSavedFolder(expandConfig, getPeriodOptions());
    loadData(loaded, { measureColumnWidths: true });
  } catch (err) {
    cancelPlanLoadingOverlay();
    if (err?.code === 'NEEDS_PERMISSION' && err.handle) {
      renderFolderAccessScreen(err.folderName ?? err.handle.name, err.handle);
      return;
    }
    renderCsvLoadScreen(err instanceof Error ? err.message : 'CSV の読み込みに失敗しました。');
  }
}

function bindPeriodControls() {
  const { menu, trigger, panel } = getPeriodSelectElements();
  const prevBtn = document.getElementById('plan-period-prev');
  const nextBtn = document.getElementById('plan-period-next');

  syncPeriodControls();

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPeriodSelectOpen()) {
      closePeriodSelect();
      return;
    }
    openPeriodSelect({ focusCurrent: true });
  });

  panel?.addEventListener('keydown', handlePeriodSelectPanelKeydown);

  document.addEventListener('click', (e) => {
    if (menu && !menu.contains(e.target)) closePeriodSelect();
  });

  prevBtn?.addEventListener('click', () => {
    setFiscalPeriod(appSettings.fiscalPeriod - 1);
  });
  nextBtn?.addEventListener('click', () => {
    setFiscalPeriod(appSettings.fiscalPeriod + 1);
  });
}

function bindDashboardButton() {
  const btn = document.getElementById('plan-dashboard-btn');
  btn?.addEventListener('click', () => {
    if (activeTab === 'dashboard' || isSettingsMainTab(activeTab)) {
      switchMainTab('plan');
      return;
    }
    switchMainTab('dashboard');
  });
}

function initColorSettingsWindow() {
  colorSettingsWindow = createColorSettingsWindow({
    mountContent: (container) => {
      container.appendChild(buildColorSettingsContent());
    },
    onOpenChange: () => {
      syncMainMenuChecks();
    },
  });
}

function openColorSettingsWindow() {
  colorSettingsWindow?.open();
}

const MAIN_VIEW_TABS = new Set(['plan', 'dashboard']);

function isSettingsMainTab(tab) {
  return !MAIN_VIEW_TABS.has(tab);
}

let rawPlanData = null;
let data = null;
let journalText = null;
let bsText = null;
let generalLedgerText = null;
let generalLedgerName = null;
let sectionFilterConfig = {};
let activeTab = 'plan';
let colorSettingsWindow = null;
let csvGateActive = false;
let expandConfig = loadExpandConfig();
let visibilityConfig = loadVisibilityConfig();
let rowDisplayConfig = loadRowDisplayConfig();
let expenseSortConfig = loadExpenseSortConfig();
let sectionColorConfig = loadSectionColorConfig();

function getPlanColorMode() {
  return getUiColorMode(uiColorConfig);
}
let uiColorConfig = loadUiColorConfig();
let csvNameConfig = loadCsvNameConfig();
let appSettings = loadAppSettings();
let employees = loadEmployees();
let salaryPlans = loadSalaryPlans();
let salaryPlanSettings = loadSalaryPlanSettings();
let taxPaymentPlans = loadTaxPaymentPlans();
let paymentPlanSettings = loadPaymentPlanSettings();
let expensePlanOverrides = loadExpensePlanOverrides();
let outsourcingPlans = loadOutsourcingPlans();
let revenuePlans = loadRevenuePlans();
let revenuePlanSettings = loadRevenuePlanSettings();
let monthDisplayConfig = loadMonthDisplayConfig();
applyClosedPeriodPlanPurgeIfNeeded();
let employeeTenureTimerId = null;
let journalEntriesCache = null;
let drilldownIndex = null;
let journalPopupEl = null;
const expandedGroups = new Set();
const rowHoverPlateControllers = new WeakMap();
const editableCellHoverPlateControllers = new WeakMap();
const planColumnPlateControllers = new WeakMap();
const rowSelectionPlateControllers = new WeakMap();
const rowContextMenuControllers = new WeakMap();
const expandSettingsContextMenuControllers = new WeakMap();
const planTableColumnWidthControllers = new WeakMap();
let activePlanTableColumnWidthAbort = null;
let rowContextMenuEl = null;
let rowContextMenuCleanup = null;
/** 予実表の複数行選択（visibilityRowKey の Set） */
const selectedPlanRowKeys = new Set();
/** Shift+クリック範囲選択の起点 */
let selectionAnchorRowKey = null;

let planLoadingVisible = false;
let planLoadingAwaitLayout = false;
let planLoadingOverlayEl = null;
let planLoadingHideTimer = null;
let planLoadingFinishTimer = null;
let planLoadingShownAt = 0;
const PLAN_LOADING_MIN_DISPLAY_MS = 150;
/** 予実表を一度でも列幅確定まで表示済みなら true（以降の読み込みは列幅待ちしない） */
let planTableInitialLayoutDone = false;
/** 設定タブ表示中に破棄した表の列幅（復帰時の再計測を省略） */
let lastPlanTableColumnWidths = null;
/** 列幅キャッシュと対になるコンテンツフィット倍率（復帰時にフォントと列幅の整合を保つ） */
let lastPlanTableContentFitScale = 1;
/** 上記倍率を確定したときのレイアウト幅（ダッシュボード表示中のリサイズ追従の基準） */
let lastPlanTableFitViewportWidth = null;
/** 上記倍率を確定したときの viewport 倍率 */
let lastPlanTableFitViewportScale = 1;
/** フォント・余白変更など列幅の再計測が必要なとき true */
let planTableLayoutInvalidated = false;

/** content fit 倍率とその計測時のウィンドウ状態をまとめて記録する */
function capturePlanTableContentFitBaseline() {
  lastPlanTableContentFitScale = getContentFitScale();
  lastPlanTableFitViewportWidth = getLayoutViewportWidth();
  lastPlanTableFitViewportScale = getViewportScale() || 1;
}

const root = document.getElementById('plan-root');
const planBody = () => document.querySelector('.plan-body');

function resetPlanBodyScroll() {
  const body = planBody();
  if (!body) return;
  body.scrollTop = 0;
  body.scrollLeft = 0;
}
const mainTabs = document.getElementById('plan-main-tabs');
const toolbar = document.getElementById('plan-toolbar');
const kpiMainEl = document.getElementById('plan-kpi-main');
const kpiSubEl = document.getElementById('plan-kpi-sub');

function formatKpiRate(value) {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)}%`;
}

function formatKpiMultiple(value) {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)}倍`;
}

function resolveDashboardKpiMetrics() {
  if (isDashboardMultiPeriodView()) {
    const allPeriodDatas = buildDashboardPeriodRangeDatas(
      dashboardPeriodRange.from,
      dashboardPeriodRange.to,
    );
    if (allPeriodDatas.length) {
      return calcPlanKpiMetricsAllPeriods(allPeriodDatas, buildPlanKpiOptions);
    }
  }
  const viewPeriod = dashboardPeriodRange.from;
  const viewData = getDashboardPeriodData(viewPeriod);
  if (!viewData) return null;
  return calcPlanKpiMetrics(viewData, buildPlanKpiOptions(viewPeriod));
}

function refreshPlanKpi() {
  if (activeTab === 'dashboard') {
    setPlanKpi(resolveDashboardKpiMetrics());
    return;
  }
  if (data) setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));
  else setPlanKpi(null);
}

function buildPlanKpiOptions(fiscalPeriod = appSettings.fiscalPeriod) {
  const active = employees.filter(isSalaryPlanEmployee);
  if (active.length === 0) return {};
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const directorCount = active
    .filter(isDirectorEmployee)
    .filter((emp) => {
      const plan = getEmployeeSalaryPlan(
        salaryPlans,
        fiscalPeriod,
        emp.id,
        emp,
        fiscalMonths,
      );
      return computeSalaryPlanEmployeeTotal(plan, fiscalMonths) > 0;
    })
    .length;
  return {
    directorCount,
    staffCount: active.filter((emp) => !isDirectorEmployee(emp)).length,
  };
}

function createKpiItem(label, valueText, tooltipKey, className, numericValue = null) {
  const span = document.createElement('span');
  span.className = className;
  span.title = getPlanKpiTooltip(tooltipKey, numericValue);
  span.textContent = `${label} ${valueText}`;
  return span;
}

function setPlanKpi(metrics) {
  if (!kpiMainEl || !kpiSubEl) return;
  if (metrics === null || metrics === undefined) {
    kpiMainEl.replaceChildren();
    kpiMainEl.textContent = '—';
    kpiSubEl.replaceChildren();
    kpiMainEl.classList.remove('plan-kpi-negative');
    return;
  }
  const margin = metrics.profitMargin;
  kpiMainEl.replaceChildren();
  kpiMainEl.appendChild(createKpiItem(
    '総利益率',
    margin != null ? formatKpiRate(margin) : '—',
    'profitMargin',
    'plan-kpi-main-item',
    margin,
  ));
  kpiMainEl.classList.toggle('plan-kpi-negative', margin != null && margin < 0);

  kpiSubEl.replaceChildren();
  const subItems = [
    ['労働分配率', formatKpiRate(metrics.laborShareRate), 'laborShareRate', metrics.laborShareRate],
    ['役員労働分配率', formatKpiRate(metrics.directorLaborShareRate), 'directorLaborShareRate', metrics.directorLaborShareRate],
    ['社員労働分配率', formatKpiRate(metrics.staffLaborShareRate), 'staffLaborShareRate', metrics.staffLaborShareRate],
    ['格差倍率', formatKpiMultiple(metrics.payGapRatio), 'payGapRatio', metrics.payGapRatio],
  ];
  subItems.forEach(([label, value, tooltipKey, numericValue], index) => {
    if (index > 0) {
      const sep = document.createElement('span');
      sep.className = 'plan-kpi-sep';
      sep.textContent = ' / ';
      sep.setAttribute('aria-hidden', 'true');
      kpiSubEl.appendChild(sep);
    }
    kpiSubEl.appendChild(createKpiItem(label, value, tooltipKey, 'plan-kpi-sub-item', numericValue));
  });
}

function cachePlanTableColumnWidthsFromDom() {
  const table = root.querySelector('.plan-table');
  if (!table) return;
  lastPlanTableColumnWidths = readPlanTableColumnWidths(table);
  capturePlanTableContentFitBaseline();
}

function shouldShowPlanLoadingOnTabReturn() {
  if (!data) return true;
  if (!planTableInitialLayoutDone) return true;
  if (planTableLayoutInvalidated) return true;
  if (!hasStoredPlanTableColumnWidths(lastPlanTableColumnWidths)) return true;
  return false;
}

function invalidatePlanTableLayout() {
  planTableLayoutInvalidated = true;
}

function ensurePlanLoadingOverlay() {
  if (planLoadingOverlayEl) return planLoadingOverlayEl;
  const el = document.createElement('div');
  el.className = 'plan-loading-overlay';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-busy', 'true');
  el.innerHTML = `
    <div class="plan-loading-overlay-panel">
      <span class="plan-loading-overlay-text">読み込み中</span><span class="plan-loading-overlay-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
    </div>
  `;
  document.body.appendChild(el);
  planLoadingOverlayEl = el;
  return el;
}

function showPlanLoadingOverlay({ awaitLayout = false } = {}) {
  if (awaitLayout) planLoadingAwaitLayout = true;
  if (planLoadingHideTimer != null) {
    clearTimeout(planLoadingHideTimer);
    planLoadingHideTimer = null;
  }
  if (planLoadingFinishTimer != null) {
    clearTimeout(planLoadingFinishTimer);
    planLoadingFinishTimer = null;
  }
  planLoadingShownAt = Date.now();
  planLoadingVisible = true;
  const el = ensurePlanLoadingOverlay();
  el.classList.remove('plan-loading-overlay--hiding');
  el.classList.add('plan-loading-overlay--visible');
  el.setAttribute('aria-busy', 'true');
}

function hidePlanLoadingOverlay() {
  if (!planLoadingVisible) return;
  planLoadingVisible = false;
  const el = planLoadingOverlayEl;
  if (!el) return;
  el.classList.remove('plan-loading-overlay--visible');
  el.classList.add('plan-loading-overlay--hiding');
  el.setAttribute('aria-busy', 'false');
  planLoadingHideTimer = setTimeout(() => {
    el.remove();
    planLoadingOverlayEl = null;
    planLoadingHideTimer = null;
  }, 380);
}

function cancelPlanLoadingOverlay() {
  planLoadingAwaitLayout = false;
  if (planLoadingFinishTimer != null) {
    clearTimeout(planLoadingFinishTimer);
    planLoadingFinishTimer = null;
  }
  hidePlanLoadingOverlay();
}

function finishPlanLoadingAfterLayout() {
  if (!planLoadingAwaitLayout) return;
  if (planLoadingFinishTimer != null) return;
  const waitMs = Math.max(0, PLAN_LOADING_MIN_DISPLAY_MS - (Date.now() - planLoadingShownAt));
  planLoadingFinishTimer = setTimeout(() => {
    planLoadingFinishTimer = null;
    if (!planLoadingAwaitLayout) return;
    planLoadingAwaitLayout = false;
    hidePlanLoadingOverlay();
  }, waitMs);
}

function formatAmount(value, rowType) {
  if (value === undefined || value === null || value === 0) {
    return '';
  }
  const abs = formatYen(Math.abs(value));
  const negative = value < 0;
  const cls = negative ? ' amount-negative' : '';
  if (rowType === 'variance') {
    const sign = value > 0 ? '+' : negative ? '-' : '';
    const prefix = sign
      ? `<span class="amount-prefix">${sign}¥</span>`
      : '';
    const prefixCls = sign ? ' amount-has-prefix' : '';
    return `<span class="amount-yen amount-variance${cls}${prefixCls}">${prefix}${abs}</span>`;
  }
  if (negative) {
    return `<span class="amount-yen amount-negative amount-has-prefix"><span class="amount-prefix">-¥</span>${abs}</span>`;
  }
  return `<span class="amount-yen">${abs}</span>`;
}

function isPlanAmountHighlightMonth(displayMode, monthLabel, pastMonthSet) {
  if (displayMode === 'actual') return false;
  if (displayMode === 'budget-actual' && pastMonthSet.has(monthLabel)) return false;
  return true;
}

/** 給与計画と同様: 期首月は常に差異色、以降は前月比（過去実績月は対象外） */
function shouldHighlightPlanAmountMonth(rowValues, monthIndex, displayMode, pastMonthSet) {
  if (monthIndex < 0) return false;
  const month = FISCAL_MONTHS[monthIndex];
  if (month === '決算整理') return false;
  if (!isPlanAmountHighlightMonth(displayMode, month, pastMonthSet)) return false;
  if (monthIndex === 0) return true;
  const prevMonth = FISCAL_MONTHS[monthIndex - 1];
  if (prevMonth === '決算整理') return false;
  return salaryPlanAmountDiffersFromPrevious(rowValues[prevMonth], rowValues[month]);
}

/** 給与設定の個別給与と同様: 期首月は常に差異色、以降は前月比 */
function shouldHighlightActualMonthDeltaFromPrevious(rowValues, monthIndex) {
  if (monthIndex < 0) return false;
  const month = FISCAL_MONTHS[monthIndex];
  if (month === '決算整理') return false;
  if (monthIndex === 0) return true;
  const prevMonth = FISCAL_MONTHS[monthIndex - 1];
  if (prevMonth === '決算整理') return false;
  return salaryPlanAmountDiffersFromPrevious(rowValues[prevMonth], rowValues[month]);
}

function shouldHighlightMonthDeltaFromPrevious(section, row, monthIndex, displayMode, pastMonthSet) {
  if (monthIndex < 0 || row.type === 'variance' || row.type === 'sub-variance' || row.type === 'warningSummary') {
    return false;
  }
  if (row.type === 'plan' || row.type === 'man-month') {
    return !isTaxPublicChargeRow(row) && shouldHighlightPlanAmountMonth(row.values, monthIndex, displayMode, pastMonthSet);
  }
  if (section.id === 'personnel' && isOvertimePlanRowEditable(section, row)) {
    if (displayMode === 'plan' || displayMode === 'budget-actual') {
      return shouldHighlightPlanAmountMonth(row.values, monthIndex, displayMode, pastMonthSet);
    }
    return shouldHighlightActualMonthDeltaFromPrevious(row.values, monthIndex);
  }
  if (section.id === 'revenue') {
    if (row.type === 'item' || row.type === 'sub' || row.type === 'group') {
      if (displayMode === 'plan' || displayMode === 'budget-actual') {
        return shouldHighlightPlanAmountMonth(row.values, monthIndex, displayMode, pastMonthSet);
      }
      return shouldHighlightActualMonthDeltaFromPrevious(row.values, monthIndex);
    }
  }
  return false;
}

function isTaxPublicChargeRow(row) {
  return /^租税公課/.test(row.label ?? '');
}

function sectionUsesCategoryCell(section) {
  return Boolean(section.label) && !section.hideCategory;
}

function countCategoryRowSpan(section, visibleRows) {
  const rows = section.categorySpanExcludesTotal
    ? visibleRows.filter((r) => r.type !== 'total' && r.type !== 'warningSummary')
    : visibleRows;
  return rows.length;
}

function isCategoryColumnCoveredByRowSpan(sectionRowIndex, categoryRowSpan, usesCategoryCell, sectionCellAdded) {
  return usesCategoryCell
    && sectionCellAdded
    && sectionRowIndex > 0
    && sectionRowIndex < categoryRowSpan;
}

/** 区分列を常に1列分確保し、列ズレを防ぐ */
function appendPlanTableCategoryCell(tr, {
  section,
  sectionRowIndex,
  categoryRowSpan,
  usesCategoryCell,
  sectionCellAdded,
}) {
  if (isCategoryColumnCoveredByRowSpan(sectionRowIndex, categoryRowSpan, usesCategoryCell, sectionCellAdded)) {
    return sectionCellAdded;
  }

  if (usesCategoryCell && sectionRowIndex === 0 && categoryRowSpan > 0) {
    const category = document.createElement('td');
    category.className = 'col-category';
    category.rowSpan = categoryRowSpan;
    appendSectionCategoryLabel(category, section);
    tr.appendChild(category);
    return true;
  }

  const category = document.createElement('td');
  category.className = 'col-category col-category-placeholder';
  tr.appendChild(category);
  return sectionCellAdded;
}

/** 列内容に合わせた幅（空セル除外・計測モード中の scrollWidth） */
function maxPlanCellScrollWidth(cells) {
  let max = 0;
  for (const cell of cells) {
    const hasContent = cell.textContent.trim()
      || cell.querySelector('.amount-yen, .row-toggle, button');
    if (!hasContent) continue;
    max = Math.max(max, measurePlanCellContentWidth(cell));
  }
  return max;
}

function cellHorizontalPadding(cell) {
  const style = getComputedStyle(cell);
  return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
}

function readPlanTableScale(table, varName, fallback = 1) {
  const raw = getComputedStyle(table).getPropertyValue(varName).trim();
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 金額セル：.amount-yen の実幅 + padding（scrollWidth より詰めて計測） */
function maxAmountCellScrollWidth(cells) {
  let max = 0;
  for (const cell of cells) {
    const yen = cell.querySelector('.amount-yen');
    if (yen) {
      max = Math.max(max, Math.ceil(yen.getBoundingClientRect().width + cellHorizontalPadding(cell)));
      continue;
    }
    if (!cell.textContent.trim()) continue;
    max = Math.max(max, Math.ceil(cell.scrollWidth));
  }
  return max;
}

function appendPlanTableColgroup(table) {
  const colgroup = document.createElement('colgroup');
  for (const cls of ['col-category', 'col-label', 'col-sub']) {
    const col = document.createElement('col');
    col.className = cls;
    colgroup.appendChild(col);
  }
  for (let i = 0; i < FISCAL_MONTHS.length; i += 1) {
    const col = document.createElement('col');
    col.className = 'col-amount-month';
    colgroup.appendChild(col);
  }
  for (let i = 0; i < EXTRA_COLUMNS.length; i += 1) {
    const col = document.createElement('col');
    col.className = 'col-amount-extra';
    colgroup.appendChild(col);
  }
  table.appendChild(colgroup);
}

function measurePlanCellContentWidth(cell) {
  if (!cell) return 0;
  return Math.max(Math.ceil(cell.scrollWidth), Math.ceil(cell.getBoundingClientRect().width));
}

function syncPlanTableStickyColumnOffsets(table) {
  const catW = parseFloat(getComputedStyle(table).getPropertyValue('--plan-col-category-w')) || 0;
  const labelW = parseFloat(getComputedStyle(table).getPropertyValue('--plan-col-label-w')) || 0;
  table.style.setProperty('--plan-col-label-left', `${catW}px`);
  table.style.setProperty('--plan-col-sub-left', `${catW + labelW}px`);
}

function readPlanTableColumnWidths(table) {
  const style = getComputedStyle(table);
  const read = (varName) => {
    const n = parseFloat(style.getPropertyValue(varName));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    categoryW: read('--plan-col-category-w'),
    labelW: read('--plan-col-label-w'),
    subW: read('--plan-col-sub-w'),
    monthW: read('--plan-col-amount-month-w'),
    extraW: read('--plan-col-amount-extra-w'),
  };
}

function hasStoredPlanTableColumnWidths(widths) {
  if (!widths) return false;
  return widths.categoryW > 0
    || widths.labelW > 0
    || widths.subW > 0
    || widths.monthW > 0
    || widths.extraW > 0;
}

function applyPreservedPlanTableColumnWidths(table, widths) {
  if (!hasStoredPlanTableColumnWidths(widths)) return false;
  let fitted = { ...widths };
  const availableW = getPlanTableAvailableWidth(table);
  fitted = shrinkPlanTableFlexColumnsToFit(table, fitted, availableW);
  if (planTableOverflowsWrapContent(table)) {
    fitted = shrinkPlanTableFlexColumnsToFit(table, fitted, availableW - 1);
  }
  applyPlanTableColumnWidths(table, fitted);
  return true;
}

/** 列幅を内容から再計測する（期変更・初回表示・フォント変更など明示時のみ） */
function measurePlanTableColumnWidths(table, { onSettled, beforeMeasure } = {}) {
  if (!table?.isConnected) {
    onSettled?.();
    return;
  }
  const wrap = table.closest('.plan-table-wrap');
  if (wrap) bindPlanTableColumnWidthSync(wrap, table);
  schedulePlanTableLayout(table, { onSettled, beforeMeasure });
}

/** フォント読み込みと描画確定を待ってから 1 回だけレイアウトする（ループなし） */
async function schedulePlanTableLayout(table, { onSettled, beforeMeasure } = {}) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  if (!table.isConnected) {
    onSettled?.();
    return;
  }

  beforeMeasure?.();
  layoutPlanTableSinglePass(table);
  onSettled?.();
}

function getPlanTableWrapContentWidth(wrap) {
  if (!wrap?.isConnected) return 0;
  const style = getComputedStyle(wrap);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  return Math.max(0, wrap.clientWidth - padL - padR);
}

function sumPlanTableColumnWidths(widths, monthCount, extraCount) {
  return widths.categoryW + widths.labelW + widths.subW
    + monthCount * widths.monthW + extraCount * widths.extraW;
}

/** 予実表の横方向に使える幅（wrap のコンテンツボックス。表幅ではなく親を基準にする） */
function getPlanTableAvailableWidth(table) {
  const wrap = table?.closest('.plan-table-wrap');
  return getPlanTableWrapContentWidth(wrap);
}

function planTableOverflowsWrapContent(table) {
  const wrap = table?.closest('.plan-table-wrap');
  if (!wrap || !table?.isConnected) return false;
  const style = getComputedStyle(wrap);
  const padR = parseFloat(style.paddingRight) || 0;
  const contentRight = wrap.getBoundingClientRect().right - padR;
  return table.getBoundingClientRect().right > contentRight + 0.5;
}

function applyPlanDisplayScales() {
  applyFontScale(appSettings.fontScale);
  applyRowPaddingScale(appSettings.rowPaddingScale);
}

/**
 * 1 回の計測で最適なフォント倍率と列幅を同時に確定する。
 * 文字幅・padding（rem 基準）はフォント倍率にほぼ比例するため、
 * 「自然幅 : 使える幅」の比率だけで最適倍率が一発で決まり、再計測ループが不要。
 */
function layoutPlanTableSinglePass(table) {
  if (!table?.isConnected) return;

  applyPlanDisplayScales();
  const baseScale = getContentFitScale();
  const measured = measureNaturalPlanTableColumnWidths(table);
  const { monthCount, extraCount } = countPlanTableFlexibleColumns(table);
  const naturalW = sumPlanTableColumnWidths(measured, monthCount, extraCount);
  const availableW = getPlanTableAvailableWidth(table);

  if (naturalW <= 0 || availableW <= 0) {
    finalizePlanTableColumnWidths(table, measured);
    return;
  }

  // 1% は丸め・サブピクセル誤差の安全マージン（重なり防止）
  setContentFitScale(baseScale * (availableW / naturalW) * 0.99);
  let nextScale = getContentFitScale();

  // ヒステリシス：丸め 1 ステップ（0.01）以内の変化はフォントを変えず列幅の再配分のみ行う。
  // フォント変更 → rem 余白の微変化 → 再レイアウトの自己フィードバックで
  // 倍率が丸め境界を往復し続ける振動をここで断ち切る
  if (Math.abs(nextScale - baseScale) <= 0.011) {
    setContentFitScale(baseScale);
    nextScale = baseScale;
  }
  applyPlanDisplayScales();

  const k = nextScale / baseScale;
  const pad = k > 1 ? 1 : 0;
  finalizePlanTableColumnWidths(table, {
    categoryW: Math.ceil(measured.categoryW * k) + pad,
    labelW: Math.ceil(measured.labelW * k) + pad,
    subW: Math.ceil(measured.subW * k) + pad,
    monthW: measured.monthW * k,
    extraW: measured.extraW * k,
  });
}

/** 適用中の列幅合計が現在の表示幅から大きくずれているか（タブ復帰・リサイズ後の再レイアウト判定） */
function planTableColumnWidthsStale(table) {
  const availableW = getPlanTableAvailableWidth(table);
  if (!availableW) return false;
  const { monthCount, extraCount } = countPlanTableFlexibleColumns(table);
  const totalW = sumPlanTableColumnWidths(readPlanTableColumnWidths(table), monthCount, extraCount);
  if (totalW <= 0) return true;
  return Math.abs(availableW - totalW) > 8;
}

function shrinkPlanTableFlexColumnsToFit(table, widths, availableW) {
  const { monthCount, extraCount, flexCount } = countPlanTableFlexibleColumns(table);
  if (flexCount === 0 || availableW <= 0) return widths;

  const fixedW = widths.categoryW + widths.labelW + widths.subW;
  const flexTotal = monthCount * widths.monthW + extraCount * widths.extraW;
  const totalW = fixedW + flexTotal;
  const overflow = totalW - availableW;
  if (overflow <= 0.5 || flexTotal <= overflow) return widths;

  const scale = (flexTotal - overflow) / flexTotal;
  return {
    ...widths,
    monthW: widths.monthW * scale,
    extraW: widths.extraW * scale,
  };
}

function countPlanTableFlexibleColumns(table) {
  const monthCount = table.querySelectorAll('thead .month-row th.col-amount-month').length;
  const extraCount = table.querySelectorAll('thead .month-row th.col-amount-extra').length;
  return { monthCount, extraCount, flexCount: monthCount + extraCount };
}

/** 余白があるときだけ月次・合計列を拡大する（不足時は計測幅を維持し、文字の重なりは許容） */
function fitPlanTableColumnsToViewport(table, widths) {
  const availableW = getPlanTableAvailableWidth(table);
  if (!availableW) return widths;

  const { monthCount, extraCount, flexCount } = countPlanTableFlexibleColumns(table);
  if (flexCount === 0) return widths;

  const { categoryW, labelW, subW } = widths;
  const fixedW = categoryW + labelW + subW;
  const flexBudget = availableW - fixedW;
  if (flexBudget <= 0) return widths;

  const contentFlexTotal = monthCount * widths.monthW + extraCount * widths.extraW;
  if (contentFlexTotal <= 0 || contentFlexTotal >= flexBudget) return widths;

  // 端数切り上げで右側にはみ出さないよう、比例配分で flexBudget にぴったり合わせる。
  // フォントが上限に達して余白が大きい場合でも、数字の間隔が開きすぎないよう拡大は 1.25 倍まで
  const scale = Math.min(flexBudget / contentFlexTotal, 1.25);
  return {
    categoryW,
    labelW,
    subW,
    monthW: widths.monthW * scale,
    extraW: widths.extraW * scale,
  };
}

function applyPlanTableColumnWidths(table, widths) {
  table.style.setProperty('--plan-col-category-w', `${widths.categoryW}px`);
  table.style.setProperty('--plan-col-label-w', `${widths.labelW}px`);
  table.style.setProperty('--plan-col-sub-w', `${widths.subW}px`);
  table.style.setProperty('--plan-col-amount-month-w', `${widths.monthW}px`);
  table.style.setProperty('--plan-col-amount-extra-w', `${widths.extraW}px`);
  syncPlanTableStickyColumnOffsets(table);
}

/** セクション全体が大項目背景色（--section-bg）で行を塗るか（CFセクション） */
function sectionFillsRowWithAccentBackground(sectionId) {
  return sectionId === 'cfIn' || sectionId === 'cfOut';
}

function isBsSectionForAccentTotal(sectionId) {
  return BS_SECTION_IDS.has(sectionId);
}

/** BS・現預金は残高表示のため合計・平均列を出さない */
function sectionHidesExtraColumns(sectionId) {
  return BS_SECTION_IDS.has(sectionId);
}

/** 大項目色付け行か（BS・利益は各セクションの最重要行のみ） */
function planRowIsAccentRow(section, row) {
  if (row.accentTotal === true) return true;
  if (row.type !== 'total') return false;
  if (isBsSectionForAccentTotal(section.id)) return false;
  return true;
}

/**
 * 予実表行がアクセント背景色を持つか（row-accent-bg / 通常フォントサイズの判定）。
 * 大項目合計行・CFセクションの行・差異行に該当。区分列（col-category）は行種別に関わらず常にアクセント。
 */
function planRowHasAccentBackground(section, row) {
  if (row.type === 'variance' || row.type === 'warningSummary') return true;
  return planRowIsAccentRow(section, row) || sectionFillsRowWithAccentBackground(section.id);
}

function isOutsourcingFixedDisplayRow(section, row) {
  return isOutsourcingFixedDisplaySection(section.id)
    && row.type !== 'total'
    && row.type !== 'breakdown';
}

function planRowUsesLargeDisplay(section, row) {
  if (isOutsourcingBreakdownRow(section.id, row)) return false;
  if (isRevenueManMonthRow(section.id, row)) return false;
  if (isVisibilityFixedSection(section.id)) return true;
  if (row.type === 'plan' && !isOutsourcingFixedDisplayRow(section, row)) return false;
  if (planRowHasAccentBackground(section, row)) return true;
  return getRowDisplayEntry(rowDisplayConfig, section.id, row).largeDisplay;
}

function getRowFillColorClass(section, row) {
  if (isOutsourcingFixedDisplayRow(section, row)) return 'row-fill-1';
  if (planRowHasAccentBackground(section, row)) return '';
  if (isVisibilityFixedSection(section.id)) return '';
  const { fillColor1, fillColor2 } = getRowDisplayEntry(rowDisplayConfig, section.id, row);
  if (fillColor2) return 'row-fill-2';
  if (fillColor1) return 'row-fill-1';
  return '';
}

function splitAggregateLabel(label) {
  if (!label?.startsWith(APP_AGGREGATE_LABEL_PREFIX)) {
    return { hasPrefix: false, text: label ?? '' };
  }
  return {
    hasPrefix: true,
    text: label.slice(APP_AGGREGATE_LABEL_PREFIX.length),
  };
}

function appendAggregateLabelContent(parent, label, formulaLabel = null) {
  const { hasPrefix, text } = splitAggregateLabel(label);
  if (!hasPrefix) {
    parent.textContent = text;
    return;
  }
  const prefixSpan = document.createElement('span');
  prefixSpan.className = 'aggregate-label-prefix';
  prefixSpan.textContent = APP_AGGREGATE_LABEL_PREFIX.trimEnd();
  prefixSpan.setAttribute('aria-hidden', 'true');
  if (formulaLabel) {
    prefixSpan.classList.add('aggregate-label-has-formula');
    prefixSpan.title = formulaLabel;
  }
  parent.appendChild(prefixSpan);
  parent.appendChild(document.createTextNode(` ${text}`));
}

function applyAggregateCellTooltip(td, row, section, columnKey, drilldownHint = '') {
  if (!isAggregateRow(row)) return;
  const detail = getAggregateFormulaDetail(row, section, data, columnKey);
  if (!detail) return;
  td.classList.add('aggregate-formula-cell');
  td.title = drilldownHint ? `${detail}\n${drilldownHint}` : detail;
}

function appendSectionCategoryLabel(categoryTd, section) {
  if (section.labelNote) {
    categoryTd.classList.add('col-category-multiline');
    const main = document.createElement('span');
    main.textContent = section.label;
    const note = document.createElement('span');
    note.className = 'col-category-note';
    note.textContent = section.labelNote;
    categoryTd.append(main, document.createElement('br'), note);
    return;
  }
  categoryTd.textContent = section.label;
}

function buildPlanRowTrClass(section, row) {
  const fillSectionColor = sectionFillsRowWithAccentBackground(section.id);
  const isAccentRow = planRowIsAccentRow(section, row);
  const rowKindClass = row.type === 'total' ? 'row-total' : 'row-item';
  return [
    `${rowKindClass}${isAccentRow ? ' row-section-total' : ''}`,
    fillSectionColor ? 'row-section-total' : '',
    planRowUsesLargeDisplay(section, row) ? 'row-accent-bg' : 'row-plain-bg',
    getRowFillColorClass(section, row),
    row.type === 'plan' ? 'row-plan-amount' : '',
    isTaxPublicChargeRow(row) && row.type !== 'total' ? 'row-tax-public-charge' : '',
    row.type === 'profit' && section.id !== 'profit' ? 'row-profit' : '',
    row.type === 'group' ? 'row-group' : '',
    row.type === 'breakdown' ? 'row-breakdown' : '',
    row.type === 'sub' || row.type === 'breakdown' ? 'row-sub' : '',
    row.type === 'man-month' ? 'row-man-month row-sub' : '',
    row.type === 'variance' ? 'row-variance' : '',
    row.type === 'warningSummary' ? 'row-warning-summary' : '',
    row.type === 'sub-variance' ? 'row-sub-variance' : '',
  ].filter(Boolean).join(' ');
}

/** 大項目列：セクションフィルターで隠している行を一時表示して計測する（ソロ表示リロード時の列幅維持） */
function maxPlanCategoryCellScrollWidth(table) {
  const sectionIds = getCurrentSectionFilterIds();
  const filterActive = sectionIds.length > 0
    && !isAllSectionFiltersEnabled(sectionFilterConfig, sectionIds);
  if (!filterActive) {
    return maxPlanCellScrollWidth(table.querySelectorAll('tbody .col-category'));
  }

  const hiddenRows = [];
  for (const tr of table.querySelectorAll('tbody tr[data-section-id][hidden]')) {
    hiddenRows.push(tr);
    tr.hidden = false;
  }
  try {
    return maxPlanCellScrollWidth(table.querySelectorAll('tbody .col-category'));
  } finally {
    for (const tr of hiddenRows) {
      tr.hidden = true;
    }
  }
}

/** 展開前後に変わらない列幅用：表示対象の全行から勘定科目・補助科目の候補を集める */
function collectPlanColumnWidthCandidates(planData) {
  const labelSpecs = [];
  const subEntries = [];

  if (!planData?.sections) return { labelSpecs, subEntries };

  for (const section of planData.sections) {
    for (const row of section.rows) {
      if (!rowVisibleInSection(section, row)) continue;

      const trClass = buildPlanRowTrClass(section, row);

      if (row.type === 'group') {
        labelSpecs.push({ trClass, groupLabel: row.label, expanded: false });
        labelSpecs.push({ trClass, groupLabel: row.label, expanded: true });
      } else if (row.type !== 'sub' && row.label) {
        labelSpecs.push({
          trClass,
          text: row.label,
          formulaLabel: getAggregateFormulaLabel(row, section),
        });
      }

      if (row.type === 'sub' && row.subLabel) {
        subEntries.push({ trClass, text: row.subLabel });
      } else if (row.type === 'breakdown' && row.subLabel) {
        subEntries.push({ trClass, text: row.subLabel });
      } else if (row.type === 'man-month' && row.subLabel) {
        subEntries.push({ trClass, text: row.subLabel });
      } else if (row.type === 'item' && row.subLabel) {
        subEntries.push({ trClass, text: row.subLabel });
      }
    }
  }

  return { labelSpecs, subEntries };
}

function measureLabelColumnWidth(table, labelSpecs) {
  const headerCell = table.querySelector('.month-row th.col-label');
  let max = headerCell && headerCell.colSpan <= 1 ? headerCell.scrollWidth : 0;

  const tbody = table.querySelector('tbody') ?? table.appendChild(document.createElement('tbody'));
  const tr = document.createElement('tr');
  tr.className = 'plan-label-width-probe';
  tr.style.visibility = 'hidden';
  tr.style.pointerEvents = 'none';
  const td = document.createElement('td');
  td.className = 'col-label';
  tr.appendChild(td);
  tbody.appendChild(tr);

  for (const spec of labelSpecs) {
    tr.className = ['plan-label-width-probe', spec.trClass].filter(Boolean).join(' ');
    td.replaceChildren();
    if (spec.groupLabel) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'row-toggle';
      const icon = document.createElement('span');
      icon.className = 'toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = spec.expanded ? '▼' : '▶';
      const textSpan = document.createElement('span');
      textSpan.className = 'row-toggle-text';
      appendAggregateLabelContent(textSpan, spec.groupLabel);
      btn.append(icon, textSpan);
      td.appendChild(btn);
    } else {
      appendAggregateLabelContent(td, spec.text, spec.formulaLabel ?? null);
    }
    max = Math.max(max, measurePlanCellContentWidth(td));
  }

  tr.remove();
  return max;
}

function measureSubColumnWidth(table, subEntries) {
  const headerCell = table.querySelector('.month-row th.col-sub');
  let max = headerCell ? headerCell.scrollWidth : 0;

  const tbody = table.querySelector('tbody') ?? table.appendChild(document.createElement('tbody'));
  const tr = document.createElement('tr');
  tr.className = 'plan-sub-width-probe';
  tr.style.visibility = 'hidden';
  tr.style.pointerEvents = 'none';
  const td = document.createElement('td');
  td.className = 'col-sub';
  tr.appendChild(td);
  tbody.appendChild(tr);

  for (const entry of subEntries) {
    tr.className = ['plan-sub-width-probe', entry.trClass].filter(Boolean).join(' ');
    td.textContent = entry.text;
    max = Math.max(max, td.scrollWidth);
  }

  tr.remove();
  return max;
}

function getPlanTableMonthColumnIndex(monthLabel) {
  return FISCAL_MONTHS.indexOf(monthLabel);
}

function getPlanColumnPlateClipRect(wrap, table) {
  const body = planBody();
  const wrapRect = wrap.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  if (!body) {
    return { top: wrapRect.top, bottom: wrapRect.bottom };
  }
  const bodyRect = body.getBoundingClientRect();
  return {
    top: Math.max(bodyRect.top, tableRect.top),
    bottom: Math.min(bodyRect.bottom, tableRect.bottom, wrapRect.bottom),
  };
}

function isPlanMonthHeaderSticky(table) {
  const yearTh = table.querySelector('.year-row th.col-amount-month');
  const monthTh = table.querySelector('.month-row th.col-amount-month');
  if (!yearTh || !monthTh) return false;
  return yearTh.getBoundingClientRect().bottom <= monthTh.getBoundingClientRect().top + 1;
}

function applyFixedColumnPlate(plate, monthRect, topY, bottomY, clipRect) {
  const clippedTop = Math.max(topY, clipRect.top);
  const clippedBottom = Math.min(bottomY, clipRect.bottom);

  if (clippedBottom <= clippedTop + 0.5) {
    plate.hidden = true;
    delete plate.dataset.plateKey;
    return;
  }

  const left = Math.round(monthRect.left);
  const top = Math.round(clippedTop);
  const isCurrentMonthPlate = plate.classList.contains('plan-column-plate--current')
    || plate.classList.contains('plan-column-plate--current-header');
  const width = Math.round(monthRect.width) - (isCurrentMonthPlate ? 1 : 0);
  const height = Math.round(clippedBottom - clippedTop);
  const key = `${left}|${top}|${width}|${height}`;

  if (plate.dataset.plateKey === key && !plate.hidden) return;

  plate.dataset.plateKey = key;
  plate.hidden = false;
  plate.style.position = 'fixed';
  plate.style.left = `${left}px`;
  plate.style.width = `${width}px`;
  plate.style.top = `${top}px`;
  plate.style.height = `${height}px`;
}

/** tbody 列: 月行の直下から最終行まで（月行自体は含めない） */
function positionPlanColumnBodyPlate(wrap, plate, table, monthIndex) {
  const monthThs = table.querySelectorAll('thead .month-row th.col-amount-month');
  const monthTh = monthThs[monthIndex];
  if (!monthTh) {
    plate.hidden = true;
    delete plate.dataset.plateKey;
    return;
  }

  const monthRect = monthTh.getBoundingClientRect();
  let bottomY = monthRect.bottom;

  const tbody = table.tBodies[0];
  if (tbody) {
    const rows = tbody.querySelectorAll('tr');
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (row.hidden) continue;
      const monthTds = row.querySelectorAll('td.col-amount-month');
      const td = monthTds[monthIndex];
      if (td) {
        bottomY = td.getBoundingClientRect().bottom;
        break;
      }
    }
  }

  applyFixedColumnPlate(
    plate,
    monthRect,
    monthRect.bottom,
    bottomY,
    getPlanColumnPlateClipRect(wrap, table),
  );
}

/** thead 月行のみ: sticky ヘッダーに固定（viewport 基準・スクロール中は座標不変） */
function positionPlanColumnHeaderPlate(wrap, plate, table, monthIndex) {
  const monthThs = table.querySelectorAll('thead .month-row th.col-amount-month');
  const monthTh = monthThs[monthIndex];
  if (!monthTh) {
    plate.hidden = true;
    delete plate.dataset.plateKey;
    return;
  }

  const monthRect = monthTh.getBoundingClientRect();
  applyFixedColumnPlate(
    plate,
    monthRect,
    monthRect.top,
    monthRect.bottom,
    getPlanColumnPlateClipRect(wrap, table),
  );
}

function syncPlanColumnBodyPlates(wrap, table) {
  const layer = wrap?.querySelector('.plan-column-plate-layer');
  if (!layer || !table?.isConnected) return;

  const highlightMonth = getHighlightFiscalMonth();
  const currentIdx = highlightMonth ? getPlanTableMonthColumnIndex(highlightMonth) : -1;
  const settlementIdx = getPlanTableMonthColumnIndex(SETTLEMENT_FISCAL_MONTH);

  const currentBodyPlate = layer.querySelector('.plan-column-plate--current');
  const settlementBodyPlate = layer.querySelector('.plan-column-plate--settlement');

  if (currentBodyPlate) {
    if (currentIdx >= 0) positionPlanColumnBodyPlate(wrap, currentBodyPlate, table, currentIdx);
    else {
      currentBodyPlate.hidden = true;
      delete currentBodyPlate.dataset.plateKey;
    }
  }
  if (settlementBodyPlate) {
    if (settlementIdx >= 0) positionPlanColumnBodyPlate(wrap, settlementBodyPlate, table, settlementIdx);
    else {
      settlementBodyPlate.hidden = true;
      delete settlementBodyPlate.dataset.plateKey;
    }
  }
}

function syncPlanColumnHeaderPlates(wrap, table) {
  const layer = wrap?.querySelector('.plan-column-plate-layer');
  if (!layer || !table?.isConnected) return;

  const highlightMonth = getHighlightFiscalMonth();
  const currentIdx = highlightMonth ? getPlanTableMonthColumnIndex(highlightMonth) : -1;
  const settlementIdx = getPlanTableMonthColumnIndex(SETTLEMENT_FISCAL_MONTH);

  const currentHeaderPlate = layer.querySelector('.plan-column-plate--current-header');
  const settlementHeaderPlate = layer.querySelector('.plan-column-plate--settlement-header');

  if (currentHeaderPlate) {
    if (currentIdx >= 0) positionPlanColumnHeaderPlate(wrap, currentHeaderPlate, table, currentIdx);
    else {
      currentHeaderPlate.hidden = true;
      delete currentHeaderPlate.dataset.plateKey;
    }
  }
  if (settlementHeaderPlate) {
    if (settlementIdx >= 0) positionPlanColumnHeaderPlate(wrap, settlementHeaderPlate, table, settlementIdx);
    else {
      settlementHeaderPlate.hidden = true;
      delete settlementHeaderPlate.dataset.plateKey;
    }
  }
}

function syncPlanColumnPlates(wrap, table) {
  syncPlanColumnHeaderPlates(wrap, table);
  syncPlanColumnBodyPlates(wrap, table);
}

function bindPlanColumnPlates(wrap, table) {
  const prev = planColumnPlateControllers.get(wrap);
  prev?.abort();

  let layer = wrap.querySelector('.plan-column-plate-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'plan-column-plate-layer';
    layer.setAttribute('aria-hidden', 'true');
  }
  wrap.appendChild(layer);

  let currentBodyPlate = layer.querySelector('.plan-column-plate--current');
  if (!currentBodyPlate) {
    currentBodyPlate = document.createElement('div');
    currentBodyPlate.className = 'plan-column-plate plan-column-plate--current';
    layer.appendChild(currentBodyPlate);
  }

  let currentHeaderPlate = layer.querySelector('.plan-column-plate--current-header');
  if (!currentHeaderPlate) {
    currentHeaderPlate = document.createElement('div');
    currentHeaderPlate.className = 'plan-column-plate plan-column-plate--current-header';
    layer.appendChild(currentHeaderPlate);
  }

  let settlementBodyPlate = layer.querySelector('.plan-column-plate--settlement');
  if (!settlementBodyPlate) {
    settlementBodyPlate = document.createElement('div');
    settlementBodyPlate.className = 'plan-column-plate plan-column-plate--settlement';
    layer.appendChild(settlementBodyPlate);
  }

  let settlementHeaderPlate = layer.querySelector('.plan-column-plate--settlement-header');
  if (!settlementHeaderPlate) {
    settlementHeaderPlate = document.createElement('div');
    settlementHeaderPlate.className = 'plan-column-plate plan-column-plate--settlement-header';
    layer.appendChild(settlementHeaderPlate);
  }

  const controller = new AbortController();
  const { signal } = controller;
  planColumnPlateControllers.set(wrap, controller);

  let syncRaf = 0;
  const syncAll = () => {
    if (syncRaf) cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      syncRaf = 0;
      syncPlanColumnPlates(wrap, table);
    });
  };
  const syncOnScroll = () => {
    if (syncRaf) cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      syncRaf = 0;
      syncPlanColumnBodyPlates(wrap, table);
      const sticky = isPlanMonthHeaderSticky(table);
      const wasSticky = wrap.dataset.planMonthHeaderPlatesSticky === '1';
      // sticky 前後の切り替え時のみ月行板を再配置（固定後は viewport 座標が不変）
      if (!sticky || !wasSticky) {
        syncPlanColumnHeaderPlates(wrap, table);
      }
      wrap.dataset.planMonthHeaderPlatesSticky = sticky ? '1' : '0';
    });
  };
  syncAll();

  const scrollRoot = planBody() ?? wrap;
  scrollRoot.addEventListener('scroll', syncOnScroll, { signal, passive: true });
  wrap.addEventListener('scroll', syncOnScroll, { signal, passive: true });
  window.addEventListener('resize', syncAll, { signal });

  const resizeObserver = new ResizeObserver(syncAll);
  resizeObserver.observe(table);
  signal.addEventListener('abort', () => resizeObserver.disconnect());
}

function positionRowHoverPlate(wrap, plate, tr) {
  const labelCell = tr.querySelector('.col-label');
  const lastCell = tr.querySelector('td:last-child');
  if (!labelCell || !lastCell) {
    plate.classList.remove('is-active');
    return;
  }

  const wrapRect = wrap.getBoundingClientRect();
  const labelRect = labelCell.getBoundingClientRect();
  const lastRect = lastCell.getBoundingClientRect();

  plate.style.top = `${labelRect.top - wrapRect.top + wrap.scrollTop}px`;
  plate.style.left = `${labelRect.left - wrapRect.left + wrap.scrollLeft}px`;
  plate.style.width = `${lastRect.right - labelRect.left}px`;
  plate.style.height = `${labelRect.height}px`;
}

function positionEditableCellHoverPlate(wrap, plate, td) {
  const wrapRect = wrap.getBoundingClientRect();
  const cellRect = td.getBoundingClientRect();

  plate.style.top = `${cellRect.top - wrapRect.top + wrap.scrollTop}px`;
  plate.style.left = `${cellRect.left - wrapRect.left + wrap.scrollLeft}px`;
  plate.style.width = `${cellRect.width}px`;
  plate.style.height = `${cellRect.height}px`;
}

function bindEditableCellHoverPlate(wrap, table) {
  const prev = editableCellHoverPlateControllers.get(wrap);
  prev?.abort();

  const existing = wrap.querySelector('.plan-editable-cell-hover-plate');
  existing?.remove();

  const plate = document.createElement('div');
  plate.className = 'plan-editable-cell-hover-plate';
  plate.setAttribute('aria-hidden', 'true');
  wrap.appendChild(plate);

  const tbody = table.tBodies[0];
  if (!tbody) return;

  let activeTd = null;
  const controller = new AbortController();
  const { signal } = controller;
  editableCellHoverPlateControllers.set(wrap, controller);

  const sync = () => {
    if (activeTd?.isConnected && !activeTd.querySelector('input')) {
      positionEditableCellHoverPlate(wrap, plate, activeTd);
    }
  };

  const hide = () => {
    activeTd = null;
    plate.classList.remove('is-active');
  };

  tbody.addEventListener('mouseover', (e) => {
    const td = e.target.closest('td.col-amount.salary-plan-cell-editable');
    if (!td || !tbody.contains(td) || td.querySelector('input')) {
      hide();
      return;
    }
    if (td === activeTd) return;
    activeTd = td;
    positionEditableCellHoverPlate(wrap, plate, td);
    plate.classList.add('is-active');
  }, { signal });

  tbody.addEventListener('mouseleave', hide, { signal });

  const scrollRoot = planBody() ?? wrap;
  scrollRoot.addEventListener('scroll', sync, { signal, passive: true });
  wrap.addEventListener('scroll', sync, { signal, passive: true });
  window.addEventListener('resize', sync, { signal });
}

function positionRowSelectionPlate(wrap, plate, tr) {
  const labelCell = tr.querySelector('.col-label');
  const lastCell = tr.querySelector('td:last-child');
  if (!labelCell || !lastCell) {
    plate.hidden = true;
    return;
  }

  const wrapRect = wrap.getBoundingClientRect();
  const labelRect = labelCell.getBoundingClientRect();
  const lastRect = lastCell.getBoundingClientRect();

  plate.hidden = false;
  plate.style.top = `${labelRect.top - wrapRect.top + wrap.scrollTop}px`;
  plate.style.left = `${labelRect.left - wrapRect.left + wrap.scrollLeft}px`;
  plate.style.width = `${lastRect.right - labelRect.left}px`;
  plate.style.height = `${labelRect.height}px`;
}

function updateRowSelectionPlates(wrap, table) {
  const layer = wrap?.querySelector('.plan-row-selection-layer');
  if (!layer || !table) return;

  layer.replaceChildren();
  const tbody = table.tBodies[0];
  if (!tbody) return;

  for (const tr of tbody.querySelectorAll('tr.is-row-selected')) {
    const plate = document.createElement('div');
    plate.className = 'plan-row-selection-plate';
    plate.setAttribute('aria-hidden', 'true');
    layer.appendChild(plate);
    positionRowSelectionPlate(wrap, plate, tr);
  }
}

function refreshRowSelectionPlates(table) {
  const wrap = table?.closest('.plan-table-wrap');
  if (wrap) updateRowSelectionPlates(wrap, table);
}

function bindRowSelectionPlates(wrap, table) {
  const prev = rowSelectionPlateControllers.get(wrap);
  prev?.abort();

  let layer = wrap.querySelector('.plan-row-selection-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'plan-row-selection-layer';
    layer.setAttribute('aria-hidden', 'true');
    wrap.appendChild(layer);
  }

  const controller = new AbortController();
  const { signal } = controller;
  rowSelectionPlateControllers.set(wrap, controller);

  const sync = () => updateRowSelectionPlates(wrap, table);

  sync();

  const scrollRoot = planBody() ?? wrap;
  scrollRoot.addEventListener('scroll', sync, { signal, passive: true });
  wrap.addEventListener('scroll', sync, { signal, passive: true });
  window.addEventListener('resize', sync, { signal });
}

function bindRowHoverPlate(wrap, table) {
  const prev = rowHoverPlateControllers.get(wrap);
  prev?.abort();

  const existing = wrap.querySelector('.plan-row-hover-plate');
  existing?.remove();

  const plate = document.createElement('div');
  plate.className = 'plan-row-hover-plate';
  plate.setAttribute('aria-hidden', 'true');
  wrap.appendChild(plate);

  const tbody = table.tBodies[0];
  if (!tbody) return;

  let activeTr = null;
  const controller = new AbortController();
  const { signal } = controller;
  rowHoverPlateControllers.set(wrap, controller);

  const sync = () => {
    if (activeTr) positionRowHoverPlate(wrap, plate, activeTr);
  };

  tbody.addEventListener('mouseover', (e) => {
    const tr = e.target.closest('tr');
    if (!tr || tr.parentElement !== tbody) return;
    if (tr === activeTr) return;
    activeTr = tr;
    positionRowHoverPlate(wrap, plate, tr);
    plate.classList.toggle('is-expandable', tr.classList.contains('row-group'));
    plate.classList.add('is-active');
  }, { signal });

  tbody.addEventListener('mouseleave', () => {
    activeTr = null;
    plate.classList.remove('is-active');
  }, { signal });

  wrap.addEventListener('scroll', sync, { signal, passive: true });
  window.addEventListener('resize', sync, { signal });
}

function findPlanRow(sectionId, rowKey) {
  const section = data?.sections?.find((s) => s.id === sectionId);
  if (!section) return null;
  const row = section.rows.find((r) => visibilityRowKey(sectionId, r) === rowKey);
  if (!row) return null;
  return { section, row };
}

function findPlanRowByKey(rowKey) {
  if (!data?.sections || !rowKey) return null;
  for (const section of data.sections) {
    const row = section.rows.find((r) => visibilityRowKey(section.id, r) === rowKey);
    if (row) return { section, row };
  }
  return null;
}

function dedupeTargetsByRowKey(targets) {
  const seen = new Set();
  const result = [];
  for (const item of targets) {
    const key = visibilityRowKey(item.section.id, item.row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function applyRowDisplayPatch(targets, patch) {
  if (!targets.length) return;
  for (const { section, row } of targets) {
    rowDisplayConfig = setRowDisplayEntry(rowDisplayConfig, section.id, row, patch);
  }
  saveRowDisplayConfig(rowDisplayConfig);
}

/** 行の見た目設定（大きく表示・塗り色）だけ DOM に反映する */
function applyPlanRowDisplayState(table, targets) {
  if (!table || !targets.length || !data) return;

  const targetKeys = new Set(
    targets.map(({ section, row }) => visibilityRowKey(section.id, row)),
  );

  for (const tr of table.querySelectorAll('tbody tr[data-row-key]')) {
    if (!targetKeys.has(tr.dataset.rowKey)) continue;
    const sectionId = tr.dataset.sectionId;
    const rowKey = tr.dataset.rowKey;
    const section = data.sections.find((s) => s.id === sectionId);
    if (!section) continue;
    const row = section.rows.find((r) => visibilityRowKey(sectionId, r) === rowKey);
    if (!row) continue;

    const usesLarge = planRowUsesLargeDisplay(section, row);
    tr.classList.toggle('row-accent-bg', usesLarge);
    tr.classList.toggle('row-plain-bg', !usesLarge);

    tr.classList.remove('row-fill-1', 'row-fill-2');
    const fillClass = getRowFillColorClass(section, row);
    if (fillClass) tr.classList.add(fillClass);
  }
}

function findExpandCandidate(sectionId, account) {
  return data?.expandCandidates?.find(
    (c) => c.sectionId === sectionId && c.account === account,
  ) ?? null;
}

function resolveExpandAccountFromRow(row) {
  if (row.type === 'group' || row.type === 'item' || row.type === 'sub') {
    return row.label || null;
  }
  return null;
}

/** 展開設定対象を勘定科目単位にまとめる（補助科目行・常時表示行も含む） */
function collectExpandMenuTargets(targets) {
  const byKey = new Map();
  for (const { section, row } of targets) {
    const account = resolveExpandAccountFromRow(row);
    if (!account || !findExpandCandidate(section.id, account)) continue;
    const key = expandConfigKey(section.id, account);
    if (!byKey.has(key)) {
      byKey.set(key, { section, account, row });
    }
  }
  return [...byKey.values()];
}

function findGroupRowForExpand(section, account) {
  return section.rows.find((r) => r.type === 'group' && r.label === account) ?? null;
}

function clearRowSelection(table) {
  selectedPlanRowKeys.clear();
  selectionAnchorRowKey = null;
  table?.querySelectorAll('tr.is-row-selected').forEach((tr) => {
    tr.classList.remove('is-row-selected');
  });
  refreshRowSelectionPlates(table);
}

function getVisibleSelectableRowTrs(tbody) {
  return [...tbody.querySelectorAll('tr[data-row-key]')]
    .filter((tr) => !tr.classList.contains('is-expand-collapsed'));
}

function selectPlanRowRange(fromKey, toKey, table) {
  const tbody = table?.tBodies[0];
  if (!tbody || !toKey) return;

  const trs = getVisibleSelectableRowTrs(tbody);
  if (!trs.length) return;

  const keys = trs.map((tr) => tr.dataset.rowKey);
  const fromIdx = fromKey ? keys.indexOf(fromKey) : -1;
  const toIdx = keys.indexOf(toKey);
  if (toIdx < 0) return;

  const startIdx = fromIdx >= 0 ? Math.min(fromIdx, toIdx) : toIdx;
  const endIdx = fromIdx >= 0 ? Math.max(fromIdx, toIdx) : toIdx;

  selectedPlanRowKeys.clear();
  tbody.querySelectorAll('tr.is-row-selected').forEach((tr) => {
    tr.classList.remove('is-row-selected');
  });

  for (let i = startIdx; i <= endIdx; i += 1) {
    selectedPlanRowKeys.add(keys[i]);
  }

  for (const tr of trs) {
    if (selectedPlanRowKeys.has(tr.dataset.rowKey)) {
      tr.classList.add('is-row-selected');
    }
  }

  selectionAnchorRowKey = toKey;
  refreshRowSelectionPlates(table);
}

function handlePlanRowSelectClick(tr, table, e) {
  const { rowKey } = tr.dataset;
  if (!rowKey) return;

  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  if (shift) {
    e.preventDefault();
    selectPlanRowRange(selectionAnchorRowKey ?? rowKey, rowKey, table);
    return;
  }

  if (ctrl) {
    e.preventDefault();
    toggleRowSelection(tr);
    selectionAnchorRowKey = rowKey;
    return;
  }

  clearRowSelection(table);
  selectionAnchorRowKey = rowKey;
}

function getSelectedPlanRows() {
  const table = root.querySelector('.plan-table');
  const targets = [];
  const seenKeys = new Set();

  const appendTarget = (item) => {
    if (!item) return;
    const key = visibilityRowKey(item.section.id, item.row);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    targets.push(item);
  };

  if (table?.tBodies[0]) {
    for (const tr of table.tBodies[0].querySelectorAll('tr.is-row-selected')) {
      const { sectionId, rowKey } = tr.dataset;
      if (!rowKey) continue;
      const found = (sectionId && findPlanRow(sectionId, rowKey))
        || findPlanRowByKey(rowKey);
      appendTarget(found);
    }
  }

  for (const rowKey of selectedPlanRowKeys) {
    if (seenKeys.has(rowKey)) continue;
    appendTarget(findPlanRowByKey(rowKey));
  }

  return targets;
}

function syncRowSelection(tr) {
  if (selectedPlanRowKeys.has(tr.dataset.rowKey)) {
    tr.classList.add('is-row-selected');
  }
}

function toggleRowSelection(tr) {
  const { rowKey } = tr.dataset;
  if (!rowKey) return;
  if (selectedPlanRowKeys.has(rowKey)) {
    selectedPlanRowKeys.delete(rowKey);
    tr.classList.remove('is-row-selected');
  } else {
    selectedPlanRowKeys.add(rowKey);
    tr.classList.add('is-row-selected');
  }
  refreshRowSelectionPlates(tr.closest('table'));
}

function ensureRowInSelection(tr, table) {
  const { rowKey } = tr.dataset;
  if (!rowKey) return;
  if (!selectedPlanRowKeys.has(rowKey)) {
    clearRowSelection(table);
    selectedPlanRowKeys.add(rowKey);
    tr.classList.add('is-row-selected');
    refreshRowSelectionPlates(table);
  }
  selectionAnchorRowKey = rowKey;
}

function bulkToggleState(values) {
  const all = values.length > 0 && values.every(Boolean);
  const any = values.some(Boolean);
  return { all, any, mixed: any && !all, next: all ? false : true };
}

function formatContextMenuRowTitle(section, row) {
  const rowTitle = row.type === 'man-month'
    ? row.subLabel
    : row.type === 'sub' || row.type === 'breakdown'
      ? `${row.label || section.label} / ${row.subLabel}`
      : (row.subLabel ? `${row.label} / ${row.subLabel}` : row.label);
  return `${section.label} — ${rowTitle}`;
}

function isRevenueManMonthMonthEditable(month, displayMode, pastMonthSet) {
  if (!isMonthDisplayToggleTarget(month)) return false;
  if (displayMode === 'actual') return false;
  if (displayMode === 'budget-actual' && pastMonthSet.has(month)) return false;
  return true;
}

function getOutsourcingVendorIdFromRow(row) {
  if (row.outsourcingVendorId) return row.outsourcingVendorId;
  if (row.type === 'plan' && typeof row.id === 'string' && row.id.startsWith('out-plan-')) {
    return row.id.slice('out-plan-'.length);
  }
  return null;
}

function isOutsourcingPlanMonthEditable(month, displayMode, pastMonthSet) {
  if (!isMonthDisplayToggleTarget(month)) return false;
  if (displayMode === 'actual') return false;
  if (displayMode === 'budget-actual' && pastMonthSet.has(month)) return false;
  return true;
}

function isOutsourcingPlanRowEditable(section, row) {
  if (section.id !== 'outsourcing') return false;
  if (row.type === 'breakdown' || row.type === 'total' || row.type === 'variance') return false;
  return Boolean(getOutsourcingVendorIdFromRow(row));
}

function isOutsourcingPlanCellEditable(section, row, month, displayMode, pastMonthSet) {
  return isOutsourcingPlanRowEditable(section, row)
    && isOutsourcingPlanMonthEditable(month, displayMode, pastMonthSet);
}

function getEmployeeIdFromPlanRow(row) {
  if (row.type !== 'plan' || typeof row.id !== 'string') return null;
  if (row.id.startsWith('emp-plan-d-')) return row.id.slice('emp-plan-d-'.length);
  if (row.id.startsWith('emp-plan-m-')) return row.id.slice('emp-plan-m-'.length);
  return null;
}

function isEmployeeSalaryPlanMonthEditable(month, displayMode, pastMonthSet) {
  if (!isMonthDisplayToggleTarget(month)) return false;
  if (displayMode === 'actual') return false;
  if (displayMode === 'budget-actual' && pastMonthSet.has(month)) return false;
  return true;
}

function isEmployeeSalaryPlanRowEditable(section, row) {
  if (section.id !== 'personnel') return false;
  if (row.type !== 'plan') return false;
  return Boolean(getEmployeeIdFromPlanRow(row));
}

function isEmployeeSalaryPlanCellEditable(section, row, month, displayMode, pastMonthSet) {
  return isEmployeeSalaryPlanRowEditable(section, row)
    && isEmployeeSalaryPlanMonthEditable(month, displayMode, pastMonthSet);
}

function isOvertimePlanMonthEditable(month, displayMode, pastMonthSet) {
  if (!isMonthDisplayToggleTarget(month)) return false;
  if (displayMode === 'actual') return false;
  if (displayMode === 'budget-actual' && pastMonthSet.has(month)) return false;
  return true;
}

function isOvertimePlanRowEditable(section, row) {
  if (section.id !== 'personnel') return false;
  if (row.type === 'breakdown' || row.type === 'total' || row.type === 'variance') return false;
  if (row.id === 'overtime-plan' && row.type === 'plan') return true;
  if (row.type === 'plan') return false;
  return row.planTargetTag === 'overtime' || isVariableOvertimePlanTableRow(row);
}

function isOvertimePlanCellEditable(section, row, month, displayMode, pastMonthSet) {
  return isOvertimePlanRowEditable(section, row)
    && isOvertimePlanMonthEditable(month, displayMode, pastMonthSet);
}

function isTaxPaymentNonEditableRowType(row) {
  return row.type === 'total'
    || row.type === 'variance'
    || row.type === 'sub-variance'
    || row.type === 'warningSummary';
}

function isTaxPaymentPrimaryAccountRow(row) {
  const sub = String(row.subLabel ?? '').trim();
  return !sub || sub === PLAN_TABLE_TAX_PAYMENT_NO_SUB_LABEL;
}

function getTaxPaymentSimpleAccountFromPlanRow(section, row) {
  if (isTaxPaymentNonEditableRowType(row)) return null;
  if (
    section.id === 'other'
    && isTaxPublicChargeRow(row)
    && isTaxPaymentPrimaryAccountRow(row)
  ) {
    return PLAN_TABLE_TAX_PAYMENT_OTHER_ACCOUNT;
  }
  if (section.id === 'otherPay' && isTaxPaymentPrimaryAccountRow(row)) {
    const label = row.label ?? '';
    if (PLAN_TABLE_TAX_PAYMENT_OTHER_PAY_EDITABLE_ACCOUNTS.includes(label)) return label;
  }
  return null;
}

function getTaxPaymentResidentTaxMunicipalityFromPlanRow(section, row) {
  if (section.id !== 'otherPay') return null;
  if (isTaxPaymentNonEditableRowType(row)) return null;
  if (row.label !== RESIDENT_TAX_ACCOUNT) return null;
  const municipality = String(row.subLabel ?? '').trim();
  if (!municipality || municipality === PLAN_TABLE_TAX_PAYMENT_NO_SUB_LABEL) return null;
  return municipality;
}

function isTaxPaymentPlanRowEditable(section, row) {
  return Boolean(getTaxPaymentSimpleAccountFromPlanRow(section, row))
    || Boolean(getTaxPaymentResidentTaxMunicipalityFromPlanRow(section, row));
}

function isTaxPaymentSimplePlanMonthEditable(month, displayMode, pastMonthSet) {
  if (!isMonthDisplayToggleTarget(month)) return false;
  if (displayMode === 'actual') return false;
  if (displayMode === 'budget-actual' && pastMonthSet.has(month)) return false;
  return true;
}

function isTaxPaymentResidentTaxPlanMonthEditable(month, displayMode) {
  if (!isMonthDisplayToggleTarget(month)) return false;
  return displayMode !== 'actual';
}

function isTaxPaymentPlanCellEditable(section, row, month, displayMode, pastMonthSet) {
  const account = getTaxPaymentSimpleAccountFromPlanRow(section, row);
  if (account) {
    return isTaxPaymentSimplePlanMonthEditable(month, displayMode, pastMonthSet);
  }
  if (getTaxPaymentResidentTaxMunicipalityFromPlanRow(section, row)) {
    return isTaxPaymentResidentTaxPlanMonthEditable(month, displayMode);
  }
  return false;
}

function getPlanTableFillForwardSkipMonths(fiscalPeriod, fiscalMonths, pastMonthSet = null) {
  const skip = new Set([SETTLEMENT_FISCAL_MONTH]);
  const locked = pastMonthSet ?? getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths);
  for (const month of locked) skip.add(month);
  return skip;
}

function getTaxPaymentPlanEditTarget(section, row) {
  const account = getTaxPaymentSimpleAccountFromPlanRow(section, row);
  if (account) return { kind: 'simple', account };
  const municipality = getTaxPaymentResidentTaxMunicipalityFromPlanRow(section, row);
  if (!municipality) return null;
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const entry = getResidentTaxMunicipalityEntries(
    taxPaymentPlans,
    appSettings.fiscalPeriod,
    fiscalMonths,
  ).find((e) => e.municipality === municipality);
  if (!entry) return null;
  return { kind: 'residentTax', entryId: entry.id, municipality };
}

function persistTaxPaymentPlanMonthly(account, nextMonthly) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  taxPaymentPlans = setPaymentPlanAccount(
    taxPaymentPlans,
    appSettings.fiscalPeriod,
    account,
    nextMonthly,
    fiscalMonths,
  );
  syncPlanDataToCurrentPeriod();
  refreshPlanTable();
}

function persistTaxPaymentResidentTaxMonthly(entryId, nextMonthly) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const entries = getResidentTaxMunicipalityEntries(
    taxPaymentPlans,
    appSettings.fiscalPeriod,
    fiscalMonths,
  );
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;
  taxPaymentPlans = setResidentTaxMunicipalityEntry(
    taxPaymentPlans,
    appSettings.fiscalPeriod,
    { ...entry, monthly: nextMonthly },
    fiscalMonths,
  );
  syncPlanDataToCurrentPeriod();
  refreshPlanTable();
}

function startTaxPaymentPlanTableCellEdit(td, {
  target,
  month,
  displayMode,
  pastMonthSet,
}) {
  if (!target) return;
  if (target.kind === 'simple') {
    if (!isTaxPaymentSimplePlanMonthEditable(month, displayMode, pastMonthSet)) return;
  } else if (!isTaxPaymentResidentTaxPlanMonthEditable(month, displayMode)) {
    return;
  }
  if (td.querySelector('input')) return;

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const fiscalPeriod = appSettings.fiscalPeriod;
  let rawValue;
  let planMonthly;
  let rowKey;

  if (target.kind === 'simple') {
    planMonthly = getPaymentPlansForPeriod(taxPaymentPlans, fiscalPeriod, fiscalMonths)[target.account] ?? {};
    rawValue = planMonthly[month];
    rowKey = target.account;
  } else {
    const entry = getResidentTaxMunicipalityEntries(
      taxPaymentPlans,
      fiscalPeriod,
      fiscalMonths,
    ).find((e) => e.id === target.entryId);
    if (!entry) return;
    planMonthly = entry.monthly ?? {};
    rawValue = planMonthly[month];
    rowKey = target.entryId;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = 'salary-plan-amount-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

  let editClosed = false;

  const finish = (save, fillForward = false) => {
    if (editClosed) return;
    editClosed = true;
    td.classList.remove('plan-tax-payment-editing');
    if (save) {
      const parsed = parseSalaryPlanAmountInputWithFillForward(
        input.value,
        fillForward,
        rawValue,
      );
      let nextMonthly;
      if (target.kind === 'simple') {
        const lockedMonths = getPlanTableFillForwardSkipMonths(
          fiscalPeriod,
          fiscalMonths,
          pastMonthSet,
        );
        nextMonthly = fillForward
          ? applyAmountFromMonthForwardSkippingPast(
            planMonthly,
            fiscalMonths,
            month,
            parsed,
            lockedMonths,
          )
          : { ...planMonthly, [month]: parsed };
        input.remove();
        persistTaxPaymentPlanMonthly(target.account, nextMonthly);
        return;
      }
      nextMonthly = fillForward
        ? applyAmountFromMonthForwardSkippingPast(
          planMonthly,
          fiscalMonths,
          month,
          parsed,
          getPlanTableFillForwardSkipMonths(fiscalPeriod, fiscalMonths),
        )
        : { ...planMonthly, [month]: parsed };
      input.remove();
      persistTaxPaymentResidentTaxMonthly(target.entryId, nextMonthly);
      return;
    }
    input.remove();
    td.innerHTML = formatAmount(rawValue, 'item');
  };

  input.addEventListener('keydown', (e) => {
    handlePlanAmountCellKeydown(e, {
      finish,
      td,
      scopeId: 'plan-table-tax-payment',
      allowShiftFillForward: true,
      onTabNext: (nextTd, { nextMonth }) => {
        if (!nextTd || !nextMonth) return;
        requestAnimationFrame(() => {
          startTaxPaymentPlanTableCellEdit(nextTd, {
            target,
            month: nextMonth,
            displayMode,
            pastMonthSet,
          });
        });
      },
    });
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!editClosed) finish(true, false);
    }, 0);
  });

  tagPlanEditableCell(td, { rowKey, month });
  td.classList.add('plan-tax-payment-editing');
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();
}

function shouldShowRevenueAmountInMonth(section, row, month, displayMode, pastMonthSet) {
  if (section.id !== 'revenue' || displayMode !== 'budget-actual') return true;
  if (!pastMonthSet.has(month)) return true;
  if (row.type === 'plan' || row.type === 'man-month') return false;
  if (row.planFillMonths?.includes(month)) return false;
  return true;
}

function shouldShowPlanTableMonthAmount(section, row, month, amountCtx) {
  const { displayMode, pastMonthSet, crossVarianceCtx } = amountCtx;
  return shouldShowCrossVarianceMonth(section, row, month, crossVarianceCtx)
    && shouldShowRevenueAmountInMonth(section, row, month, displayMode, pastMonthSet);
}

function persistRevenueManMonths(clientId, nextManMonths) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const clients = getPeriodClientEntries(revenuePlans, appSettings.fiscalPeriod, fiscalMonths);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;
  revenuePlans = setClientEntry(
    revenuePlans,
    appSettings.fiscalPeriod,
    { ...client, manMonths: nextManMonths },
    fiscalMonths,
  );
  refreshSectionColors();
  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));
  applyRevenueManMonthEditDom(root.querySelector('.plan-table'), clientId);
}

/** 人月編集後: 売上・利益の該当セルだけ DOM 更新する */
function applyRevenueManMonthEditDom(table, clientId) {
  if (!table || !data) return;
  const amountCtx = getPlanTableAmountContext();
  const revenueSection = data.sections.find((s) => s.id === 'revenue');
  if (!revenueSection) return;

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const client = getClientEntry(revenuePlans, appSettings.fiscalPeriod, clientId, fiscalMonths);

  const parentRowIds = new Set();
  for (const row of revenueSection.rows) {
    if (row.type === 'man-month' && row.revenueClientId === clientId) {
      parentRowIds.add(row.parentRevenueRowId);
    }
  }
  if (client) {
    for (const row of revenueSection.rows) {
      if (row.type === 'total' || row.type === 'man-month') continue;
      if (row.label === client.accountLabel && row.subLabel === client.subLabel) {
        parentRowIds.add(row.id);
      }
    }
  }

  for (const tr of [...table.querySelectorAll('tbody tr[data-section-id="revenue"][data-row-id]')]) {
    const row = revenueSection.rows.find((r) => r.id === tr.dataset.rowId);
    if (!row) {
      if (tr.dataset.rowId?.endsWith('-mm')) tr.remove();
      continue;
    }
    const shouldUpdate = row.type === 'total'
      || (row.type === 'man-month' && row.revenueClientId === clientId)
      || parentRowIds.has(row.id);
    if (!shouldUpdate) continue;
    if (row.type === 'man-month') {
      updatePlanTableManMonthRowCells(tr, revenueSection, row, amountCtx);
    } else {
      updatePlanTableRevenueAmountRowCells(tr, revenueSection, row, amountCtx);
    }
  }

  const profitSection = data.sections.find((s) => s.id === 'profit');
  if (!profitSection) return;
  for (const tr of table.querySelectorAll('tbody tr[data-section-id="profit"][data-row-id]')) {
    const row = profitSection.rows.find((r) => r.id === tr.dataset.rowId);
    if (!row || !rowVisibleInSection(profitSection, row)) continue;
    updatePlanTableProfitRowCells(tr, profitSection, row, amountCtx);
  }
}

function updatePlanTableManMonthRowCells(tr, section, row, amountCtx) {
  const { displayMode, pastMonthSet } = amountCtx;
  const monthTds = tr.querySelectorAll('td.col-amount-month');
  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const td = monthTds[mi];
    if (!td || td.querySelector('input')) continue;
    const m = FISCAL_MONTHS[mi];
    const val = row.values[m];
    td.classList.toggle(
      'plan-amount-variance',
      shouldHighlightMonthDeltaFromPrevious(section, row, mi, displayMode, pastMonthSet),
    );
    td.textContent = formatManMonths(val);
  }

  const extraTds = tr.querySelectorAll('td.col-amount-extra');
  for (let ei = 0; ei < EXTRA_COLUMNS.length; ei += 1) {
    const td = extraTds[ei];
    if (!td || td.querySelector('input')) continue;
    td.textContent = formatManMonths(row.values[EXTRA_COLUMNS[ei]]);
  }
}

function updatePlanTableRevenueAmountRowCells(tr, section, row, amountCtx) {
  const { displayMode, pastMonthSet, crossVarianceCtx } = amountCtx;
  const amountType = row.type === 'variance' ? 'variance' : 'item';
  const hideGroupTotal = row.type === 'group'
    && expandedGroups.has(row.id)
    && isHideTotalWhenExpanded(section.id, row.label, expandConfig);
  const monthTds = tr.querySelectorAll('td.col-amount-month');
  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const td = monthTds[mi];
    if (!td) continue;
    const m = FISCAL_MONTHS[mi];
    const val = row.values[m];
    td.classList.toggle(
      'has-variance',
      (row.type === 'variance' || row.type === 'sub-variance') && val !== 0,
    );
    td.classList.toggle(
      'plan-amount-variance',
      shouldHighlightMonthDeltaFromPrevious(section, row, mi, displayMode, pastMonthSet),
    );
    td.classList.toggle('plan-amount-filled', Boolean(row.planFillMonths?.includes(m)));
    const showAmount = shouldShowPlanTableMonthAmount(section, row, m, amountCtx);
    const hasDrilldown = !hideGroupTotal
      && showAmount
      && isDrilldownAvailable(section, row)
      && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
      && !row.planFillMonths?.includes(m)
      && !row.openingAdjustMonths?.includes(m);
    td.classList.toggle('col-amount-drilldown', hasDrilldown);
    td.ondblclick = hasDrilldown ? () => showJournalPopup(section, row, m) : null;
    if (!showAmount || hideGroupTotal) {
      td.innerHTML = '';
      td.removeAttribute('title');
      continue;
    }
    td.innerHTML = formatAmount(val, amountType);
    const drilldownHint = hasDrilldown ? 'ダブルクリックで仕訳を表示' : '';
    applyAggregateCellTooltip(td, row, section, m, drilldownHint);
  }

  const extraTds = tr.querySelectorAll('td.col-amount-extra');
  for (let ei = 0; ei < EXTRA_COLUMNS.length; ei += 1) {
    const col = EXTRA_COLUMNS[ei];
    const td = extraTds[ei];
    if (!td) continue;
    td.classList.toggle(
      'has-variance',
      (row.type === 'variance' || row.type === 'sub-variance') && (row.values[col] ?? 0) !== 0,
    );
    td.innerHTML = formatAmount(row.values[col], amountType);
    applyAggregateCellTooltip(td, row, section, col);
  }
}

function updatePlanTableProfitRowCells(tr, section, row, amountCtx) {
  const { crossVarianceCtx } = amountCtx;
  const amountType = row.type === 'variance' ? 'variance' : 'item';
  const monthTds = tr.querySelectorAll('td.col-amount-month');
  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const td = monthTds[mi];
    if (!td) continue;
    const m = FISCAL_MONTHS[mi];
    const val = row.values[m];
    td.classList.toggle(
      'has-variance',
      (row.type === 'variance' || row.type === 'sub-variance') && val !== 0,
    );
    const showAmount = shouldShowCrossVarianceMonth(section, row, m, crossVarianceCtx);
    td.innerHTML = showAmount ? formatAmount(val, amountType) : '';
    if (showAmount) {
      applyAggregateCellTooltip(
        td,
        row,
        section,
        m,
        td.classList.contains('col-amount-drilldown') ? 'ダブルクリックで仕訳を表示' : '',
      );
    }
  }

  const extraTds = tr.querySelectorAll('td.col-amount-extra');
  for (let ei = 0; ei < EXTRA_COLUMNS.length; ei += 1) {
    const col = EXTRA_COLUMNS[ei];
    const td = extraTds[ei];
    if (!td) continue;
    td.classList.toggle(
      'has-variance',
      (row.type === 'variance' || row.type === 'sub-variance') && (row.values[col] ?? 0) !== 0,
    );
    td.innerHTML = formatAmount(row.values[col], amountType);
    applyAggregateCellTooltip(td, row, section, col);
  }
}

function startRevenueManMonthCellEdit(td, {
  clientId,
  month,
  displayMode,
  pastMonthSet,
}) {
  if (!isRevenueManMonthMonthEditable(month, displayMode, pastMonthSet)) return;
  if (td.querySelector('input')) return;

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const clients = getPeriodClientEntries(revenuePlans, appSettings.fiscalPeriod, fiscalMonths);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;

  const editStartValue = client.manMonths[month] ?? null;

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.className = 'salary-plan-amount-input plan-man-month-amount-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = editStartValue != null && editStartValue !== 0 ? String(editStartValue) : '';

  let editClosed = false;

  const finish = (save, fillForward = false) => {
    if (editClosed) return;
    editClosed = true;
    td.classList.remove('plan-man-month-editing');
    if (save) {
      const parsed = fillForward
        ? parseSalaryPlanAmountInputWithFillForward(input.value, true, editStartValue)
        : parseManMonthInput(input.value);
      const latestClient = getPeriodClientEntries(revenuePlans, appSettings.fiscalPeriod, fiscalMonths)
        .find((c) => c.id === clientId);
      const baseManMonths = latestClient?.manMonths ?? client.manMonths;
      const fillForwardSkipMonths = getPlanTableFillForwardSkipMonths(
        appSettings.fiscalPeriod,
        fiscalMonths,
        pastMonthSet,
      );
      const nextManMonths = fillForward
        ? applyManMonthsFromMonthForward(
          baseManMonths,
          month,
          parsed,
          fillForwardSkipMonths,
          fiscalMonths,
        )
        : { ...baseManMonths, [month]: parsed };
      input.remove();
      persistRevenueManMonths(clientId, nextManMonths);
      return;
    }
    input.remove();
    td.textContent = formatManMonths(editStartValue);
  };

  input.addEventListener('keydown', (e) => {
    handlePlanAmountCellKeydown(e, {
      finish,
      td,
      allowShiftFillForward: true,
      onTabNext: (nextTd, { nextMonth }) => {
        if (!nextTd || !nextMonth) return;
        requestAnimationFrame(() => {
          startRevenueManMonthCellEdit(nextTd, {
            clientId,
            month: nextMonth,
            displayMode,
            pastMonthSet,
          });
        });
      },
    });
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!editClosed) finish(true, false);
    }, 0);
  });

  td.classList.add('plan-man-month-editing');
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();
}

function persistOutsourcingVendorMonthly(vendorId, nextMonthly) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const vendor = getVendorEntry(outsourcingPlans, appSettings.fiscalPeriod, vendorId, fiscalMonths);
  if (!vendor) return;
  outsourcingPlans = setVendorEntry(
    outsourcingPlans,
    appSettings.fiscalPeriod,
    { ...vendor, monthly: nextMonthly },
    fiscalMonths,
  );
  syncPlanDataToCurrentPeriod();
  refreshPlanTable();
}

function startOutsourcingPlanCellEdit(td, {
  vendorId,
  month,
  displayMode,
  pastMonthSet,
}) {
  if (!isOutsourcingPlanMonthEditable(month, displayMode, pastMonthSet)) return;
  if (td.querySelector('input')) return;

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const vendor = getVendorEntry(outsourcingPlans, appSettings.fiscalPeriod, vendorId, fiscalMonths);
  if (!vendor) return;

  const rawValue = vendor.monthly[month];

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = 'salary-plan-amount-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

  let editClosed = false;

  const finish = (save, fillForward = false) => {
    if (editClosed) return;
    editClosed = true;
    td.classList.remove('plan-outsourcing-editing');
    if (save) {
      const parsed = parseSalaryPlanAmountInputWithFillForward(
        input.value,
        fillForward,
        rawValue,
      );
      const lockedMonths = getPlanTableFillForwardSkipMonths(
        appSettings.fiscalPeriod,
        fiscalMonths,
        pastMonthSet,
      );
      const nextMonthly = fillForward
        ? applyAmountFromMonthForwardSkippingPast(
          vendor.monthly,
          fiscalMonths,
          month,
          parsed,
          lockedMonths,
        )
        : { ...vendor.monthly, [month]: parsed };
      input.remove();
      persistOutsourcingVendorMonthly(vendorId, nextMonthly);
      return;
    }
    input.remove();
    td.innerHTML = formatAmount(rawValue, 'item');
  };

  input.addEventListener('keydown', (e) => {
    handlePlanAmountCellKeydown(e, {
      finish,
      td,
      scopeId: 'plan-table-outsourcing',
      onTabNext: (nextTd, { nextMonth }) => {
        if (!nextTd || !nextMonth) return;
        requestAnimationFrame(() => {
          startOutsourcingPlanCellEdit(nextTd, {
            vendorId,
            month: nextMonth,
            displayMode,
            pastMonthSet,
          });
        });
      },
    });
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!editClosed) finish(true, false);
    }, 0);
  });

  td.classList.add('plan-outsourcing-editing');
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();
}

function persistEmployeeSalaryPlanMonthly(employeeId, nextMonthly) {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return;
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const plan = getEmployeeSalaryPlan(
    salaryPlans,
    appSettings.fiscalPeriod,
    employeeId,
    emp,
    fiscalMonths,
  );
  salaryPlans = setEmployeeSalaryPlan(
    salaryPlans,
    appSettings.fiscalPeriod,
    employeeId,
    { ...plan, monthly: nextMonthly },
  );
  syncPlanDataToCurrentPeriod();
  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));
  refreshPlanTable();
}

function persistEmployeeSalaryPlanBonusMonthly(employeeId, nextBonusMonthly) {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return;
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const plan = getEmployeeSalaryPlan(
    salaryPlans,
    appSettings.fiscalPeriod,
    employeeId,
    emp,
    fiscalMonths,
  );
  salaryPlans = setEmployeeSalaryPlan(
    salaryPlans,
    appSettings.fiscalPeriod,
    employeeId,
    { ...plan, bonusMonthly: nextBonusMonthly },
  );
  syncPlanDataToCurrentPeriod();
  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));
  refreshPlanTable();
}

function isEmployeeSalaryPlanBonusMonth(month, fiscalPeriod, fiscalMonths, emp) {
  if (isDirectorEmployee(emp)) return false;
  const bonusMonthLabels = bonusPaymentMonthLabels(
    getBonusPaymentMonths(salaryPlanSettings, fiscalPeriod, fiscalMonths),
  );
  return bonusMonthLabels.includes(month);
}

function startEmployeeSalaryPlanCellEdit(td, {
  employeeId,
  month,
  displayMode,
  pastMonthSet,
}) {
  if (!isEmployeeSalaryPlanMonthEditable(month, displayMode, pastMonthSet)) return;
  if (td.querySelector('input')) return;

  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return;

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const fiscalPeriod = appSettings.fiscalPeriod;
  const plan = getEmployeeSalaryPlan(
    salaryPlans,
    fiscalPeriod,
    employeeId,
    emp,
    fiscalMonths,
  );
  const isBonusMonth = isEmployeeSalaryPlanBonusMonth(month, fiscalPeriod, fiscalMonths, emp);
  const rawValue = isBonusMonth ? plan.bonusMonthly[month] : plan.monthly[month];

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = 'salary-plan-amount-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

  let editClosed = false;

  const finish = (save, fillForward = false) => {
    if (editClosed) return;
    editClosed = true;
    td.classList.remove('plan-employee-salary-editing');
    if (save) {
      const parsed = parseSalaryPlanAmountInputWithFillForward(
        input.value,
        fillForward,
        rawValue,
      );
      input.remove();
      if (isBonusMonth) {
        persistEmployeeSalaryPlanBonusMonthly(employeeId, {
          ...plan.bonusMonthly,
          [month]: parsed,
        });
        return;
      }
      const lockedMonths = getPlanTableFillForwardSkipMonths(
        fiscalPeriod,
        fiscalMonths,
        pastMonthSet,
      );
      const nextMonthly = fillForward
        ? applyAmountFromMonthForwardSkippingPast(
          plan.monthly,
          fiscalMonths,
          month,
          parsed,
          lockedMonths,
        )
        : { ...plan.monthly, [month]: parsed };
      persistEmployeeSalaryPlanMonthly(employeeId, nextMonthly);
      return;
    }
    input.remove();
    const monthly = plan.monthly[month] ?? 0;
    const bonus = plan.bonusMonthly[month] ?? 0;
    td.innerHTML = formatAmount(monthly + bonus, 'item');
  };

  input.addEventListener('keydown', (e) => {
    handlePlanAmountCellKeydown(e, {
      finish,
      td,
      scopeId: 'plan-table-employee-salary',
      allowShiftFillForward: !isBonusMonth,
      onTabNext: (nextTd, { nextMonth }) => {
        if (!nextTd || !nextMonth) return;
        requestAnimationFrame(() => {
          startEmployeeSalaryPlanCellEdit(nextTd, {
            employeeId,
            month: nextMonth,
            displayMode,
            pastMonthSet,
          });
        });
      },
    });
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!editClosed) finish(true, false);
    }, 0);
  });

  td.classList.add('plan-employee-salary-editing');
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();
}

function persistOvertimePlanMonthly(nextOvertimeMonthly) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  salaryPlanSettings = setOvertimePlan(
    salaryPlanSettings,
    appSettings.fiscalPeriod,
    nextOvertimeMonthly,
    fiscalMonths,
  );
  syncPlanDataToCurrentPeriod();
  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));
  refreshPlanTable();
}

function startOvertimePlanTableCellEdit(td, {
  month,
  displayMode,
  pastMonthSet,
}) {
  if (!isOvertimePlanMonthEditable(month, displayMode, pastMonthSet)) return;
  if (td.querySelector('input')) return;

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const fiscalPeriod = appSettings.fiscalPeriod;
  const overtime = getOvertimePlan(salaryPlanSettings, fiscalPeriod, fiscalMonths);
  const rawValue = overtime[month];

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = 'salary-plan-amount-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

  let editClosed = false;

  const finish = (save, fillForward = false) => {
    if (editClosed) return;
    editClosed = true;
    td.classList.remove('plan-overtime-editing');
    if (save) {
      const parsed = parseSalaryPlanAmountInputWithFillForward(
        input.value,
        fillForward,
        rawValue,
      );
      const lockedMonths = getPlanTableFillForwardSkipMonths(
        fiscalPeriod,
        fiscalMonths,
        pastMonthSet,
      );
      const nextOvertime = fillForward
        ? applyAmountFromMonthForwardSkippingPast(
          overtime,
          fiscalMonths,
          month,
          parsed,
          lockedMonths,
        )
        : { ...overtime, [month]: parsed };
      input.remove();
      persistOvertimePlanMonthly(nextOvertime);
      return;
    }
    input.remove();
    td.innerHTML = formatAmount(rawValue ?? 0, 'item');
  };

  input.addEventListener('keydown', (e) => {
    handlePlanAmountCellKeydown(e, {
      finish,
      td,
      scopeId: 'plan-table-overtime',
      onTabNext: (nextTd, { nextMonth }) => {
        if (!nextTd || !nextMonth) return;
        requestAnimationFrame(() => {
          startOvertimePlanTableCellEdit(nextTd, {
            month: nextMonth,
            displayMode,
            pastMonthSet,
          });
        });
      },
    });
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!editClosed) finish(true, false);
    }, 0);
  });

  td.classList.add('plan-overtime-editing');
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();
}

function closeRowContextMenu() {
  rowContextMenuCleanup?.();
  rowContextMenuCleanup = null;
  rowContextMenuEl?.remove();
  rowContextMenuEl = null;
}

function appendContextMenuSeparator(menu) {
  const sep = document.createElement('div');
  sep.className = 'plan-row-context-menu-sep';
  sep.setAttribute('role', 'separator');
  menu.appendChild(sep);
}

function appendContextMenuHeading(menu, text) {
  const heading = document.createElement('div');
  heading.className = 'plan-row-context-menu-heading';
  heading.textContent = text;
  menu.appendChild(heading);
}

function appendContextMenuItem(menu, {
  label, checked = false, indeterminate = false, disabled = false, onSelect,
}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'plan-row-context-menu-item';
  btn.disabled = disabled;
  const mark = indeterminate ? '−' : (checked ? '✓' : '');
  btn.innerHTML =
    `<span class="plan-row-context-menu-check" aria-hidden="true">${mark}</span>`
    + `<span class="plan-row-context-menu-label">${label}</span>`;
  if (!disabled && onSelect) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect();
      closeRowContextMenu();
    });
  }
  menu.appendChild(btn);
  return btn;
}

function positionContextMenu(menu, clientX, clientY) {
  menu.style.visibility = 'hidden';
  menu.style.left = '0';
  menu.style.top = '0';
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  menu.style.left = `${Math.max(8, Math.min(clientX, maxX))}px`;
  menu.style.top = `${Math.max(8, Math.min(clientY, maxY))}px`;
  menu.style.visibility = '';
}

function showRowContextMenu(clientX, clientY, targets) {
  closeRowContextMenu();
  if (!targets.length) return;

  const menu = document.createElement('div');
  menu.className = 'plan-row-context-menu';
  menu.setAttribute('role', 'menu');

  const title = document.createElement('div');
  title.className = 'plan-row-context-menu-title';
  if (targets.length === 1) {
    title.textContent = formatContextMenuRowTitle(targets[0].section, targets[0].row);
  } else {
    title.textContent = `${targets.length}行を選択`;
  }
  menu.appendChild(title);

  const multi = targets.length > 1;
  const visibilityTargets = targets.filter(({ section }) => !isVisibilityFixedSection(section.id));
  const visibilityState = bulkToggleState(
    visibilityTargets.map(({ section, row }) => isRowVisible(section.id, row, visibilityConfig)),
  );
  if (visibilityTargets.length > 0) {
    appendContextMenuHeading(menu, '表示');
    appendContextMenuItem(menu, {
      label: multi ? '選択行を非表示' : (visibilityState.all ? 'この行を非表示' : 'この行を表示'),
      onSelect: () => {
        visibilityConfig = { ...visibilityConfig };
        for (const { section, row } of visibilityTargets) {
          const key = visibilityRowKey(section.id, row);
          if (multi || visibilityState.all) visibilityConfig[key] = false;
          else delete visibilityConfig[key];
        }
        saveVisibilityConfig(visibilityConfig);
        if (multi) selectedPlanRowKeys.clear();
        renderTable();
      },
    });
  }

  const styleTargets = dedupeTargetsByRowKey(targets.filter(
    ({ section, row }) => !planRowHasAccentBackground(section, row)
      && !isVisibilityFixedSection(section.id),
  ));
  const largeState = bulkToggleState(
    styleTargets.map(({ section, row }) =>
      getRowDisplayEntry(rowDisplayConfig, section.id, row).largeDisplay),
  );
  const fill1State = bulkToggleState(
    styleTargets.map(({ section, row }) =>
      getRowDisplayEntry(rowDisplayConfig, section.id, row).fillColor1),
  );
  const fill2State = bulkToggleState(
    styleTargets.map(({ section, row }) =>
      getRowDisplayEntry(rowDisplayConfig, section.id, row).fillColor2),
  );

  appendContextMenuSeparator(menu);
  appendContextMenuHeading(menu, '行の見た目');
  appendContextMenuItem(menu, {
    label: '大きく表示',
    checked: largeState.all,
    indeterminate: largeState.mixed,
    disabled: !styleTargets.length,
    onSelect: () => {
      applyRowDisplayPatch(styleTargets, { largeDisplay: largeState.next });
      applyPlanRowDisplayState(root.querySelector('.plan-table'), styleTargets);
    },
  });
  appendContextMenuItem(menu, {
    label: '塗り色１（注目）',
    checked: fill1State.all,
    indeterminate: fill1State.mixed,
    disabled: !styleTargets.length,
    onSelect: () => {
      applyRowDisplayPatch(styleTargets, { fillColor1: fill1State.next });
      applyPlanRowDisplayState(root.querySelector('.plan-table'), styleTargets);
    },
  });
  appendContextMenuItem(menu, {
    label: '塗り色２（注意）',
    checked: fill2State.all,
    indeterminate: fill2State.mixed,
    disabled: !styleTargets.length,
    onSelect: () => {
      applyRowDisplayPatch(styleTargets, { fillColor2: fill2State.next });
      applyPlanRowDisplayState(root.querySelector('.plan-table'), styleTargets);
    },
  });

  const expandMenuTargets = collectExpandMenuTargets(targets);
  const collapsibleTargets = expandMenuTargets.filter(
    ({ section }) => !ALWAYS_EXPAND_SECTION_IDS.has(section.id),
  );

  if (expandMenuTargets.length > 0) {
    const collapsibleState = bulkToggleState(
      collapsibleTargets.map(({ section, account }) =>
        getExpandEntry(expandConfig, section.id, account).collapsible),
    );
    const hideTotalTargets = collapsibleTargets.filter(({ section, account }) =>
      getExpandEntry(expandConfig, section.id, account).collapsible);
    const hideTotalState = bulkToggleState(
      hideTotalTargets.map(({ section, account }) =>
        getExpandEntry(expandConfig, section.id, account).hideTotalWhenExpanded),
    );
    const sessionTargets = collapsibleTargets
      .map(({ section, account }) => {
        const groupRow = findGroupRowForExpand(section, account);
        return groupRow ? { section, account, row: groupRow } : null;
      })
      .filter(Boolean);
    const expandedState = bulkToggleState(
      sessionTargets.map(({ row }) => expandedGroups.has(row.id)),
    );

    appendContextMenuSeparator(menu);
    appendContextMenuHeading(menu, '展開設定');
    appendContextMenuItem(menu, {
      label: '折りたたむ',
      checked: collapsibleState.all,
      indeterminate: collapsibleState.mixed,
      disabled: !collapsibleTargets.length,
      onSelect: () => {
        for (const { section, account } of collapsibleTargets) {
          expandConfig = setExpandEntry(expandConfig, section.id, account, {
            collapsible: collapsibleState.next,
          });
        }
        saveExpandConfig(expandConfig);
        rebuildPlanData();
        renderTable();
      },
    });
    appendContextMenuItem(menu, {
      label: '展開時に合計非表示',
      checked: hideTotalState.all,
      indeterminate: hideTotalState.mixed,
      disabled: !hideTotalTargets.length,
      onSelect: () => {
        for (const { section, account } of hideTotalTargets) {
          expandConfig = setExpandEntry(expandConfig, section.id, account, {
            hideTotalWhenExpanded: hideTotalState.next,
          });
        }
        saveExpandConfig(expandConfig);
        applyPlanGroupExpandState(root.querySelector('.plan-table'));
      },
    });
    if (sessionTargets.length > 0) {
      const expandLabel = multi
        ? (expandedState.all ? '選択行の補助科目を折りたたむ' : '選択行の補助科目を展開')
        : (expandedState.all ? '補助科目を折りたたむ' : '補助科目を展開');
      appendContextMenuItem(menu, {
        label: expandLabel,
        onSelect: () => {
          for (const { row } of sessionTargets) {
            if (expandedState.all) expandedGroups.delete(row.id);
            else expandedGroups.add(row.id);
          }
          applyPlanGroupExpandState(root.querySelector('.plan-table'));
        },
      });
    }
  }

  positionContextMenu(menu, clientX, clientY);
  rowContextMenuEl = menu;

  const onDismiss = () => closeRowContextMenu();
  const controller = new AbortController();
  const { signal } = controller;
  rowContextMenuCleanup = () => controller.abort();

  document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target)) onDismiss();
  }, { signal, capture: true });
  window.addEventListener('scroll', onDismiss, { signal, capture: true });
  window.addEventListener('resize', onDismiss, { signal });
}

function formatExpandSettingsContextMenuTitle(candidate) {
  return `${candidate.sectionLabel} — ${candidate.account}`;
}

function showExpandSettingsContextMenu(clientX, clientY, candidates) {
  closeRowContextMenu();
  if (!candidates.length) return;

  const menu = document.createElement('div');
  menu.className = 'plan-row-context-menu';
  menu.setAttribute('role', 'menu');

  const title = document.createElement('div');
  title.className = 'plan-row-context-menu-title';
  if (candidates.length === 1) {
    title.textContent = formatExpandSettingsContextMenuTitle(candidates[0]);
  } else {
    title.textContent = `${candidates.length}件を選択`;
  }
  menu.appendChild(title);

  const multi = candidates.length > 1;
  const collapsibleTargets = candidates.filter(
    (c) => !ALWAYS_EXPAND_SECTION_IDS.has(c.sectionId),
  );
  const collapsibleState = bulkToggleState(
    collapsibleTargets.map((c) =>
      getExpandEntry(expandConfig, c.sectionId, c.account).collapsible),
  );
  const hideTotalTargets = collapsibleTargets.filter((c) =>
    getExpandEntry(expandConfig, c.sectionId, c.account).collapsible);
  const hideTotalState = bulkToggleState(
    hideTotalTargets.map((c) =>
      getExpandEntry(expandConfig, c.sectionId, c.account).hideTotalWhenExpanded),
  );
  const hasCustomEntry = candidates.some(
    (c) => Object.prototype.hasOwnProperty.call(
      expandConfig,
      expandConfigKey(c.sectionId, c.account),
    ),
  );

  appendContextMenuItem(menu, {
    label: '折りたたむ',
    checked: collapsibleState.all,
    indeterminate: collapsibleState.mixed,
    disabled: !collapsibleTargets.length,
    onSelect: () => {
      for (const c of collapsibleTargets) {
        expandConfig = setExpandEntry(expandConfig, c.sectionId, c.account, {
          collapsible: collapsibleState.next,
        });
      }
      saveExpandConfig(expandConfig);
      rebuildPlanData();
      if (activeTab === 'visibility') renderVisibilitySettings();
    },
  });
  appendContextMenuItem(menu, {
    label: '展開時に合計非表示',
    checked: hideTotalState.all,
    indeterminate: hideTotalState.mixed,
    disabled: !hideTotalTargets.length,
    onSelect: () => {
      for (const c of hideTotalTargets) {
        expandConfig = setExpandEntry(expandConfig, c.sectionId, c.account, {
          hideTotalWhenExpanded: hideTotalState.next,
        });
      }
      saveExpandConfig(expandConfig);
      if (activeTab === 'visibility') renderVisibilitySettings();
    },
  });
  if (!multi && hasCustomEntry) {
    appendContextMenuItem(menu, {
      label: 'デフォルトに戻す',
      onSelect: () => {
        const c = candidates[0];
        const key = expandConfigKey(c.sectionId, c.account);
        expandConfig = { ...expandConfig };
        delete expandConfig[key];
        saveExpandConfig(expandConfig);
        rebuildPlanData();
        if (activeTab === 'visibility') renderVisibilitySettings();
      },
    });
  }

  positionContextMenu(menu, clientX, clientY);
  rowContextMenuEl = menu;

  const onDismiss = () => closeRowContextMenu();
  const controller = new AbortController();
  const { signal } = controller;
  rowContextMenuCleanup = () => controller.abort();

  document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target)) onDismiss();
  }, { signal, capture: true });
  window.addEventListener('scroll', onDismiss, { signal, capture: true });
  window.addEventListener('resize', onDismiss, { signal });
}

function bindExpandSettingsContextMenu(wrap, table) {
  const prev = expandSettingsContextMenuControllers.get(wrap);
  prev?.abort();

  const tbody = table.tBodies[0];
  if (!tbody) return;

  const controller = new AbortController();
  const { signal } = controller;
  expandSettingsContextMenuControllers.set(wrap, controller);

  tbody.addEventListener('contextmenu', (e) => {
    const tr = e.target.closest('tr');
    if (!tr || tr.parentElement !== tbody) return;
    const { sectionId, account } = tr.dataset;
    if (!sectionId || !account) return;
    e.preventDefault();
    const candidate = findExpandCandidate(sectionId, account);
    if (!candidate) return;
    showExpandSettingsContextMenu(e.clientX, e.clientY, [candidate]);
  }, { signal });
}

function bindRowContextMenu(wrap, table) {
  const prev = rowContextMenuControllers.get(wrap);
  prev?.abort();

  const tbody = table.tBodies[0];
  if (!tbody) return;

  const controller = new AbortController();
  const { signal } = controller;
  rowContextMenuControllers.set(wrap, controller);

  tbody.addEventListener('click', (e) => {
    if (e.target.closest('.row-toggle') && !(e.ctrlKey || e.metaKey) && !e.shiftKey) return;
    const tr = e.target.closest('tr');
    if (!tr || tr.parentElement !== tbody) return;
    if (!tr.dataset.rowKey) return;

    handlePlanRowSelectClick(tr, table, e);
  }, { signal });

  tbody.addEventListener('contextmenu', (e) => {
    const tr = e.target.closest('tr');
    if (!tr || tr.parentElement !== tbody) return;
    const { sectionId, rowKey } = tr.dataset;
    if (!sectionId || !rowKey) return;
    e.preventDefault();
    ensureRowInSelection(tr, table);
    const targets = getSelectedPlanRows();
    if (!targets.length) return;
    showRowContextMenu(e.clientX, e.clientY, targets);
  }, { signal });

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (wrap.contains(e.target)) return;
    clearRowSelection(table);
  }, { signal, capture: true });
}

function resetPlanTableColumnWidthVars(table) {
  for (const prop of [
    '--plan-col-category-w',
    '--plan-col-label-w',
    '--plan-col-sub-w',
    '--plan-col-amount-month-w',
    '--plan-col-amount-extra-w',
    '--plan-col-label-left',
    '--plan-col-sub-left',
  ]) {
    table.style.removeProperty(prop);
  }
}

/** 列内容を走査し、改行なしで収まる自然幅を計測する（適用はしない・強制リフローは 1 回） */
function measureNaturalPlanTableColumnWidths(table) {
  resetPlanTableColumnWidthVars(table);
  table.classList.add('plan-table-measuring');

  const hasData = Boolean(data?.sections);
  const categoryW = maxPlanCategoryCellScrollWidth(table);
  let labelW;
  let subW;
  if (hasData) {
    const { labelSpecs, subEntries } = collectPlanColumnWidthCandidates(data);
    labelW = Math.max(
      maxPlanCellScrollWidth(table.querySelectorAll('tbody .col-label')),
      measureLabelColumnWidth(table, labelSpecs),
    );
    subW = Math.max(
      maxPlanCellScrollWidth(table.querySelectorAll('thead .month-row th.col-sub')),
      maxPlanCellScrollWidth(table.querySelectorAll('tbody .col-sub')),
      measureSubColumnWidth(table, subEntries),
    );
  } else {
    labelW = maxPlanCellScrollWidth(table.querySelectorAll(':is(th, td).col-label'));
    subW = maxPlanCellScrollWidth(table.querySelectorAll(':is(th, td).col-sub'));
  }

  // 金額列は内容ぴったりだと窮屈なので、数字 1 桁分の余白を自然幅に含める
  const digitW = planAmountDigitWidth(table);
  const monthScale = readPlanTableScale(table, '--plan-col-amount-month-scale');
  const monthW = Math.ceil(Math.max(
    maxAmountCellScrollWidth(table.querySelectorAll('tbody .col-amount-month')),
    maxAmountCellScrollWidth(table.querySelectorAll('thead .col-amount-month')),
  ) * monthScale) + digitW;
  const extraW = Math.max(
    maxAmountCellScrollWidth(table.querySelectorAll('tbody .col-amount-extra')),
    maxPlanCellScrollWidth(table.querySelectorAll('thead .col-amount-extra')),
  ) + digitW;

  table.classList.remove('plan-table-measuring');
  return { categoryW, labelW, subW, monthW, extraW };
}

/** 金額 1 桁分の目安幅。フォント倍率に比例するため 1 パス計算の線形性を崩さない */
function planAmountDigitWidth(table) {
  const fontPx = parseFloat(getComputedStyle(table).fontSize) || 12;
  return Math.ceil(fontPx * 0.8);
}

/** 計測済みの列幅を適用し、余白配分・見切れ補正・付随レイアウトを更新する（計算のみで再計測しない） */
function finalizePlanTableColumnWidths(table, widths) {
  applyPlanTableColumnWidths(table, widths);

  let fitted = fitPlanTableColumnsToViewport(table, widths);
  const availableW = getPlanTableAvailableWidth(table);
  fitted = shrinkPlanTableFlexColumnsToFit(table, fitted, availableW);
  applyPlanTableColumnWidths(table, fitted);

  if (planTableOverflowsWrapContent(table)) {
    fitted = shrinkPlanTableFlexColumnsToFit(
      table,
      readPlanTableColumnWidths(table),
      availableW - 1,
    );
    applyPlanTableColumnWidths(table, fitted);
  }

  const yearRow = table.querySelector('.year-row');
  if (yearRow) {
    table.style.setProperty('--plan-thead-year-h', `${yearRow.offsetHeight}px`);
  }

  const wrap = table.closest('.plan-table-wrap');
  if (wrap) syncPlanColumnPlates(wrap, table);
}

function abortActivePlanTableColumnWidthSync() {
  activePlanTableColumnWidthAbort?.abort();
  activePlanTableColumnWidthAbort = null;
}

function bindPlanTableColumnWidthSync(wrap, table) {
  abortActivePlanTableColumnWidthSync();

  const prev = planTableColumnWidthControllers.get(wrap);
  prev?.abort();

  const controller = new AbortController();
  const { signal } = controller;
  activePlanTableColumnWidthAbort = controller;
  planTableColumnWidthControllers.set(wrap, controller);

  // 初期幅を控えておき、ResizeObserver の初回発火（observe 直後）で二重レイアウトしない。
  // 1px 未満の変化はフォント変更に伴う rem 余白の揺れなので無視する（振動防止）
  let raf = null;
  let lastSyncAvailableWidth = getPlanTableAvailableWidth(table);
  const schedule = () => {
    if (!table.isConnected) return;
    const availableW = getPlanTableAvailableWidth(table);
    if (availableW > 0 && Math.abs(availableW - lastSyncAvailableWidth) < 1) return;
    lastSyncAvailableWidth = availableW;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = null;
      layoutPlanTableSinglePass(table);
    });
  };

  const observer = new ResizeObserver(schedule);
  const scrollRoot = planBody() ?? wrap;
  observer.observe(table);
  observer.observe(scrollRoot);
  if (scrollRoot !== wrap) observer.observe(wrap);
  window.addEventListener('resize', schedule, { signal });

  signal.addEventListener('abort', () => {
    observer.disconnect();
    if (raf !== null) cancelAnimationFrame(raf);
    if (activePlanTableColumnWidthAbort === controller) {
      activePlanTableColumnWidthAbort = null;
    }
  });
}

/** 保存済み列幅を維持し、ビューポート変化時のみ 1 回レイアウトし直す */
function bindPlanTableColumnWidthViewportFit(wrap, table) {
  abortActivePlanTableColumnWidthSync();

  const prev = planTableColumnWidthControllers.get(wrap);
  prev?.abort();

  const controller = new AbortController();
  const { signal } = controller;
  activePlanTableColumnWidthAbort = controller;
  planTableColumnWidthControllers.set(wrap, controller);

  // 初期幅を控えておき、ResizeObserver の初回発火（observe 直後）で二重レイアウトしない。
  // 1px 未満の変化はフォント変更に伴う rem 余白の揺れなので無視する（振動防止）
  let raf = null;
  let lastSyncAvailableWidth = getPlanTableAvailableWidth(table);
  const schedule = () => {
    if (!table.isConnected) return;
    const availableW = getPlanTableAvailableWidth(table);
    if (availableW > 0 && Math.abs(availableW - lastSyncAvailableWidth) < 1) return;
    lastSyncAvailableWidth = availableW;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = null;
      layoutPlanTableSinglePass(table);
    });
  };

  const observer = new ResizeObserver(schedule);
  const scrollRoot = planBody() ?? wrap;
  observer.observe(table);
  observer.observe(scrollRoot);
  if (scrollRoot !== wrap) observer.observe(wrap);
  window.addEventListener('resize', schedule, { signal });

  signal.addEventListener('abort', () => {
    observer.disconnect();
    if (raf !== null) cancelAnimationFrame(raf);
    if (activePlanTableColumnWidthAbort === controller) {
      activePlanTableColumnWidthAbort = null;
    }
  });
}

const ROW_PADDING_SCALE_STEP = 0.1;
const PLAN_ROW_PADDING_BTN_ICON = {
  up: '<svg class="plan-scale-btn-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 8 6 2 10 8z" fill="currentColor"/></svg>',
  down: '<svg class="plan-scale-btn-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4 6 10 10 4z" fill="currentColor"/></svg>',
};
let planRowPaddingScaleEl = null;
let planViewportColumnWidthRaf = null;
let dashboardViewportFitRaf = null;

/**
 * ダッシュボード表示中にウィンドウ幅が変わったとき、予実表を再レイアウトした場合の
 * content fit 倍率を幅の比から見積もって適用する。
 * これでリサイズ直後とリロード後の見た目が一致する。
 */
function applyDashboardContentFitEstimate() {
  if (!lastPlanTableFitViewportWidth) return false;
  const width = getLayoutViewportWidth();
  if (!width) return false;
  const viewportScale = computeViewportScale(width) || 1;
  // 表の自然幅はフォント実寸（viewport 倍率 × content fit）にほぼ比例するため、
  // 「レイアウト幅の比 ÷ viewport 倍率の比」で再レイアウト相当の fit 倍率が求まる
  const estimated = lastPlanTableContentFitScale
    * (width / lastPlanTableFitViewportWidth)
    * (lastPlanTableFitViewportScale / viewportScale);
  const prev = getContentFitScale();
  setContentFitScale(estimated);
  return Math.abs(getContentFitScale() - prev) > 0.001;
}

/**
 * viewport 倍率が上下限で頭打ちになりリサイズ通知が来ない場合でも、
 * ダッシュボードのフォント倍率（content fit）をウィンドウ幅に追従させる
 */
function scheduleDashboardViewportFitRefresh() {
  if (dashboardViewportFitRaf !== null) cancelAnimationFrame(dashboardViewportFitRaf);
  dashboardViewportFitRaf = requestAnimationFrame(() => {
    dashboardViewportFitRaf = null;
    if (activeTab !== 'dashboard') return;
    if (applyDashboardContentFitEstimate()) applyPlanDisplayScales();
  });
}

function applyPlanViewportScaleChange() {
  if (activeTab === 'dashboard') applyDashboardContentFitEstimate();
  applyPlanDisplayScales();
  applyBrandLogoImageFilters(appSettings, getPlanColorMode());
  invalidatePlanTableLayout();
  if (planViewportColumnWidthRaf !== null) {
    cancelAnimationFrame(planViewportColumnWidthRaf);
  }
  planViewportColumnWidthRaf = requestAnimationFrame(() => {
    planViewportColumnWidthRaf = null;
    const table = root.querySelector('.plan-table');
    if (table && activeTab === 'plan' && data) {
      measurePlanTableColumnWidths(table);
    }
  });
  if (activeTab === 'dashboard') {
    renderDashboardView();
  }
}

function ensurePlanRowPaddingScaleControl() {
  if (planRowPaddingScaleEl) return planRowPaddingScaleEl;

  planRowPaddingScaleEl = document.createElement('div');
  planRowPaddingScaleEl.className = 'plan-row-padding-scale';
  planRowPaddingScaleEl.setAttribute('role', 'group');
  planRowPaddingScaleEl.setAttribute('aria-label', '行の余白');
  planRowPaddingScaleEl.innerHTML = `
    <button type="button" class="plan-row-padding-scale-btn" data-action="inc" aria-label="余白を広く">${PLAN_ROW_PADDING_BTN_ICON.up}</button>
    <span class="plan-row-padding-scale-value" aria-live="polite"></span>
    <button type="button" class="plan-row-padding-scale-btn" data-action="dec" aria-label="余白を狭く">${PLAN_ROW_PADDING_BTN_ICON.down}</button>
  `;
  planRowPaddingScaleEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const delta = btn.dataset.action === 'inc' ? ROW_PADDING_SCALE_STEP : -ROW_PADDING_SCALE_STEP;
    applyPlanRowPaddingScaleSetting(appSettings.rowPaddingScale + delta);
  });
  return planRowPaddingScaleEl;
}

function mountPlanRowPaddingScaleControl() {
  const el = ensurePlanRowPaddingScaleControl();
  const menu = document.getElementById('plan-main-menu');
  if (!menu?.parentElement) {
    refreshPlanRowPaddingScaleControl();
    return;
  }
  if (menu.previousElementSibling !== el) {
    menu.insertAdjacentElement('beforebegin', el);
  }
  refreshPlanRowPaddingScaleControl();
}

function refreshPlanRowPaddingScaleControl() {
  const el = ensurePlanRowPaddingScaleControl();
  const scale = normalizeRowPaddingScale(appSettings.rowPaddingScale);
  el.querySelector('.plan-row-padding-scale-value').textContent = formatRowPaddingScaleMultiplier(scale);
  el.querySelector('[data-action="dec"]').disabled = scale <= MIN_ROW_PADDING_SCALE;
  el.querySelector('[data-action="inc"]').disabled = scale >= MAX_ROW_PADDING_SCALE;
}

function applyPlanRowPaddingScaleSetting(scale) {
  appSettings = { ...appSettings, rowPaddingScale: normalizeRowPaddingScale(scale) };
  saveAppSettings(appSettings);
  // 行間は tbody の上下 padding のみ。列幅・content fit には影響しないので CSS 変数だけ更新する
  applyRowPaddingScale(appSettings.rowPaddingScale);
  refreshPlanRowPaddingScaleControl();
}

function getCurrentSectionFilterIds() {
  return getPlanSectionFilterIds(data?.sections ?? []);
}

function syncSectionFilterConfigToData(forceReload = false) {
  const ids = getCurrentSectionFilterIds();
  if (!ids.length) {
    sectionFilterConfig = {};
    return;
  }
  if (forceReload || !Object.keys(sectionFilterConfig).some((key) => ids.includes(key))) {
    sectionFilterConfig = loadSectionFilterConfig(ids);
    return;
  }
  sectionFilterConfig = normalizeSectionFilterConfig(sectionFilterConfig, ids);
}

function applyPlanSectionFilterState(table) {
  if (!table || !data) return;
  const sectionIds = getCurrentSectionFilterIds();
  const sectionVisibility = new Map();
  for (const section of data.sections) {
    sectionVisibility.set(
      section.id,
      sectionMatchesFilter(section, sectionFilterConfig, sectionIds),
    );
  }
  for (const tr of table.querySelectorAll('tbody tr[data-section-id]')) {
    tr.hidden = !sectionVisibility.get(tr.dataset.sectionId);
  }
}

function handleSectionFilterClick(filterId, ev) {
  const sectionIds = getCurrentSectionFilterIds();
  if (filterId === 'all') {
    sectionFilterConfig = defaultSectionFilterState(sectionIds);
  } else if (ev.ctrlKey || ev.metaKey) {
    sectionFilterConfig = {
      ...sectionFilterConfig,
      [filterId]: sectionFilterConfig[filterId] === false,
    };
  } else if (isSoloSectionFilter(sectionFilterConfig, sectionIds, filterId)) {
    sectionFilterConfig = defaultSectionFilterState(sectionIds);
  } else {
    sectionFilterConfig = Object.fromEntries(
      sectionIds.map((id) => [id, id === filterId]),
    );
  }
  saveSectionFilterConfig(sectionFilterConfig, sectionIds);
  renderToolbar();
  if (activeTab === 'dashboard') {
    switchMainTab('plan');
    return;
  }
  const table = root.querySelector('.plan-table');
  applyPlanSectionFilterState(table);
  const wrap = table?.closest('.plan-table-wrap');
  if (wrap && table) syncPlanColumnPlates(wrap, table);
}

function rowVisibleInSection(section, row) {
  if (!isRowVisible(section.id, row, visibilityConfig)) return false;
  if (row.parentId) {
    const parent = section.rows.find((r) => r.id === row.parentId);
    if (parent && !rowVisibleInSection(section, parent)) return false;
  }
  return true;
}

function getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths) {
  return getSettingsLockedMonths({
    config: monthDisplayConfig,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalMonths,
    currentFiscalPeriod: appSettings.fiscalPeriod,
  });
}

function applyClosedPeriodPlanPurgeIfNeeded() {
  const purged = purgeClosedPeriodPlanStorage({
    businessStartYear: appSettings.businessStartYear,
    revenuePlans,
    salaryPlans,
    salaryPlanSettings,
    taxPaymentPlans,
    outsourcingPlans,
    expensePlanOverrides,
    monthDisplayConfig,
  });
  if (!purged.changed) return false;
  revenuePlans = purged.revenuePlans;
  salaryPlans = purged.salaryPlans;
  salaryPlanSettings = purged.salaryPlanSettings;
  taxPaymentPlans = purged.taxPaymentPlans;
  outsourcingPlans = purged.outsourcingPlans;
  expensePlanOverrides = purged.expensePlanOverrides;
  monthDisplayConfig = purged.monthDisplayConfig;
  saveRevenuePlans(revenuePlans);
  saveSalaryPlans(salaryPlans);
  saveSalaryPlanSettings(salaryPlanSettings);
  saveTaxPaymentPlans(taxPaymentPlans);
  saveOutsourcingPlans(outsourcingPlans);
  saveExpensePlanOverrides(expensePlanOverrides);
  saveMonthDisplayConfig(monthDisplayConfig);
  return true;
}

function buildPlanTablePastMonthSet(displayMode) {
  if (displayMode === 'budget-actual') {
    return buildBudgetActualMonthSets({
      config: monthDisplayConfig,
      businessStartYear: appSettings.businessStartYear,
      fiscalPeriod: appSettings.fiscalPeriod,
      fiscalMonths: FISCAL_MONTHS,
    }).actualMonthSet;
  }
  if (displayMode === 'actual') return new Set(FISCAL_MONTHS);
  return new Set();
}

function applyPlanColors(planData, fiscalPeriod = appSettings.fiscalPeriod) {
  if (!planData) return null;
  const displayMode = getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    fiscalPeriod,
  );
  const enriched = enrichPlanDataWithEmployeeSalaryRows(planData, {
    employees,
    salaryPlans,
    salaryPlanSettings,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    legalWelfareRate: appSettings.legalWelfareRate,
    monthDisplayConfig,
  });
  const withTaxPayments = enrichPlanDataWithTaxPaymentRows(enriched, {
    taxPaymentPlans,
    employees,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    actualSourcePlanData: enriched,
    monthDisplayConfig,
  });
  const withOutsourcing = enrichPlanDataWithOutsourcingRows(withTaxPayments, {
    outsourcingPlans,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    corpEntityMarkers: appSettings.corpEntityMarkers,
    consumptionTaxRates: appSettings.consumptionTaxRates,
    withholdingTaxRates: appSettings.withholdingTaxRates,
    monthDisplayConfig,
  });
  const withRevenue = enrichPlanDataWithRevenueRows(withOutsourcing, {
    revenuePlans,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    consumptionTaxRates: appSettings.consumptionTaxRates,
    monthDisplayConfig,
  });
  const withMiscIncome = enrichPlanDataWithMiscIncomeRows(withRevenue, {
    revenuePlans,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    monthDisplayConfig,
  });
  const withAverages = enrichPlanDataWithPeriodAverageFills(withMiscIncome, {
    expandConfig,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    expensePlanOverrides,
    monthDisplayConfig,
  });
  const withCashOpening = enrichPlanDataWithCashFlowOpeningInflow(withAverages, {
    expandConfig,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    monthDisplayConfig,
  });
  const withCashForecast = enrichPlanDataWithCashFlowForecast(withCashOpening, {
    expandConfig,
    businessStartYear: appSettings.businessStartYear,
    fiscalPeriod,
    fiscalEndMonth: appSettings.fiscalEndMonth,
    displayMode,
    monthDisplayConfig,
  });
  const withProfit = rebuildProfitSectionInPlanData(withCashForecast);
  const withSga = insertSgaSummarySections(withProfit);
  const colored = {
    ...withSga,
    sections: applySectionColors(withSga.sections, sectionColorConfig, getPlanColorMode()),
  };
  const sorted = applyExpenseSortToPlanData(colored, expenseSortConfig);
  return {
    ...sorted,
    visibilityCandidates: collectVisibilityCandidates(sorted.sections),
  };
}

function refreshSectionColors() {
  if (rawPlanData) data = applyPlanColors(rawPlanData);
}

function refreshColorDependentViews({ rebuildData = true } = {}) {
  applyBrandSettings(appSettings, getPlanColorMode());
  if (activeTab === 'settings') renderOtherSettings();
  if (rebuildData) refreshSectionColors();
  if (activeTab === 'plan') refreshPlanTable();
  if (activeTab === 'dashboard' || document.querySelector('.dashboard-wrap')) {
    renderDashboardView();
  }
}

function refreshToolbarFilterStyles() {
  toolbar?.querySelectorAll('.plan-filter-btn').forEach(applyFilterButtonStyle);
  refreshRevenueSettingsSectionTitles(getFilterButtonColors);
}

function refreshColorSettingsPanels() {
  colorSettingsWindow?.refresh();
}

function rebuildPlanData() {
  if (!journalText) return;
  rawPlanData = buildFullPlan(journalText, bsText, expandConfig);
  data = applyPlanColors(rawPlanData);
  invalidateDrilldownIndex();
  expandedGroups.clear();
}

function styleSectionLabelCell(td, sectionId) {
  const barColor = getSectionBarColor(sectionId, data?.sections, sectionColorConfig, getPlanColorMode());
  const textColor = getSectionTextColor(sectionId, data?.sections, sectionColorConfig, getPlanColorMode());
  td.className = 'col-section-label';
  td.style.background = barColor;
  td.style.borderColor = barColor;
  td.style.color = textColor;
}

function invalidateDrilldownIndex() {
  drilldownIndex = null;
}

function getDrilldownIndex() {
  if (!drilldownIndex && rawPlanData && journalText) {
    drilldownIndex = buildDrilldownIndex(
      getCachedJournalEntries(),
      rawPlanData.sections,
    );
  }
  return drilldownIndex ?? new Set();
}

function getCachedJournalEntries() {
  if (!journalEntriesCache && journalText) {
    journalEntriesCache = parseJournalEntries(journalText);
  }
  return journalEntriesCache ?? [];
}

function closeJournalPopup() {
  journalPopupEl?.remove();
  journalPopupEl = null;
  document.body.classList.remove('plan-journal-open');
}

function showJournalPopup(section, row, month) {
  if (!journalText) return;
  const entries = findRelatedJournalEntries(
    getCachedJournalEntries(),
    section,
    row,
    month,
  );
  if (!entries.length) return;
  closeJournalPopup();
  const title = buildDrilldownTitle(section, row, month);

  const overlay = document.createElement('div');
  overlay.className = 'plan-journal-overlay';
  overlay.innerHTML = `
    <div class="plan-journal-modal" role="dialog" aria-modal="true" aria-labelledby="plan-journal-title">
      <header class="plan-journal-header">
        <h2 class="plan-journal-title" id="plan-journal-title"></h2>
        <button type="button" class="plan-journal-close" aria-label="閉じる">×</button>
      </header>
      <div class="plan-journal-body"></div>
    </div>
  `;

  overlay.querySelector('.plan-journal-title').textContent = title;
  const body = overlay.querySelector('.plan-journal-body');

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'plan-journal-empty';
    empty.textContent = '該当する仕訳がありません。';
    body.appendChild(empty);
  } else {
    const sorted = [...entries].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.no.localeCompare(b.no, undefined, { numeric: true });
    });
    const table = document.createElement('table');
    table.className = 'plan-journal-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>日付</th>
          <th>借方勘定科目</th>
          <th>借方補助</th>
          <th class="col-amt">借方金額</th>
          <th>貸方勘定科目</th>
          <th>貸方補助</th>
          <th class="col-amt">貸方金額</th>
          <th>摘要</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    for (const e of sorted) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.date}</td>
        <td>${e.debitAcct}</td>
        <td>${e.debitSub}</td>
        <td class="col-amt">${formatEntryAmount(e.debitAmt)}</td>
        <td>${e.creditAcct}</td>
        <td>${e.creditSub}</td>
        <td class="col-amt">${formatEntryAmount(e.creditAmt)}</td>
        <td>${e.summary}</td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const meta = document.createElement('p');
    meta.className = 'plan-journal-count';
    meta.textContent = `${sorted.length} 件`;
    body.append(meta, table);
  }

  overlay.querySelector('.plan-journal-close').addEventListener('click', closeJournalPopup);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeJournalPopup();
  });
  overlay.querySelector('.plan-journal-modal').addEventListener('click', (ev) => {
    ev.stopPropagation();
  });

  document.body.appendChild(overlay);
  document.body.classList.add('plan-journal-open');
  journalPopupEl = overlay;
  overlay.querySelector('.plan-journal-close').focus();
}

function getMainMenuItems() {
  const panel = document.getElementById('plan-main-menu-panel');
  if (!panel) return [];
  return [...panel.querySelectorAll('.plan-main-menu-item')];
}

function isMainMenuOpen() {
  const panel = document.getElementById('plan-main-menu-panel');
  return panel != null && !panel.hidden;
}

function closeMainMenu({ returnFocus = false } = {}) {
  const trigger = document.getElementById('plan-main-menu-trigger');
  const panel = document.getElementById('plan-main-menu-panel');
  if (!trigger || !panel) return;
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (returnFocus) trigger.focus();
}

function setCsvGateMode(active) {
  csvGateActive = active;
  document.querySelector('.plan-app')?.classList.toggle('plan-csv-gate', active);
  if (active) {
    closePeriodSelect();
    closeMainMenu();
    colorSettingsWindow?.close?.();
  }
}

function openMainMenu({ focusFirst = false } = {}) {
  if (csvGateActive) return;
  closePeriodSelect();
  const trigger = document.getElementById('plan-main-menu-trigger');
  const panel = document.getElementById('plan-main-menu-panel');
  if (!trigger || !panel) return;
  syncMainMenuChecks();
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  if (focusFirst) {
    const items = getMainMenuItems();
    if (items.length > 0) items[0].focus();
  }
}

function focusMainMenuItemByOffset(items, currentIndex, offset) {
  if (!items.length) return;
  const base = currentIndex < 0 ? (offset > 0 ? -1 : 0) : currentIndex;
  const next = (base + offset + items.length) % items.length;
  items[next].focus();
}

function handleMainMenuPanelKeydown(e) {
  const panel = document.getElementById('plan-main-menu-panel');
  if (!panel || panel.hidden) return;

  const items = getMainMenuItems();
  if (!items.length) return;

  const currentIndex = items.indexOf(document.activeElement);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusMainMenuItemByOffset(items, currentIndex, 1);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusMainMenuItemByOffset(items, currentIndex, -1);
    return;
  }
  if (e.key === 'Home') {
    e.preventDefault();
    items[0].focus();
    return;
  }
  if (e.key === 'End') {
    e.preventDefault();
    items[items.length - 1].focus();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeMainMenu({ returnFocus: true });
    return;
  }

  if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
    const entry = getMainMenuEntryByShortcut(e.key);
    if (entry) {
      e.preventDefault();
      executeMainMenuEntry(entry);
    }
  }
}

function handleEscapeKey() {
  if (isPeriodSelectOpen()) {
    closePeriodSelect({ returnFocus: true });
    return;
  }
  if (isMainMenuOpen()) {
    closeMainMenu({ returnFocus: true });
    return;
  }
  if (journalPopupEl) {
    closeJournalPopup();
    return;
  }
  if (rowContextMenuEl) {
    closeRowContextMenu();
    return;
  }
  if (activeTab === 'plan' && selectedPlanRowKeys.size > 0) {
    const table = root.querySelector('.plan-table');
    clearRowSelection(table);
  }
}

document.addEventListener('keydown', (ev) => {
  if (csvGateActive) return;
  if (ev.key === 'F10' && !ev.shiftKey && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
    ev.preventDefault();
    openMainMenu({ focusFirst: true });
    return;
  }
  if (ev.key === 'Escape') handleEscapeKey();
});

const MAIN_MENU_ENTRIES = [
  { kind: 'item', value: 'plan', label: '予実表', shortcutKey: 'P' },
  { kind: 'item', value: 'dashboard', label: 'ダッシュボード', shortcutKey: 'D' },
  { kind: 'heading', label: '設定' },
  { kind: 'item', value: 'orders', label: '受注', indented: true, shortcutKey: 'O' },
  { kind: 'item', value: 'taxrates', label: '税率定義', indented: true, shortcutKey: 'T' },
  { kind: 'item', value: 'taxpayments', label: '支払い', indented: true, shortcutKey: 'Y' },
  { kind: 'item', value: 'employees', label: '人件費', indented: true, shortcutKey: 'E' },
  { kind: 'item', value: 'outsourcing', label: '外注費', indented: true, shortcutKey: 'U' },
  { kind: 'item', value: 'visibility', label: '表示', indented: true, shortcutKey: 'V' },
  { kind: 'item', value: 'colors', label: '色', indented: true, shortcutKey: 'C' },
  { kind: 'item', value: 'settings', label: 'その他', indented: true, shortcutKey: 'S' },
  { kind: 'heading', label: '操作' },
  { kind: 'item', value: 'action:settings-export', label: 'エクスポート', indented: true, shortcutKey: 'X' },
  { kind: 'item', value: 'action:settings-import', label: 'インポート', indented: true, shortcutKey: 'I' },
  { kind: 'item', value: 'action:reload-csv', label: '再読み込み', indented: true, shortcutKey: 'R' },
  { kind: 'item', value: 'action:change-folder', label: 'フォルダ変更', indented: true, shortcutKey: 'F' },
];

function getMainMenuEntryByShortcut(key) {
  const normalized = key.length === 1 ? key.toUpperCase() : '';
  if (!normalized) return null;
  return MAIN_MENU_ENTRIES.find(
    (entry) => entry.kind === 'item' && entry.shortcutKey?.toUpperCase() === normalized,
  ) ?? null;
}

function executeMainMenuEntry(entry) {
  handleMainMenuAction(entry.value);
  closeMainMenu();
}

function renderMainTabs() {
  toolbar.hidden = !MAIN_VIEW_TABS.has(activeTab);
  const onDashboard = activeTab === 'dashboard';
  const inSettings = isSettingsMainTab(activeTab);
  const showPlanReturn = onDashboard || inSettings;
  const dashboardBtn = document.getElementById('plan-dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.textContent = showPlanReturn ? '予実表を表示' : 'ダッシュボードを表示';
    dashboardBtn.title = showPlanReturn ? '予実表を表示' : 'ダッシュボードを表示';
    dashboardBtn.classList.toggle('is-active', onDashboard);
    dashboardBtn.classList.toggle('is-settings-return', inSettings);
  }

  const menuTrigger = document.getElementById('plan-main-menu-trigger');
  if (menuTrigger) {
    menuTrigger.classList.remove('is-settings-active');
    menuTrigger.innerHTML = 'メニュー <kbd>F10</kbd>';
    menuTrigger.removeAttribute('title');
  }
  syncMainMenuChecks();
}

function getFilterButtonColors(filterId) {
  const { cellBg, textColor } = getUiColors(uiColorConfig);
  if (filterId === 'all') {
    return { background: cellBg, color: textColor };
  }
  return {
    background: getSectionBarColor(filterId, data?.sections, sectionColorConfig, getPlanColorMode()),
    color: getSectionTextColor(filterId, data?.sections, sectionColorConfig, getPlanColorMode()),
  };
}

function applyFilterButtonStyle(btn) {
  const filterId = btn.dataset.filter;
  const { background, color } = getFilterButtonColors(filterId);
  btn.style.setProperty('--filter-btn-bg', background);
  btn.style.color = color;

  const sectionIds = getCurrentSectionFilterIds();

  if (filterId === 'all') {
    const allOn = isAllSectionFiltersEnabled(sectionFilterConfig, sectionIds);
    btn.classList.toggle('is-default', allOn);
    btn.classList.toggle('is-on', !allOn);
    btn.classList.remove('is-off', 'active');
    btn.setAttribute('aria-pressed', String(allOn));
    return;
  }

  const enabled = sectionFilterConfig[filterId] !== false;
  btn.classList.toggle('is-on', enabled);
  btn.classList.toggle('is-off', !enabled);
  btn.classList.remove('active');
  btn.setAttribute('aria-pressed', String(enabled));
}

function getPlanSectionFilterButtons() {
  if (!data?.sections) return [];
  return data.sections
    .filter(isPlanSectionFilterTarget)
    .map((section) => ({ id: section.id, label: section.label }));
}

function renderToolbar() {
  syncSectionFilterConfigToData();
  const buttons = [{ id: 'all', label: '通常表示' }, ...getPlanSectionFilterButtons()];
  toolbar.innerHTML = buttons.map(
    (f) =>
      `<button type="button" class="plan-filter-btn${f.id === 'all' ? ' plan-filter-btn-all' : ''}" data-filter="${f.id}" aria-pressed="false">${f.label}</button>`,
  ).join('');

  toolbar.querySelectorAll('.plan-filter-btn').forEach((btn) => {
    applyFilterButtonStyle(btn);
    btn.addEventListener('click', (ev) => {
      handleSectionFilterClick(btn.dataset.filter, ev);
    });
  });
}

function syncPlanDataToCurrentPeriod() {
  if (!rawPlanData) return;
  data = applyPlanColors(rawPlanData);
  invalidateDrilldownIndex();
  journalEntriesCache = null;
}

function renderPlanViewAfterDataChange({ measureColumnWidths = false } = {}) {
  syncPeriodControls();
  const render = () => {
    renderView({ measureColumnWidths });
    if (activeTab !== 'plan') finishPlanLoadingAfterLayout();
  };
  if (planLoadingVisible || planLoadingAwaitLayout) {
    requestAnimationFrame(() => requestAnimationFrame(render));
  } else {
    render();
  }
}

function refreshPlanTable({ measureColumnWidths = false } = {}) {
  syncPlanDataToCurrentPeriod();
  renderToolbar();
  abortActivePlanTableColumnWidthSync();
  renderTable({ measureColumnWidths });
}

function clearEmployeeTenureTimer() {
  if (employeeTenureTimerId != null) {
    clearInterval(employeeTenureTimerId);
    employeeTenureTimerId = null;
  }
}

function switchMainTab(nextTab) {
  if (nextTab === 'expand') nextTab = 'visibility';
  if (nextTab === 'csvnames') nextTab = 'settings';
  const prevTab = activeTab;
  if (prevTab === 'plan' && nextTab !== 'plan') {
    resetPlanBodyScroll();
    cachePlanTableColumnWidthsFromDom();
    if (nextTab !== 'dashboard') resetContentFitScale();
    applyPlanDisplayScales();
  }
  // ダッシュボードでは予実表と同じヘッダー倍率（content fit）を、
  // どのタブから来ても現在のウィンドウ幅に合わせて適用する
  if (nextTab === 'dashboard' && prevTab !== 'dashboard') {
    resetDashboardPeriodRange();
    setContentFitScale(lastPlanTableContentFitScale);
    applyDashboardContentFitEstimate();
    applyPlanDisplayScales();
  }
  if (prevTab === 'dashboard' && nextTab !== 'dashboard') {
    resetDashboardState({
      fiscalPeriod: appSettings.fiscalPeriod,
      multiPeriodRange: isDashboardMultiPeriodView() ? { ...dashboardPeriodRange } : null,
    });
    resetDashboardPeriodRange();
  }
  activeTab = nextTab;
  syncPeriodControls();
  if (nextTab === 'plan' && prevTab !== 'plan') {
    resetPlanBodyScroll();
    const showLoading = shouldShowPlanLoadingOnTabReturn();
    if (showLoading) {
      showPlanLoadingOverlay({ awaitLayout: true });
    }
    const render = () => {
      renderView();
      if (!showLoading || !planLoadingAwaitLayout) return;
      const table = root.querySelector('.plan-table');
      if (!table && !data) finishPlanLoadingAfterLayout();
    };
    if (showLoading) {
      requestAnimationFrame(() => requestAnimationFrame(render));
    } else {
      render();
    }
    return;
  }
  renderView();
}

function renderView({ measureColumnWidths = false } = {}) {
  if (activeTab !== 'employees') clearEmployeeTenureTimer();
  renderMainTabs();
  if (activeTab === 'plan') {
    refreshPlanTable({ measureColumnWidths });
    if (planLoadingAwaitLayout && !data) finishPlanLoadingAfterLayout();
    else if (planLoadingAwaitLayout && !root.querySelector('.plan-table')) {
      finishPlanLoadingAfterLayout();
    }
  } else if (activeTab === 'visibility') renderVisibilitySettings();
  else if (activeTab === 'taxrates') renderTaxRateSettings();
  else if (activeTab === 'orders') renderRevenueSettings();
  else if (activeTab === 'taxpayments') renderTaxPaymentSettings();
  else if (activeTab === 'employees') renderEmployeeSettings();
  else if (activeTab === 'outsourcing') renderOutsourcingSettings();
  else if (activeTab === 'dashboard') renderDashboardView();
  else if (activeTab === 'settings') renderOtherSettings();
}

/** 複数期表示用に、指定期の範囲のデータを期の昇順で集める（取得できない期はスキップ） */
function buildDashboardPeriodRangeDatas(from, to) {
  const maxPeriod = getDashboardMaxPeriod();
  const rangeFrom = Math.min(from, to);
  const rangeTo = Math.max(from, to);
  const list = [];
  for (let p = rangeFrom; p <= rangeTo; p += 1) {
    if (p > maxPeriod) continue;
    const periodData = getDashboardPeriodData(p);
    if (periodData) list.push({ fiscalPeriod: p, data: periodData });
  }
  return list;
}

function ensureDashboardPeriodRangeInBounds() {
  const max = getDashboardMaxPeriod();
  let from = Math.min(max, Math.max(1, dashboardPeriodRange.from));
  let to = Math.min(max, Math.max(1, dashboardPeriodRange.to));
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  dashboardPeriodRange.from = from;
  dashboardPeriodRange.to = to;
}

function renderDashboardView() {
  // ダッシュボード再描画中に期メニューが開いたままだと操作が不安定になるため閉じる
  closePeriodSelect();
  ensureDashboardPeriodRangeInBounds();
  const multiPeriodView = isDashboardMultiPeriodView();
  const allPeriodDatas = multiPeriodView
    ? buildDashboardPeriodRangeDatas(dashboardPeriodRange.from, dashboardPeriodRange.to)
    : null;
  const viewPeriod = dashboardPeriodRange.from;
  const viewData = multiPeriodView
    ? data
    : (getDashboardPeriodData(viewPeriod) ?? data);
  const prevPeriod = viewPeriod - 1;
  const prevPrevPeriod = viewPeriod - 2;
  const prevDataForView = !multiPeriodView && prevPeriod >= 1
    ? getDashboardCachedPeriodData(prevPeriod)
    : null;
  const prevPrevDataForView = !multiPeriodView && prevPrevPeriod >= 1
    ? getDashboardCachedPeriodData(prevPrevPeriod)
    : null;
  mountDashboardPanel({
    replaceRootPanel,
    data: viewData,
    prevData: prevDataForView,
    prevPrevData: prevPrevDataForView,
    allPeriods: allPeriodDatas?.length ? allPeriodDatas : null,
    periodRange: { ...dashboardPeriodRange },
    maxFiscalPeriod: getDashboardMaxPeriod(),
    onPeriodRangeChange: setDashboardPeriodRange,
    appSettings,
    getSectionFilterColors: getFilterButtonColors,
    showJournalPopup,
    hasJournalDrilldown: (section, row, month) =>
      hasDrilldownEntries(getDrilldownIndex(), section, row, month)
      || findRelatedJournalEntries(getCachedJournalEntries(), section, row, month).length > 0,
  });
  syncPeriodControls();
  refreshPlanKpi();
}

function getPlanTableAmountContext() {
  const displayMode = getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    appSettings.fiscalPeriod,
  );
  const pastMonthSet = buildPlanTablePastMonthSet(displayMode);
  return {
    displayMode,
    pastMonthSet,
    crossVarianceCtx: buildRevenueReceivablesCrossVarianceContext(data.sections),
  };
}

function updateGroupRowAmountDisplay(tr, section, row, amountCtx) {
  const expanded = expandedGroups.has(row.id);
  const hideGroupTotal = expanded
    && isHideTotalWhenExpanded(section.id, row.label, expandConfig);
  const { crossVarianceCtx } = amountCtx;

  const monthTds = tr.querySelectorAll('td.col-amount-month');
  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const m = FISCAL_MONTHS[mi];
    const td = monthTds[mi];
    if (!td) continue;
    const val = row.values[m];
    const showAmount = shouldShowPlanTableMonthAmount(section, row, m, amountCtx);
    if (hideGroupTotal || !showAmount) {
      td.innerHTML = '';
      td.classList.remove('aggregate-formula-cell');
      td.removeAttribute('title');
    } else {
      td.innerHTML = formatAmount(val, 'item');
      const drilldownHint = td.classList.contains('col-amount-drilldown')
        ? 'ダブルクリックで仕訳を表示'
        : '';
      applyAggregateCellTooltip(td, row, section, m, drilldownHint);
    }
  }

  const extraTds = tr.querySelectorAll('td.col-amount-extra');
  const hideExtra = sectionHidesExtraColumns(section.id);
  for (let ei = 0; ei < EXTRA_COLUMNS.length; ei += 1) {
    const col = EXTRA_COLUMNS[ei];
    const td = extraTds[ei];
    if (!td) continue;
    if (hideExtra || hideGroupTotal) {
      td.innerHTML = '';
      td.classList.remove('aggregate-formula-cell');
      td.removeAttribute('title');
    } else {
      td.innerHTML = formatAmount(row.values[col], 'item');
      applyAggregateCellTooltip(td, row, section, col);
    }
  }
}

/** 展開状態だけ DOM に反映する */
function applyPlanGroupExpandState(table) {
  if (!table || !data) return;
  const amountCtx = getPlanTableAmountContext();

  for (const tr of table.querySelectorAll('tbody tr[data-parent-id]')) {
    const parentId = tr.dataset.parentId;
    tr.classList.toggle('is-expand-collapsed', !expandedGroups.has(parentId));
  }

  for (const tr of table.querySelectorAll('tbody tr.row-group[data-row-id]')) {
    const groupId = tr.dataset.rowId;
    const sectionId = tr.dataset.sectionId;
    const section = data.sections.find((s) => s.id === sectionId);
    const row = section?.rows.find((r) => r.id === groupId);
    if (!section || !row) continue;

    const expanded = expandedGroups.has(groupId);
    const btn = tr.querySelector('.row-toggle');
    const icon = btn?.querySelector('.toggle-icon');
    if (btn) btn.setAttribute('aria-expanded', String(expanded));
    if (icon) icon.textContent = expanded ? '▼' : '▶';
    updateGroupRowAmountDisplay(tr, section, row, amountCtx);
  }
}

function togglePlanGroupExpanded(groupId) {
  if (expandedGroups.has(groupId)) expandedGroups.delete(groupId);
  else expandedGroups.add(groupId);
  applyPlanGroupExpandState(root.querySelector('.plan-table'));
}

function updatePlanMonthDisplayHeaderCell(th, monthLabel, displayMode, highlightFiscalMonth) {
  const toggleTarget = displayMode === 'budget-actual' && isMonthDisplayToggleTarget(monthLabel);
  syncPlanTableMonthHighlightClasses(th, monthLabel, highlightFiscalMonth);
  if (!toggleTarget) {
    th.classList.remove('month-display-toggle', 'month-display-actual', 'month-display-plan');
    th.removeAttribute('role');
    th.removeAttribute('aria-pressed');
    th.removeAttribute('title');
    if (th.tabIndex >= 0) th.tabIndex = -1;
    return;
  }
  const mode = getMonthDisplayMode(
    monthDisplayConfig,
    appSettings.fiscalPeriod,
    monthLabel,
    appSettings.businessStartYear,
    FISCAL_MONTHS,
  );
  th.classList.add('month-display-toggle');
  th.classList.toggle('month-display-actual', mode === 'actual');
  th.classList.toggle('month-display-plan', mode === 'plan');
  th.title = getMonthDisplayClickHint(mode);
  th.setAttribute('role', 'button');
  th.tabIndex = 0;
  th.setAttribute('aria-pressed', mode === 'plan' ? 'true' : 'false');
}

function updatePlanTableRowMonthCells(tr, section, row, {
  displayMode,
  pastMonthSet,
  highlightFiscalMonth,
  crossVarianceCtx,
}) {
  const hideGroupTotal = row.type === 'group'
    && expandedGroups.has(row.id)
    && isHideTotalWhenExpanded(section.id, row.label, expandConfig);
  const isManMonthRow = isRevenueManMonthRow(section.id, row);
  const monthTds = tr.querySelectorAll('td.col-amount-month');

  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const m = FISCAL_MONTHS[mi];
    const td = monthTds[mi];
    if (!td || td.querySelector('input')) continue;
    const val = row.values[m];

    syncPlanTableMonthHighlightClasses(td, m, highlightFiscalMonth);
    td.classList.toggle(
      'has-variance',
      (row.type === 'variance' || row.type === 'sub-variance') && val !== 0,
    );
    td.classList.toggle(
      'plan-amount-variance',
      shouldHighlightMonthDeltaFromPrevious(section, row, mi, displayMode, pastMonthSet),
    );
    td.classList.toggle('plan-amount-filled', Boolean(row.planFillMonths?.includes(m)));

    const showAmount = shouldShowPlanTableMonthAmount(section, row, m, {
      displayMode,
      pastMonthSet,
      crossVarianceCtx,
    });

    if (isManMonthRow) {
      if (!hideGroupTotal && showAmount) {
        td.textContent = formatManMonths(val);
        const editable = isRevenueManMonthMonthEditable(m, displayMode, pastMonthSet);
        td.classList.toggle('plan-man-month-editable', editable);
        td.classList.toggle('salary-plan-cell-editable', editable);
        td.title = editable
          ? 'ダブルクリックで編集（Shift+Enter で後続月へ同値を反映　0 も可）'
          : '';
        td.ondblclick = editable
          ? () => startRevenueManMonthCellEdit(td, {
            clientId: row.revenueClientId,
            month: m,
            displayMode,
            pastMonthSet,
          })
          : null;
      } else {
        td.textContent = '';
        td.classList.remove('plan-man-month-editable', 'salary-plan-cell-editable');
        td.removeAttribute('title');
        td.ondblclick = null;
      }
      continue;
    }

    const outsourcingVendorId = getOutsourcingVendorIdFromRow(row);
    const isOutsourcingEditableRow = isOutsourcingPlanRowEditable(section, row);

    if (isOutsourcingEditableRow) {
      if (hideGroupTotal || !showAmount) {
        td.innerHTML = '';
        td.classList.remove('salary-plan-cell-editable');
        td.removeAttribute('title');
        td.ondblclick = null;
        td.classList.remove('col-amount-drilldown');
        continue;
      }

      const amountType = row.type === 'variance' ? 'variance' : 'item';
      const editable = isOutsourcingPlanCellEditable(section, row, m, displayMode, pastMonthSet);
      const hasDrilldown = !editable
        && isDrilldownAvailable(section, row)
        && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
        && !row.planFillMonths?.includes(m)
        && !row.openingAdjustMonths?.includes(m);

      td.innerHTML = formatAmount(val, amountType);
      td.classList.toggle('salary-plan-cell-editable', editable);
      td.classList.toggle('col-amount-drilldown', hasDrilldown);

      if (editable) {
        tagPlanEditableCell(td, { rowKey: outsourcingVendorId, month: m });
        td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
        td.ondblclick = () => startOutsourcingPlanCellEdit(td, {
          vendorId: outsourcingVendorId,
          month: m,
          displayMode,
          pastMonthSet,
        });
      } else if (hasDrilldown) {
        td.removeAttribute('title');
        td.ondblclick = () => showJournalPopup(section, row, m);
        applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
      } else {
        td.removeAttribute('title');
        td.ondblclick = null;
        applyAggregateCellTooltip(td, row, section, m, '');
      }
      continue;
    }

    const isOvertimeEditableRow = isOvertimePlanRowEditable(section, row);

    if (isOvertimeEditableRow) {
      if (hideGroupTotal || !showAmount) {
        td.innerHTML = '';
        td.classList.remove('salary-plan-cell-editable');
        td.removeAttribute('title');
        td.ondblclick = null;
        td.classList.remove('col-amount-drilldown');
        continue;
      }

      const amountType = row.type === 'variance' ? 'variance' : 'item';
      const editable = isOvertimePlanCellEditable(section, row, m, displayMode, pastMonthSet);
      const hasDrilldown = !editable
        && isDrilldownAvailable(section, row)
        && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
        && !row.planFillMonths?.includes(m)
        && !row.openingAdjustMonths?.includes(m);

      td.innerHTML = formatAmount(val, amountType);
      td.classList.toggle('salary-plan-cell-editable', editable);
      td.classList.toggle('col-amount-drilldown', hasDrilldown);

      if (editable) {
        tagPlanEditableCell(td, { rowKey: 'overtime', month: m });
        td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
        td.ondblclick = () => startOvertimePlanTableCellEdit(td, {
          month: m,
          displayMode,
          pastMonthSet,
        });
      } else if (hasDrilldown) {
        td.removeAttribute('title');
        td.ondblclick = () => showJournalPopup(section, row, m);
        applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
      } else {
        td.removeAttribute('title');
        td.ondblclick = null;
        applyAggregateCellTooltip(td, row, section, m, '');
      }
      continue;
    }

    const employeePlanId = getEmployeeIdFromPlanRow(row);
    const isEmployeeSalaryEditableRow = isEmployeeSalaryPlanRowEditable(section, row);

    if (isEmployeeSalaryEditableRow) {
      if (hideGroupTotal || !showAmount) {
        td.innerHTML = '';
        td.classList.remove('salary-plan-cell-editable');
        td.removeAttribute('title');
        td.ondblclick = null;
        td.classList.remove('col-amount-drilldown');
        continue;
      }

      const amountType = row.type === 'variance' ? 'variance' : 'item';
      const editable = isEmployeeSalaryPlanCellEditable(section, row, m, displayMode, pastMonthSet);
      const hasDrilldown = !editable
        && isDrilldownAvailable(section, row)
        && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
        && !row.planFillMonths?.includes(m)
        && !row.openingAdjustMonths?.includes(m);

      td.innerHTML = formatAmount(val, amountType);
      td.classList.toggle('salary-plan-cell-editable', editable);
      td.classList.toggle('col-amount-drilldown', hasDrilldown);

      if (editable) {
        tagPlanEditableCell(td, { rowKey: employeePlanId, month: m });
        td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
        td.ondblclick = () => startEmployeeSalaryPlanCellEdit(td, {
          employeeId: employeePlanId,
          month: m,
          displayMode,
          pastMonthSet,
        });
      } else if (hasDrilldown) {
        td.removeAttribute('title');
        td.ondblclick = () => showJournalPopup(section, row, m);
        applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
      } else {
        td.removeAttribute('title');
        td.ondblclick = null;
        applyAggregateCellTooltip(td, row, section, m, '');
      }
      continue;
    }

    const taxPaymentEditTarget = getTaxPaymentPlanEditTarget(section, row);
    const isTaxPaymentEditableRow = isTaxPaymentPlanRowEditable(section, row);

    if (isTaxPaymentEditableRow) {
      if (hideGroupTotal || !showAmount) {
        td.innerHTML = '';
        td.classList.remove('salary-plan-cell-editable');
        td.removeAttribute('title');
        td.ondblclick = null;
        td.classList.remove('col-amount-drilldown');
        continue;
      }

      const amountType = row.type === 'variance' ? 'variance' : 'item';
      const editable = isTaxPaymentPlanCellEditable(section, row, m, displayMode, pastMonthSet);
      const hasDrilldown = !editable
        && isDrilldownAvailable(section, row)
        && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
        && !row.planFillMonths?.includes(m)
        && !row.openingAdjustMonths?.includes(m);

      td.innerHTML = formatAmount(val, amountType);
      td.classList.toggle('salary-plan-cell-editable', editable);
      td.classList.toggle('col-amount-drilldown', hasDrilldown);

      if (editable && taxPaymentEditTarget) {
        const rowKey = taxPaymentEditTarget.kind === 'simple'
          ? taxPaymentEditTarget.account
          : taxPaymentEditTarget.entryId;
        tagPlanEditableCell(td, { rowKey, month: m });
        td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
        td.ondblclick = () => startTaxPaymentPlanTableCellEdit(td, {
          target: taxPaymentEditTarget,
          month: m,
          displayMode,
          pastMonthSet,
        });
      } else if (hasDrilldown) {
        td.removeAttribute('title');
        td.ondblclick = () => showJournalPopup(section, row, m);
        applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
      } else {
        td.removeAttribute('title');
        td.ondblclick = null;
        applyAggregateCellTooltip(td, row, section, m, '');
      }
      continue;
    }

    const amountType = row.type === 'variance' ? 'variance' : 'item';
    const hasDrilldown = !hideGroupTotal
      && showAmount
      && isDrilldownAvailable(section, row)
      && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
      && !row.planFillMonths?.includes(m)
      && !row.openingAdjustMonths?.includes(m);

    td.classList.toggle('col-amount-drilldown', hasDrilldown);
    td.ondblclick = hasDrilldown ? () => showJournalPopup(section, row, m) : null;

    if (hideGroupTotal || !showAmount) {
      td.innerHTML = '';
      td.removeAttribute('title');
    } else {
      td.innerHTML = formatAmount(val, amountType);
      const drilldownHint = hasDrilldown ? 'ダブルクリックで仕訳を表示' : '';
      applyAggregateCellTooltip(td, row, section, m, drilldownHint);
    }
  }

  const extraTds = tr.querySelectorAll('td.col-amount-extra');
  const hideExtra = sectionHidesExtraColumns(section.id);
  for (let ei = 0; ei < EXTRA_COLUMNS.length; ei += 1) {
    const col = EXTRA_COLUMNS[ei];
    const td = extraTds[ei];
    if (!td || td.querySelector('input')) continue;
    const val = row.values[col];
    td.classList.toggle(
      'has-variance',
      !hideExtra
        && (row.type === 'variance' || row.type === 'sub-variance')
        && val !== 0,
    );
    if (isManMonthRow) {
      td.textContent = (hideExtra || hideGroupTotal) ? '' : formatManMonths(val);
    } else {
      const amountType = row.type === 'variance' ? 'variance' : 'item';
      td.innerHTML = (hideExtra || hideGroupTotal) ? '' : formatAmount(val, amountType);
      if (!hideExtra && !hideGroupTotal) applyAggregateCellTooltip(td, row, section, col);
    }
  }
}

function applyPlanMonthDisplayDom(table) {
  if (!table || !data) return;
  const displayMode = getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    appSettings.fiscalPeriod,
  );
  const highlightFiscalMonth = getHighlightFiscalMonth();
  const amountCtx = getPlanTableAmountContext();
  const monthThs = table.querySelectorAll('thead .month-row th.col-amount-month');
  for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
    const th = monthThs[mi];
    if (th) updatePlanMonthDisplayHeaderCell(th, FISCAL_MONTHS[mi], displayMode, highlightFiscalMonth);
  }
  syncPlanTableHeaderMonthHighlights(table, highlightFiscalMonth);
  syncPlanColumnPlates(table.closest('.plan-table-wrap'), table);

  for (const tr of table.querySelectorAll('tbody tr[data-section-id]')) {
    const section = data.sections.find((s) => s.id === tr.dataset.sectionId);
    if (!section) continue;
    const row = section.rows.find((r) => r.id === tr.dataset.rowId);
    if (!row || !rowVisibleInSection(section, row)) continue;
    updatePlanTableRowMonthCells(tr, section, row, {
      ...amountCtx,
      highlightFiscalMonth,
    });
  }

  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));
}

function togglePlanMonthDisplay(monthLabel) {
  const displayMode = getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    appSettings.fiscalPeriod,
  );
  if (displayMode !== 'budget-actual' || !isMonthDisplayToggleTarget(monthLabel)) return;
  monthDisplayConfig = toggleMonthDisplayMode(
    monthDisplayConfig,
    appSettings.fiscalPeriod,
    monthLabel,
    appSettings.businessStartYear,
    FISCAL_MONTHS,
  );
  saveMonthDisplayConfig(monthDisplayConfig);
  if (rawPlanData) {
    data = applyPlanColors(rawPlanData);
    refreshPlanKpi();
    if (activeTab === 'dashboard') {
      renderDashboardView();
    } else if (activeTab === 'orders') {
      applyRevenueSettingsMonthDisplayDom();
    } else if (activeTab === 'taxpayments') {
      applyTaxPaymentSettingsMonthDisplayDom();
    } else if (activeTab === 'outsourcing') {
      applyOutsourcingSettingsMonthDisplayDom();
    } else if (activeTab === 'employees') {
      applyEmployeeSettingsMonthDisplayDom();
    } else {
      applyPlanMonthDisplayDom(root.querySelector('.plan-table'));
    }
  }
}

function renderTable({ measureColumnWidths = false } = {}) {
  if (!data) return;
  closeJournalPopup();
  closeRowContextMenu();

  const existingWrap = root.querySelector('.plan-table-wrap');
  const existingTable = existingWrap?.querySelector('.plan-table');
  const preservedWidths = existingTable
    ? readPlanTableColumnWidths(existingTable)
    : lastPlanTableColumnWidths;
  abortActivePlanTableColumnWidthSync();

  const body = planBody();
  const preserveScroll = existingWrap != null;
  const scrollTop = preserveScroll ? (body?.scrollTop ?? existingWrap?.scrollTop ?? 0) : 0;
  const scrollLeft = preserveScroll ? (body?.scrollLeft ?? existingWrap?.scrollLeft ?? 0) : 0;

  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));

  const allSections = data.sections;
  const highlightFiscalMonth = getHighlightFiscalMonth();
  const displayMode = getFiscalPeriodDisplayMode(
    appSettings.businessStartYear,
    appSettings.fiscalPeriod,
  );
  const pastMonthSet = buildPlanTablePastMonthSet(displayMode);

  const crossVarianceCtx = buildRevenueReceivablesCrossVarianceContext(data.sections);

  const table = document.createElement('table');
  table.className = 'plan-table';

  appendPlanTableColgroup(table);

  const thead = document.createElement('thead');

  const yearRow = document.createElement('tr');
  yearRow.className = 'year-row';
  yearRow.innerHTML =
    '<th class="col-account-header" colspan="2"></th><th class="col-sub"></th>';

  let lastYear = null;
  const monthYear = getMonthYear();
  for (const m of FISCAL_MONTHS) {
    const y = monthYear[m];
    const monthHighlightClass = planTableMonthHighlightClass(m, highlightFiscalMonth);
    if (y !== lastYear) {
      const th = document.createElement('th');
      th.colSpan = 1;
      th.textContent = `${y}年`;
      th.className = `col-amount col-amount-month year-row-label${monthHighlightClass}`;
      yearRow.appendChild(th);
      lastYear = y;
    } else {
      const th = document.createElement('th');
      th.className = `col-amount col-amount-month${monthHighlightClass}`;
      yearRow.appendChild(th);
    }
  }
  for (const _ of EXTRA_COLUMNS) {
    const th = document.createElement('th');
    th.className = 'col-amount col-amount-extra';
    yearRow.appendChild(th);
  }
  thead.appendChild(yearRow);

  const monthRow = document.createElement('tr');
  monthRow.className = 'month-row';
  monthRow.innerHTML =
    '<th class="col-account-header" colspan="2">勘定科目</th><th class="col-sub">補助科目</th>';
  for (const m of FISCAL_MONTHS) {
    const th = document.createElement('th');
    const monthDisplayMode = displayMode === 'budget-actual' && isMonthDisplayToggleTarget(m)
      ? getMonthDisplayMode(
        monthDisplayConfig,
        appSettings.fiscalPeriod,
        m,
        appSettings.businessStartYear,
        FISCAL_MONTHS,
      )
      : null;
    th.className = `col-amount col-amount-month${planTableMonthHighlightClass(m, highlightFiscalMonth)}${monthDisplayMode ? ` month-display-toggle month-display-${monthDisplayMode}` : ''}`;
    th.textContent = m;
    if (monthDisplayMode) {
      th.title = getMonthDisplayClickHint(monthDisplayMode);
      th.setAttribute('role', 'button');
      th.tabIndex = 0;
      th.setAttribute('aria-pressed', monthDisplayMode === 'plan' ? 'true' : 'false');
      th.addEventListener('click', () => togglePlanMonthDisplay(m));
      th.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          togglePlanMonthDisplay(m);
        }
      });
    }
    monthRow.appendChild(th);
  }
  for (const col of EXTRA_COLUMNS) {
    const th = document.createElement('th');
    th.className = 'col-amount col-amount-extra';
    th.textContent = col;
    monthRow.appendChild(th);
  }
  thead.appendChild(monthRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const section of allSections) {
    const visibleRows = section.rows.filter((row) => {
      if (!rowVisibleInSection(section, row)) return false;
      if (section.hideSectionTotal && row.type === 'total') return false;
      return true;
    });
    if (!visibleRows.length) continue;
    let sectionCellAdded = false;
    let sectionRowIndex = 0;
    const usesCategoryCell = sectionUsesCategoryCell(section);
    const categoryRowSpan = usesCategoryCell ? countCategoryRowSpan(section, visibleRows) : 0;
    const sectionTextColor = section.textColor ?? '#ffffff';
    const fillSectionColor = sectionFillsRowWithAccentBackground(section.id);

    for (const row of visibleRows) {
      const tr = document.createElement('tr');
      tr.className = buildPlanRowTrClass(section, row);
      tr.dataset.sectionId = section.id;
      tr.dataset.rowKey = visibilityRowKey(section.id, row);
      syncRowSelection(tr);
      if (row.id) tr.dataset.rowId = row.id;
      const outsourcingVendorId = getOutsourcingVendorIdFromRow(row);
      if (section.id === 'outsourcing' && outsourcingVendorId) {
        tagPlanEditableRow(tr, outsourcingVendorId);
      }
      const employeePlanId = getEmployeeIdFromPlanRow(row);
      if (section.id === 'personnel' && employeePlanId) {
        tagPlanEditableRow(tr, employeePlanId);
      }
      if (section.id === 'personnel' && isOvertimePlanRowEditable(section, row)) {
        tagPlanEditableRow(tr, 'overtime');
      }
      if (row.parentId) {
        tr.dataset.parentId = row.parentId;
        if (!expandedGroups.has(row.parentId)) tr.classList.add('is-expand-collapsed');
      }
      if (!sectionCellAdded || planRowIsAccentRow(section, row) || row.type === 'warningSummary' || fillSectionColor) {
        tr.style.setProperty('--section-bg', section.barColor);
        tr.style.setProperty('--section-accent', section.color);
        tr.style.setProperty('--section-text', sectionTextColor);
        tr.style.setProperty('--section-text-dim', hexToRgba(sectionTextColor, 0.55));
      }

      sectionCellAdded = appendPlanTableCategoryCell(tr, {
        section,
        sectionRowIndex,
        categoryRowSpan,
        usesCategoryCell,
        sectionCellAdded,
      });

      const label = document.createElement('td');
      label.className = 'col-label';
      const aggregateFormulaLabel = getAggregateFormulaLabel(row, section);

      if (row.type === 'group') {
        const expanded = expandedGroups.has(row.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'row-toggle';
        btn.setAttribute('aria-expanded', String(expanded));
        const icon = document.createElement('span');
        icon.className = 'toggle-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = expanded ? '▼' : '▶';
        const textSpan = document.createElement('span');
        textSpan.className = 'row-toggle-text';
        appendAggregateLabelContent(textSpan, row.label, aggregateFormulaLabel);
        btn.append(icon, textSpan);
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            e.stopPropagation();
            handlePlanRowSelectClick(tr, tr.closest('table'), e);
            return;
          }
          togglePlanGroupExpanded(row.id);
        });
        label.appendChild(btn);
      } else if (row.type === 'sub' || row.type === 'sub-variance' || row.type === 'breakdown' || row.type === 'man-month') {
        label.textContent = '';
      } else if (row.label) {
        appendAggregateLabelContent(label, row.label, aggregateFormulaLabel);
        if (aggregateFormulaLabel) {
          label.classList.add('aggregate-formula-label');
          label.title = aggregateFormulaLabel;
        }
      }
      tr.appendChild(label);

      const sub = document.createElement('td');
      sub.className = 'col-sub';
      if (row.type === 'sub' || row.type === 'sub-variance' || row.type === 'breakdown' || row.type === 'man-month') {
        sub.textContent = row.subLabel;
      } else if (row.type !== 'total' && row.type !== 'warningSummary') {
        sub.textContent = row.type === 'group' ? '' : (row.subLabel || '');
      }
      tr.appendChild(sub);

      const hideGroupTotal = row.type === 'group'
        && expandedGroups.has(row.id)
        && isHideTotalWhenExpanded(section.id, row.label, expandConfig);

      const isManMonthRow = isRevenueManMonthRow(section.id, row);

      for (let mi = 0; mi < FISCAL_MONTHS.length; mi += 1) {
        const m = FISCAL_MONTHS[mi];
        const td = document.createElement('td');
        const val = row.values[m];
        td.className = `col-amount col-amount-month${planTableMonthHighlightClass(m, highlightFiscalMonth)}`;
        if (
          (row.type === 'variance' || row.type === 'sub-variance')
          && val !== 0
        ) {
          td.classList.add('has-variance');
        }
        if (shouldHighlightMonthDeltaFromPrevious(section, row, mi, displayMode, pastMonthSet)) {
          td.classList.add('plan-amount-variance');
        }
        if (row.planFillMonths?.includes(m)) {
          td.classList.add('plan-amount-filled');
        }
        const showAmount = shouldShowPlanTableMonthAmount(section, row, m, {
          displayMode,
          pastMonthSet,
          crossVarianceCtx,
        });

        if (isManMonthRow) {
          if (!hideGroupTotal && showAmount) {
            td.textContent = formatManMonths(val);
            if (isRevenueManMonthMonthEditable(m, displayMode, pastMonthSet)) {
              td.classList.add('plan-man-month-editable', 'salary-plan-cell-editable');
              tagPlanEditableCell(td, { rowKey: row.revenueClientId, month: m });
              td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同値を反映　0 も可）';
              td.addEventListener('dblclick', () => {
                startRevenueManMonthCellEdit(td, {
                  clientId: row.revenueClientId,
                  month: m,
                  displayMode,
                  pastMonthSet,
                });
              });
            }
          }
          tr.appendChild(td);
          continue;
        }

        const outsourcingVendorId = getOutsourcingVendorIdFromRow(row);
        const isOutsourcingEditableRow = isOutsourcingPlanRowEditable(section, row);

        if (isOutsourcingEditableRow) {
          if (!hideGroupTotal && showAmount) {
            const amountType = row.type === 'variance' ? 'variance' : 'item';
            td.innerHTML = formatAmount(val, amountType);
            const editable = isOutsourcingPlanCellEditable(section, row, m, displayMode, pastMonthSet);
            const hasDrilldown = !editable
              && isDrilldownAvailable(section, row)
              && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
              && !row.planFillMonths?.includes(m)
              && !row.openingAdjustMonths?.includes(m);
            if (editable) {
              td.classList.add('salary-plan-cell-editable');
              tagPlanEditableCell(td, { rowKey: outsourcingVendorId, month: m });
              td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
              td.addEventListener('dblclick', () => {
                startOutsourcingPlanCellEdit(td, {
                  vendorId: outsourcingVendorId,
                  month: m,
                  displayMode,
                  pastMonthSet,
                });
              });
            } else if (hasDrilldown) {
              td.classList.add('col-amount-drilldown');
              td.addEventListener('dblclick', () => {
                showJournalPopup(section, row, m);
              });
              applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
            } else {
              applyAggregateCellTooltip(td, row, section, m, '');
            }
          }
          tr.appendChild(td);
          continue;
        }

        const isOvertimeEditableRow = isOvertimePlanRowEditable(section, row);

        if (isOvertimeEditableRow) {
          if (!hideGroupTotal && showAmount) {
            const amountType = row.type === 'variance' ? 'variance' : 'item';
            td.innerHTML = formatAmount(val, amountType);
            const editable = isOvertimePlanCellEditable(section, row, m, displayMode, pastMonthSet);
            const hasDrilldown = !editable
              && isDrilldownAvailable(section, row)
              && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
              && !row.planFillMonths?.includes(m)
              && !row.openingAdjustMonths?.includes(m);
            if (editable) {
              td.classList.add('salary-plan-cell-editable');
              tagPlanEditableCell(td, { rowKey: 'overtime', month: m });
              td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
              td.addEventListener('dblclick', () => {
                startOvertimePlanTableCellEdit(td, {
                  month: m,
                  displayMode,
                  pastMonthSet,
                });
              });
            } else if (hasDrilldown) {
              td.classList.add('col-amount-drilldown');
              td.addEventListener('dblclick', () => {
                showJournalPopup(section, row, m);
              });
              applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
            } else {
              applyAggregateCellTooltip(td, row, section, m, '');
            }
          }
          tr.appendChild(td);
          continue;
        }

        const employeePlanId = getEmployeeIdFromPlanRow(row);
        const isEmployeeSalaryEditableRow = isEmployeeSalaryPlanRowEditable(section, row);

        if (isEmployeeSalaryEditableRow) {
          if (!hideGroupTotal && showAmount) {
            const amountType = row.type === 'variance' ? 'variance' : 'item';
            td.innerHTML = formatAmount(val, amountType);
            const editable = isEmployeeSalaryPlanCellEditable(section, row, m, displayMode, pastMonthSet);
            const hasDrilldown = !editable
              && isDrilldownAvailable(section, row)
              && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
              && !row.planFillMonths?.includes(m)
              && !row.openingAdjustMonths?.includes(m);
            if (editable) {
              td.classList.add('salary-plan-cell-editable');
              tagPlanEditableCell(td, { rowKey: employeePlanId, month: m });
              td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
              td.addEventListener('dblclick', () => {
                startEmployeeSalaryPlanCellEdit(td, {
                  employeeId: employeePlanId,
                  month: m,
                  displayMode,
                  pastMonthSet,
                });
              });
            } else if (hasDrilldown) {
              td.classList.add('col-amount-drilldown');
              td.addEventListener('dblclick', () => {
                showJournalPopup(section, row, m);
              });
              applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
            } else {
              applyAggregateCellTooltip(td, row, section, m, '');
            }
          }
          tr.appendChild(td);
          continue;
        }

        const taxPaymentEditTarget = getTaxPaymentPlanEditTarget(section, row);
        const isTaxPaymentEditableRow = isTaxPaymentPlanRowEditable(section, row);

        if (isTaxPaymentEditableRow) {
          if (!hideGroupTotal && showAmount) {
            const amountType = row.type === 'variance' ? 'variance' : 'item';
            td.innerHTML = formatAmount(val, amountType);
            const editable = isTaxPaymentPlanCellEditable(section, row, m, displayMode, pastMonthSet);
            const hasDrilldown = !editable
              && isDrilldownAvailable(section, row)
              && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
              && !row.planFillMonths?.includes(m)
              && !row.openingAdjustMonths?.includes(m);
            if (editable && taxPaymentEditTarget) {
              const rowKey = taxPaymentEditTarget.kind === 'simple'
                ? taxPaymentEditTarget.account
                : taxPaymentEditTarget.entryId;
              td.classList.add('salary-plan-cell-editable');
              tagPlanEditableCell(td, { rowKey, month: m });
              td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）';
              td.addEventListener('dblclick', () => {
                startTaxPaymentPlanTableCellEdit(td, {
                  target: taxPaymentEditTarget,
                  month: m,
                  displayMode,
                  pastMonthSet,
                });
              });
            } else if (hasDrilldown) {
              td.classList.add('col-amount-drilldown');
              td.addEventListener('dblclick', () => {
                showJournalPopup(section, row, m);
              });
              applyAggregateCellTooltip(td, row, section, m, 'ダブルクリックで仕訳を表示');
            } else {
              applyAggregateCellTooltip(td, row, section, m, '');
            }
          }
          tr.appendChild(td);
          continue;
        }

        const amountType = row.type === 'variance' ? 'variance' : 'item';
        td.innerHTML = hideGroupTotal || !showAmount ? '' : formatAmount(val, amountType);
        const hasDrilldown = showAmount
          && isDrilldownAvailable(section, row)
          && hasDrilldownEntries(getDrilldownIndex(), section, row, m)
          && !row.planFillMonths?.includes(m)
          && !row.openingAdjustMonths?.includes(m);
        if (hasDrilldown) {
          td.classList.add('col-amount-drilldown');
          td.addEventListener('dblclick', () => {
            showJournalPopup(section, row, m);
          });
        }
        if (showAmount && !hideGroupTotal) {
          applyAggregateCellTooltip(
            td,
            row,
            section,
            m,
            hasDrilldown ? 'ダブルクリックで仕訳を表示' : '',
          );
        }
        tr.appendChild(td);
      }
      for (const col of EXTRA_COLUMNS) {
        const td = document.createElement('td');
        const val = row.values[col];
        td.className = 'col-amount col-amount-extra';
        const hideExtra = sectionHidesExtraColumns(section.id);
        if (
          !hideExtra
          && (row.type === 'variance' || row.type === 'sub-variance')
          && val !== 0
        ) {
          td.classList.add('has-variance');
        }
        if (isManMonthRow) {
          td.textContent = (hideExtra || hideGroupTotal) ? '' : formatManMonths(val);
        } else {
          const amountType = row.type === 'variance' ? 'variance' : 'item';
          td.innerHTML = (hideExtra || hideGroupTotal) ? '' : formatAmount(val, amountType);
          if (!hideExtra && !hideGroupTotal) {
            applyAggregateCellTooltip(td, row, section, col);
          }
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      sectionRowIndex += 1;
    }
  }

  table.appendChild(tbody);

  const wrap = document.createElement('div');
  wrap.className = 'plan-table-wrap';
  wrap.appendChild(table);
  replaceRootPanel(wrap);
  bindRowHoverPlate(wrap, table);
  bindEditableCellHoverPlate(wrap, table);
  bindPlanColumnPlates(wrap, table);
  bindRowSelectionPlates(wrap, table);
  bindRowContextMenu(wrap, table);
  applyPlanSectionFilterState(table);

  const scrollTarget = planBody() ?? wrap;
  const shouldMeasureColumnWidths = measureColumnWidths
    || planTableLayoutInvalidated
    || !hasStoredPlanTableColumnWidths(preservedWidths);

  if (shouldMeasureColumnWidths) {
    measurePlanTableColumnWidths(table, {
      onSettled: () => {
        planTableInitialLayoutDone = true;
        lastPlanTableColumnWidths = readPlanTableColumnWidths(table);
        capturePlanTableContentFitBaseline();
        planTableLayoutInvalidated = false;
        if (planLoadingAwaitLayout) finishPlanLoadingAfterLayout();
      },
      beforeMeasure: () => {
        if (scrollTarget) {
          scrollTarget.scrollTop = scrollTop;
          scrollTarget.scrollLeft = scrollLeft;
        }
      },
    });
  } else {
    // キャッシュ列幅と対のフォント倍率を復元して整合を保つ（再計測なし）
    setContentFitScale(lastPlanTableContentFitScale);
    applyPlanDisplayScales();
    applyPreservedPlanTableColumnWidths(table, preservedWidths);
    bindPlanTableColumnWidthViewportFit(wrap, table);
    if (scrollTarget) {
      scrollTarget.scrollTop = scrollTop;
      scrollTarget.scrollLeft = scrollLeft;
    }
    // 設定タブ表示中にウィンドウ幅が変わっていた場合のみ 1 回だけレイアウトし直す
    if (planTableColumnWidthsStale(table)) {
      layoutPlanTableSinglePass(table);
    }
    lastPlanTableColumnWidths = readPlanTableColumnWidths(table);
    capturePlanTableContentFitBaseline();
    planTableLayoutInvalidated = false;
    if (planLoadingAwaitLayout) {
      finishPlanLoadingAfterLayout();
    }
  }
}

function appendExpandSettingsCheckbox(cell, { checked, labelText, disabled, onChange, toggle }) {
  const label = document.createElement('label');
  label.className = 'expand-toggle-label';
  if (toggle) label.dataset.toggle = toggle;
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.disabled = disabled;
  if (toggle) checkbox.dataset.toggle = toggle;
  label.appendChild(checkbox);
  label.append(` ${labelText}`);
  checkbox.addEventListener('change', onChange);
  cell.appendChild(label);
  return checkbox;
}

function renderVisibilitySettings() {
  if (!data) return;

  setPlanKpi(null);

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap visibility-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">予実表に表示する行と見え方を設定します。オフにした行は予実表に表示されません（補助科目行は親行をオフにすると非表示になります）。<strong>折りたたむ</strong>（オン）の場合はグループ行で畳み、クリックで補助科目を表示します（デフォルトはオフ＝常時表示）。<strong>展開時に合計非表示</strong>（オン）の場合、展開中はグループ行の合計金額を非表示にします。<strong>大きく表示</strong>は通常サイズのフォント・行高で表示します（デフォルトは小さめ）。<strong>塗り色１</strong>は注目したい行、<strong>塗り色２</strong>は注意したい行に着色します（色は色設定で変更可能）。<strong>諸経費</strong>の勘定科目行では<strong>並び順</strong>（数値が小さいほど上）を指定できます。設定はブラウザに保存されます。</p>
    <div class="expand-settings-header-actions">
      <button type="button" class="expand-reset-btn" id="visibility-show-all-btn">すべて表示</button>
      <button type="button" class="expand-reset-btn" id="visibility-reset-btn">デフォルトに戻す</button>
    </div>
  `;
  wrap.appendChild(header);

  function bindVisibilitySettingsHeaderActions() {
    wrap.querySelector('#visibility-show-all-btn')?.addEventListener('click', () => {
      visibilityConfig = {};
      saveVisibilityConfig(visibilityConfig);
      renderVisibilitySettings();
      if (activeTab === 'plan') refreshPlanTable();
    });
    wrap.querySelector('#visibility-reset-btn')?.addEventListener('click', () => {
      visibilityConfig = {};
      rowDisplayConfig = {};
      expenseSortConfig = {};
      expandConfig = {};
      saveVisibilityConfig(visibilityConfig);
      saveRowDisplayConfig(rowDisplayConfig);
      saveExpenseSortConfig(expenseSortConfig);
      saveExpandConfig(expandConfig);
      if (journalText) rebuildPlanData();
      else if (rawPlanData) data = applyPlanColors(rawPlanData);
      renderVisibilitySettings();
      if (activeTab === 'plan') refreshPlanTable();
    });
  }

  const candidates = collectVisibilityCandidates(data.sections);
  if (candidates.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'expand-settings-empty';
    empty.textContent = '表示対象の行がありません。';
    wrap.appendChild(empty);
    bindVisibilitySettingsHeaderActions();
    replaceRootPanel(wrap);
    return;
  }

  const table = document.createElement('table');
  table.className = 'expand-settings-table visibility-config-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>大項目</th>
        <th class="col-row-type">種別</th>
        <th class="col-settings-label">勘定科目</th>
        <th class="col-subs">補助科目</th>
        <th class="col-sort-order">並び順</th>
        <th class="col-toggle">折りたたむ</th>
        <th class="col-toggle">展開時に合計非表示</th>
        <th class="col-toggle">表示</th>
        <th class="col-toggle">大きく表示</th>
        <th class="col-toggle">塗り色１（注目）</th>
        <th class="col-toggle">塗り色２（注意）</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  let lastSection = '';
  const expenseSortAccountsShown = new Set();
  const expandAccountsShown = new Set();

  function applyExpenseSortAndRefreshPlan() {
    if (rawPlanData) data = applyPlanColors(rawPlanData);
    if (activeTab === 'plan') refreshPlanTable();
  }

  function appendDisplayCheckbox(cell, { checked, ariaLabel, disabled, onChange, toggle }) {
    const label = document.createElement('label');
    label.className = 'expand-toggle-label';
    if (toggle) label.dataset.toggle = toggle;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.disabled = disabled;
    checkbox.setAttribute('aria-label', ariaLabel);
    if (toggle) checkbox.dataset.toggle = toggle;
    label.appendChild(checkbox);
    checkbox.addEventListener('change', onChange);
    cell.appendChild(label);
    return checkbox;
  }

  for (const c of candidates) {
    const tr = document.createElement('tr');
    tr.dataset.rowKey = c.key;
    tr.dataset.sectionId = c.sectionId;
    tr.dataset.rowType = c.rowType;
    tr.dataset.account = c.account;
    if (c.subLabel) tr.dataset.subLabel = c.subLabel;
    if (c.sectionLabel !== lastSection) {
      tr.className = 'expand-section-row';
      lastSection = c.sectionLabel;
    }

    const visible = isRowVisible(c.sectionId, {
      type: c.rowType,
      label: c.account,
      subLabel: c.subLabel,
    }, visibilityConfig);

    const displayEntry = getRowDisplayEntry(rowDisplayConfig, c.sectionId, {
      type: c.rowType,
      label: c.account,
      subLabel: c.subLabel,
    });

    tr.innerHTML = `
      <td></td>
      <td class="col-row-type">${c.rowTypeLabel}</td>
      <td class="col-settings-label">${c.account}</td>
      <td class="col-subs">${c.subLabel}</td>
      <td class="col-sort-order"></td>
      <td class="col-toggle"></td>
      <td class="col-toggle"></td>
      <td class="col-toggle"></td>
      <td class="col-toggle"></td>
      <td class="col-toggle"></td>
      <td class="col-toggle"></td>
    `;
    styleSectionLabelCell(tr.querySelector('td'), c.sectionId);
    tr.querySelector('td').textContent = c.sectionLabel;

    const sortCell = tr.querySelector('.col-sort-order');
    if (
      c.sectionId === 'expense'
      && c.rowType !== 'total'
      && !expenseSortAccountsShown.has(c.account)
    ) {
      expenseSortAccountsShown.add(c.account);
      const sortInput = document.createElement('input');
      sortInput.type = 'text';
      sortInput.inputMode = 'numeric';
      sortInput.autocomplete = 'off';
      sortInput.className = 'expense-sort-order-input';
      sortInput.value = getExpenseAccountSortOrderDisplay(expenseSortConfig, c.account);
      sortInput.setAttribute('aria-label', `${c.account} の並び順`);
      sortInput.addEventListener('change', () => {
        expenseSortConfig = setExpenseAccountSortOrder(
          expenseSortConfig,
          c.account,
          sortInput.value,
        );
        saveExpenseSortConfig(expenseSortConfig);
        applyExpenseSortAndRefreshPlan();
      });
      sortCell.appendChild(sortInput);
    }

    const expandAccountKey = `${c.sectionId}|${c.account}`;
    const isExpandAccountRow = findExpandCandidate(c.sectionId, c.account)
      && !expandAccountsShown.has(expandAccountKey);
    if (isExpandAccountRow) expandAccountsShown.add(expandAccountKey);

    const toggleCells = tr.querySelectorAll('.col-toggle');

    if (isExpandAccountRow) {
      tr.dataset.sectionId = c.sectionId;
      tr.dataset.account = c.account;

      const entry = getExpandEntry(expandConfig, c.sectionId, c.account);
      const isDefault = !Object.prototype.hasOwnProperty.call(
        expandConfig,
        expandConfigKey(c.sectionId, c.account),
      );
      const forceExpanded = ALWAYS_EXPAND_SECTION_IDS.has(c.sectionId);

      const collapsibleCheckbox = appendExpandSettingsCheckbox(toggleCells[0], {
        checked: entry.collapsible,
        labelText: '折りたたむ',
        disabled: forceExpanded,
        toggle: 'collapsible',
        onChange: () => {
          expandConfig = setExpandEntry(expandConfig, c.sectionId, c.account, {
            collapsible: collapsibleCheckbox.checked,
          });
          saveExpandConfig(expandConfig);
          rebuildPlanData();
          renderVisibilitySettings();
        },
      });

      const hideTotalCheckbox = appendExpandSettingsCheckbox(toggleCells[1], {
        checked: entry.hideTotalWhenExpanded,
        labelText: '展開時に合計非表示',
        disabled: forceExpanded || !entry.collapsible,
        toggle: 'hideTotal',
        onChange: () => {
          expandConfig = setExpandEntry(expandConfig, c.sectionId, c.account, {
            hideTotalWhenExpanded: hideTotalCheckbox.checked,
          });
          saveExpandConfig(expandConfig);
        },
      });

      if (isDefault) {
        const hint = document.createElement('span');
        hint.className = 'expand-default-hint';
        hint.textContent = '（初期）';
        toggleCells[0].querySelector('.expand-toggle-label').appendChild(hint);
      }
    }

    const toggleCell = toggleCells[2];
    const label = document.createElement('label');
    label.className = 'expand-toggle-label';
    label.dataset.toggle = 'visible';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = visible;
    checkbox.dataset.toggle = 'visible';
    label.appendChild(checkbox);
    label.append(' 表示');
    toggleCell.appendChild(label);

    checkbox.addEventListener('change', () => {
      visibilityConfig = { ...visibilityConfig };
      if (checkbox.checked) delete visibilityConfig[c.key];
      else visibilityConfig[c.key] = false;
      saveVisibilityConfig(visibilityConfig);
      renderVisibilitySettings();
    });

    const rowRef = { type: c.rowType, label: c.account, subLabel: c.subLabel };
    const hasFixedDisplayStyle = planRowHasAccentBackground({ id: c.sectionId }, rowRef)
      || rowRef?.type === 'plan';

    appendDisplayCheckbox(toggleCells[3], {
      checked: hasFixedDisplayStyle ? false : displayEntry.largeDisplay,
      ariaLabel: '大きく表示',
      disabled: hasFixedDisplayStyle,
      toggle: 'large',
      onChange: (ev) => {
        rowDisplayConfig = setRowDisplayEntry(
          rowDisplayConfig,
          c.sectionId,
          rowRef,
          { largeDisplay: ev.target.checked },
        );
        saveRowDisplayConfig(rowDisplayConfig);
        renderVisibilitySettings();
        if (activeTab === 'plan') refreshPlanTable();
      },
    });

    appendDisplayCheckbox(toggleCells[4], {
      checked: hasFixedDisplayStyle ? false : displayEntry.fillColor1,
      ariaLabel: '塗り色１（注目）',
      disabled: hasFixedDisplayStyle,
      toggle: 'fill1',
      onChange: (ev) => {
        rowDisplayConfig = setRowDisplayEntry(
          rowDisplayConfig,
          c.sectionId,
          rowRef,
          { fillColor1: ev.target.checked },
        );
        saveRowDisplayConfig(rowDisplayConfig);
        renderVisibilitySettings();
        if (activeTab === 'plan') refreshPlanTable();
      },
    });

    appendDisplayCheckbox(toggleCells[5], {
      checked: hasFixedDisplayStyle ? false : displayEntry.fillColor2,
      ariaLabel: '塗り色２（注意）',
      disabled: hasFixedDisplayStyle,
      toggle: 'fill2',
      onChange: (ev) => {
        rowDisplayConfig = setRowDisplayEntry(
          rowDisplayConfig,
          c.sectionId,
          rowRef,
          { fillColor2: ev.target.checked },
        );
        saveRowDisplayConfig(rowDisplayConfig);
        renderVisibilitySettings();
        if (activeTab === 'plan') refreshPlanTable();
      },
    });

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  bindExpandSettingsContextMenu(wrap, table);

  bindVisibilitySettingsHeaderActions();

  replaceRootPanel(wrap);
  // ブラウザ幅へフィットさせる（表の自然幅 ＋ 左右余白 2rem を基準に UI スケール）
  bindPlanSettingsScalableLayout(wrap, {
    measureNaturalWidth: () => {
      const tableW = measureElementIntrinsicWidth(wrap.querySelector('.visibility-config-table'));
      return tableW > 0 ? tableW + planSettingsRemToPx(2) : 0;
    },
  });
}

function renderUiColorPanel(container) {
  mountUiColorPanel(container, {
    getConfig: () => uiColorConfig,
    setConfig: (next) => { uiColorConfig = next; },
    data,
    sectionColorConfig,
    onRefreshPlanView: () => refreshColorDependentViews({ rebuildData: false }),
    onRefreshToolbar: refreshToolbarFilterStyles,
    onRefreshDashboard: renderDashboardView,
    onReRender: refreshColorSettingsPanels,
  });
}

function mountSectionColorPanel(sectionPanel) {
  sectionPanel.replaceChildren();

  const sectionTitle = document.createElement('h2');
  sectionTitle.className = 'ui-color-panel-title';
  sectionTitle.textContent = '大項目';
  sectionPanel.appendChild(sectionTitle);

  const defs = collectSectionColorDefs(
    data?.sections ?? rawPlanData?.sections ?? [],
    sectionColorConfig,
    getPlanColorMode(),
  );
  if (defs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'expand-settings-empty';
    empty.textContent = '大項目がありません。';
    sectionPanel.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'expand-settings-table section-color-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>大項目</th>
        <th class="col-color-input">塗り色</th>
        <th class="col-color-input">文字色</th>
        <th class="col-color-preview">プレビュー</th>
        <th class="col-color-action">操作</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  let sectionColorSaveTimer = null;
  let sectionColorRefreshTimer = null;

  const flushSectionColorSave = () => {
    if (sectionColorSaveTimer != null) {
      clearTimeout(sectionColorSaveTimer);
      sectionColorSaveTimer = null;
    }
    saveSectionColorConfig(sectionColorConfig);
  };

  const scheduleSectionColorSave = () => {
    if (sectionColorSaveTimer != null) clearTimeout(sectionColorSaveTimer);
    sectionColorSaveTimer = setTimeout(flushSectionColorSave, 300);
  };

  const scheduleSectionColorRefresh = () => {
    if (sectionColorRefreshTimer != null) cancelAnimationFrame(sectionColorRefreshTimer);
    sectionColorRefreshTimer = requestAnimationFrame(() => {
      refreshColorDependentViews();
      sectionColorRefreshTimer = null;
    });
  };

  for (const def of defs) {
    const tr = document.createElement('tr');

    const labelTd = document.createElement('td');
    labelTd.textContent = def.label;
    styleSectionLabelCell(labelTd, def.sectionId);

    const bgInputTd = document.createElement('td');
    bgInputTd.className = 'col-color-input';
    const bgInput = document.createElement('input');
    bgInput.type = 'color';
    bgInput.className = 'section-color-input';
    bgInput.value = def.barColor;
    bgInput.title = def.barColor;
    bgInputTd.appendChild(bgInput);

    const textInputTd = document.createElement('td');
    textInputTd.className = 'col-color-input';
    const textInput = document.createElement('input');
    textInput.type = 'color';
    textInput.className = 'section-color-input';
    textInput.value = def.textColor;
    textInput.title = def.textColor;
    textInputTd.appendChild(textInput);

    const previewTd = document.createElement('td');
    previewTd.className = 'col-color-preview';
    const preview = document.createElement('span');
    preview.className = 'section-color-preview';
    preview.style.background = def.barColor;
    preview.style.color = def.textColor;
    preview.textContent = def.label;
    previewTd.appendChild(preview);

    const actionTd = document.createElement('td');
    actionTd.className = 'col-color-action';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'section-color-reset-btn';
    resetBtn.textContent = 'デフォルト';
    resetBtn.disabled = !def.isCustom;
    actionTd.appendChild(resetBtn);

    tr.append(labelTd, bgInputTd, textInputTd, previewTd, actionTd);
    tbody.appendChild(tr);

    const applySectionColorOverride = (barColor, textColor, { flush = false } = {}) => {
      sectionColorConfig = setSectionColorOverride(
        sectionColorConfig,
        getPlanColorMode(),
        def.sectionId,
        { barColor, textColor },
      );
      if (flush) flushSectionColorSave();
      else scheduleSectionColorSave();
      scheduleSectionColorRefresh();
      bgInput.value = barColor;
      bgInput.title = barColor;
      textInput.value = textColor;
      textInput.title = textColor;
      preview.style.background = barColor;
      preview.style.color = textColor;
      styleSectionLabelCell(labelTd, def.sectionId);
      resetBtn.disabled = false;
    };

    const emitSectionColorOverride = (flush) => {
      applySectionColorOverride(bgInput.value, textInput.value, { flush });
    };

    bgInput.addEventListener('input', () => emitSectionColorOverride(false));
    bgInput.addEventListener('change', () => emitSectionColorOverride(true));
    textInput.addEventListener('input', () => emitSectionColorOverride(false));
    textInput.addEventListener('change', () => emitSectionColorOverride(true));

    resetBtn.addEventListener('click', () => {
      sectionColorConfig = resetSectionColorOverride(
        sectionColorConfig,
        getPlanColorMode(),
        def.sectionId,
      );
      flushSectionColorSave();
      refreshColorDependentViews();
      const colors = getSectionColors(def.sectionId, sectionColorConfig, getPlanColorMode());
      bgInput.value = colors.barColor;
      bgInput.title = colors.barColor;
      textInput.value = colors.textColor;
      textInput.title = colors.textColor;
      preview.style.background = colors.barColor;
      preview.style.color = colors.textColor;
      styleSectionLabelCell(labelTd, def.sectionId);
      resetBtn.disabled = true;
    });
  }

  table.appendChild(tbody);
  sectionPanel.appendChild(table);
}

function buildColorSettingsColumns() {
  const columns = document.createElement('div');
  columns.className = 'color-settings-columns';

  const uiColumn = document.createElement('div');
  uiColumn.className = 'color-settings-column color-settings-column-ui';
  renderUiColorPanel(uiColumn);
  columns.appendChild(uiColumn);

  const sectionColumn = document.createElement('div');
  sectionColumn.className = 'color-settings-column color-settings-column-sections';

  const sectionPanel = document.createElement('div');
  sectionPanel.className = 'section-color-panel';
  mountSectionColorPanel(sectionPanel);
  sectionColumn.appendChild(sectionPanel);
  columns.appendChild(sectionColumn);

  return columns;
}

function bindColorSettingsResetActions(container) {
  container.querySelector('#ui-color-reset-btn')?.addEventListener('click', () => {
    uiColorConfig = resetUiColorModeOverrides(uiColorConfig, getPlanColorMode());
    saveUiColorConfig(uiColorConfig);
    applyUiColors(uiColorConfig);
    refreshColorSettingsPanels();
    refreshColorDependentViews();
  });

  container.querySelector('#section-color-reset-btn')?.addEventListener('click', () => {
    sectionColorConfig = resetSectionColorModeOverrides(sectionColorConfig, getPlanColorMode());
    saveSectionColorConfig(sectionColorConfig);
    refreshSectionColors();
    refreshColorSettingsPanels();
    refreshColorDependentViews();
  });
}

function buildColorSettingsContent() {
  const wrap = document.createElement('div');
  wrap.className = 'color-settings-content';

  const header = document.createElement('div');
  header.className = 'expand-settings-header color-settings-content-header';
  header.innerHTML = `
    <div class="expand-settings-header-actions color-settings-window-reset-actions">
      <button type="button" class="expand-reset-btn" id="ui-color-reset-btn">全体をデフォルトに戻す</button>
      <button type="button" class="expand-reset-btn" id="section-color-reset-btn">大項目をすべてデフォルトに戻す</button>
    </div>
  `;
  wrap.appendChild(header);
  wrap.appendChild(buildColorSettingsColumns());
  bindColorSettingsResetActions(wrap);
  return wrap;
}

function appendCsvNameSettingsPanel(wrap) {
  const section = document.createElement('div');
  section.className = 'app-settings-section csv-name-settings-wrap';

  const title = document.createElement('h2');
  title.className = 'ui-color-panel-title';
  title.textContent = 'CSV名定義';
  section.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'app-settings-hint';
  desc.innerHTML = `
    フォルダ読み込み時に対象とする CSV ファイル名を、種類ごとに<strong>正規表現</strong>で定義します。
    例のファイル名でパターンをテストできます。変更後は <strong>CSV再読込</strong> で反映されます。
  `;
  section.appendChild(desc);

  const resetRow = document.createElement('div');
  resetRow.className = 'expand-settings-header-actions';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'expand-reset-btn';
  resetBtn.id = 'csvname-reset-btn';
  resetBtn.textContent = 'CSV名定義をデフォルトに戻す';
  resetRow.appendChild(resetBtn);
  section.appendChild(resetRow);

  const table = document.createElement('table');
  table.className = 'expand-settings-table csv-name-settings-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>種類</th>
        <th>正規表現パターン</th>
        <th>例（ファイル名）</th>
        <th class="col-csvname-test">テスト</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  for (const kind of CSV_KINDS) {
    const entry = csvNameConfig[kind.id];
    const tr = document.createElement('tr');
    tr.dataset.csvKind = kind.id;

    const labelTd = document.createElement('td');
    labelTd.textContent = kind.required ? kind.label : `${kind.label}（任意）`;

    const patternTd = document.createElement('td');
    patternTd.className = 'col-csvname-pattern';
    const patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.className = 'csvname-pattern-input';
    patternInput.value = entry.pattern;
    patternInput.spellcheck = false;
    patternTd.appendChild(patternInput);

    const exampleTd = document.createElement('td');
    exampleTd.className = 'col-csvname-example';
    const exampleInput = document.createElement('input');
    exampleInput.type = 'text';
    exampleInput.className = 'csvname-example-input';
    exampleInput.value = entry.example;
    exampleInput.spellcheck = false;
    exampleTd.appendChild(exampleInput);

    const testTd = document.createElement('td');
    testTd.className = 'col-csvname-test';

    function refreshTestCell() {
      const result = testCsvNameExample(kind.id, csvNameConfig);
      testTd.textContent = result.ok ? '一致' : (result.error ?? '—');
      testTd.className = `col-csvname-test${result.ok ? ' is-ok' : ' is-ng'}`;
    }

    function persistField(field, value) {
      csvNameConfig = {
        ...csvNameConfig,
        [kind.id]: { ...csvNameConfig[kind.id], [field]: value },
      };
      saveCsvNameConfig(csvNameConfig);
      refreshTestCell();
    }

    patternInput.addEventListener('input', () => {
      persistField('pattern', patternInput.value);
    });
    exampleInput.addEventListener('input', () => {
      persistField('example', exampleInput.value);
    });

    tr.append(labelTd, patternTd, exampleTd, testTd);
    tbody.appendChild(tr);
    refreshTestCell();
  }

  table.appendChild(tbody);
  section.appendChild(table);

  resetBtn.addEventListener('click', () => {
    csvNameConfig = resetCsvNameConfig();
    if (activeTab === 'settings') renderOtherSettings();
  });

  wrap.appendChild(section);
}

function filterBrandLogoDecimalInput(value) {
  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, dotIndex);
  const fracPart = cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 1);
  if (fracPart.length > 0 || cleaned.endsWith('.')) {
    return `${intPart}.${fracPart}`;
  }
  return `${intPart}.`;
}

function filterTaxRateIntegerInput(value) {
  return String(value ?? '').replace(/[^\d]/g, '');
}

function filterTaxRateDecimalInput(value) {
  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, dotIndex);
  const fracPart = cleaned.slice(dotIndex + 1).replace(/\./g, '');
  return `${intPart}.${fracPart}`;
}

function formatTaxRateThresholdYen(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (!Number.isFinite(num)) return '';
  return `\u00a5${num.toLocaleString('ja-JP')}`;
}

function parseTaxRateThresholdYen(raw) {
  return String(raw ?? '').replace(/[^\d]/g, '');
}

function createTaxRateThresholdInput({ field, value, className }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.className = className;
  input.dataset.field = field;
  input.value = formatTaxRateThresholdYen(value);

  input.addEventListener('focus', () => {
    input.value = parseTaxRateThresholdYen(input.value);
  });

  input.addEventListener('input', () => {
    const filtered = filterTaxRateIntegerInput(input.value);
    if (filtered !== input.value) input.value = filtered;
  });

  input.addEventListener('blur', () => {
    input.value = formatTaxRateThresholdYen(input.value);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  return input;
}

function createTaxRateInput({ field, value, className, numericKind }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = numericKind === 'decimal' ? 'decimal' : 'numeric';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.className = className;
  input.dataset.field = field;
  input.value = String(value);

  input.addEventListener('input', () => {
    const filtered = numericKind === 'decimal'
      ? filterTaxRateDecimalInput(input.value)
      : filterTaxRateIntegerInput(input.value);
    if (filtered !== input.value) input.value = filtered;
  });

  return input;
}

function bindTaxRateTable({ tbody, addBtn, getRates, normalizeRates, onUpdate }) {
  function readRatesFromTable() {
    const rows = [];
    tbody.querySelectorAll('tr').forEach((tr) => {
      rows.push({
        year: tr.querySelector('[data-field="year"]')?.value,
        month: tr.querySelector('[data-field="month"]')?.value,
        ratePercent: tr.querySelector('[data-field="rate"]')?.value,
      });
    });
    return rows;
  }

  function saveFromTable() {
    onUpdate(normalizeRates(readRatesFromTable()));
  }

  function renderRows() {
    tbody.replaceChildren();
    getRates().forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.dataset.rateKind = 'consumption';
      tr.dataset.index = String(index);

      const yearTd = document.createElement('td');
      yearTd.appendChild(createTaxRateInput({
        field: 'year',
        value: row.year,
        className: 'tax-rate-input',
        numericKind: 'integer',
      }));

      const monthTd = document.createElement('td');
      monthTd.appendChild(createTaxRateInput({
        field: 'month',
        value: row.month,
        className: 'tax-rate-input',
        numericKind: 'integer',
      }));

      const rateTd = document.createElement('td');
      rateTd.appendChild(createTaxRateInput({
        field: 'rate',
        value: row.ratePercent,
        className: 'tax-rate-input tax-rate-input-rate',
        numericKind: 'decimal',
      }));

      const actionTd = document.createElement('td');
      actionTd.className = 'col-tax-rate-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'settings-delete-btn';
      deleteBtn.textContent = '削除';
      deleteBtn.addEventListener('click', () => {
        tr.remove();
        saveFromTable();
      });
      actionTd.appendChild(deleteBtn);

      tr.append(yearTd, monthTd, rateTd, actionTd);
      tr.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', saveFromTable);
      });
      tbody.appendChild(tr);
    });
  }

  addBtn.addEventListener('click', () => {
    const rates = getRates();
    const last = rates.length > 0 ? rates[rates.length - 1] : null;
    const now = new Date();
    const nextRow = last
      ? { year: last.year, month: last.month, ratePercent: last.ratePercent }
      : { year: now.getFullYear(), month: now.getMonth() + 1, ratePercent: 10 };
    onUpdate(normalizeRates([...rates, nextRow]));
  });

  return { renderRows };
}

function bindWithholdingTaxTable({ tbody, addBtn, getRates, onUpdate }) {
  function readRatesFromTable() {
    const rows = [];
    tbody.querySelectorAll('tr').forEach((tr) => {
      rows.push({
        year: tr.querySelector('[data-field="year"]')?.value,
        month: tr.querySelector('[data-field="month"]')?.value,
        thresholdYen: parseTaxRateThresholdYen(tr.querySelector('[data-field="threshold"]')?.value),
        baseRatePercent: tr.querySelector('[data-field="base-rate"]')?.value,
        excessRatePercent: tr.querySelector('[data-field="excess-rate"]')?.value,
      });
    });
    return rows;
  }

  function saveFromTable() {
    onUpdate(normalizeWithholdingTaxRates(readRatesFromTable()));
  }

  function renderRows() {
    tbody.replaceChildren();
    getRates().forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.dataset.rateKind = 'withholding';
      tr.dataset.index = String(index);

      const fields = [
        { name: 'year', value: row.year, className: 'tax-rate-input', numericKind: 'integer' },
        { name: 'month', value: row.month, className: 'tax-rate-input', numericKind: 'integer' },
        {
          name: 'threshold',
          value: row.thresholdYen,
          className: 'tax-rate-input tax-rate-input-threshold',
          numericKind: 'integer',
        },
        {
          name: 'base-rate',
          value: row.baseRatePercent,
          className: 'tax-rate-input tax-rate-input-rate',
          numericKind: 'decimal',
        },
        {
          name: 'excess-rate',
          value: row.excessRatePercent,
          className: 'tax-rate-input tax-rate-input-rate',
          numericKind: 'decimal',
        },
      ];

      for (const field of fields) {
        const td = document.createElement('td');
        if (field.name === 'threshold') {
          td.appendChild(createTaxRateThresholdInput({
            field: field.name,
            value: field.value,
            className: field.className,
          }));
        } else {
          td.appendChild(createTaxRateInput({
            field: field.name,
            value: field.value,
            className: field.className,
            numericKind: field.numericKind,
          }));
        }
        tr.appendChild(td);
      }

      const actionTd = document.createElement('td');
      actionTd.className = 'col-tax-rate-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'settings-delete-btn';
      deleteBtn.textContent = '削除';
      deleteBtn.addEventListener('click', () => {
        tr.remove();
        saveFromTable();
      });
      actionTd.appendChild(deleteBtn);

      tr.appendChild(actionTd);
      tr.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', saveFromTable);
      });
      tbody.appendChild(tr);
    });
  }

  addBtn.addEventListener('click', () => {
    const rates = getRates();
    const last = rates.length > 0 ? rates[rates.length - 1] : null;
    const now = new Date();
    const nextRow = last
      ? { ...last }
      : {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        thresholdYen: DEFAULT_WITHHOLDING_THRESHOLD_YEN,
        baseRatePercent: 10.21,
        excessRatePercent: 20.42,
      };
    onUpdate(normalizeWithholdingTaxRates([...rates, nextRow]));
  });

  return { renderRows };
}

function renderTaxRateSettings() {
  setPlanKpi(null);

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap tax-rate-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc tax-rate-settings-desc">
      消費税税率・源泉所得税（個人事業主）・法定福利費予測率を定義します。源泉所得税は支払額に対する段階税率で、各行はその年月以降に有効です。
    </p>
    <div class="expand-settings-header-actions">
      <button type="button" class="expand-reset-btn" id="tax-rate-reset-btn">デフォルトに戻す</button>
    </div>
  `;
  wrap.appendChild(header);

  const form = document.createElement('div');
  form.className = 'app-settings-form tax-rate-settings-form';
  form.innerHTML = `
    <div class="tax-rate-settings-stack">
      <div class="app-settings-section tax-rate-section tax-rate-section--consumption">
        <div class="tax-rate-section-head">
          <span class="app-settings-label">消費税税率</span>
          <span class="app-settings-hint tax-rate-section-hint">適用開始年月以降に有効な消費税税率（％）</span>
        </div>
        <table class="expand-settings-table tax-rate-table consumption-tax-rate-table">
          <thead>
            <tr>
              <th>年</th>
              <th>月</th>
              <th>税率（%）</th>
              <th class="col-tax-rate-actions"></th>
            </tr>
          </thead>
          <tbody id="consumption-tax-rate-tbody"></tbody>
        </table>
        <button type="button" class="expand-reset-btn tax-rate-add-btn" id="consumption-tax-rate-add">行を追加</button>
      </div>
      <div class="app-settings-section tax-rate-section tax-rate-section--withholding">
        <div class="tax-rate-section-head">
          <span class="app-settings-label">源泉所得税（個人事業主・報酬・料金等）</span>
          <span class="app-settings-hint tax-rate-section-hint">閾値以下は基準税率、超過分は超過税率。税額 = 閾値以下 × 基準 ＋ 超過 × 超過（1円未満切捨て）。例: 150万・10.21%／20.42% → 204,200円</span>
        </div>
        <table class="expand-settings-table tax-rate-table withholding-tax-rate-table">
          <thead>
            <tr>
              <th>年</th>
              <th>月</th>
              <th>閾値（円）</th>
              <th>基準税率（%）</th>
              <th>超過税率（%）</th>
              <th class="col-tax-rate-actions"></th>
            </tr>
          </thead>
          <tbody id="withholding-tax-rate-tbody"></tbody>
        </table>
        <button type="button" class="expand-reset-btn tax-rate-add-btn" id="withholding-tax-rate-add">行を追加</button>
      </div>
      <div class="app-settings-section tax-rate-section tax-rate-section--legal-welfare">
        <div class="tax-rate-section-head">
          <span class="app-settings-label">法定福利費（予測）</span>
          <span class="app-settings-hint tax-rate-section-hint">round((役員報酬月次合計 ＋ 給料手当月次合計) × 率)。CSV実績＋人件費計画のマージ合計（残業手当含む）</span>
        </div>
        <div class="legal-welfare-rate-inline">
          <label class="legal-welfare-rate-field" for="legal-welfare-rate-input">
            <span class="app-settings-label">率</span>
            <input
              type="number"
              class="app-settings-input tax-rate-input legal-welfare-rate-input"
              id="legal-welfare-rate-input"
              min="0"
              max="1"
              step="0.01"
              aria-describedby="legal-welfare-rate-note"
            />
          </label>
          <span class="app-settings-hint tax-rate-section-hint" id="legal-welfare-rate-note"></span>
        </div>
      </div>
    </div>
  `;
  wrap.appendChild(form);

  const consumptionTbody = form.querySelector('#consumption-tax-rate-tbody');
  const consumptionAddBtn = form.querySelector('#consumption-tax-rate-add');
  const withholdingTbody = form.querySelector('#withholding-tax-rate-tbody');
  const withholdingAddBtn = form.querySelector('#withholding-tax-rate-add');
  const legalWelfareRateInput = form.querySelector('#legal-welfare-rate-input');
  const legalWelfareRateNote = form.querySelector('#legal-welfare-rate-note');

  const syncLegalWelfareRateNote = (rate) => {
    legalWelfareRateNote.textContent = `（${formatLegalWelfareRatePercent(rate)} に相当）`;
  };

  legalWelfareRateInput.value = String(appSettings.legalWelfareRate ?? DEFAULT_LEGAL_WELFARE_RATE);
  syncLegalWelfareRateNote(appSettings.legalWelfareRate ?? DEFAULT_LEGAL_WELFARE_RATE);

  const saveLegalWelfareRate = () => {
    const nextRate = normalizeLegalWelfareRate(legalWelfareRateInput.value);
    legalWelfareRateInput.value = String(nextRate);
    syncLegalWelfareRateNote(nextRate);
    appSettings = { ...appSettings, legalWelfareRate: nextRate };
    saveAppSettings(appSettings);
    if (activeTab === 'plan') refreshPlanTable();
  };

  legalWelfareRateInput.addEventListener('change', saveLegalWelfareRate);
  legalWelfareRateInput.addEventListener('blur', saveLegalWelfareRate);

  const consumptionTable = bindTaxRateTable({
    tbody: consumptionTbody,
    addBtn: consumptionAddBtn,
    getRates: () => appSettings.consumptionTaxRates,
    normalizeRates: normalizeConsumptionTaxRates,
    onUpdate: (rates) => {
      appSettings = { ...appSettings, consumptionTaxRates: rates };
      saveAppSettings(appSettings);
      consumptionTable.renderRows();
    },
  });

  const withholdingTable = bindWithholdingTaxTable({
    tbody: withholdingTbody,
    addBtn: withholdingAddBtn,
    getRates: () => appSettings.withholdingTaxRates,
    onUpdate: (rates) => {
      appSettings = { ...appSettings, withholdingTaxRates: rates };
      saveAppSettings(appSettings);
      withholdingTable.renderRows();
    },
  });

  wrap.querySelector('#tax-rate-reset-btn').addEventListener('click', () => {
    appSettings = {
      ...appSettings,
      consumptionTaxRates: DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r })),
      withholdingTaxRates: DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r })),
      legalWelfareRate: DEFAULT_LEGAL_WELFARE_RATE,
    };
    saveAppSettings(appSettings);
    legalWelfareRateInput.value = String(DEFAULT_LEGAL_WELFARE_RATE);
    syncLegalWelfareRateNote(DEFAULT_LEGAL_WELFARE_RATE);
    consumptionTable.renderRows();
    withholdingTable.renderRows();
    if (activeTab === 'plan') refreshPlanTable();
  });

  consumptionTable.renderRows();
  withholdingTable.renderRows();
  replaceRootPanel(wrap);
  // ブラウザ幅へフィットさせる（源泉所得税表の自然幅 ＋ 左右余白 2rem、下限 28rem）
  bindPlanSettingsScalableLayout(wrap, {
    measureNaturalWidth: () => {
      const withholdingW = Math.max(
        measureElementIntrinsicWidth(wrap.querySelector('.withholding-tax-rate-table')),
        planSettingsRemToPx(28),
      );
      return withholdingW + planSettingsRemToPx(2);
    },
  });
}

function applyTaxPaymentPlanTitleStyle(titleEl) {
  if (!titleEl) return;
  titleEl.classList.add('salary-plan-title--section-filter');
  titleEl.dataset.sectionFilter = 'otherPay';
  const { background, color } = getFilterButtonColors('otherPay');
  titleEl.style.setProperty('--filter-btn-bg', background);
  titleEl.style.color = color;
}

function renderTaxPaymentSettings() {
  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap tax-payment-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header tax-payment-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">租税公課・保険積立金・長期未払金・未払消費税・未払法人税等・法人税等・住民税・役員借入金の支払い計画を設定します。法人税等は予実表の「法人税」セクションに反映されます。住民税は市区町村ごとに入力し、合計が予実表に反映されます。当期の実績表示月は仕訳実績を表示します（編集不可）。予実表で計画表示に切り替えた月は編集できます。住民税のみ過去月も入力でき、予実表にもその値が反映されます。Shift+Enter で入力した月以降の同額を後続月に反映します。</p>
    <div class="tax-payment-settings-controls">
      <div class="tax-payment-plan-years-row">
        <span class="app-settings-label">計画年数</span>
        <input
          type="number"
          class="app-settings-input tax-payment-plan-years-input"
          id="tax-payment-plan-years-input"
          min="1"
          max="30"
          step="1"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          aria-label="計画年数"
        />
        <p class="tax-payment-plan-years-hint">選択中の期から数えた年数です。デフォルトは ${DEFAULT_PAYMENT_PLAN_YEARS} 年です。</p>
      </div>
    </div>
  `;
  wrap.appendChild(header);

  const planYearsInput = header.querySelector('#tax-payment-plan-years-input');
  planYearsInput.value = String(getPaymentPlanYears(paymentPlanSettings));
  planYearsInput.addEventListener('change', () => {
    paymentPlanSettings = setPaymentPlanYears(paymentPlanSettings, planYearsInput.value);
    planYearsInput.value = String(getPaymentPlanYears(paymentPlanSettings));
    renderPlanSection();
  });
  planYearsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      planYearsInput.blur();
    }
  });

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const currentPeriod = appSettings.fiscalPeriod;
  const planPeriodEntries = () => buildPaymentPlanPeriodEntries(
    currentPeriod,
    getPaymentPlanYears(paymentPlanSettings),
  );
  const actualAmountsByAccount = rawPlanData
    ? collectPaymentActualAmountsFromPlanData(rawPlanData, fiscalMonths)
    : new Map();
  const { byMunicipality: actualResidentTaxByMunicipality } = rawPlanData
    ? collectResidentTaxActualByMunicipality(rawPlanData, fiscalMonths)
    : { byMunicipality: new Map() };

  const municipalityNames = [
    ...collectResidentTaxMunicipalityNamesFromEmployees(employees),
    ...collectResidentTaxSubaccountsFromPlanData(rawPlanData).map((item) => item.municipality),
  ];
  taxPaymentPlans = mergeResidentTaxMunicipalitiesFromNames(
    taxPaymentPlans,
    currentPeriod,
    municipalityNames,
    fiscalMonths,
  );
  for (const { period } of planPeriodEntries()) {
    if (period === currentPeriod) continue;
    taxPaymentPlans = syncResidentTaxMunicipalitiesFromReference(
      taxPaymentPlans,
      period,
      currentPeriod,
      fiscalMonths,
    );
  }

  function refreshPlanTableIfNeeded() {
    refreshSectionColors();
    refreshPlanKpi();
    if (activeTab === 'plan' && data) refreshPlanTable();
  }

  const monthDisplayUi = createPlanMonthDisplayUi({
    appSettings,
    currentPeriod,
    fiscalMonths,
    getMonthDisplayConfig: () => monthDisplayConfig,
    getPastMonthsForPeriod,
    onToggleMonthDisplay: togglePlanMonthDisplay,
  });
  const startNumericCellEdit = createPlanAmountCellEditor({ onEditClose: () => renderPlanSection() });

  function appendPlanAmountCell(tr, {
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
    editable,
    title,
    formatValue,
    rawValue,
    parseValue,
    onSave,
    allowShiftFillForward = true,
    tabScopeId,
    forcePlanMonthColor = false,
  }) {
    const td = document.createElement('td');
    tr.appendChild(td);
    monthDisplayUi.setPlanAmountCellContent(td, {
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
      allowShiftFillForward,
      tabScopeId,
      forcePlanMonthColor,
      onEditClose: () => renderPlanSection(),
    }, startNumericCellEdit);
  }

  function syncTaxPaymentTableMonthDisplay(table, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) return;

    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th, i) => {
      const month = fiscalMonths[i];
      if (month) monthDisplayUi.updateMonthHeaderTh(th, month, fiscalPeriod);
    });

    for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
      const tr = table.querySelector(`tbody tr[data-plan-row-key="${CSS.escape(account)}"]`);
      if (!tr) continue;
      const displayMonthly = buildDisplayMonthly(account, fiscalPeriod);
      const plan = getPlanForPeriod(fiscalPeriod)[account] ?? {};
      const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: displayMonthly[month],
          prevValue,
          editable: isMonthEditable(fiscalPeriod, month),
          fiscalPeriod,
          title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
          formatValue: formatSalaryPlanYen,
          rawValue: plan[month],
          parseValue: parseSalaryPlanAmountInput,
          allowShiftFillForward: true,
          tabScopeId: `tax-payment-${fiscalPeriod}`,
          onSave: (parsed, fillForward) => {
            const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
            const next = fillForward
              ? applyAmountFromMonthForwardSkippingPast(
                plan,
                fiscalMonths,
                month,
                parsed,
                pastMonths,
              )
              : { ...plan, [month]: parsed };
            persistPlan(account, next, fiscalPeriod);
          },
          onEditClose: () => renderPlanSection(),
        }, startNumericCellEdit);
      }
      const totalTd = tr.querySelector('td.salary-plan-col-total');
      if (totalTd) totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly));
    }

    for (const entry of getMunicipalitiesForPeriod(fiscalPeriod)) {
      const tr = table.querySelector(`tbody tr[data-plan-row-key="${CSS.escape(entry.id)}"]`);
      if (!tr) continue;
      const displayMonthly = buildMunicipalityDisplayMonthly(entry, fiscalPeriod);
      const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: displayMonthly[month],
          prevValue,
          editable: isResidentTaxMonthEditable(fiscalPeriod, month),
          fiscalPeriod,
          forcePlanMonthColor: true,
          title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
          formatValue: formatSalaryPlanYen,
          rawValue: entry.monthly[month],
          parseValue: parseSalaryPlanAmountInput,
          allowShiftFillForward: true,
          tabScopeId: `tax-municipality-${fiscalPeriod}`,
          onSave: (parsed, fillForward) => {
            saveMunicipalityMonthly(entry, fiscalPeriod, month, parsed, fillForward);
          },
          onEditClose: () => renderPlanSection(),
        }, startNumericCellEdit);
      }
      const totalTd = tr.querySelector('td.salary-plan-col-total');
      if (totalTd) totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly));
    }

    const residentTaxTotalDisplay = buildResidentTaxTotalDisplay(fiscalPeriod);
    const residentTaxTotalTr = table.querySelector('tbody tr[data-plan-row-key="resident-tax-total"]');
    if (residentTaxTotalTr) {
      const amountCells = residentTaxTotalTr.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? residentTaxTotalDisplay[prevMonth] : undefined;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: residentTaxTotalDisplay[month],
          prevValue,
          editable: false,
          fiscalPeriod,
          forcePlanMonthColor: true,
          formatValue: formatSalaryPlanYen,
        }, startNumericCellEdit);
      }
      const totalTd = residentTaxTotalTr.querySelector('td.salary-plan-col-total');
      if (totalTd) {
        totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(residentTaxTotalDisplay));
      }
    }

    const grandTotalDisplay = {};
    for (const month of fiscalMonths) grandTotalDisplay[month] = 0;
    for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
      const displayMonthly = buildDisplayMonthly(account, fiscalPeriod);
      for (const month of fiscalMonths) {
        grandTotalDisplay[month] += displayMonthly[month] ?? 0;
      }
    }
    for (const month of fiscalMonths) {
      grandTotalDisplay[month] += residentTaxTotalDisplay[month] ?? 0;
    }

    const grandTr = table.querySelector('tbody tr[data-plan-row-key="grand-total"]');
    if (grandTr) {
      const amountCells = grandTr.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: grandTotalDisplay[month],
          prevValue: i > 0 ? grandTotalDisplay[fiscalMonths[i - 1]] : undefined,
          editable: false,
          fiscalPeriod,
          formatValue: formatSalaryPlanYen,
        }, startNumericCellEdit);
      }
      const totalTd = grandTr.querySelector('td.salary-plan-col-total');
      if (totalTd) totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(grandTotalDisplay));
    }
  }

  function applyTaxPaymentMonthDisplayToWrap(rootWrap) {
    if (!rootWrap?.isConnected) return;
    rootWrap.querySelectorAll('table.tax-payment-plan-table[data-fiscal-period]').forEach((table) => {
      const fiscalPeriod = Number(table.dataset.fiscalPeriod);
      if (fiscalPeriod !== currentPeriod) return;
      syncTaxPaymentTableMonthDisplay(table, fiscalPeriod);
    });
    expenseOverrideMonthDisplaySync?.(currentPeriod);
    refreshPlanSettingsColumnPlates(rootWrap, fiscalMonths, currentPeriod, appSettings);
  }

  let expenseOverrideMonthDisplaySync = null;

  function getPlanForPeriod(fiscalPeriod) {
    return getPaymentPlansForPeriod(taxPaymentPlans, fiscalPeriod, fiscalMonths);
  }

  function getPastMonthsForPeriod(fiscalPeriod) {
    return getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths);
  }

  function getAccountActualMonthly(account, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) return {};
    return actualAmountsByAccount.get(account) ?? {};
  }

  function getMunicipalitiesForPeriod(fiscalPeriod) {
    const entries = getResidentTaxMunicipalityEntries(taxPaymentPlans, fiscalPeriod, fiscalMonths);
    const actualByMunicipality = fiscalPeriod === currentPeriod
      ? actualResidentTaxByMunicipality
      : new Map();
    return filterVisibleResidentTaxMunicipalities(entries, {
      employees,
      fiscalMonths,
      actualByMunicipality: fiscalPeriod === currentPeriod ? actualResidentTaxByMunicipality : new Map(),
    });
  }

  function persistMunicipality(entry, fiscalPeriod) {
    taxPaymentPlans = setResidentTaxMunicipalityEntry(
      taxPaymentPlans,
      fiscalPeriod,
      entry,
      fiscalMonths,
    );
    refreshPlanTableIfNeeded();
  }

  function buildMunicipalityDisplayMonthly(entry, fiscalPeriod) {
    const display = {};
    for (const month of fiscalMonths) {
      display[month] = entry.monthly[month];
    }
    return display;
  }

  function buildResidentTaxTotalDisplay(fiscalPeriod) {
    const municipalities = getMunicipalitiesForPeriod(fiscalPeriod);
    const display = {};
    for (const month of fiscalMonths) display[month] = 0;
    for (const entry of municipalities) {
      const rowDisplay = buildMunicipalityDisplayMonthly(entry, fiscalPeriod);
      for (const month of fiscalMonths) {
        display[month] += rowDisplay[month] ?? 0;
      }
    }
    return display;
  }

  function buildDisplayMonthly(account, fiscalPeriod) {
    const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
    const actualMonthly = getAccountActualMonthly(account, fiscalPeriod);
    const plan = getPlanForPeriod(fiscalPeriod)[account] ?? {};
    const display = {};
    for (const month of fiscalMonths) {
      if (pastMonths.has(month)) {
        display[month] = actualMonthly[month] ?? 0;
      } else {
        display[month] = plan[month];
      }
    }
    return display;
  }

  function isMonthEditable(fiscalPeriod, month) {
    return !getPastMonthsForPeriod(fiscalPeriod).has(month);
  }

  function isResidentTaxMonthEditable(fiscalPeriod, month) {
    if (fiscalPeriod !== currentPeriod) return true;
    const displayMode = getFiscalPeriodDisplayMode(
      appSettings.businessStartYear,
      fiscalPeriod,
    );
    if (displayMode === 'budget-actual') {
      return isMonthEditable(fiscalPeriod, month);
    }
    return true;
  }

  function saveMunicipalityMonthly(entry, fiscalPeriod, month, parsed, fillForward) {
    const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
    const displayMode = getFiscalPeriodDisplayMode(
      appSettings.businessStartYear,
      fiscalPeriod,
    );
    const skipPast = fiscalPeriod === currentPeriod && displayMode === 'budget-actual';
    const nextMonthly = fillForward
      ? (skipPast
        ? applyAmountFromMonthForwardSkippingPast(
          entry.monthly,
          fiscalMonths,
          month,
          parsed,
          pastMonths,
        )
        : applyAmountFromMonthForward(entry.monthly, fiscalMonths, month, parsed))
      : { ...entry.monthly, [month]: parsed };
    persistMunicipality({ ...entry, monthly: nextMonthly }, fiscalPeriod);
  }

  function sumDisplayMonthlyTotal(display) {
    let total = 0;
    for (const month of fiscalMonths) {
      total += display[month] ?? 0;
    }
    return total;
  }

  function persistPlan(account, monthly, fiscalPeriod) {
    taxPaymentPlans = setPaymentPlanAccount(
      taxPaymentPlans,
      fiscalPeriod,
      account,
      monthly,
      fiscalMonths,
    );
    refreshPlanTableIfNeeded();
  }

  function appendAmountCell(tr, { account, month, monthIndex, fiscalPeriod, value, prevValue, editable }) {
    const plan = getPlanForPeriod(fiscalPeriod)[account] ?? {};
    appendPlanAmountCell(tr, {
      month,
      monthIndex,
      fiscalPeriod,
      value,
      prevValue,
      editable,
      title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
      formatValue: formatSalaryPlanYen,
      rawValue: plan[month],
      parseValue: parseSalaryPlanAmountInput,
      tabScopeId: `tax-payment-${fiscalPeriod}`,
      onSave: (parsed, fillForward) => {
        const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
        const next = fillForward
          ? applyAmountFromMonthForwardSkippingPast(
            plan,
            fiscalMonths,
            month,
            parsed,
            pastMonths,
          )
          : { ...plan, [month]: parsed };
        persistPlan(account, next, fiscalPeriod);
      },
    });
  }

  function appendMunicipalityAmountCell(tr, {
    entry,
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
    editable,
  }) {
    appendPlanAmountCell(tr, {
      month,
      monthIndex,
      fiscalPeriod,
      value,
      prevValue,
      editable,
      title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
      formatValue: formatSalaryPlanYen,
      rawValue: entry.monthly[month],
      parseValue: parseSalaryPlanAmountInput,
      tabScopeId: `tax-municipality-${fiscalPeriod}`,
      forcePlanMonthColor: true,
      onSave: (parsed, fillForward) => {
        saveMunicipalityMonthly(entry, fiscalPeriod, month, parsed, fillForward);
      },
    });
  }

  function buildTaxPaymentTable(fiscalPeriod) {
    const municipalities = getMunicipalitiesForPeriod(fiscalPeriod);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table tax-payment-plan-table';
    table.dataset.fiscalPeriod = String(fiscalPeriod);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const accountTh = document.createElement('th');
    accountTh.className = 'salary-plan-col-name';
    accountTh.textContent = '勘定科目';
    headerRow.appendChild(accountTh);

    const subTh = document.createElement('th');
    subTh.className = 'salary-plan-col-sub';
    subTh.textContent = '市区町村';
    headerRow.appendChild(subTh);

    for (const month of fiscalMonths) {
      const th = document.createElement('th');
      monthDisplayUi.configureMonthHeaderTh(th, month, fiscalPeriod);
      headerRow.appendChild(th);
    }

    const totalTh = document.createElement('th');
    totalTh.className = 'salary-plan-col-total';
    totalTh.textContent = '合計';
    headerRow.appendChild(totalTh);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
      const displayMonthly = buildDisplayMonthly(account, fiscalPeriod);
      const tr = document.createElement('tr');
      tr.className = 'salary-plan-row-monthly';
      tr.dataset.planRowKey = account;
      tagPlanEditableRow(tr, account);

      const accountTd = document.createElement('td');
      accountTd.className = 'salary-plan-col-name';
      const sectionLabel = PAYMENT_PLAN_ACCOUNT_SECTION_LABELS[account];
      accountTd.textContent = sectionLabel ?? account;
      tr.appendChild(accountTd);

      const subTd = document.createElement('td');
      subTd.className = 'salary-plan-col-sub';
      if (sectionLabel) subTd.textContent = account;
      tr.appendChild(subTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        appendAmountCell(tr, {
          account,
          month,
          monthIndex: i,
          fiscalPeriod,
          value: displayMonthly[month],
          prevValue,
          editable,
        });
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly));
      tr.appendChild(totalTd);

      tbody.appendChild(tr);
    }

    for (const entry of municipalities) {
      const displayMonthly = buildMunicipalityDisplayMonthly(entry, fiscalPeriod);
      const tr = document.createElement('tr');
      tr.className = 'salary-plan-row-monthly salary-plan-row-sub';
      tr.dataset.planRowKey = entry.id;
      tagPlanEditableRow(tr, entry.id);

      const accountTd = document.createElement('td');
      accountTd.className = 'salary-plan-col-name';
      accountTd.textContent = RESIDENT_TAX_ACCOUNT;
      tr.appendChild(accountTd);

      const subTd = document.createElement('td');
      subTd.className = 'salary-plan-col-sub';
      subTd.textContent = entry.municipality;
      tr.appendChild(subTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isResidentTaxMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        appendMunicipalityAmountCell(tr, {
          entry,
          month,
          monthIndex: i,
          fiscalPeriod,
          value: displayMonthly[month],
          prevValue,
          editable,
        });
      }

      const rowTotalTd = document.createElement('td');
      rowTotalTd.className = 'salary-plan-col-total';
      rowTotalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly));
      tr.appendChild(rowTotalTd);

      tbody.appendChild(tr);
    }

    const residentTaxTotalDisplay = buildResidentTaxTotalDisplay(fiscalPeriod);
    const totalTr = document.createElement('tr');
    totalTr.className = 'salary-plan-row-monthly salary-plan-row-total salary-plan-total-row';
    totalTr.dataset.planRowKey = 'resident-tax-total';

    const totalAccountTd = document.createElement('td');
    totalAccountTd.className = 'salary-plan-col-name';
    totalAccountTd.textContent = RESIDENT_TAX_ACCOUNT;
    totalTr.appendChild(totalAccountTd);

    const totalSubTd = document.createElement('td');
    totalSubTd.className = 'salary-plan-col-sub';
    totalSubTd.textContent = '合計';
    totalTr.appendChild(totalSubTd);

    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
      const prevValue = prevMonth != null ? residentTaxTotalDisplay[prevMonth] : undefined;
      appendPlanAmountCell(totalTr, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: residentTaxTotalDisplay[month],
        prevValue,
        editable: false,
        forcePlanMonthColor: true,
        formatValue: formatSalaryPlanYen,
      });
    }

    const residentTaxTotalTd = document.createElement('td');
    residentTaxTotalTd.className = 'salary-plan-col-total';
    residentTaxTotalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(residentTaxTotalDisplay));
    totalTr.appendChild(residentTaxTotalTd);
    tbody.appendChild(totalTr);

    const grandTotalDisplay = {};
    for (const month of fiscalMonths) grandTotalDisplay[month] = 0;
    for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
      const displayMonthly = buildDisplayMonthly(account, fiscalPeriod);
      for (const month of fiscalMonths) {
        grandTotalDisplay[month] += displayMonthly[month] ?? 0;
      }
    }
    for (const month of fiscalMonths) {
      grandTotalDisplay[month] += residentTaxTotalDisplay[month] ?? 0;
    }

    const grandTr = document.createElement('tr');
    grandTr.className = 'salary-plan-total-row salary-plan-row-monthly';
    grandTr.dataset.planRowKey = 'grand-total';

    const grandLabelTd = document.createElement('td');
    grandLabelTd.colSpan = 2;
    grandLabelTd.className = 'salary-plan-total-label';
    grandLabelTd.textContent = TAX_PAY_OTHER_PAY_TOTAL_LABEL;
    grandTr.appendChild(grandLabelTd);

    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      appendPlanAmountCell(grandTr, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: grandTotalDisplay[month],
        prevValue: i > 0 ? grandTotalDisplay[fiscalMonths[i - 1]] : undefined,
        editable: false,
        formatValue: formatSalaryPlanYen,
      });
    }

    const grandTotalTd = document.createElement('td');
    grandTotalTd.className = 'salary-plan-col-total';
    grandTotalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(grandTotalDisplay));
    grandTr.appendChild(grandTotalTd);
    tbody.appendChild(grandTr);

    table.appendChild(tbody);
    return table;
  }

  function renderPlanSection() {
    wrap.querySelector('.tax-payment-plan-section')?.remove();

    const section = document.createElement('div');
    section.className = 'salary-plan-section tax-payment-plan-section';

    const planHeader = document.createElement('div');
    planHeader.className = 'salary-plan-header';
    const planTitle = document.createElement('h3');
    planTitle.className = 'salary-plan-title';
    planTitle.textContent = '支払い計画表';
    applyTaxPaymentPlanTitleStyle(planTitle);
    planHeader.appendChild(planTitle);
    section.appendChild(planHeader);

    for (const { period, label } of planPeriodEntries()) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = label;
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildTaxPaymentTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `tax-payment-${period}`);
      resumePlanCellTabEdit(block, `tax-municipality-${period}`);

      section.appendChild(block);
    }

    wrap.insertBefore(section, wrap.querySelector('.expense-plan-override-section'));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layoutPlanSettingsScalableWrap(wrap, (rootWrap) => measurePlanSettingsPageNaturalWidth(
        rootWrap,
        fiscalMonths.length,
        [
          { subColumns: 1, actionsColumn: false },
          { subColumns: 0, actionsColumn: true },
        ],
      ));
      refreshPlanSettingsColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
    }));
  }

  renderPlanSection();
  const overrideSection = mountExpensePlanOverrideSection({
    wrap,
    appSettings,
    rawPlanData,
    getMonthDisplayConfig: () => monthDisplayConfig,
    onToggleMonthDisplay: togglePlanMonthDisplay,
    monthDisplayUi,
    startNumericCellEdit,
    getSectionFilterColors: getFilterButtonColors,
    getExpensePlanOverrides: () => expensePlanOverrides,
    setExpensePlanOverrides: (next) => {
      expensePlanOverrides = next;
    },
    refreshPlanTableIfNeeded,
    refreshPlanSettingsColumnPlates: () => refreshPlanSettingsColumnPlates(
      wrap,
      fiscalMonths,
      currentPeriod,
      appSettings,
    ),
  });
  expenseOverrideMonthDisplaySync = overrideSection?.syncMonthDisplay ?? null;
  taxPaymentSettingsMonthDisplayApplier = () => applyTaxPaymentMonthDisplayToWrap(wrap);
  bindPlanSettingsScalableLayout(wrap, {
    measureNaturalWidth: (rootWrap) => measurePlanSettingsPageNaturalWidth(
      rootWrap,
      fiscalMonths.length,
      [
        { subColumns: 1, actionsColumn: false },
        { subColumns: 0, actionsColumn: true },
      ],
    ),
    fiscalMonths,
    currentPeriod,
    appSettings,
  });
  replaceRootPanel(wrap);
  refreshPlanKpi();
}

function renderEmployeeSettings() {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const currentPeriod = appSettings.fiscalPeriod;

  const monthDisplayUi = createPlanMonthDisplayUi({
    appSettings,
    currentPeriod,
    fiscalMonths,
    getMonthDisplayConfig: () => monthDisplayConfig,
    getPastMonthsForPeriod: (fiscalPeriod) => getSettingsLockedMonthsForPeriod(
      fiscalPeriod,
      fiscalMonths,
    ),
    onToggleMonthDisplay: togglePlanMonthDisplay,
  });

  function isSalaryPlanMonthEditable(fiscalPeriod, month) {
    if (fiscalPeriod !== currentPeriod) return true;
    const displayMode = getFiscalPeriodDisplayMode(
      appSettings.businessStartYear,
      fiscalPeriod,
    );
    if (displayMode === 'budget-actual') {
      return !getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths).has(month);
    }
    return true;
  }

  function refreshSalaryPlanUi() {
    renderSalaryPlanSection(employees.filter(isSalaryPlanEmployee));
  }

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap employee-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">
      従業員マスタを管理します。マネーフォワード給与の「従業員情報」CSVを読み込むと一覧を生成できます。
      同じ従業員識別子の行は上書き更新されます。手動追加・削除も可能で、設定はブラウザに保存されます。
      「非表示」にチェックした社員は給与支払い計画表に表示されず、住民税の支払対象からも除外されます。
    </p>
  `;
  wrap.appendChild(header);

  const statusEl = document.createElement('p');
  statusEl.className = 'employee-status-msg';
  statusEl.hidden = true;
  wrap.appendChild(statusEl);

  const addForm = document.createElement('div');
  addForm.className = 'employee-add-form';
  addForm.hidden = true;
  addForm.innerHTML = `
    <div class="employee-add-form-grid">
      <label class="app-settings-field">
        <span class="app-settings-label">従業員番号</span>
        <input type="text" class="app-settings-input" id="employee-add-number" autocomplete="off" spellcheck="false" />
      </label>
      <label class="app-settings-field">
        <span class="app-settings-label">姓</span>
        <input type="text" class="app-settings-input" id="employee-add-last" autocomplete="off" spellcheck="false" />
      </label>
      <label class="app-settings-field">
        <span class="app-settings-label">名</span>
        <input type="text" class="app-settings-input" id="employee-add-first" autocomplete="off" spellcheck="false" />
      </label>
      <label class="app-settings-field">
        <span class="app-settings-label">契約種別</span>
        <input type="text" class="app-settings-input" id="employee-add-contract" autocomplete="off" spellcheck="false" placeholder="正社員" />
      </label>
      <label class="app-settings-field">
        <span class="app-settings-label">入社年月日</span>
        <input type="text" class="app-settings-input" id="employee-add-join" autocomplete="off" spellcheck="false" placeholder="2024/04/01" />
      </label>
      <label class="app-settings-field">
        <span class="app-settings-label">月額報酬</span>
        <input type="text" class="app-settings-input" id="employee-add-salary" inputmode="numeric" autocomplete="off" spellcheck="false" />
      </label>
    </div>
    <div class="employee-add-form-actions">
      <button type="button" class="plan-csv-btn" id="employee-add-submit-btn">追加</button>
      <button type="button" class="expand-reset-btn" id="employee-add-cancel-btn">キャンセル</button>
    </div>
  `;

  const listToolbar = document.createElement('div');
  listToolbar.className = 'employee-list-toolbar employee-settings-actions';
  listToolbar.innerHTML = `
    <input type="file" accept=".csv,text/csv" class="employee-csv-input" id="employee-csv-input" hidden />
    <button type="button" class="plan-csv-btn" id="employee-csv-btn">CSV読み込み</button>
    <button type="button" class="expand-reset-btn" id="employee-add-toggle-btn">社員を追加</button>
  `;

  const columns = document.createElement('div');
  columns.className = 'employee-settings-columns';
  const listColumn = document.createElement('div');
  listColumn.className = 'employee-settings-column-list';
  listColumn.append(listToolbar, addForm);
  const travelColumn = document.createElement('div');
  travelColumn.className = 'employee-settings-column-travel';
  columns.append(listColumn, travelColumn);
  wrap.appendChild(columns);

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
    statusEl.classList.toggle('employee-status-error', isError);
  }

  function refreshPlanTableIfNeeded() {
    refreshSectionColors();
    if (activeTab === 'plan' && data) refreshPlanTable();
  }

  function refreshEmployeeLiveCells() {
    if (activeTab !== 'employees') return;
    const now = new Date();
    wrap.querySelectorAll('[data-tenure-join]').forEach((cell) => {
      cell.textContent = computeTenure(cell.dataset.tenureJoin, cell.dataset.tenureLeave || '', now);
    });
  }

  function renderEmployeeTable() {
    const listColumnEl = wrap.querySelector('.employee-settings-column-list');
    if (!listColumnEl) return;

    listColumnEl.querySelector('.employee-settings-table')?.remove();
    listColumnEl.querySelector('.employee-settings-empty')?.remove();
    wrap.querySelector('.salary-plan-section')?.remove();

    renderTravelAllowanceSection();

    const activeEmployees = employees.filter(isActiveEmployee);
    if (activeEmployees.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'expand-settings-empty employee-settings-empty';
      empty.textContent = '従業員が登録されていません。CSVを読み込むか、手動で追加してください。';
      listColumnEl.appendChild(empty);
      return;
    }

    const columns = buildEmployeeTableColumns();
    const table = document.createElement('table');
    table.className = 'expand-settings-table employee-settings-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const col of columns) {
      const th = document.createElement('th');
      th.className = col.className;
      th.textContent = col.label;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const now = new Date();
    for (const emp of activeEmployees) {
      const tr = document.createElement('tr');

      for (const col of columns) {
        const td = document.createElement('td');
        td.className = col.className;

        if (col.kind === 'salaryPlanExclude') {
          const excludeLabel = document.createElement('label');
          excludeLabel.className = 'employee-salary-plan-exclude';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = emp.excludedFromSalaryPlan === true;
          checkbox.title = '給与支払い計画表に表示しない（住民税の支払対象外）';
          checkbox.addEventListener('change', () => {
            employees = saveEmployees(
              employees.map((e) => (
                e.id === emp.id
                  ? { ...e, excludedFromSalaryPlan: checkbox.checked }
                  : e
              )),
            );
            renderEmployeeTable();
            refreshPlanTableIfNeeded();
          });
          excludeLabel.appendChild(checkbox);
          td.appendChild(excludeLabel);
        } else if (col.kind === 'actions') {
          const actionsWrap = document.createElement('div');
          actionsWrap.className = 'employee-actions-wrap';

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

            confirmBtn.addEventListener('click', () => {
              const name = formatEmployeeName(emp);
              employees = saveEmployees(employees.filter((e) => e.id !== emp.id));
              showStatus(`${name} を削除しました。`);
              renderEmployeeTable();
              refreshEmployeeLiveCells();
            });

            cancelBtn.addEventListener('click', () => {
              actionsWrap.classList.remove('employee-actions-confirm');
              actionsWrap.replaceChildren(deleteBtn);
            });

            actionsWrap.append(prompt, confirmBtn, cancelBtn);
          });

          actionsWrap.appendChild(deleteBtn);
          td.appendChild(actionsWrap);
        } else if (col.kind === 'tenure') {
          td.dataset.tenureJoin = emp.joinDate;
          td.dataset.tenureLeave = emp.leaveDate;
          td.textContent = getEmployeeCellValue(emp, col, now);
        } else {
          td.textContent = getEmployeeCellValue(emp, col, now);
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    const totals = computeEmployeeAmountTotals(activeEmployees);
    const tfoot = document.createElement('tfoot');
    const totalRow = document.createElement('tr');
    totalRow.className = 'employee-settings-total-row';
    let totalLabelShown = false;
    for (const col of columns) {
      const td = document.createElement('td');
      td.className = col.className;
      if (col.kind === 'amount') {
        td.textContent = getEmployeeAmountTotalValue(col.key, totals);
      } else if (!totalLabelShown && col.key === 'name') {
        td.textContent = '合計';
        td.classList.add('employee-settings-total-label');
        totalLabelShown = true;
      }
      totalRow.appendChild(td);
    }
    tfoot.appendChild(totalRow);
    table.appendChild(tbody);
    table.appendChild(tfoot);
    listColumnEl.appendChild(table);
    refreshEmployeeLiveCells();
    renderSalaryPlanSection(activeEmployees.filter(isSalaryPlanEmployee));
  }

  function getSalaryPlanForEmployee(emp, fiscalMonths, fiscalPeriod) {
    return getEmployeeSalaryPlan(
      salaryPlans,
      fiscalPeriod,
      emp.id,
      emp,
      fiscalMonths,
    );
  }

  function persistSalaryPlan(emp, plan, fiscalPeriod) {
    salaryPlans = setEmployeeSalaryPlan(
      salaryPlans,
      fiscalPeriod,
      emp.id,
      plan,
    );
  }

  function startSalaryPlanCellEdit(td, emp, rowKind, month, fiscalMonths, fiscalPeriod) {
    if (rowKind === 'bonus' && isDirectorEmployee(emp)) return;
    if (td.querySelector('input')) return;

    const plan = getSalaryPlanForEmployee(emp, fiscalMonths, fiscalPeriod);
    const source = rowKind === 'monthly' ? plan.monthly : plan.bonusMonthly;
    const rawValue = source[month];

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.className = 'salary-plan-amount-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

    let editClosed = false;

    const finish = (save, fillForward = false) => {
      if (editClosed) return;
      editClosed = true;
      if (save) {
        const parsed = parseSalaryPlanAmountInputWithFillForward(
          input.value,
          fillForward,
          rawValue,
        );
        const nextPlan = {
          monthly: { ...plan.monthly },
          bonusMonthly: { ...plan.bonusMonthly },
        };
        if (rowKind === 'monthly') {
          nextPlan.monthly = fillForward
            ? applyAmountFromMonthForwardSkippingPast(
              nextPlan.monthly,
              fiscalMonths,
              month,
              parsed,
              getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths),
            )
            : { ...nextPlan.monthly, [month]: parsed };
        } else {
          nextPlan.bonusMonthly[month] = parsed;
        }
        persistSalaryPlan(emp, nextPlan, fiscalPeriod);
      }
      refreshSalaryPlanUi();
    };

    input.addEventListener('keydown', (e) => {
      handlePlanAmountCellKeydown(e, {
        finish,
        td,
        scopeId: `salary-plan-${fiscalPeriod}`,
        allowShiftFillForward: rowKind === 'monthly',
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
  }

  function appendSalaryPlanAmountCell(tr, {
    emp,
    rowKind,
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
    editable,
  }) {
    const td = document.createElement('td');
    tr.appendChild(td);
    monthDisplayUi.setPlanAmountCellContent(td, {
      month,
      monthIndex,
      value,
      prevValue,
      editable,
      fiscalPeriod,
      forcePlanMonthColor: true,
      title: rowKind === 'monthly'
        ? 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）'
        : 'ダブルクリックで編集',
      formatValue: formatSalaryPlanYen,
      rawValue: value,
      allowShiftFillForward: rowKind === 'monthly',
      tabScopeId: `salary-plan-${fiscalPeriod}`,
      onEditClose: refreshSalaryPlanUi,
    }, (editTd) => {
      startSalaryPlanCellEdit(editTd, emp, rowKind, month, fiscalMonths, fiscalPeriod);
    });
  }

  function appendSalaryPlanTotalAmountCell(tr, {
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
  }) {
    const td = document.createElement('td');
    tr.appendChild(td);
    monthDisplayUi.setPlanAmountCellContent(td, {
      month,
      monthIndex,
      value,
      prevValue,
      editable: false,
      fiscalPeriod,
      forcePlanMonthColor: true,
      formatValue: formatSalaryPlanYen,
    }, () => {});
  }

  function buildTravelAllowanceField(fiscalPeriod, periodLabel) {
    const field = document.createElement('label');
    field.className = 'salary-plan-travel-allowance-field';

    const fieldLabel = document.createElement('span');
    fieldLabel.className = 'salary-plan-travel-allowance-field-label';
    fieldLabel.textContent = periodLabel;
    field.appendChild(fieldLabel);

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.className = 'salary-plan-travel-allowance-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = String(getTravelAllowancePerPerson(salaryPlanSettings, fiscalPeriod));

    const suffix = document.createElement('span');
    suffix.className = 'salary-plan-travel-allowance-suffix';
    suffix.textContent = '円/月';

    const persist = () => {
      const parsed = parseSalaryPlanAmountInput(input.value);
      salaryPlanSettings = setTravelAllowancePerPerson(
        salaryPlanSettings,
        fiscalPeriod,
        parsed ?? DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON,
      );
      input.value = String(getTravelAllowancePerPerson(salaryPlanSettings, fiscalPeriod));
    };

    input.addEventListener('change', persist);
    input.addEventListener('blur', persist);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });

    field.appendChild(input);
    field.appendChild(suffix);
    return field;
  }

  function buildTravelAllowanceConfig(currentPeriod, nextPeriod) {
    const config = document.createElement('div');
    config.className = 'salary-plan-travel-allowance-config';
    config.appendChild(buildTravelAllowanceField(
      currentPeriod,
      formatFiscalPeriodLabel(currentPeriod),
    ));
    config.appendChild(buildTravelAllowanceField(
      nextPeriod,
      formatFiscalPeriodLabel(nextPeriod),
    ));
    return config;
  }

  function getOvertimePlanForPeriod(fiscalPeriod, fiscalMonths) {
    return getOvertimePlan(salaryPlanSettings, fiscalPeriod, fiscalMonths);
  }

  function persistOvertimePlan(overtimeMonthly, fiscalPeriod, fiscalMonths) {
    salaryPlanSettings = setOvertimePlan(
      salaryPlanSettings,
      fiscalPeriod,
      overtimeMonthly,
      fiscalMonths,
    );
  }

  function startOvertimePlanCellEdit(td, month, fiscalMonths, fiscalPeriod) {
    if (td.querySelector('input')) return;

    const overtime = getOvertimePlanForPeriod(fiscalPeriod, fiscalMonths);
    const rawValue = overtime[month];

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.className = 'salary-plan-amount-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

    let editClosed = false;

    const finish = (save, fillForward = false) => {
      if (editClosed) return;
      editClosed = true;
      if (save) {
        const parsed = parseSalaryPlanAmountInputWithFillForward(
          input.value,
          fillForward,
          rawValue,
        );
        const next = fillForward
          ? applyAmountFromMonthForwardSkippingPast(
            { ...overtime },
            fiscalMonths,
            month,
            parsed,
            getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths),
          )
          : { ...overtime, [month]: parsed };
        persistOvertimePlan(next, fiscalPeriod, fiscalMonths);
      }
      refreshSalaryPlanUi();
    };

    input.addEventListener('keydown', (e) => {
      handlePlanAmountCellKeydown(e, {
        finish,
        td,
        scopeId: `salary-overtime-${fiscalPeriod}`,
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
  }

  function appendOvertimePlanAmountCell(tr, {
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
  }) {
    const editable = isSalaryPlanMonthEditable(fiscalPeriod, month);
    const td = document.createElement('td');
    tr.appendChild(td);
    monthDisplayUi.setPlanAmountCellContent(td, {
      month,
      monthIndex,
      value,
      prevValue,
      editable,
      fiscalPeriod,
      forcePlanMonthColor: true,
      title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
      formatValue: formatSalaryPlanYen,
      rawValue: value,
      allowShiftFillForward: true,
      tabScopeId: `salary-overtime-${fiscalPeriod}`,
      onEditClose: refreshSalaryPlanUi,
    }, (editTd) => {
      startOvertimePlanCellEdit(editTd, month, fiscalMonths, fiscalPeriod);
    });
  }

  function buildOvertimePlanTable(fiscalPeriod, fiscalMonths) {
    const overtime = getOvertimePlanForPeriod(fiscalPeriod, fiscalMonths);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table salary-overtime-plan-table';
    table.dataset.fiscalPeriod = String(fiscalPeriod);
    table.appendChild(buildEmployeePlanTableColgroup({
      variant: 'overtime',
      monthCount: fiscalMonths.length,
    }));

    const headerLabels = ['種別', ...fiscalMonths, '合計'];
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      if (label === '種別') {
        th.className = 'salary-plan-col-kind';
        th.textContent = label;
      } else if (label === '合計') {
        th.className = 'salary-plan-col-total';
        th.textContent = label;
      } else {
        monthDisplayUi.configureMonthHeaderTh(th, label, fiscalPeriod);
      }
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    tr.className = 'salary-plan-row-monthly';
    tagPlanEditableRow(tr, 'overtime');

    const kindTd = document.createElement('td');
    kindTd.className = 'salary-plan-col-kind';
    kindTd.textContent = '残業手当';
    tr.appendChild(kindTd);

    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const prevValue = i > 0 ? overtime[fiscalMonths[i - 1]] : undefined;
      appendOvertimePlanAmountCell(tr, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: overtime[month],
        prevValue,
      });
    }

    const totalTd = document.createElement('td');
    totalTd.className = 'salary-plan-col-total';
    totalTd.textContent = formatSalaryPlanYen(sumOvertimePlanTotal(overtime, fiscalMonths));
    tr.appendChild(totalTd);

    tbody.appendChild(tr);
    table.appendChild(tbody);
    return table;
  }

  function buildBonusMonthConfig(activeEmployees, fiscalPeriod, fiscalMonths) {
    const bonusMonthNumbers = getBonusPaymentMonths(
      salaryPlanSettings,
      fiscalPeriod,
      fiscalMonths,
    );

    const bonusMonthConfig = document.createElement('div');
    bonusMonthConfig.className = 'salary-plan-bonus-month-config';
    const configLabel = document.createElement('span');
    configLabel.className = 'salary-plan-bonus-month-config-label';
    configLabel.textContent = '賞与支払月';
    bonusMonthConfig.appendChild(configLabel);

    for (let slot = 0; slot < MAX_BONUS_COUNT; slot += 1) {
      const field = document.createElement('label');
      field.className = 'salary-plan-bonus-month-field';

      const fieldLabel = document.createElement('span');
      fieldLabel.className = 'salary-plan-bonus-month-field-label';
      fieldLabel.textContent = `${slot + 1}回目`;
      field.appendChild(fieldLabel);

      const select = document.createElement('select');
      select.className = 'salary-plan-bonus-month-select';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '—';
      select.appendChild(emptyOpt);
      for (const month of fiscalMonths) {
        const opt = document.createElement('option');
        opt.value = String(monthLabelToNumber(month));
        opt.textContent = month;
        select.appendChild(opt);
      }
      select.value = bonusMonthNumbers[slot] != null ? String(bonusMonthNumbers[slot]) : '';

      select.addEventListener('change', () => {
        const nums = [...bonusMonthConfig.querySelectorAll('select')]
          .map((el) => (el.value ? parseInt(el.value, 10) : null))
          .filter((n) => n != null);
        salaryPlanSettings = setBonusPaymentMonths(
          salaryPlanSettings,
          fiscalPeriod,
          nums,
          fiscalMonths,
        );
        const labels = bonusPaymentMonthLabels(
          getBonusPaymentMonths(salaryPlanSettings, fiscalPeriod, fiscalMonths),
        );
        salaryPlans = prunePeriodSalaryPlanBonuses(
          salaryPlans,
          labels,
          fiscalPeriod,
          activeEmployees,
          fiscalMonths,
        );
        renderSalaryPlanSection(activeEmployees);
      });

      field.appendChild(select);
      bonusMonthConfig.appendChild(field);
    }

    return bonusMonthConfig;
  }

  function buildSalaryPlanTable(activeEmployees, fiscalPeriod, fiscalMonths, bonusMonthLabels, {
    showIncreaseRate = false,
    comparePeriod = null,
  } = {}) {
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table employee-salary-plan-table';
    table.dataset.fiscalPeriod = String(fiscalPeriod);
    table.appendChild(buildEmployeePlanTableColgroup({
      variant: 'salary',
      monthCount: fiscalMonths.length,
      hasIncrease: showIncreaseRate,
    }));

    const headerLabels = ['番号', '氏名', '市区町村', '種別', ...fiscalMonths, '合計'];
    if (showIncreaseRate) headerLabels.push('昇給率');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      if (label === '番号') {
        th.className = 'salary-plan-col-no';
        th.textContent = label;
      } else if (label === '氏名') {
        th.className = 'salary-plan-col-name';
        th.textContent = label;
      } else if (label === '市区町村') {
        th.className = 'salary-plan-col-sub';
        th.textContent = label;
      } else if (label === '種別') {
        th.className = 'salary-plan-col-kind';
        th.textContent = label;
      } else if (label === '合計') {
        th.className = 'salary-plan-col-total';
        th.textContent = label;
      } else if (label === '昇給率') {
        th.className = 'salary-plan-col-increase';
        th.textContent = label;
      } else {
        monthDisplayUi.configureMonthHeaderTh(th, label, fiscalPeriod);
      }
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const emp of activeEmployees) {
      const isDirector = isDirectorEmployee(emp);
      const plan = getSalaryPlanForEmployee(emp, fiscalMonths, fiscalPeriod);
      const rowSpan = isDirector ? 1 : 2;

      const trMonthly = document.createElement('tr');
      trMonthly.className = 'salary-plan-row-monthly';
      trMonthly.dataset.planRowKey = `${emp.id}:monthly`;
      trMonthly.dataset.employeePlanGroup = emp.id;
      tagPlanEditableRow(trMonthly, `${emp.id}:monthly`);

      const noTd = document.createElement('td');
      noTd.className = 'salary-plan-col-no';
      noTd.rowSpan = rowSpan;
      noTd.textContent = emp.employeeNumber || '';
      trMonthly.appendChild(noTd);

      const nameTd = document.createElement('td');
      nameTd.className = 'salary-plan-col-name';
      nameTd.rowSpan = rowSpan;
      nameTd.textContent = formatEmployeeName(emp);
      trMonthly.appendChild(nameTd);

      const municipalityTd = document.createElement('td');
      municipalityTd.className = 'salary-plan-col-sub';
      municipalityTd.rowSpan = rowSpan;
      municipalityTd.textContent = getEmployeeResidentTaxMunicipality(emp);
      trMonthly.appendChild(municipalityTd);

      const kindMonthlyTd = document.createElement('td');
      kindMonthlyTd.className = 'salary-plan-col-kind';
      kindMonthlyTd.textContent = '月額';
      trMonthly.appendChild(kindMonthlyTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const prevValue = i > 0 ? plan.monthly[fiscalMonths[i - 1]] : undefined;
        appendSalaryPlanAmountCell(trMonthly, {
          emp,
          rowKind: 'monthly',
          month,
          monthIndex: i,
          fiscalPeriod,
          value: plan.monthly[month],
          prevValue,
          editable: isSalaryPlanMonthEditable(fiscalPeriod, month),
        });
      }

      const monthlyTotalTd = document.createElement('td');
      monthlyTotalTd.className = 'salary-plan-col-total';
      monthlyTotalTd.rowSpan = rowSpan;
      monthlyTotalTd.textContent = formatSalaryPlanYen(
        computeSalaryPlanEmployeeTotal(plan, fiscalMonths, !isDirector),
      );
      trMonthly.appendChild(monthlyTotalTd);

      if (showIncreaseRate && comparePeriod != null) {
        const currentPlan = getSalaryPlanForEmployee(emp, fiscalMonths, comparePeriod);
        const increaseTd = document.createElement('td');
        increaseTd.className = 'salary-plan-col-increase';
        increaseTd.rowSpan = rowSpan;
        const rate = computeSalaryIncreaseRate(
          sumMonthlyPlanTotal(currentPlan, fiscalMonths),
          sumMonthlyPlanTotal(plan, fiscalMonths),
        );
        increaseTd.textContent = formatSalaryIncreaseRate(rate);
        trMonthly.appendChild(increaseTd);
      }

      tbody.appendChild(trMonthly);

      if (!isDirector) {
        const trBonus = document.createElement('tr');
        trBonus.className = 'salary-plan-row-bonus';
        trBonus.dataset.planRowKey = `${emp.id}:bonus`;
        trBonus.dataset.employeePlanGroup = emp.id;
        tagPlanEditableRow(trBonus, `${emp.id}:bonus`);

        const kindBonusTd = document.createElement('td');
        kindBonusTd.className = 'salary-plan-col-kind';
        kindBonusTd.textContent = '賞与';
        trBonus.appendChild(kindBonusTd);

        for (let i = 0; i < fiscalMonths.length; i += 1) {
          const month = fiscalMonths[i];
          const isEditable = bonusMonthLabels.includes(month)
            && isSalaryPlanMonthEditable(fiscalPeriod, month);
          const prevValue = i > 0 ? plan.bonusMonthly[fiscalMonths[i - 1]] : undefined;
          appendSalaryPlanAmountCell(trBonus, {
            emp,
            rowKind: 'bonus',
            month,
            monthIndex: i,
            fiscalPeriod,
            value: plan.bonusMonthly[month],
            prevValue: isEditable ? prevValue : undefined,
            editable: isEditable,
          });
        }

        tbody.appendChild(trBonus);
      }
    }

    const monthlyTotals = computeSalaryPlanMonthlyTotals(
      activeEmployees,
      salaryPlans,
      fiscalPeriod,
      fiscalMonths,
      'monthly',
    );
    const bonusTotals = computeSalaryPlanMonthlyTotals(
      activeEmployees,
      salaryPlans,
      fiscalPeriod,
      fiscalMonths,
      'bonus',
    );

    let currentMonthlyGrand = 0;
    if (showIncreaseRate && comparePeriod != null) {
      for (const emp of activeEmployees) {
        const comparePlan = getSalaryPlanForEmployee(emp, fiscalMonths, comparePeriod);
        currentMonthlyGrand += sumMonthlyPlanTotal(comparePlan, fiscalMonths);
      }
    }

    const trMonthlyTotal = document.createElement('tr');
    trMonthlyTotal.className = 'salary-plan-total-row salary-plan-row-monthly';
    const monthlyTotalLabel = document.createElement('td');
    monthlyTotalLabel.colSpan = 4;
    monthlyTotalLabel.className = 'salary-plan-total-label';
    monthlyTotalLabel.textContent = '合計（月額）';
    trMonthlyTotal.appendChild(monthlyTotalLabel);
    let monthlyGrand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const val = monthlyTotals[month] ?? 0;
      monthlyGrand += val;
      const prevValue = i > 0 ? (monthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
      appendSalaryPlanTotalAmountCell(trMonthlyTotal, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: val,
        prevValue,
      });
    }
    const monthlyGrandTd = document.createElement('td');
    monthlyGrandTd.className = 'salary-plan-col-total';
    monthlyGrandTd.textContent = formatSalaryPlanYen(monthlyGrand);
    trMonthlyTotal.appendChild(monthlyGrandTd);
    if (showIncreaseRate) {
      const increaseGrandTd = document.createElement('td');
      increaseGrandTd.className = 'salary-plan-col-increase';
      const rate = computeSalaryIncreaseRate(currentMonthlyGrand, monthlyGrand);
      increaseGrandTd.textContent = formatSalaryIncreaseRate(rate);
      trMonthlyTotal.appendChild(increaseGrandTd);
    }
    tbody.appendChild(trMonthlyTotal);

    const trBonusTotal = document.createElement('tr');
    trBonusTotal.className = 'salary-plan-total-row salary-plan-row-bonus';
    const bonusTotalLabel = document.createElement('td');
    bonusTotalLabel.colSpan = 4;
    bonusTotalLabel.className = 'salary-plan-total-label';
    bonusTotalLabel.textContent = '合計（賞与）';
    trBonusTotal.appendChild(bonusTotalLabel);
    let bonusGrand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const val = bonusTotals[month] ?? 0;
      bonusGrand += val;
      const prevValue = i > 0 ? (bonusTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
      appendSalaryPlanTotalAmountCell(trBonusTotal, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: val,
        prevValue,
      });
    }
    const bonusGrandTd = document.createElement('td');
    bonusGrandTd.className = 'salary-plan-col-total';
    bonusGrandTd.textContent = formatSalaryPlanYen(bonusGrand);
    trBonusTotal.appendChild(bonusGrandTd);
    if (showIncreaseRate) {
      const increaseBonusTotalTd = document.createElement('td');
      increaseBonusTotalTd.className = 'salary-plan-col-increase';
      trBonusTotal.appendChild(increaseBonusTotalTd);
    }
    tbody.appendChild(trBonusTotal);

    const trCombinedTotal = document.createElement('tr');
    trCombinedTotal.className = 'salary-plan-total-row salary-plan-row-combined';
    const combinedTotalLabel = document.createElement('td');
    combinedTotalLabel.colSpan = 4;
    combinedTotalLabel.className = 'salary-plan-total-label';
    combinedTotalLabel.textContent = '合計（月額＋賞与）';
    trCombinedTotal.appendChild(combinedTotalLabel);
    let combinedGrand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const val = (monthlyTotals[month] ?? 0) + (bonusTotals[month] ?? 0);
      combinedGrand += val;
      const prevValue = i > 0
        ? (monthlyTotals[fiscalMonths[i - 1]] ?? 0) + (bonusTotals[fiscalMonths[i - 1]] ?? 0)
        : undefined;
      appendSalaryPlanTotalAmountCell(trCombinedTotal, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: val,
        prevValue,
      });
    }
    const combinedGrandTd = document.createElement('td');
    combinedGrandTd.className = 'salary-plan-col-total';
    combinedGrandTd.textContent = formatSalaryPlanYen(combinedGrand);
    trCombinedTotal.appendChild(combinedGrandTd);
    if (showIncreaseRate) {
      const increaseCombinedTd = document.createElement('td');
      increaseCombinedTd.className = 'salary-plan-col-increase';
      trCombinedTotal.appendChild(increaseCombinedTd);
    }
    tbody.appendChild(trCombinedTotal);

    table.appendChild(tbody);
    return table;
  }

  function bindEmployeePlanGroupRowHover(table) {
    const tbody = table.tBodies[0];
    if (!tbody || tbody.dataset.employeePlanGroupHoverBound) return;
    tbody.dataset.employeePlanGroupHoverBound = '1';

    const setHover = (groupId) => {
      tbody.querySelectorAll('.is-employee-plan-group-hover').forEach((el) => {
        el.classList.remove('is-employee-plan-group-hover');
      });
      if (!groupId) return;
      tbody.querySelectorAll('[data-employee-plan-group]').forEach((el) => {
        if (el.dataset.employeePlanGroup === groupId) {
          el.classList.add('is-employee-plan-group-hover');
        }
      });
    };

    tbody.addEventListener('mouseover', (ev) => {
      const groupEl = ev.target.closest('[data-employee-plan-group]');
      if (!groupEl || !tbody.contains(groupEl)) return;
      const groupId = groupEl.dataset.employeePlanGroup;
      if (tbody.dataset.hoverEmployeePlanGroup === groupId) return;
      tbody.dataset.hoverEmployeePlanGroup = groupId;
      setHover(groupId);
    });

    tbody.addEventListener('mouseout', (ev) => {
      const groupEl = ev.target.closest('[data-employee-plan-group]');
      if (!groupEl) return;
      const groupId = groupEl.dataset.employeePlanGroup;
      const related = ev.relatedTarget;
      if (related?.closest?.('[data-employee-plan-group]')?.dataset?.employeePlanGroup === groupId) return;
      if (tbody.dataset.hoverEmployeePlanGroup === groupId) {
        delete tbody.dataset.hoverEmployeePlanGroup;
        setHover(null);
      }
    });

    tbody.addEventListener('mouseleave', () => {
      delete tbody.dataset.hoverEmployeePlanGroup;
      setHover(null);
    });
  }

  function syncOvertimePlanTableMonthDisplay(table, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) return;

    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th, i) => {
      const month = fiscalMonths[i];
      if (month) monthDisplayUi.updateMonthHeaderTh(th, month, fiscalPeriod);
    });

    const tr = table.querySelector('tbody tr.salary-plan-row-monthly');
    if (!tr) return;

    const overtime = getOvertimePlanForPeriod(fiscalPeriod, fiscalMonths);
    const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const td = amountCells[i];
      if (!td) continue;
      const prevValue = i > 0 ? overtime[fiscalMonths[i - 1]] : undefined;
      monthDisplayUi.setPlanAmountCellContent(td, {
        month,
        monthIndex: i,
        value: overtime[month],
        prevValue,
        editable: isSalaryPlanMonthEditable(fiscalPeriod, month),
        fiscalPeriod,
        forcePlanMonthColor: true,
        title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
        formatValue: formatSalaryPlanYen,
        rawValue: overtime[month],
        allowShiftFillForward: true,
        tabScopeId: `salary-overtime-${fiscalPeriod}`,
        onEditClose: refreshSalaryPlanUi,
      }, (editTd) => {
        startOvertimePlanCellEdit(editTd, month, fiscalMonths, fiscalPeriod);
      });
    }
  }

  function syncEmployeeSalaryPlanTableMonthDisplay(table, fiscalPeriod, activeEmployees) {
    if (fiscalPeriod !== currentPeriod) return;

    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th, i) => {
      const month = fiscalMonths[i];
      if (month) monthDisplayUi.updateMonthHeaderTh(th, month, fiscalPeriod);
    });

    const bonusMonthLabels = bonusPaymentMonthLabels(
      getBonusPaymentMonths(salaryPlanSettings, fiscalPeriod, fiscalMonths),
    );

    for (const emp of activeEmployees) {
      const plan = getSalaryPlanForEmployee(emp, fiscalMonths, fiscalPeriod);
      const trMonthly = table.querySelector(`tbody tr[data-plan-row-key="${CSS.escape(`${emp.id}:monthly`)}"]`);
      if (trMonthly) {
        const amountCells = trMonthly.querySelectorAll('td.salary-plan-amount-cell');
        for (let i = 0; i < fiscalMonths.length; i += 1) {
          const month = fiscalMonths[i];
          const td = amountCells[i];
          if (!td) continue;
          const prevValue = i > 0 ? plan.monthly[fiscalMonths[i - 1]] : undefined;
          monthDisplayUi.setPlanAmountCellContent(td, {
            month,
            monthIndex: i,
            value: plan.monthly[month],
            prevValue,
            editable: isSalaryPlanMonthEditable(fiscalPeriod, month),
            fiscalPeriod,
            forcePlanMonthColor: true,
            title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
            formatValue: formatSalaryPlanYen,
            rawValue: plan.monthly[month],
            allowShiftFillForward: true,
            tabScopeId: `salary-plan-${fiscalPeriod}`,
            onEditClose: refreshSalaryPlanUi,
          }, (editTd) => {
            startSalaryPlanCellEdit(editTd, emp, 'monthly', month, fiscalMonths, fiscalPeriod);
          });
        }
      }

      if (isDirectorEmployee(emp)) continue;

      const trBonus = table.querySelector(`tbody tr[data-plan-row-key="${CSS.escape(`${emp.id}:bonus`)}"]`);
      if (!trBonus) continue;
      const amountCells = trBonus.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const isEditable = bonusMonthLabels.includes(month)
          && isSalaryPlanMonthEditable(fiscalPeriod, month);
        const prevValue = i > 0 ? plan.bonusMonthly[fiscalMonths[i - 1]] : undefined;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: plan.bonusMonthly[month],
          prevValue: isEditable ? prevValue : undefined,
          editable: isEditable,
          fiscalPeriod,
          forcePlanMonthColor: true,
          title: 'ダブルクリックで編集',
          formatValue: formatSalaryPlanYen,
          rawValue: plan.bonusMonthly[month],
          allowShiftFillForward: false,
          tabScopeId: `salary-plan-${fiscalPeriod}`,
          onEditClose: refreshSalaryPlanUi,
        }, (editTd) => {
          startSalaryPlanCellEdit(editTd, emp, 'bonus', month, fiscalMonths, fiscalPeriod);
        });
      }
    }

    const monthlyTotals = computeSalaryPlanMonthlyTotals(
      activeEmployees,
      salaryPlans,
      fiscalPeriod,
      fiscalMonths,
      'monthly',
    );
    const bonusTotals = computeSalaryPlanMonthlyTotals(
      activeEmployees,
      salaryPlans,
      fiscalPeriod,
      fiscalMonths,
      'bonus',
    );

    const trMonthlyTotal = table.querySelector('tbody tr.salary-plan-total-row.salary-plan-row-monthly');
    if (trMonthlyTotal) {
      const amountCells = trMonthlyTotal.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const val = monthlyTotals[month] ?? 0;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: val,
          prevValue: i > 0 ? (monthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined,
          editable: false,
          fiscalPeriod,
          forcePlanMonthColor: true,
          formatValue: formatSalaryPlanYen,
        }, () => {});
      }
    }

    const trBonusTotal = table.querySelector('tbody tr.salary-plan-total-row.salary-plan-row-bonus');
    if (trBonusTotal) {
      const amountCells = trBonusTotal.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const val = bonusTotals[month] ?? 0;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: val,
          prevValue: i > 0 ? (bonusTotals[fiscalMonths[i - 1]] ?? 0) : undefined,
          editable: false,
          fiscalPeriod,
          forcePlanMonthColor: true,
          formatValue: formatSalaryPlanYen,
        }, () => {});
      }
    }

    const trCombinedTotal = table.querySelector('tbody tr.salary-plan-total-row.salary-plan-row-combined');
    if (trCombinedTotal) {
      const amountCells = trCombinedTotal.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const val = (monthlyTotals[month] ?? 0) + (bonusTotals[month] ?? 0);
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: val,
          prevValue: i > 0
            ? (monthlyTotals[fiscalMonths[i - 1]] ?? 0) + (bonusTotals[fiscalMonths[i - 1]] ?? 0)
            : undefined,
          editable: false,
          fiscalPeriod,
          forcePlanMonthColor: true,
          formatValue: formatSalaryPlanYen,
        }, () => {});
      }
    }
  }

  function applyEmployeeMonthDisplayToWrap(rootWrap) {
    if (!rootWrap?.isConnected) return;
    const activeEmployees = employees.filter(isSalaryPlanEmployee);
    rootWrap.querySelectorAll('table.salary-plan-table[data-fiscal-period]').forEach((table) => {
      const fiscalPeriod = Number(table.dataset.fiscalPeriod);
      if (table.classList.contains('salary-overtime-plan-table')) {
        syncOvertimePlanTableMonthDisplay(table, fiscalPeriod);
      } else if (table.classList.contains('employee-salary-plan-table')) {
        syncEmployeeSalaryPlanTableMonthDisplay(table, fiscalPeriod, activeEmployees);
      }
    });
    syncAllPlanSettingsTableColumnPlates(rootWrap, fiscalMonths, currentPeriod, appSettings);
  }

  function layoutEmployeeSettingsScalableWrap() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layoutEmployeeSettingsTables(wrap, fiscalMonths.length);
      refreshPlanSettingsColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
    }));
  }

  function renderTravelAllowanceSection() {
    const travelColumnEl = wrap.querySelector('.employee-settings-column-travel');
    if (!travelColumnEl) return;

    travelColumnEl.replaceChildren();

    const currentPeriod = appSettings.fiscalPeriod;
    const nextPeriod = appSettings.fiscalPeriod + 1;

    const travelHeader = document.createElement('div');
    travelHeader.className = 'salary-plan-header employee-travel-header';

    const travelTitle = document.createElement('h3');
    travelTitle.className = 'salary-plan-title';
    travelTitle.dataset.sectionFilter = 'personnel';
    travelTitle.textContent = '旅費交通費';
    applySectionFilterTitleStyle(travelTitle, 'personnel', getFilterButtonColors);
    travelHeader.appendChild(travelTitle);

    const travelDesc = document.createElement('p');
    travelDesc.className = 'salary-plan-desc employee-travel-desc';
    travelDesc.textContent = `一人あたりに支給する月額です。デフォルトは ${formatSalaryPlanYen(DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON)} です。`;
    travelHeader.appendChild(travelDesc);
    travelHeader.appendChild(buildTravelAllowanceConfig(currentPeriod, nextPeriod));
    travelColumnEl.appendChild(travelHeader);
  }

  function renderSalaryPlanSection(activeEmployees) {
    wrap.querySelector('.salary-plan-section')?.remove();
    if (activeEmployees.length === 0) {
      layoutEmployeeSettingsScalableWrap();
      return;
    }

    const nextPeriod = appSettings.fiscalPeriod + 1;

    const section = document.createElement('div');
    section.className = 'salary-plan-section';

    const overtimeHeader = document.createElement('div');
    overtimeHeader.className = 'salary-plan-header';
    const overtimeTitle = document.createElement('h3');
    overtimeTitle.className = 'salary-plan-title';
    overtimeTitle.dataset.sectionFilter = 'personnel';
    overtimeTitle.textContent = '残業手当支払い計画表';
    overtimeHeader.appendChild(overtimeTitle);
    const overtimeDesc = document.createElement('p');
    overtimeDesc.className = 'salary-plan-desc';
    overtimeDesc.textContent = `決算月 ${appSettings.fiscalEndMonth}月 を基準とした12か月分です。各セルをダブルクリックで編集できます。Shift+Enter で入力した月以降の同額を後続月に反映します（0円も可）。Enter はその月のみ反映します。`;
    overtimeHeader.appendChild(overtimeDesc);
    applySectionFilterTitleStyle(overtimeTitle, 'personnel', getFilterButtonColors);
    section.appendChild(overtimeHeader);

    for (const period of [currentPeriod, nextPeriod]) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = formatFiscalPeriodLabel(period);
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildOvertimePlanTable(period, fiscalMonths));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `salary-overtime-${period}`);

      section.appendChild(block);
    }

    const salaryHeader = document.createElement('div');
    salaryHeader.className = 'salary-plan-header salary-plan-header-spaced';
    const salaryTitle = document.createElement('h3');
    salaryTitle.className = 'salary-plan-title';
    salaryTitle.dataset.sectionFilter = 'personnel';
    salaryTitle.textContent = '給与支払い計画表';
    salaryHeader.appendChild(salaryTitle);
    const salaryDesc = document.createElement('p');
    salaryDesc.className = 'salary-plan-desc';
    salaryDesc.textContent = '決算月 '
      + `${appSettings.fiscalEndMonth}月 を基準とした12か月分です。`
      + '月額・賞与の各セルをダブルクリックで編集できます。月額は Shift+Enter で後続月へ同額を反映します（0円も可）。Enter はその月のみ反映します。'
      + '役員は賞与の入力がありません。'
      + `${formatFiscalPeriodLabel(nextPeriod)}の昇給率は月額合計のみを${formatFiscalPeriodLabel(currentPeriod)}と比較します（賞与は含みません）。`
      + '実績表示月は計画値を表示します（編集不可）。';
    salaryHeader.appendChild(salaryDesc);
    applySectionFilterTitleStyle(salaryTitle, 'personnel', getFilterButtonColors);
    section.appendChild(salaryHeader);

    for (const period of [currentPeriod, nextPeriod]) {
      const bonusMonthLabels = bonusPaymentMonthLabels(
        getBonusPaymentMonths(salaryPlanSettings, period, fiscalMonths),
      );

      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = formatFiscalPeriodLabel(period);
      block.appendChild(blockTitle);

      block.appendChild(buildBonusMonthConfig(activeEmployees, period, fiscalMonths));

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(
        buildSalaryPlanTable(activeEmployees, period, fiscalMonths, bonusMonthLabels, {
          showIncreaseRate: period === nextPeriod,
          comparePeriod: currentPeriod,
        }),
      );
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `salary-plan-${period}`);
      bindEmployeePlanGroupRowHover(tableWrap.querySelector('.employee-salary-plan-table'));

      section.appendChild(block);
    }

    wrap.appendChild(section);
    layoutEmployeeSettingsScalableWrap();
  }

  renderEmployeeTable();
  clearEmployeeTenureTimer();
  employeeTenureTimerId = setInterval(refreshEmployeeLiveCells, 60000);

  const csvInput = wrap.querySelector('#employee-csv-input');
  wrap.querySelector('#employee-csv-btn').addEventListener('click', () => {
    csvInput.value = '';
    csvInput.click();
  });

  csvInput.addEventListener('change', async () => {
    const file = csvInput.files?.[0];
    if (!file) return;
    try {
      const text = await readCsvFile(file);
      const { employees: imported, errors } = parseEmployeeCsv(text);
      if (imported.length === 0) {
        showStatus(errors[0] ?? '読み込める従業員データがありません。', true);
        return;
      }
      const existingIds = new Set(employees.map((e) => e.id));
      const newCount = imported.filter((e) => !existingIds.has(e.id)).length;
      const updateCount = imported.length - newCount;
      employees = saveEmployees(mergeEmployees(employees, imported));
      const parts = [`${imported.length}件を読み込み`];
      if (newCount > 0) parts.push(`${newCount}件を新規追加`);
      if (updateCount > 0) parts.push(`${updateCount}件を更新`);
      let message = `${parts.join('、')}しました。`;
      if (errors.length > 0) {
        message += ` （警告: ${errors.slice(0, 3).join(' ')}）`;
      }
      showStatus(message);
      renderEmployeeTable();
    } catch {
      showStatus('CSVの読み込みに失敗しました。', true);
    }
  });

  const addToggleBtn = wrap.querySelector('#employee-add-toggle-btn');
  addToggleBtn.addEventListener('click', () => {
    addForm.hidden = !addForm.hidden;
    if (!addForm.hidden) {
      addForm.querySelector('#employee-add-last')?.focus();
    }
  });

  addForm.querySelector('#employee-add-cancel-btn').addEventListener('click', () => {
    addForm.hidden = true;
    addForm.querySelector('#employee-add-number').value = '';
    addForm.querySelector('#employee-add-last').value = '';
    addForm.querySelector('#employee-add-first').value = '';
    addForm.querySelector('#employee-add-contract').value = '';
    addForm.querySelector('#employee-add-join').value = '';
    addForm.querySelector('#employee-add-salary').value = '';
  });

  addForm.querySelector('#employee-add-submit-btn').addEventListener('click', () => {
    const lastName = addForm.querySelector('#employee-add-last').value.trim();
    const firstName = addForm.querySelector('#employee-add-first').value.trim();
    if (!lastName || !firstName) {
      showStatus('姓と名を入力してください。', true);
      return;
    }
    const salaryRaw = addForm.querySelector('#employee-add-salary').value.trim();
    const salary = salaryRaw ? parseInt(salaryRaw.replace(/,/g, ''), 10) : null;
    const newEmployee = createManualEmployee({
      employeeNumber: addForm.querySelector('#employee-add-number').value.trim(),
      lastName,
      firstName,
      contractType: addForm.querySelector('#employee-add-contract').value.trim(),
      joinDate: addForm.querySelector('#employee-add-join').value.trim(),
      baseSalary: Number.isFinite(salary) ? salary : null,
    });
    employees = saveEmployees([...employees, newEmployee]);
    addForm.hidden = true;
    addForm.querySelector('#employee-add-number').value = '';
    addForm.querySelector('#employee-add-last').value = '';
    addForm.querySelector('#employee-add-first').value = '';
    addForm.querySelector('#employee-add-contract').value = '';
    addForm.querySelector('#employee-add-join').value = '';
    addForm.querySelector('#employee-add-salary').value = '';
    showStatus(`${formatEmployeeName(newEmployee)} を追加しました。`);
    renderEmployeeTable();
  });

  replaceRootPanel(wrap);
  employeeSettingsMonthDisplayApplier = () => {
    if (!wrap.isConnected) return;
    refreshSalaryPlanUi();
  };
  bindEmployeeSettingsLayout(wrap, {
    monthCount: fiscalMonths.length,
    fiscalMonths,
    currentPeriod,
    appSettings,
  });
  refreshPlanKpi();
}

function renderRevenueSettings() {
  mountRevenueSettingsPanel({
    replaceRootPanel,
    refreshPlanKpi,
    appSettings,
    rawPlanData,
    getMonthDisplayConfig: () => monthDisplayConfig,
    onToggleMonthDisplay: togglePlanMonthDisplay,
    getRevenuePlans: () => revenuePlans,
    setRevenuePlans: (plans) => { revenuePlans = plans; },
    getRevenuePlanSettings: () => revenuePlanSettings,
    setRevenuePlanSettings: (settings) => { revenuePlanSettings = settings; },
    refreshPlanTableIfNeeded: () => {
      refreshSectionColors();
      refreshRevenueSettingsSectionTitles(getFilterButtonColors);
      refreshPlanKpi();
      if (activeTab === 'plan' && data) refreshPlanTable();
    },
    getSectionFilterColors: getFilterButtonColors,
  });
}

function renderOutsourcingSettings() {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const currentPeriod = appSettings.fiscalPeriod;
  const nextPeriod = appSettings.fiscalPeriod + 1;

  if (rawPlanData) {
    const subaccounts = collectOutsourcingSubaccountsFromPlanData(rawPlanData);
    outsourcingPlans = mergeVendorsFromSubaccounts(
      outsourcingPlans,
      currentPeriod,
      subaccounts,
      fiscalMonths,
    );
  }
  outsourcingPlans = syncVendorListFromReference(
    outsourcingPlans,
    nextPeriod,
    currentPeriod,
    fiscalMonths,
  );

  const actualAmountsByVendor = rawPlanData
    ? collectOutsourcingActualAmountsFromPlanData(rawPlanData, fiscalMonths)
    : new Map();

  const journalVendorKeys = new Set();
  if (rawPlanData) {
    const subaccounts = collectOutsourcingSubaccountsFromPlanData(rawPlanData);
    for (const { accountLabel, subLabel } of subaccounts) {
      const account = String(accountLabel ?? '').trim();
      const sub = String(subLabel ?? '').trim();
      if (!account || !sub) continue;
      journalVendorKeys.add(`${account}\x00${sub}`);
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap outsourcing-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">
      外注費の支払い計画を設定します。今期の仕訳に存在する補助科目は自動で一覧に追加されます。
      今期の実績表示月は仕訳実績を表示します（編集不可）。予実表で計画表示に切り替えた月はダブルクリックで編集できます。Shift+Enter で入力した月以降の同額を後続月に反映します（0円も可）。Enter はその月のみ反映します。設定はブラウザに保存され、予実表の「外注費」セクションに反映されます。
    </p>
  `;
  wrap.appendChild(header);

  const statusEl = document.createElement('p');
  statusEl.className = 'employee-status-msg';
  statusEl.hidden = true;
  wrap.appendChild(statusEl);

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
    statusEl.classList.toggle('employee-status-error', isError);
  }

  function refreshPlanTableIfNeeded() {
    refreshSectionColors();
    refreshPlanKpi();
    if (activeTab === 'plan' && data) refreshPlanTable();
  }

  const monthDisplayUi = createPlanMonthDisplayUi({
    appSettings,
    currentPeriod,
    fiscalMonths,
    getMonthDisplayConfig: () => monthDisplayConfig,
    getPastMonthsForPeriod,
    onToggleMonthDisplay: togglePlanMonthDisplay,
  });
  const startNumericCellEdit = createPlanAmountCellEditor({ onEditClose: () => renderPlanSection() });

  function appendPlanAmountCell(tr, {
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
    editable,
    title,
    formatValue,
    rawValue,
    parseValue,
    onSave,
    tabScopeId,
  }) {
    const td = document.createElement('td');
    tr.appendChild(td);
    monthDisplayUi.setPlanAmountCellContent(td, {
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
      allowShiftFillForward: true,
      tabScopeId,
      onEditClose: () => renderPlanSection(),
    }, startNumericCellEdit);
  }

  function syncOutsourcingPlanTableMonthDisplay(table, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) return;

    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th, i) => {
      const month = fiscalMonths[i];
      if (month) monthDisplayUi.updateMonthHeaderTh(th, month, fiscalPeriod);
    });

    for (const vendor of getVendorsForPeriod(fiscalPeriod)) {
      const tr = table.querySelector(`tbody tr[data-plan-row-key="${CSS.escape(vendor.id)}"]`);
      if (!tr) continue;
      const displayMonthly = buildDisplayMonthly(vendor, fiscalPeriod);
      const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: displayMonthly[month],
          prevValue,
          editable,
          fiscalPeriod,
          title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
          formatValue: formatSalaryPlanYen,
          rawValue: vendor.monthly[month],
          parseValue: parseSalaryPlanAmountInput,
          allowShiftFillForward: true,
          tabScopeId: `outsourcing-${fiscalPeriod}`,
          onSave: (parsed, fillForward) => {
            const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
            const nextMonthly = fillForward
              ? applyAmountFromMonthForwardSkippingPast(
                vendor.monthly,
                fiscalMonths,
                month,
                parsed,
                pastMonths,
              )
              : { ...vendor.monthly, [month]: parsed };
            persistVendor({ ...vendor, monthly: nextMonthly }, fiscalPeriod);
          },
          onEditClose: () => renderPlanSection(),
        }, startNumericCellEdit);
      }
      const totalTd = tr.querySelector('td.salary-plan-col-total');
      if (totalTd) totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly));
    }

    const trTotal = table.querySelector('tbody tr[data-plan-row-key="total"]');
    if (trTotal) {
      const monthlyTotals = emptyMonthlyTotals();
      for (const vendor of getVendorsForPeriod(fiscalPeriod)) {
        const displayMonthly = buildDisplayMonthly(vendor, fiscalPeriod);
        for (const month of fiscalMonths) {
          monthlyTotals[month] = (monthlyTotals[month] ?? 0) + (displayMonthly[month] ?? 0);
        }
      }
      const amountCells = trTotal.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: monthlyTotals[month] ?? 0,
          prevValue: i > 0 ? (monthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined,
          editable: false,
          fiscalPeriod,
          formatValue: formatSalaryPlanYen,
        }, startNumericCellEdit);
      }
      const grandTd = trTotal.querySelector('td.salary-plan-col-total');
      if (grandTd) grandTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(monthlyTotals));
    }
  }

  function applyOutsourcingMonthDisplayToWrap(rootWrap) {
    if (!rootWrap?.isConnected) return;
    rootWrap.querySelectorAll('table.outsourcing-plan-table[data-fiscal-period]').forEach((table) => {
      const fiscalPeriod = Number(table.dataset.fiscalPeriod);
      if (fiscalPeriod !== currentPeriod) return;
      syncOutsourcingPlanTableMonthDisplay(table, fiscalPeriod);
    });
    refreshPlanSettingsColumnPlates(rootWrap, fiscalMonths, currentPeriod, appSettings);
  }

  function getVendorsForPeriod(fiscalPeriod) {
    return getPeriodVendorEntries(outsourcingPlans, fiscalPeriod, fiscalMonths);
  }

  function persistVendor(entry, fiscalPeriod) {
    outsourcingPlans = setVendorEntry(
      outsourcingPlans,
      fiscalPeriod,
      entry,
      fiscalMonths,
    );
    refreshPlanTableIfNeeded();
  }

  function getVendorActualMonthly(vendor) {
    return actualAmountsByVendor.get(`${vendor.accountLabel}\x00${vendor.subLabel}`) ?? {};
  }

  function getPastMonthsForPeriod(fiscalPeriod) {
    return getSettingsLockedMonthsForPeriod(fiscalPeriod, fiscalMonths);
  }

  function buildDisplayMonthly(vendor, fiscalPeriod) {
    const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
    const actualMonthly = fiscalPeriod === currentPeriod ? getVendorActualMonthly(vendor) : {};
    const display = {};
    for (const month of fiscalMonths) {
      if (pastMonths.has(month)) {
        display[month] = actualMonthly[month] ?? null;
      } else {
        display[month] = vendor.monthly[month];
      }
    }
    return display;
  }

  function isMonthEditable(fiscalPeriod, month) {
    return !getPastMonthsForPeriod(fiscalPeriod).has(month);
  }

  function sumDisplayMonthlyTotal(display) {
    let total = 0;
    for (const month of fiscalMonths) {
      total += display[month] ?? 0;
    }
    return total;
  }

  function appendAmountCell(tr, {
    vendor,
    month,
    monthIndex,
    fiscalPeriod,
    value,
    prevValue,
    editable,
  }) {
    appendPlanAmountCell(tr, {
      month,
      monthIndex,
      fiscalPeriod,
      value,
      prevValue,
      editable,
      title: 'ダブルクリックで編集（Shift+Enter で後続月へ同額反映）',
      formatValue: formatSalaryPlanYen,
      rawValue: vendor.monthly[month],
      parseValue: parseSalaryPlanAmountInput,
      tabScopeId: `outsourcing-${fiscalPeriod}`,
      onSave: (parsed, fillForward) => {
        const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
        const nextMonthly = fillForward
          ? applyAmountFromMonthForwardSkippingPast(
            vendor.monthly,
            fiscalMonths,
            month,
            parsed,
            pastMonths,
          )
          : { ...vendor.monthly, [month]: parsed };
        persistVendor({ ...vendor, monthly: nextMonthly }, fiscalPeriod);
      },
    });
  }

  function canDeleteVendor(vendor) {
    if (vendor.manual) return true;
    const key = `${vendor.accountLabel}\x00${vendor.subLabel}`;
    return !journalVendorKeys.has(key);
  }

  function deleteVendor(vendor, fiscalPeriod) {
    outsourcingPlans = removeVendorEntry(
      outsourcingPlans,
      fiscalPeriod,
      vendor.id,
      fiscalMonths,
    );
    renderPlanSection();
    refreshPlanTableIfNeeded();
  }

  function appendVendorDeleteCell(tr, vendor, fiscalPeriod) {
    const td = document.createElement('td');
    td.className = 'col-out-actions';

    if (!canDeleteVendor(vendor)) {
      tr.appendChild(td);
      return;
    }

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'employee-actions-wrap';

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

      confirmBtn.addEventListener('click', () => {
        deleteVendor(vendor, fiscalPeriod);
      });

      cancelBtn.addEventListener('click', () => {
        actionsWrap.classList.remove('employee-actions-confirm');
        actionsWrap.replaceChildren(deleteBtn);
      });

      actionsWrap.append(prompt, confirmBtn, cancelBtn);
    });

    actionsWrap.appendChild(deleteBtn);
    td.appendChild(actionsWrap);
    tr.appendChild(td);
  }

  function buildOutsourcingPlanTable(fiscalPeriod) {
    const vendors = getVendorsForPeriod(fiscalPeriod);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table outsourcing-plan-table';
    table.dataset.fiscalPeriod = String(fiscalPeriod);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const accountTh = document.createElement('th');
    accountTh.className = 'salary-plan-col-name';
    accountTh.textContent = '勘定科目';
    headerRow.appendChild(accountTh);

    const subTh = document.createElement('th');
    subTh.className = 'salary-plan-col-sub';
    subTh.textContent = '補助科目';
    headerRow.appendChild(subTh);

    for (const month of fiscalMonths) {
      const th = document.createElement('th');
      monthDisplayUi.configureMonthHeaderTh(th, month, fiscalPeriod);
      headerRow.appendChild(th);
    }

    const totalTh = document.createElement('th');
    totalTh.className = 'salary-plan-col-total';
    totalTh.textContent = '合計';
    headerRow.appendChild(totalTh);

    const actionsTh = document.createElement('th');
    actionsTh.className = 'col-out-actions';
    headerRow.appendChild(actionsTh);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (vendors.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = fiscalMonths.length + 4;
      emptyTd.className = 'expand-settings-empty';
      emptyTd.textContent = '取引先が登録されていません。今期の仕訳に補助科目がある場合は自動追加されます。手動追加も可能です。';
      emptyRow.appendChild(emptyTd);
      tbody.appendChild(emptyRow);
      table.appendChild(tbody);
      return table;
    }

    for (const vendor of vendors) {
      const tr = document.createElement('tr');
      tr.className = 'salary-plan-row-monthly';
      tr.dataset.planRowKey = vendor.id;
      tagPlanEditableRow(tr, vendor.id);
      const displayMonthly = buildDisplayMonthly(vendor, fiscalPeriod);

      const accountTd = document.createElement('td');
      accountTd.className = 'salary-plan-col-name';
      accountTd.textContent = vendor.accountLabel;
      tr.appendChild(accountTd);

      const subTd = document.createElement('td');
      subTd.className = 'salary-plan-col-sub';
      subTd.textContent = vendor.subLabel;
      tr.appendChild(subTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        appendAmountCell(tr, {
          vendor,
          month,
          monthIndex: i,
          fiscalPeriod,
          value: displayMonthly[month],
          prevValue,
          editable,
        });
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly));
      tr.appendChild(totalTd);

      appendVendorDeleteCell(tr, vendor, fiscalPeriod);

      tbody.appendChild(tr);
    }

    const trTotal = document.createElement('tr');
    trTotal.className = 'salary-plan-total-row salary-plan-row-monthly';
    trTotal.dataset.planRowKey = 'total';
    const totalLabel = document.createElement('td');
    totalLabel.colSpan = 2;
    totalLabel.className = 'salary-plan-total-label';
    totalLabel.textContent = '合計';
    trTotal.appendChild(totalLabel);

    const monthlyTotals = emptyMonthlyTotals();
    for (const vendor of vendors) {
      const displayMonthly = buildDisplayMonthly(vendor, fiscalPeriod);
      for (const month of fiscalMonths) {
        monthlyTotals[month] = (monthlyTotals[month] ?? 0) + (displayMonthly[month] ?? 0);
      }
    }

    let grand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const val = monthlyTotals[month] ?? 0;
      grand += val;
      appendPlanAmountCell(trTotal, {
        month,
        monthIndex: i,
        fiscalPeriod,
        value: val,
        prevValue: i > 0 ? (monthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined,
        editable: false,
        formatValue: formatSalaryPlanYen,
      });
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
    return table;
  }

  function emptyMonthlyTotals() {
    const totals = {};
    for (const month of fiscalMonths) totals[month] = 0;
    return totals;
  }

  function buildPeriodAddForm(fiscalPeriod) {
    const form = document.createElement('div');
    form.className = 'employee-add-form outsourcing-add-form outsourcing-period-add-form';

    const row = document.createElement('div');
    row.className = 'outsourcing-add-form-row';

    const label = document.createElement('span');
    label.className = 'outsourcing-add-label';
    label.textContent = '取引先名';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'app-settings-input outsourcing-add-input';
    input.autocomplete = 'off';
    input.spellcheck = false;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'plan-csv-btn';
    submitBtn.textContent = '追加';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'expand-reset-btn';
    cancelBtn.textContent = 'キャンセル';

    cancelBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });

    submitBtn.addEventListener('click', () => {
      const subLabel = input.value.trim();
      if (!subLabel) {
        showStatus('取引先名を入力してください。', true);
        input.focus();
        return;
      }
      const vendor = createManualVendor({ accountLabel: '外注費', subLabel });
      if (!vendor) {
        showStatus('取引先の追加に失敗しました。', true);
        return;
      }
      const existing = getVendorsForPeriod(fiscalPeriod).some(
        (v) => v.accountLabel === vendor.accountLabel && v.subLabel === vendor.subLabel,
      );
      if (existing) {
        showStatus('同じ補助科目が既に登録されています。', true);
        input.focus();
        return;
      }
      outsourcingPlans = setVendorEntry(
        outsourcingPlans,
        fiscalPeriod,
        vendor,
        fiscalMonths,
      );
      input.value = '';
      renderPlanSection();
      refreshPlanTableIfNeeded();
    });

    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        submitBtn.click();
      }
    });

    row.append(label, input, submitBtn, cancelBtn);
    form.appendChild(row);
    return form;
  }

  function renderPlanSection() {
    let section = wrap.querySelector('.salary-plan-section');
    let periodsContainer = wrap.querySelector('.outsourcing-plan-periods');

    if (!section) {
      section = document.createElement('div');
      section.className = 'salary-plan-section';

      const planHeader = document.createElement('div');
      planHeader.className = 'salary-plan-header';
      const planTitle = document.createElement('h3');
      planTitle.className = 'salary-plan-title';
      planTitle.dataset.sectionFilter = 'outsourcing';
      planTitle.textContent = '外注費支払い計画表';
      planHeader.appendChild(planTitle);
      const planDesc = document.createElement('p');
      planDesc.className = 'salary-plan-desc';
      planDesc.textContent = `決算月 ${appSettings.fiscalEndMonth}月 を基準とした12か月分です。`
        + '今期の実績表示月は仕訳実績を表示します（編集不可）。予実表で計画表示に切り替えた月はダブルクリックで編集できます。'
        + 'Shift+Enter で入力した月以降の同額を後続月に反映します（0円も可）。Enter はその月のみ反映します。';
      planHeader.appendChild(planDesc);
      applySectionFilterTitleStyle(planTitle, 'outsourcing', getFilterButtonColors);
      section.appendChild(planHeader);

      periodsContainer = document.createElement('div');
      periodsContainer.className = 'outsourcing-plan-periods';
      section.appendChild(periodsContainer);

      wrap.appendChild(section);
    }

    periodsContainer.replaceChildren();

    for (const period of [currentPeriod, nextPeriod]) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = formatFiscalPeriodLabel(period);
      block.appendChild(blockTitle);

      block.appendChild(buildPeriodAddForm(period));

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildOutsourcingPlanTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `outsourcing-${period}`);

      periodsContainer.appendChild(block);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layoutPlanSettingsScalableWrap(wrap, (rootWrap) => measurePlanSettingsPageNaturalWidth(
        rootWrap,
        fiscalMonths.length,
        [{ subColumns: 1, actionsColumn: true }],
      ));
      refreshPlanSettingsColumnPlates(wrap, fiscalMonths, currentPeriod, appSettings);
    }));
  }

  renderPlanSection();

  outsourcingSettingsMonthDisplayApplier = () => applyOutsourcingMonthDisplayToWrap(wrap);
  bindPlanSettingsScalableLayout(wrap, {
    measureNaturalWidth: (rootWrap) => measurePlanSettingsPageNaturalWidth(
      rootWrap,
      fiscalMonths.length,
      [{ subColumns: 1, actionsColumn: true }],
    ),
    fiscalMonths,
    currentPeriod,
    appSettings,
  });
  replaceRootPanel(wrap);
  refreshPlanKpi();
}

function renderOtherSettings() {
  setPlanKpi(null);

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap app-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">アプリ全体の設定です。事業開始年は予実表ヘッダーの年表示（12月〜11月）の算出に使います。選択中の期（例: 第8期）と組み合わせて、各月の年ラベルを決定します。決算月は会計期の最終月（1〜12）です。法人判定文字は外注費の補助科目が法人か個人事業主かを判別する際に使います。ブランド表示はヘッダー左上のアイコン・会社名に反映されます。</p>
  `;
  wrap.appendChild(header);

  const form = document.createElement('div');
  form.className = 'app-settings-form app-settings-form-fields other-settings-form';
  form.innerHTML = `
    <div class="app-settings-section brand-settings-section other-settings-brand">
      <h2 class="ui-color-panel-title">ブランド表示</h2>
      <p class="app-settings-hint brand-logo-image-mode-hint" id="brand-logo-image-mode-hint" hidden></p>
      <div class="other-settings-brand-body">
        <div class="other-settings-brand-row other-settings-brand-row-main">
          <label class="app-settings-field other-settings-brand-field other-settings-brand-company-field">
            <span class="app-settings-label">会社名</span>
            <input type="text" class="app-settings-input" id="brand-company-name"
              spellcheck="false" autocomplete="off" />
          </label>
          <label class="app-settings-field other-settings-brand-field other-settings-brand-text-field">
            <span class="app-settings-label">アイコン表示</span>
            <input type="text" class="app-settings-input" id="brand-icon-text"
              spellcheck="false" autocomplete="off" placeholder="MGA や ⚖️ など" />
          </label>
          <label class="app-settings-field other-settings-brand-color-field other-settings-brand-text-field">
            <span class="app-settings-label">塗り</span>
            <input type="color" class="section-color-input" id="brand-fill-color" />
          </label>
          <label class="app-settings-field other-settings-brand-color-field other-settings-brand-text-field">
            <span class="app-settings-label">文字</span>
            <input type="color" class="section-color-input" id="brand-text-color" />
          </label>
        </div>
        <div class="other-settings-brand-row other-settings-brand-row-logo">
          <div class="app-settings-field other-settings-brand-logo-field">
            <span class="app-settings-label">ロゴ画像</span>
            <div class="brand-logo-controls">
              <div
                class="brand-logo-settings-preview brand-logo-settings-preview--empty"
                id="brand-logo-settings-preview"
              ></div>
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                id="brand-logo-file" hidden />
              <button type="button" class="plan-csv-btn" id="brand-logo-load-btn">画像を読み込む</button>
              <button type="button" class="settings-delete-btn brand-logo-clear-btn" id="brand-logo-clear-btn" hidden>削除</button>
            </div>
          </div>
        </div>
        <div class="other-settings-brand-row other-settings-brand-row-logo-options" hidden>
          <label class="app-settings-field other-settings-brand-color-field other-settings-brand-logo-image-field other-settings-brand-logo-outline-color-field" hidden>
            <span class="app-settings-label">縁取り</span>
            <input type="color" class="section-color-input" id="brand-logo-outline-color" />
          </label>
          <label class="app-settings-field other-settings-brand-field other-settings-brand-logo-image-field" hidden>
            <span class="app-settings-label">縁取り太さ (px、0=なし)</span>
            <input type="number" class="app-settings-input app-settings-input-outline-width" id="brand-logo-outline-width"
              min="${MIN_BRAND_LOGO_OUTLINE_WIDTH}" max="${MAX_BRAND_LOGO_OUTLINE_WIDTH}" step="0.1"
              inputmode="decimal" autocomplete="off" />
          </label>
          <label class="app-settings-field other-settings-brand-field other-settings-brand-logo-image-field other-settings-brand-logo-shadow-field" hidden>
            <span class="app-settings-label">影</span>
            <input type="checkbox" class="app-settings-checkbox" id="brand-logo-shadow-enabled" />
          </label>
          <label class="app-settings-field other-settings-brand-field other-settings-brand-logo-image-field other-settings-brand-logo-shadow-option-field" hidden>
            <span class="app-settings-label">影の強さ (1.0=標準)</span>
            <input type="number" class="app-settings-input app-settings-input-outline-width" id="brand-logo-shadow-strength"
              min="${MIN_BRAND_LOGO_SHADOW_STRENGTH}" max="${MAX_BRAND_LOGO_SHADOW_STRENGTH}" step="0.1"
              inputmode="decimal" autocomplete="off" />
          </label>
          <label class="app-settings-field other-settings-brand-color-field other-settings-brand-logo-image-field other-settings-brand-logo-shadow-option-field" hidden>
            <span class="app-settings-label">影の色</span>
            <input type="color" class="section-color-input" id="brand-logo-shadow-color" />
          </label>
        </div>
        <div class="other-settings-brand-row other-settings-brand-row-actions">
          <button type="button" class="expand-reset-btn other-settings-brand-reset-btn" id="app-settings-reset-btn">基本・ブランドをデフォルトに戻す</button>
        </div>
      </div>
    </div>
    <div class="app-settings-section other-settings-general">
      <div class="app-settings-field-row other-settings-general-row">
        <label class="app-settings-field">
          <span class="app-settings-label">事業開始年</span>
          <input type="text" class="app-settings-input app-settings-input-year" id="business-start-year"
            inputmode="numeric" autocomplete="off" spellcheck="false" />
        </label>
        <label class="app-settings-field">
          <span class="app-settings-label">決算月</span>
          <select class="app-settings-input app-settings-input-fiscal-month" id="fiscal-end-month"></select>
        </label>
        <label class="app-settings-field other-settings-corp-field">
          <span class="app-settings-label">法人判定文字</span>
          <input type="text" class="app-settings-input" id="corp-entity-markers"
            spellcheck="false" autocomplete="off" placeholder="株式会社,（株） など" />
        </label>
      </div>
    </div>
  `;
  wrap.appendChild(form);

  appendCsvNameSettingsPanel(wrap);

  const yearInput = form.querySelector('#business-start-year');
  const fiscalEndMonthSelect = form.querySelector('#fiscal-end-month');
  const corpEntityMarkersInput = form.querySelector('#corp-entity-markers');
  const companyNameInput = form.querySelector('#brand-company-name');
  const brandIconTextInput = form.querySelector('#brand-icon-text');
  const brandFillColorInput = form.querySelector('#brand-fill-color');
  const brandTextColorInput = form.querySelector('#brand-text-color');
  const brandLogoOutlineColorInput = form.querySelector('#brand-logo-outline-color');
  const brandLogoOutlineWidthInput = form.querySelector('#brand-logo-outline-width');
  const brandLogoShadowEnabledInput = form.querySelector('#brand-logo-shadow-enabled');
  const brandLogoShadowStrengthInput = form.querySelector('#brand-logo-shadow-strength');
  const brandLogoShadowColorInput = form.querySelector('#brand-logo-shadow-color');
  const brandLogoImageModeHint = form.querySelector('#brand-logo-image-mode-hint');
  const brandLogoFileInput = form.querySelector('#brand-logo-file');
  const brandLogoLoadBtn = form.querySelector('#brand-logo-load-btn');
  const brandLogoClearBtn = form.querySelector('#brand-logo-clear-btn');
  const brandLogoPreview = form.querySelector('#brand-logo-settings-preview');
  const brandTextFields = form.querySelectorAll('.other-settings-brand-text-field');
  const brandLogoImageFields = form.querySelectorAll('.other-settings-brand-logo-image-field');
  const brandLogoOutlineColorField = form.querySelector('.other-settings-brand-logo-outline-color-field');
  const brandLogoShadowOptionFields = form.querySelectorAll('.other-settings-brand-logo-shadow-option-field');
  const brandLogoOptionsRow = form.querySelector('.other-settings-brand-row-logo-options');

  // ロゴ設定の表示切替でフォームの自然幅が変わったときに UI スケールを再計算する
  let refreshOtherSettingsLayout = null;

  function populateBrandLogoImageForm() {
    const mode = getPlanColorMode();
    const img = getBrandLogoImageSettings(appSettings, mode);
    if (brandLogoImageModeHint) {
      brandLogoImageModeHint.hidden = !hasBrandLogo(appSettings);
      brandLogoImageModeHint.textContent =
        `ロゴの縁取り・影: ${getBrandLogoImageModeLabel(mode)}用の設定を編集中`;
    }
    brandLogoOutlineColorInput.value = img.outlineColor;
    brandLogoOutlineWidthInput.value = formatBrandLogoOutlineWidth(img.outlineWidth);
    brandLogoShadowEnabledInput.checked = img.shadowEnabled;
    brandLogoShadowStrengthInput.value = formatBrandLogoShadowStrength(img.shadowStrength);
    brandLogoShadowColorInput.value = img.shadowColor;
  }

  function syncBrandLogoSettingsPreview(settings = appSettings) {
    if (!brandLogoPreview) return;
    const dataUrl = normalizeBrandLogoDataUrl(settings.brandLogoDataUrl);
    brandLogoPreview.classList.toggle('brand-logo-settings-preview--empty', !dataUrl);
    brandLogoPreview.classList.toggle('plan-logo-image', !!dataUrl);
    brandLogoPreview.textContent = '';
    brandLogoPreview.style.background = '';
    brandLogoPreview.style.color = '';
    brandLogoPreview.style.boxShadow = 'none';

    let img = brandLogoPreview.querySelector('img');
    if (dataUrl) {
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        brandLogoPreview.appendChild(img);
      }
      if (img.src !== dataUrl) img.src = dataUrl;
      applyBrandLogoImageFilters(settings, getPlanColorMode());
      return;
    }
    if (img) img.remove();
    brandLogoPreview.style.filter = 'none';
  }

  function syncBrandFieldsVisibility(settings = appSettings) {
    const logoActive = hasBrandLogo(settings);
    const outlineActive = normalizeBrandLogoOutlineWidth(brandLogoOutlineWidthInput.value) > 0;
    const shadowActive = brandLogoShadowEnabledInput.checked;
    syncBrandLogoSettingsPreview(settings);
    brandTextFields.forEach((el) => {
      el.hidden = logoActive;
    });
    if (brandLogoOptionsRow) brandLogoOptionsRow.hidden = !logoActive;
    brandLogoImageFields.forEach((el) => {
      el.hidden = !logoActive;
    });
    brandLogoClearBtn.hidden = !logoActive;
    if (brandLogoOutlineColorField) {
      brandLogoOutlineColorField.hidden = !logoActive || !outlineActive;
    }
    brandLogoShadowOptionFields.forEach((el) => {
      el.hidden = !logoActive || !shadowActive;
    });
    refreshOtherSettingsLayout?.();
  }

  function readBrandLogoImagePatchFromInputs() {
    return {
      outlineColor: normalizeBrandColor(
        brandLogoOutlineColorInput.value,
        DEFAULT_BRAND_LOGO_OUTLINE_COLOR,
      ),
      outlineWidth: normalizeBrandLogoOutlineWidth(brandLogoOutlineWidthInput.value),
      shadowEnabled: brandLogoShadowEnabledInput.checked,
      shadowStrength: normalizeBrandLogoShadowStrength(brandLogoShadowStrengthInput.value),
      shadowColor: normalizeBrandColor(
        brandLogoShadowColorInput.value,
        DEFAULT_BRAND_LOGO_SHADOW_COLOR,
      ),
    };
  }

  function buildBrandSettingsDraftFromInputs() {
    const mode = getPlanColorMode();
    let draft = {
      ...appSettings,
      companyName: normalizeCompanyName(companyNameInput.value),
      brandFillColor: normalizeBrandColor(brandFillColorInput.value, DEFAULT_BRAND_FILL_COLOR),
      brandTextColor: normalizeBrandColor(brandTextColorInput.value, DEFAULT_BRAND_TEXT_COLOR),
    };
    if (hasBrandLogo(draft)) {
      draft = setBrandLogoImageModeSettings(draft, mode, readBrandLogoImagePatchFromInputs());
    } else {
      draft.brandIconText = normalizeBrandIconText(brandIconTextInput.value);
    }
    return draft;
  }

  function previewBrandSettingsFromInputs() {
    const draft = buildBrandSettingsDraftFromInputs();
    applyBrandSettings(draft, getPlanColorMode());
    syncBrandFieldsVisibility(draft);
  }

  function refreshBrandSettings() {
    applyBrandSettings(appSettings, getPlanColorMode());
    syncBrandFieldsVisibility();
  }

  function saveBrandSettings() {
    const mode = getPlanColorMode();
    appSettings = buildBrandSettingsDraftFromInputs();
    saveAppSettings(appSettings);
    companyNameInput.value = appSettings.companyName;
    brandIconTextInput.value = appSettings.brandIconText;
    brandFillColorInput.value = appSettings.brandFillColor;
    brandTextColorInput.value = appSettings.brandTextColor;
    if (document.activeElement !== brandLogoOutlineWidthInput) {
      brandLogoOutlineWidthInput.value = formatBrandLogoOutlineWidth(
        getBrandLogoImageSettings(appSettings, mode).outlineWidth,
      );
    }
    if (document.activeElement !== brandLogoShadowStrengthInput) {
      brandLogoShadowStrengthInput.value = formatBrandLogoShadowStrength(
        getBrandLogoImageSettings(appSettings, mode).shadowStrength,
      );
    }
    brandLogoOutlineColorInput.value = getBrandLogoImageSettings(appSettings, mode).outlineColor;
    brandLogoShadowEnabledInput.checked = getBrandLogoImageSettings(appSettings, mode).shadowEnabled;
    brandLogoShadowColorInput.value = getBrandLogoImageSettings(appSettings, mode).shadowColor;
    previewBrandSettingsFromInputs();
  }

  function readBrandLogoFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('画像ファイルを選択してください。'));
        return;
      }
      if (file.size > MAX_BRAND_LOGO_BYTES) {
        reject(new Error(`ロゴ画像は ${Math.round(MAX_BRAND_LOGO_BYTES / 1024)}KB 以下にしてください。`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error ?? new Error('画像の読み込みに失敗しました。'));
      reader.readAsDataURL(file);
    });
  }

  brandLogoLoadBtn.addEventListener('click', () => {
    brandLogoFileInput.value = '';
    brandLogoFileInput.click();
  });

  brandLogoFileInput.addEventListener('change', async () => {
    const file = brandLogoFileInput.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readBrandLogoFile(file);
      const normalized = normalizeBrandLogoDataUrl(dataUrl);
      if (!normalized) {
        window.alert('対応していない画像形式です。');
        return;
      }
      appSettings = {
        ...appSettings,
        brandLogoDataUrl: normalized,
      };
      saveAppSettings(appSettings);
      refreshBrandSettings();
    } catch (err) {
      window.alert(err?.message ?? '画像の読み込みに失敗しました。');
    }
  });

  brandLogoClearBtn.addEventListener('click', () => {
    appSettings = {
      ...appSettings,
      brandLogoDataUrl: null,
    };
    saveAppSettings(appSettings);
    refreshBrandSettings();
  });

  for (let m = 1; m <= 12; m += 1) {
    const opt = document.createElement('option');
    opt.value = String(m);
    opt.textContent = `${m}月`;
    fiscalEndMonthSelect.appendChild(opt);
  }

  yearInput.value = String(appSettings.businessStartYear);
  fiscalEndMonthSelect.value = String(appSettings.fiscalEndMonth);
  corpEntityMarkersInput.value = appSettings.corpEntityMarkers;
  companyNameInput.value = appSettings.companyName;
  brandIconTextInput.value = appSettings.brandIconText;
  brandFillColorInput.value = appSettings.brandFillColor;
  brandTextColorInput.value = appSettings.brandTextColor;
  populateBrandLogoImageForm();
  refreshBrandSettings();

  companyNameInput.addEventListener('input', saveBrandSettings);
  brandIconTextInput.addEventListener('input', saveBrandSettings);
  brandFillColorInput.addEventListener('input', saveBrandSettings);
  brandTextColorInput.addEventListener('input', saveBrandSettings);
  brandLogoOutlineColorInput.addEventListener('input', () => {
    previewBrandSettingsFromInputs();
    appSettings = buildBrandSettingsDraftFromInputs();
    saveAppSettings(appSettings);
  });
  brandLogoShadowEnabledInput.addEventListener('input', saveBrandSettings);
  brandLogoShadowColorInput.addEventListener('input', () => {
    previewBrandSettingsFromInputs();
    appSettings = buildBrandSettingsDraftFromInputs();
    saveAppSettings(appSettings);
  });
  brandLogoOutlineWidthInput.addEventListener('input', () => {
    const filtered = filterBrandLogoDecimalInput(brandLogoOutlineWidthInput.value);
    if (filtered !== brandLogoOutlineWidthInput.value) {
      brandLogoOutlineWidthInput.value = filtered;
    }
    previewBrandSettingsFromInputs();
    appSettings = buildBrandSettingsDraftFromInputs();
    saveAppSettings(appSettings);
  });
  brandLogoOutlineWidthInput.addEventListener('blur', () => {
    const mode = getPlanColorMode();
    brandLogoOutlineWidthInput.value = formatBrandLogoOutlineWidth(
      getBrandLogoImageSettings(appSettings, mode).outlineWidth,
    );
  });
  brandLogoShadowStrengthInput.addEventListener('input', () => {
    const filtered = filterBrandLogoDecimalInput(brandLogoShadowStrengthInput.value);
    if (filtered !== brandLogoShadowStrengthInput.value) {
      brandLogoShadowStrengthInput.value = filtered;
    }
    previewBrandSettingsFromInputs();
    appSettings = buildBrandSettingsDraftFromInputs();
    saveAppSettings(appSettings);
  });
  brandLogoShadowStrengthInput.addEventListener('blur', () => {
    const mode = getPlanColorMode();
    brandLogoShadowStrengthInput.value = formatBrandLogoShadowStrength(
      getBrandLogoImageSettings(appSettings, mode).shadowStrength,
    );
  });

  yearInput.addEventListener('input', () => {
    const filtered = filterTaxRateIntegerInput(yearInput.value);
    if (filtered !== yearInput.value) yearInput.value = filtered;
  });

  corpEntityMarkersInput.addEventListener('change', () => {
    appSettings = {
      ...appSettings,
      corpEntityMarkers: normalizeCorpEntityMarkers(corpEntityMarkersInput.value),
    };
    saveAppSettings(appSettings);
    corpEntityMarkersInput.value = appSettings.corpEntityMarkers;
  });

  fiscalEndMonthSelect.addEventListener('change', () => {
    appSettings = {
      ...appSettings,
      fiscalEndMonth: normalizeFiscalEndMonth(fiscalEndMonthSelect.value),
    };
    saveAppSettings(appSettings);
    fiscalEndMonthSelect.value = String(appSettings.fiscalEndMonth);
  });

  yearInput.addEventListener('input', () => {
    const year = parseInt(yearInput.value, 10);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
    appSettings = {
      ...appSettings,
      businessStartYear: year,
      fiscalPeriod: normalizeFiscalPeriod(year, appSettings.fiscalPeriod),
    };
    saveAppSettings(appSettings);
    syncPeriodControls();
    if (activeTab === 'plan' && data) refreshPlanTable();
  });

  wrap.querySelector('#app-settings-reset-btn').addEventListener('click', () => {
    appSettings = resetOtherAppSettings(appSettings);
    saveAppSettings(appSettings);
    yearInput.value = String(appSettings.businessStartYear);
    fiscalEndMonthSelect.value = String(appSettings.fiscalEndMonth);
    corpEntityMarkersInput.value = appSettings.corpEntityMarkers;
    companyNameInput.value = appSettings.companyName;
    brandIconTextInput.value = appSettings.brandIconText;
    brandFillColorInput.value = appSettings.brandFillColor;
    brandTextColorInput.value = appSettings.brandTextColor;
    populateBrandLogoImageForm();
    refreshBrandSettings();
    syncPeriodControls();
    if (activeTab === 'plan' && data) refreshPlanTable();
  });

  replaceRootPanel(wrap);
  // ブラウザ幅へフィットさせる。
  // 自然幅 = 左右余白 2rem ＋ 各セクション（ブランド行・基本設定行・CSV名定義表）の 1 行自然幅の最大
  const measureOtherSettingsNaturalWidth = () => {
    const brandRowW = Math.max(
      0,
      ...[...wrap.querySelectorAll('.other-settings-brand-row')].map((row) => (
        row.hidden ? 0 : measureElementIntrinsicWidth(row)
      )),
    );
    const sectionW = Math.max(
      brandRowW,
      measureElementIntrinsicWidth(wrap.querySelector('.other-settings-general-row')),
      measureElementIntrinsicWidth(wrap.querySelector('.csv-name-settings-table')),
    );
    return sectionW > 0 ? sectionW + planSettingsRemToPx(2) : 0;
  };
  bindPlanSettingsScalableLayout(wrap, {
    measureNaturalWidth: measureOtherSettingsNaturalWidth,
  });
  refreshOtherSettingsLayout = () => {
    layoutPlanSettingsScalableWrap(wrap, measureOtherSettingsNaturalWidth);
  };
}

function replaceRootPanel(el) {
  const selectors = '.plan-table-wrap, .expand-settings-wrap, .plan-csv-load, .dashboard-wrap';
  const existing = root.querySelector(selectors);
  if (existing) existing.replaceWith(el);
  else root.appendChild(el);
}

function csvFolderDropHintHtml() {
  if (!isFolderDropSupported()) return '';
  return '<p class="plan-csv-drop-label">フォルダをここにドロップ</p>';
}

function bindCsvFolderDropZone(panel, onInvalid) {
  const dropEl = panel.querySelector('.plan-csv-drop');
  if (!dropEl) return;
  bindDirectoryDropZone(dropEl, handleDropCsvFolder, {
    onInvalid: () => onInvalid('フォルダをドロップしてください。'),
    onError: (err) => onInvalid(err instanceof Error ? err.message : 'CSV の読み込みに失敗しました。'),
  });
}

async function handleDropCsvFolder(handle) {
  showPlanLoadingOverlay({ awaitLayout: true });
  try {
    const loadOptions = getCsvLoadPeriodOptions();
    const loaded = await loadPlanDataFromDroppedFolder(
      expandConfig,
      loadOptions,
      handle,
    );
    if (isPlanOnlyPeriod(appSettings.businessStartYear, appSettings.fiscalPeriod)) {
      journalText = loaded.journalText;
      bsText = loaded.bsText;
      generalLedgerText = loaded.generalLedgerText ?? null;
      generalLedgerName = loaded.generalLedgerName ?? null;
      rawPlanData = loaded.data;
      loadPlanOnlyPeriodData();
      return;
    }
    loadData(loaded);
  } catch (err) {
    cancelPlanLoadingOverlay();
    if (err?.code === 'NEEDS_PERMISSION' && err.handle) {
      renderFolderAccessScreen(err.folderName ?? err.handle.name, err.handle);
      return;
    }
    renderCsvLoadScreen(err instanceof Error ? err.message : 'CSV の読み込みに失敗しました。');
  }
}

function renderFolderAccessScreen(folderName, handle) {
  cancelPlanLoadingOverlay();
  const panel = document.createElement('div');
  panel.className = 'plan-csv-load';
  panel.innerHTML = `
    <h2>CSV フォルダへのアクセス</h2>
    <p>フォルダ <strong>${folderName}</strong> から CSV を読み込みます。</p>
    <p class="plan-csv-note">ブラウザのセキュリティのため、再読み込み後は「読み込む」をクリックしてください（フォルダの再選択は不要です）。</p>
    <div class="plan-csv-drop">
      ${csvFolderDropHintHtml()}
      <button type="button" class="plan-csv-btn" id="csv-grant-btn">読み込む</button>
    </div>
    <p class="plan-csv-hint"><button type="button" class="plan-csv-link-btn" id="csv-repick-btn">別のフォルダを選択</button></p>
  `;

  replaceRootPanel(panel);

  panel.querySelector('#csv-grant-btn').addEventListener('click', () => {
    handleGrantFolderAccess(handle);
  });
  panel.querySelector('#csv-repick-btn').addEventListener('click', handlePickCsvFolder);
  bindCsvFolderDropZone(panel, (message) => {
    if (!message) return;
    panel.querySelector('.plan-csv-drop-error')?.remove();
    const msg = document.createElement('p');
    msg.className = 'plan-csv-error plan-csv-drop-error';
    msg.textContent = message;
    panel.querySelector('.plan-csv-drop')?.before(msg);
  });

  requestAnimationFrame(() => {
    panel.querySelector('#csv-grant-btn')?.focus();
  });
}

async function handleGrantFolderAccess(handle) {
  showPlanLoadingOverlay({ awaitLayout: true });

  try {
    const loadOptions = getCsvLoadPeriodOptions();
    const loaded = await loadPlanDataWithFolderAccess(handle, expandConfig, loadOptions);
    // 来期表示中はテンプレート用に今期の CSV を読み、選択中の期は計画表示のままにする
    if (isPlanOnlyPeriod(appSettings.businessStartYear, appSettings.fiscalPeriod)) {
      journalText = loaded.journalText;
      bsText = loaded.bsText;
      generalLedgerText = loaded.generalLedgerText ?? null;
      generalLedgerName = loaded.generalLedgerName ?? null;
      rawPlanData = loaded.data;
      loadPlanOnlyPeriodData();
      return;
    }
    loadData(loaded);
  } catch (err) {
    cancelPlanLoadingOverlay();
    if (err?.name === 'AbortError') {
      renderFolderAccessScreen(handle.name, handle);
      return;
    }
    renderFolderAccessScreen(
      handle.name,
      handle,
    );
    const panel = root.querySelector('.plan-csv-load');
    if (panel && err instanceof Error) {
      const msg = document.createElement('p');
      msg.className = 'plan-csv-error';
      msg.textContent = err.message;
      panel.querySelector('.plan-csv-drop')?.before(msg);
    }
  }
}

function renderCsvLoadScreen(message = '') {
  cancelPlanLoadingOverlay();
  const unsupported = !isFolderPickerSupported();
  const hintLines = formatCsvNameHintLines(csvNameConfig).join('<br />');
  const panel = document.createElement('div');
  panel.className = 'plan-csv-load';
  panel.innerHTML = `
    <h2>CSV フォルダの選択</h2>
    <p>仕訳データ・貸借対照表・総勘定元帳 CSV が入ったフォルダを指定してください。</p>
    <p class="plan-csv-note">初回のみ選択が必要です。次回以降は同じフォルダから自動で読み込みます。</p>
    ${unsupported ? '<p class="plan-csv-error">このブラウザではフォルダ選択に対応していません。Chrome または Edge をご利用ください。</p>' : ''}
    ${message ? `<p class="plan-csv-error">${message}</p>` : ''}
    <div class="plan-csv-drop">
      ${csvFolderDropHintHtml()}
      <button type="button" class="plan-csv-btn" id="csv-folder-btn" ${unsupported ? 'disabled' : ''}>
        フォルダを選択
      </button>
    </div>
    <p class="plan-csv-hint">ファイル名は CSV名定義タブの形式に一致するもののみ対象です（サブフォルダも検索）:<br />
      ${hintLines}</p>
  `;

  replaceRootPanel(panel);

  if (!unsupported) {
    panel.querySelector('#csv-folder-btn').addEventListener('click', handlePickCsvFolder);
    bindCsvFolderDropZone(panel, (dropMessage) => {
      if (dropMessage) renderCsvLoadScreen(dropMessage);
    });
  }
}

async function handlePickCsvFolder() {
  showPlanLoadingOverlay({ awaitLayout: true });

  try {
    const loadOptions = getCsvLoadPeriodOptions();
    const loaded = await loadPlanDataFromPickedFolder(expandConfig, loadOptions);
    if (isPlanOnlyPeriod(appSettings.businessStartYear, appSettings.fiscalPeriod)) {
      journalText = loaded.journalText;
      bsText = loaded.bsText;
      generalLedgerText = loaded.generalLedgerText ?? null;
      generalLedgerName = loaded.generalLedgerName ?? null;
      rawPlanData = loaded.data;
      loadPlanOnlyPeriodData();
      return;
    }
    loadData(loaded);
  } catch (err) {
    cancelPlanLoadingOverlay();
    if (err?.name === 'AbortError') {
      renderCsvLoadScreen();
      return;
    }
    renderCsvLoadScreen(err instanceof Error ? err.message : 'CSV の読み込みに失敗しました。');
  }
}

async function handleReloadCsv() {
  if (isPlanOnlyPeriod(appSettings.businessStartYear, appSettings.fiscalPeriod)) {
    showPlanLoadingOverlay({ awaitLayout: true });
    loadPlanOnlyPeriodData();
    switchMainTab('plan');
    return;
  }

  showPlanLoadingOverlay({ awaitLayout: true });

  try {
    const loaded = await reloadPlanDataFromSavedFolder(expandConfig, getPeriodOptions(), {
      forceRefresh: true,
    });
    loadData(loaded);
    switchMainTab('plan');
  } catch (err) {
    cancelPlanLoadingOverlay();
    if (err?.code === 'NEEDS_PERMISSION' && err.handle) {
      renderFolderAccessScreen(err.folderName ?? err.handle.name, err.handle);
      return;
    }
    renderCsvLoadScreen(err instanceof Error ? err.message : 'CSV の読み込みに失敗しました。');
  }
}

function handleMainMenuAction(value) {
  switch (value) {
    case 'action:settings-export':
      downloadSettingsExport();
      break;
    case 'action:settings-import':
      document.getElementById('plan-settings-import-input')?.click();
      break;
    case 'action:reload-csv':
      handleReloadCsv();
      break;
    case 'action:change-folder':
      handlePickCsvFolder();
      break;
    case 'colors':
      openColorSettingsWindow();
      break;
    default:
      switchMainTab(value);
  }
}

function isMainMenuEntryActive(value) {
  if (value === 'colors') return colorSettingsWindow?.isOpen() ?? false;
  if (value.startsWith('action:')) return false;
  return activeTab === value;
}

function syncMainMenuChecks() {
  for (const btn of getMainMenuItems()) {
    const { menuValue } = btn.dataset;
    if (!menuValue) continue;
    const checked = isMainMenuEntryActive(menuValue);
    btn.classList.toggle('is-checked', checked);
    const check = btn.querySelector('.plan-main-menu-item-check');
    if (check) check.textContent = checked ? '✓' : '';
  }
}

function buildMainMenu() {
  const panel = document.getElementById('plan-main-menu-panel');
  if (!panel) return;

  panel.innerHTML = '';
  for (const entry of MAIN_MENU_ENTRIES) {
    if (entry.kind === 'heading') {
      const sep = document.createElement('div');
      sep.className = 'plan-main-menu-sep';
      sep.setAttribute('role', 'separator');
      panel.appendChild(sep);

      const heading = document.createElement('div');
      heading.className = 'plan-main-menu-heading';
      heading.textContent = entry.label;
      panel.appendChild(heading);
      continue;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plan-main-menu-item';
    if (entry.indented) btn.classList.add('plan-main-menu-item--indented');
    else btn.classList.add('plan-main-menu-item--top');
    btn.role = 'menuitem';
    btn.dataset.menuValue = entry.value;
    if (entry.shortcutKey) {
      btn.dataset.shortcutKey = entry.shortcutKey;
      btn.setAttribute('aria-keyshortcuts', entry.shortcutKey);
    }

    const checkSpan = document.createElement('span');
    checkSpan.className = 'plan-main-menu-item-check';
    checkSpan.setAttribute('aria-hidden', 'true');
    btn.appendChild(checkSpan);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'plan-main-menu-item-label';
    labelSpan.textContent = entry.label;
    btn.appendChild(labelSpan);

    if (entry.shortcutKey) {
      const keySpan = document.createElement('span');
      keySpan.className = 'plan-main-menu-item-key';
      const kbd = document.createElement('kbd');
      kbd.textContent = entry.shortcutKey;
      keySpan.appendChild(kbd);
      keySpan.setAttribute('aria-hidden', 'true');
      btn.appendChild(keySpan);
    }

    btn.addEventListener('click', () => {
      executeMainMenuEntry(entry);
    });
    panel.appendChild(btn);
  }
  syncMainMenuChecks();
}

function bindMainMenu() {
  const menu = document.getElementById('plan-main-menu');
  const trigger = document.getElementById('plan-main-menu-trigger');
  const panel = document.getElementById('plan-main-menu-panel');
  if (!menu || !trigger || !panel) return;

  buildMainMenu();

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = panel.hidden;
    closeMainMenu();
    if (willOpen) openMainMenu();
  });

  panel.addEventListener('keydown', handleMainMenuPanelKeydown);

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMainMenu();
  });
}

function reloadAllSettingsFromStorage() {
  expandConfig = loadExpandConfig();
  visibilityConfig = loadVisibilityConfig();
  rowDisplayConfig = loadRowDisplayConfig();
  expenseSortConfig = loadExpenseSortConfig();
  sectionColorConfig = loadSectionColorConfig();
  uiColorConfig = loadUiColorConfig();
  csvNameConfig = loadCsvNameConfig();
  appSettings = loadAppSettings();
  employees = loadEmployees();
  salaryPlans = loadSalaryPlans();
  salaryPlanSettings = loadSalaryPlanSettings();
  taxPaymentPlans = loadTaxPaymentPlans();
  paymentPlanSettings = loadPaymentPlanSettings();
  expensePlanOverrides = loadExpensePlanOverrides();
  outsourcingPlans = loadOutsourcingPlans();
  revenuePlans = loadRevenuePlans();
  revenuePlanSettings = loadRevenuePlanSettings();
  monthDisplayConfig = loadMonthDisplayConfig();
  applyClosedPeriodPlanPurgeIfNeeded();

  applyUiColors(uiColorConfig);
  applyBrandSettings(appSettings, getPlanColorMode());
  applyFontScale(appSettings.fontScale);
  applyRowPaddingScale(appSettings.rowPaddingScale);
  refreshPlanRowPaddingScaleControl();
  syncPeriodControls();

  if (rawPlanData) {
    if (journalText) rebuildPlanData();
    else {
      data = applyPlanColors(rawPlanData);
      invalidateDrilldownIndex();
    }
  }

  syncSectionFilterConfigToData(true);
  renderToolbar();
  renderPlanViewAfterDataChange();
}

function bindSettingsImportExport() {
  const importInput = document.getElementById('plan-settings-import-input');

  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;

    let text;
    try {
      text = await file.text();
    } catch {
      window.alert('ファイルを読み込めませんでした。');
      return;
    }

    const validation = validateSettingsImportText(text);
    if (!validation.ok) {
      window.alert(validation.error);
      return;
    }

    const exportedAtLabel = validation.exportedAt
      ? new Date(validation.exportedAt).toLocaleString('ja-JP')
      : '不明';
    const confirmed = window.confirm(
      `設定をインポートしますか？\n\n項目数: ${validation.importableKeys.length}\nエクスポート日時: ${exportedAtLabel}\n\n現在の設定は上書きされます。`,
    );
    if (!confirmed) return;

    const result = applyValidatedSettingsImport(validation.data);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    reloadAllSettingsFromStorage();
    window.alert('設定をインポートしました。');
  });
}

function loadPlanOnlyPeriodData({ measureColumnWidths = false } = {}) {
  setCsvGateMode(false);
  journalEntriesCache = null;
  invalidateDrilldownIndex();
  closeJournalPopup();
  journalText = null;
  bsText = null;
  generalLedgerText = null;
  generalLedgerName = null;
  if (activeTab !== 'dashboard') {
    resetDashboardState();
  }
  const planData = rawPlanData
    ? zeroOutPlanData(rawPlanData)
    : buildFullPlan('', null, expandConfig);
  rawPlanData = planData;
  data = applyPlanColors(planData);
  if (measureColumnWidths) {
    planTableInitialLayoutDone = false;
    invalidatePlanTableLayout();
  }
  renderPlanViewAfterDataChange({ measureColumnWidths });
}

function loadData(loaded, { measureColumnWidths = false } = {}) {
  setCsvGateMode(false);
  journalText = loaded.journalText;
  bsText = loaded.bsText;
  generalLedgerText = loaded.generalLedgerText ?? null;
  generalLedgerName = loaded.generalLedgerName ?? null;
  journalEntriesCache = null;
  invalidateDrilldownIndex();
  closeJournalPopup();
  if (activeTab !== 'dashboard') {
    resetDashboardState();
  }
  rawPlanData = loaded.data;
  data = applyPlanColors(loaded.data);
  if (measureColumnWidths) {
    planTableInitialLayoutDone = false;
    invalidatePlanTableLayout();
  }
  renderPlanViewAfterDataChange({ measureColumnWidths });
}

async function init() {
  setCsvGateMode(true);
  applyViewportScale(computeViewportScale());
  bindViewportScale(applyPlanViewportScaleChange);
  window.addEventListener('resize', scheduleDashboardViewportFitRefresh);
  applyUiColors(uiColorConfig);
  subscribeSystemColorMode(() => {
    if (getUiColorModeSetting(uiColorConfig) !== 'system') return;
    applyUiColors(uiColorConfig);
    refreshColorDependentViews();
    refreshColorSettingsPanels();
    refreshToolbarFilterStyles();
    renderToolbar();
  });
  applyBrandSettings(appSettings, getPlanColorMode());
  applyFontScale(appSettings.fontScale);
  applyRowPaddingScale(appSettings.rowPaddingScale);
  renderToolbar();
  renderMainTabs();
  mountPlanRowPaddingScaleControl();
  bindPeriodControls();
  bindDashboardButton();
  initColorSettingsWindow();
  bindMainMenu();
  bindSettingsImportExport();

  root.innerHTML = '';

  try {
    if (isPlanOnlyPeriod(appSettings.businessStartYear, appSettings.fiscalPeriod)) {
      const savedPeriod = appSettings.fiscalPeriod;
      const currentPeriod = getFiscalPeriodForDate(appSettings.businessStartYear);
      try {
        const result = await resolvePlanStartup(expandConfig, {
          businessStartYear: appSettings.businessStartYear,
          fiscalPeriod: currentPeriod,
        });
        if (result.status === 'loaded') {
          root.innerHTML = '';
          journalText = result.data.journalText;
          bsText = result.data.bsText;
          generalLedgerText = result.data.generalLedgerText ?? null;
          generalLedgerName = result.data.generalLedgerName ?? null;
          rawPlanData = result.data.data;
        } else if (result.status === 'needs-permission') {
          renderFolderAccessScreen(result.folderName, result.handle);
          return;
        }
      } catch {
        /* テンプレートなしでも計画表示は可能 */
      }
      appSettings = { ...appSettings, fiscalPeriod: savedPeriod };
      root.innerHTML = '';
      showPlanLoadingOverlay({ awaitLayout: true });
      loadPlanOnlyPeriodData();
      return;
    }

    const result = await resolvePlanStartup(expandConfig, getCsvLoadPeriodOptions());
    if (result.status === 'loaded') {
      root.innerHTML = '';
      showPlanLoadingOverlay({ awaitLayout: true });
      if (isPlanOnlyPeriod(appSettings.businessStartYear, appSettings.fiscalPeriod)) {
        journalText = result.data.journalText;
        bsText = result.data.bsText;
        generalLedgerText = result.data.generalLedgerText ?? null;
        generalLedgerName = result.data.generalLedgerName ?? null;
        rawPlanData = result.data.data;
        loadPlanOnlyPeriodData();
        return;
      }
      loadData(result.data);
      return;
    }
    if (result.status === 'needs-permission') {
      renderFolderAccessScreen(result.folderName, result.handle);
      return;
    }
    renderCsvLoadScreen();
  } catch {
    renderCsvLoadScreen('CSV の読み込みに失敗しました。');
  }
}

init();
