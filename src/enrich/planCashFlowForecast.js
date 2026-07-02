import {
  enrichRowValues,
} from '../parse/parseJournal.js';
import {
  buildBudgetActualMonthSets,
  isMonthDisplayToggleTarget,
} from '../config/monthDisplayConfig.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { emptyRawMonthValues, loadReferencePeriodPlanData } from './enrichUtils.js';

const CFF_IN_SECTION_ID = 'cfIn';
const CFF_OUT_SECTION_ID = 'cfOut';
const CFF_CASH_BALANCE_SECTION_ID = 'cashBalance';
const CFF_CASH_BALANCE_TOTAL_LABEL = "現金及び預金合計";
const CFF_IN_ROW_ID = 'cf-in';
const CFF_OUT_ROW_ID = 'cf-out';
const CFF_DEPOSIT_CHANGE_ROW_ID = 'cash-deposit-change';

const CFF_INFLOW_SECTION_IDS = ['revenue', 'nonOperating'];
const CFF_OUTFLOW_SECTION_IDS = [
  'personnel',
  'expense',
  'outsourcing',
  'other',
  'tax',
  'nonOperatingExpense',
  'otherPay',
];

function cffFindCashBalanceTotalRow(section) {
  if (!section) return null;
  return section.rows.find((r) =>
    r.type === 'total'
    && (r.label === CFF_CASH_BALANCE_TOTAL_LABEL || String(r.label ?? '').includes(CFF_CASH_BALANCE_TOTAL_LABEL)),
  ) ?? section.rows.find((r) => r.type === 'total' && r.accentTotal);
}

function cffGetPriorPeriodEndCashBalance(refPlanData) {
  const section = refPlanData?.sections?.find((s) => s.id === CFF_CASH_BALANCE_SECTION_ID);
  const totalRow = cffFindCashBalanceTotalRow(section);
  return totalRow?.values?.["合計"] ?? 0;
}

function cffResolvePlanMonths(displayMode, monthDisplayConfig, businessStartYear, fiscalPeriod, fiscalMonths) {
  if (displayMode === 'actual') return null;
  if (displayMode === 'plan') {
    return new Set(fiscalMonths.filter((m) => isMonthDisplayToggleTarget(m)));
  }
  const { forcePlanMonths } = buildBudgetActualMonthSets({
    config: monthDisplayConfig,
    businessStartYear,
    fiscalPeriod,
    fiscalMonths,
  });
  return forcePlanMonths;
}

function cffGetSectionTotalMonthValue(sections, sectionId, month) {
  const section = sections.find((s) => s.id === sectionId);
  const totalRow = section?.rows?.find((r) => r.type === 'total');
  return totalRow?.values?.[month] ?? 0;
}

function cffSumSectionTotals(sections, sectionIds, month) {
  let sum = 0;
  for (const sectionId of sectionIds) {
    sum += cffGetSectionTotalMonthValue(sections, sectionId, month);
  }
  return sum;
}

function cffComputePlanInflow(sections, month) {
  return cffSumSectionTotals(sections, CFF_INFLOW_SECTION_IDS, month);
}

function cffComputePlanOutflow(sections, month) {
  return cffSumSectionTotals(sections, CFF_OUTFLOW_SECTION_IDS, month);
}

function cffMergePlanFillMonths(existingMonths, planMonths) {
  const merged = new Set(existingMonths ?? []);
  for (const month of planMonths) merged.add(month);
  return [...merged];
}

function cffInsertCashDepositChangeRow(rows, depositChangeRow) {
  const totalIdx = rows.findIndex((r) => r.type === 'total' && (
    r.label === CFF_CASH_BALANCE_TOTAL_LABEL
    || String(r.label ?? '').includes(CFF_CASH_BALANCE_TOTAL_LABEL)
    || r.accentTotal
  ));
  if (totalIdx < 0) return [...rows, depositChangeRow];
  const next = [...rows];
  next.splice(totalIdx, 0, depositChangeRow);
  return next;
}

/**
 * 計画月の入金・出金・現預金を見込みで補完し、預金増減行を追加する。
 */
