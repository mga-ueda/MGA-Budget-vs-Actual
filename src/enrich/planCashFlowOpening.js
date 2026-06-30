import { FISCAL_MONTHS, enrichRowValues } from '../parse/parseJournal.js';
import { buildPastFiscalMonthSet } from '../config/appSettings.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { planDataFromCache } from '../csv/csvLoader.js';

const CF_IN_SECTION_ID = 'cfIn';
const CF_OUT_SECTION_ID = 'cfOut';
const CF_CASH_BALANCE_SECTION_ID = 'cashBalance';
const CASH_BALANCE_TOTAL_LABEL = "現金及び預金合計";
const CF_IN_ROW_ID = 'cf-in';
const CF_OUT_ROW_ID = 'cf-out';

function loadReferencePeriodPlanData(expandConfig, businessStartYear, fiscalPeriod) {
  if (fiscalPeriod < 1) return null;
  const cached = planDataFromCache(expandConfig, {
    businessStartYear,
    fiscalPeriod,
  });
  return cached?.data ?? null;
}

function findCashBalanceTotalRow(section) {
  if (!section) return null;
  return section.rows.find((r) =>
    r.type === 'total'
    && (r.label === CASH_BALANCE_TOTAL_LABEL || String(r.label ?? '').includes(CASH_BALANCE_TOTAL_LABEL)),
  ) ?? section.rows.find((r) => r.type === 'total' && r.accentTotal);
}

function getPriorPeriodEndCashBalance(refPlanData) {
  const section = refPlanData?.sections?.find((s) => s.id === CF_CASH_BALANCE_SECTION_ID);
  const totalRow = findCashBalanceTotalRow(section);
  return totalRow?.values?.合計 ?? 0;
}

function monthHasCashFlowActivity(inflowRow, outflowRow, month) {
  return (inflowRow?.values?.[month] ?? 0) !== 0
    || (outflowRow?.values?.[month] ?? 0) !== 0;
}

function shouldAdjustOpeningMonth({
  displayMode,
  firstMonth,
  pastMonthSet,
  inflowRow,
  outflowRow,
  cashTotalRow,
}) {
  if (displayMode === 'plan') return false;
  if (displayMode === 'budget-actual' && !pastMonthSet.has(firstMonth)) return false;
  if (monthHasCashFlowActivity(inflowRow, outflowRow, firstMonth)) return true;
  return (cashTotalRow?.values?.[firstMonth] ?? 0) !== 0;
}

/**
 * 期首月の入金実績を前期末現預金残高と整合させ補正する。
 * 現預金｛期首月｝−前期末現預金＋出金実績｛期首月｝。
 * 第2期以降で前期CSVがキャッシュにある場合のみ。
 */
export function enrichPlanDataWithCashFlowOpeningInflow(planData, {
  expandConfig,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
}) {
  const referencePeriod = fiscalPeriod - 1;
  if (referencePeriod < 1) return planData;

  const refPlanData = loadReferencePeriodPlanData(expandConfig, businessStartYear, referencePeriod);
  if (!refPlanData) return planData;

  const cfInSection = planData.sections.find((s) => s.id === CF_IN_SECTION_ID);
  const cfOutSection = planData.sections.find((s) => s.id === CF_OUT_SECTION_ID);
  const cashSection = planData.sections.find((s) => s.id === CF_CASH_BALANCE_SECTION_ID);
  if (!cfInSection || !cfOutSection || !cashSection) return planData;

  const inflowRow = cfInSection.rows.find((r) => r.id === CF_IN_ROW_ID);
  const outflowRow = cfOutSection.rows.find((r) => r.id === CF_OUT_ROW_ID);
  const cashTotalRow = findCashBalanceTotalRow(cashSection);
  if (!inflowRow || !outflowRow || !cashTotalRow) return planData;

  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const firstMonth = fiscalMonths[0];
  const pastMonthSet = displayMode === 'budget-actual'
    ? buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths)
    : displayMode === 'actual'
      ? new Set(FISCAL_MONTHS)
      : new Set();

  if (!shouldAdjustOpeningMonth({
    displayMode,
    firstMonth,
    pastMonthSet,
    inflowRow,
    outflowRow,
    cashTotalRow,
  })) {
    return planData;
  }

  const priorEnd = getPriorPeriodEndCashBalance(refPlanData);
  const currentBalance = cashTotalRow.values[firstMonth] ?? 0;
  const outflow = outflowRow.values[firstMonth] ?? 0;
  const journalInflow = inflowRow.values[firstMonth] ?? 0;
  const adjustedInflow = currentBalance - priorEnd + outflow;

  if (adjustedInflow === journalInflow) return planData;

  const months = { ...inflowRow.values };
  months[firstMonth] = adjustedInflow;

  const updatedInflowRow = {
    ...inflowRow,
    values: enrichRowValues(months, 'flow'),
    openingAdjustMonths: [firstMonth],
  };

  const sections = planData.sections.map((section) => {
    if (section.id !== CF_IN_SECTION_ID) return section;
    return {
      ...section,
      rows: section.rows.map((row) => (
        row.id === CF_IN_ROW_ID ? updatedInflowRow : row
      )),
    };
  });

  return { ...planData, sections };
}
