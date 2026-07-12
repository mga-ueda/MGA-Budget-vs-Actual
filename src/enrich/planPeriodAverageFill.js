import {
  enrichRowValues,
} from '../parse/parseJournal.js';
import { buildBudgetActualMonthSets } from '../config/monthDisplayConfig.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { canonicalExpenseAccount } from '../config/expenseAccountConfig.js';
import {
  buildExpenseOverrideMapForPeriod,
  resolveExpenseOverrideTargetRow,
} from '../config/expensePlanOverrideConfig.js';
import {
  emptyRawMonthValues,
  addRawMonthValues,
  isMissingCsvMonthValue,
  rawValuesFromRow,
  loadReferencePeriodPlanData,
} from './enrichUtils.js';

const INTEREST_ACCOUNT = '受取利息';
const NON_OPERATING_SECTION_ID = 'nonOperating';
const EXPENSE_SECTION_ID = 'expense';
const OTHER_SECTION_ID = 'other';
const AVERAGE_COLUMN = '平均';
const DEPRECIATION_ACCOUNT = '減価償却費';

function avgFillSumNonPlanRows(rows, { includePlanRows = false } = {}) {
  const total = emptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total' || row.type === 'breakdown' || row.type === 'sub') continue;
    if (row.type === 'plan' && !includePlanRows) continue;
    if (row.type === 'item' || row.type === 'group' || row.type === 'plan') {
      addRawMonthValues(total, row.values);
    }
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
  return label === DEPRECIATION_ACCOUNT
    || label.startsWith(DEPRECIATION_ACCOUNT)
    || label === '少額減価償却費'
    || label === '繰延資産償却'
    || label.startsWith('繰延資産償却');
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

function avgFillMergePlanIntoCsvRow(
  csvRow,
  planMonthValues,
  fiscalMonths,
  skipPlanFillMonths = null,
  forcePlanMonths = null,
) {
  const months = rawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    if (forcePlanMonths?.has(m)) {
      months[m] = planMonthValues[m] ?? 0;
      planFillMonths.push(m);
      continue;
    }
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

function mergeOverrideIntoCsvRow(
  csvRow,
  overrideMonthly,
  fiscalMonths,
  skipPlanFillMonths = null,
  forcePlanMonths = null,
) {
  const months = rawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    const overrideVal = overrideMonthly[m];
    if (overrideVal === null || overrideVal === undefined) continue;
    if (forcePlanMonths?.has(m)) {
      months[m] = overrideVal;
      planFillMonths.push(m);
      continue;
    }
    if (isMissingCsvMonthValue(months[m])) {
      months[m] = overrideVal;
      planFillMonths.push(m);
    }
  }
  return {
    ...csvRow,
    values: enrichRowValues(months, 'flow'),
    planFillMonths,
  };
}

function buildExpenseOverrideTargetIds(rows, expenseOverrideMap) {
  const ids = new Set();
  if (!expenseOverrideMap) return ids;
  for (const account of expenseOverrideMap.keys()) {
    const target = resolveExpenseOverrideTargetRow(rows, account);
    if (target) ids.add(target.id);
  }
  return ids;
}

function enrichSectionRowsWithAverageFill(
  section,
  refMap,
  fiscalMonths,
  rowFilter,
  skipPlanFillMonths = null,
  expenseOverrideMap = null,
  forcePlanMonths = null,
) {
  const overrideTargetIds = buildExpenseOverrideTargetIds(section.rows, expenseOverrideMap);

  const rows = section.rows.map((row) => {
    if (row.type === 'total' || row.type === 'plan') return row;
    if (rowFilter && !rowFilter(row)) return row;

    const account = canonicalExpenseAccount(row.label);
    const overrideMonthly = expenseOverrideMap?.get(account);
    if (overrideMonthly) {
      if (!overrideTargetIds.has(row.id)) return row;
      return mergeOverrideIntoCsvRow(row, overrideMonthly, fiscalMonths, skipPlanFillMonths, forcePlanMonths);
    }

    const refRow = refMap.get(rowKey(row));
    const planMonths = buildAveragePlanMonthValues(refRow, fiscalMonths);
    if (!planMonths) return row;
    return avgFillMergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths, forcePlanMonths);
  });

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: avgFillSumNonPlanRows(rows, {
        includePlanRows: section.id === OTHER_SECTION_ID,
      }),
    };
  }

  return { ...section, rows };
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
  expensePlanOverrides,
  monthDisplayConfig,
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
  let skipPlanFillMonths = null;
  let forcePlanMonths = null;
  if (displayMode === 'budget-actual') {
    ({ skipPlanFillMonths, forcePlanMonths } = buildBudgetActualMonthSets({
      config: monthDisplayConfig,
      businessStartYear,
      fiscalPeriod,
      fiscalMonths,
    }));
  }
  const expenseOverrideMap = buildExpenseOverrideMapForPeriod(
    expensePlanOverrides ?? {},
    fiscalPeriod,
    fiscalMonths,
  );
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
        null,
        forcePlanMonths,
      );
    }
    if (section.id === EXPENSE_SECTION_ID) {
      return enrichSectionRowsWithAverageFill(
        section,
        refExpenseMap,
        fiscalMonths,
        null,
        skipPlanFillMonths,
        expenseOverrideMap,
        forcePlanMonths,
      );
    }
    if (section.id === OTHER_SECTION_ID) {
      return enrichSectionRowsWithAverageFill(
        section,
        refOtherMap,
        fiscalMonths,
        isFillableOtherRow,
        skipPlanFillMonths,
        null,
        forcePlanMonths,
      );
    }
    return section;
  });

  return { ...planData, sections };
}