export function enrichPlanDataWithCashFlowForecast(planData, {
  expandConfig,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  monthDisplayConfig,
}) {
  if (!planData?.sections?.length) return planData;
  if (displayMode === 'actual') return planData;

  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const planMonths = cffResolvePlanMonths(
    displayMode,
    monthDisplayConfig,
    businessStartYear,
    fiscalPeriod,
    fiscalMonths,
  );
  if (!planMonths?.size) return planData;

  const cfInSection = planData.sections.find((s) => s.id === CFF_IN_SECTION_ID);
  const cfOutSection = planData.sections.find((s) => s.id === CFF_OUT_SECTION_ID);
  const cashSection = planData.sections.find((s) => s.id === CFF_CASH_BALANCE_SECTION_ID);
  if (!cfInSection || !cfOutSection || !cashSection) return planData;

  const inflowRow = cfInSection.rows.find((r) => r.id === CFF_IN_ROW_ID);
  const outflowRow = cfOutSection.rows.find((r) => r.id === CFF_OUT_ROW_ID);
  const cashTotalRow = cffFindCashBalanceTotalRow(cashSection);
  if (!inflowRow || !outflowRow || !cashTotalRow) return planData;

  const refPlanData = fiscalPeriod > 1
    ? loadReferencePeriodPlanData(expandConfig, businessStartYear, fiscalPeriod - 1)
    : null;
  const priorPeriodEnd = cffGetPriorPeriodEndCashBalance(refPlanData);

  const inflowMonths = { ...inflowRow.values };
  const outflowMonths = { ...outflowRow.values };
  const balanceMonths = { ...cashTotalRow.values };
  const depositChangeMonths = emptyRawMonthValues();
  const inflowPlanFillMonths = [];
  const outflowPlanFillMonths = [];
  const balancePlanFillMonths = [];
  const depositChangePlanFillMonths = [];

  for (let i = 0; i < fiscalMonths.length; i += 1) {
    const month = fiscalMonths[i];
    if (month === "決算整理") continue;

    const prevBalance = i === 0
      ? priorPeriodEnd
      : (balanceMonths[fiscalMonths[i - 1]] ?? 0);

    if (planMonths.has(month)) {
      const inflow = cffComputePlanInflow(planData.sections, month);
      const outflow = cffComputePlanOutflow(planData.sections, month);
      const balance = prevBalance + inflow - outflow;

      inflowMonths[month] = inflow;
      outflowMonths[month] = outflow;
      balanceMonths[month] = balance;

      inflowPlanFillMonths.push(month);
      outflowPlanFillMonths.push(month);
      balancePlanFillMonths.push(month);
      depositChangePlanFillMonths.push(month);
    }

    depositChangeMonths[month] = (balanceMonths[month] ?? 0) - prevBalance;
  }

  const updatedInflowRow = {
    ...inflowRow,
    values: enrichRowValues(inflowMonths, 'flow'),
    planFillMonths: cffMergePlanFillMonths(inflowRow.planFillMonths, inflowPlanFillMonths),
  };
  const updatedOutflowRow = {
    ...outflowRow,
    values: enrichRowValues(outflowMonths, 'flow'),
    planFillMonths: cffMergePlanFillMonths(outflowRow.planFillMonths, outflowPlanFillMonths),
  };
  const updatedCashTotalRow = {
    ...cashTotalRow,
    values: enrichRowValues(balanceMonths, 'balance'),
    planFillMonths: cffMergePlanFillMonths(cashTotalRow.planFillMonths, balancePlanFillMonths),
  };
  const depositChangeRow = {
    id: CFF_DEPOSIT_CHANGE_ROW_ID,
    label: "預金増減",
    subLabel: '',
    type: 'item',
    values: enrichRowValues(depositChangeMonths, 'flow'),
    planFillMonths: depositChangePlanFillMonths,
    aggregateFormula: 'cashDepositChange',
  };

  const sections = planData.sections.map((section) => {
    if (section.id === CFF_IN_SECTION_ID) {
      return {
        ...section,
        rows: section.rows.map((row) => (
          row.id === CFF_IN_ROW_ID ? updatedInflowRow : row
        )),
      };
    }
    if (section.id === CFF_OUT_SECTION_ID) {
      return {
        ...section,
        rows: section.rows.map((row) => (
          row.id === CFF_OUT_ROW_ID ? updatedOutflowRow : row
        )),
      };
    }
    if (section.id === CFF_CASH_BALANCE_SECTION_ID) {
      const withoutDepositChange = section.rows.filter((row) => row.id !== CFF_DEPOSIT_CHANGE_ROW_ID);
      const rows = withoutDepositChange.map((row) => (
        row.id === cashTotalRow.id || (
          row.type === 'total'
          && (row.label === CFF_CASH_BALANCE_TOTAL_LABEL || row.accentTotal)
        )
          ? updatedCashTotalRow
          : row
      ));
      return {
        ...section,
        rows: cffInsertCashDepositChangeRow(rows, depositChangeRow),
      };
    }
    return section;
  });

  return { ...planData, sections };
}
