import {
  FISCAL_MONTHS,
  enrichRowValues,
} from '../parse/parseJournal.js';
import { buildPastFiscalMonthSet } from '../config/appSettings.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { planDataFromCache } from '../csv/csvLoader.js';

const INTEREST_ACCOUNT = '\u53d7\u53d6\u5229\u606f';
const NON_OPERATING_SECTION_ID = 'nonOperating';
const EXPENSE_SECTION_ID = 'expense';
const OTHER_SECTION_ID = 'other';
const AVERAGE_COLUMN = '\u5e73\u5747';
const DEPRECIATION_ACCOUNT = '\u6e1b\u4fa1\u511f\u5374\u8cbb';

function emptyRawMonthValues() {
  const values = {};
  for (const m of FISCAL_MONTHS) values[m] = 0;
  return values;
}

function addRawMonthValues(target, source) {
  for (const m of FISCAL_MONTHS) {
    target[m] += source[m] ?? 0;
  }
}

function isMissingCsvMonthValue(value) {
  return value === undefined || value === null || value === 0;
}

function rawValuesFromRow(row) {
  const values = emptyRawMonthValues();
  addRawMonthValues(values, row.values);
  return values;
}

function sumNonPlanRows(rows) {
  const total = emptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'plan' || row.type === 'total') continue;
    addRawMonthValues(total, row.values);
  }
  return enrichRowValues(total, 'flow');
}

function rowKey(row) {
  return `${row.label}\0${row.subLabel ?? ''}`;
}

function isInterestRow(row) {
  return row.label === INTEREST_ACCOUNT;
}

function isDepreciationRow(row) {
  const label = row.label ?? '';
  return label === DEPRECIATION_ACCOUNT || label.startsWith(DEPRECIATION_ACCOUNT);
}

function isFillableOtherRow(row) {
  return !isDepreciationRow(row);
}

function buildReferenceRowMap(section) {
  const map = new Map();
  if (!section) return map;
  for (const row of section.rows) {
    if (row.type === 'total' || row.type === 'plan') continue;
    const key = rowKey(row);
    if (!map.has(key)) map.set(key, row);
  }
  return map;
}

function buildAveragePlanMonthValues(referenceRow, fiscalMonths) {
  const avg = referenceRow?.values?.[AVERAGE_COLUMN] ?? 0;
  if (!avg) return null;
  const months = emptyRawMonthValues();
  for (const m of fiscalMonths) {
    months[m] = avg;
  }
  return months;
}

function mergePlanIntoCsvRow(csvRow, planMonthValues, fiscalMonths, skipPlanFillMonths = null) {
  const months = rawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    if (isMissingCsvMonthValue(months[m]) && (planMonthValues[m] ?? 0) !== 0) {
      months[m] = planMonthValues[m];
      planFillMonths.push(m);
    }
  }
  return {
    ...csvRow,
    values: enrichRowValues(months, 'flow'),
    planFillMonths,
  };
}

function enrichSectionRowsWithAverageFill(
  section,
  refMap,
  fiscalMonths,
  rowFilter,
  skipPlanFillMonths = null,
) {
  const rows = section.rows.map((row) => {
    if (row.type === 'total' || row.type === 'plan') return row;
    if (rowFilter && !rowFilter(row)) return row;
    const refRow = refMap.get(rowKey(row));
    const planMonths = buildAveragePlanMonthValues(refRow, fiscalMonths);
    if (!planMonths) return row;
    return mergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths);
  });

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: sumNonPlanRows(rows),
    };
  }

  return { ...section, rows };
}

function loadReferencePeriodPlanData(expandConfig, businessStartYear, fiscalPeriod) {
  if (fiscalPeriod < 1) return null;
  const cached = planDataFromCache(expandConfig, {
    businessStartYear,
    fiscalPeriod,
  });
  return cached?.data ?? null;
}

/**
 * 受取利息・諸経費・その他（減価償却費を除く）: 欠損月を参照期の「平均」列の金額で補完する。
 * 当期（予実）→ 前期、来期（計画）→ 当期。
 * 予実表示モードでは過去月の空欄は補完しない。
 * 減価償却費は予測対象外（例外）。
 */
export function enrichPlanDataWithPeriodAverageFills(planData, {
  expandConfig,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
}) {
  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    return planData;
  }

  const referencePeriod = fiscalPeriod - 1;
  if (referencePeriod < 1) return planData;

  const refPlanData = loadReferencePeriodPlanData(
    expandConfig,
    businessStartYear,
    referencePeriod,
  );
  if (!refPlanData) return planData;

  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const skipPlanFillMonths = displayMode === 'budget-actual'
    ? buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths)
    : null;
  const refNonOperating = refPlanData.sections.find((s) => s.id === NON_OPERATING_SECTION_ID);
  const refExpense = refPlanData.sections.find((s) => s.id === EXPENSE_SECTION_ID);
  const refOther = refPlanData.sections.find((s) => s.id === OTHER_SECTION_ID);
  const refInterestMap = buildReferenceRowMap(refNonOperating);
  const refExpenseMap = buildReferenceRowMap(refExpense);
  const refOtherMap = buildReferenceRowMap(refOther);

  const sections = planData.sections.map((section) => {
    if (section.id === NON_OPERATING_SECTION_ID) {
      return enrichSectionRowsWithAverageFill(
        section,
        refInterestMap,
        fiscalMonths,
        isInterestRow,
        skipPlanFillMonths,
      );
    }
    if (section.id === EXPENSE_SECTION_ID) {
      return enrichSectionRowsWithAverageFill(
        section,
        refExpenseMap,
        fiscalMonths,
        null,
        skipPlanFillMonths,
      );
    }
    if (section.id === OTHER_SECTION_ID) {
      return enrichSectionRowsWithAverageFill(
        section,
        refOtherMap,
        fiscalMonths,
        isFillableOtherRow,
        skipPlanFillMonths,
      );
    }
    return section;
  });

  return { ...planData, sections };
}
