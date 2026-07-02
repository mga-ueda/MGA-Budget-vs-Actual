import {
  enrichRowValues,
} from '../parse/parseJournal.js';
import { buildBudgetActualMonthSets } from '../config/monthDisplayConfig.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import {
  MISC_INCOME_ACCOUNT,
  getMiscIncomeMonthly,
  miscIncomeHasPlanValues,
} from '../config/revenuePlanConfig.js';
import {
  emptyRawMonthValues,
  addRawMonthValues,
  isMissingCsvMonthValue,
  rawValuesFromRow,
} from './enrichUtils.js';

const MI_NON_OPERATING_SECTION_ID = 'nonOperating';
const NON_OPERATING_SECTION_LABEL = '営業外収益';
const NON_OPERATING_TOTAL_LABEL = '営業外収益合計';

function miMergePlanIntoCsvRow(
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

function miIsMiscIncomeAccount(label) {
  if (!label) return false;
  const normalized = String(label).normalize('NFKC');
  const canonical = MISC_INCOME_ACCOUNT.normalize('NFKC');
  if (normalized === canonical) return true;
  return normalized.charCodeAt(0) === 0x96d1 && normalized.endsWith('入');
}

function miIsMiscIncomePlanRow(row) {
  return row.type === 'plan' && row.id === 'misc-income-plan';
}

function miIsMiscIncomeDetailRow(row) {
  if (row.type === 'total' || row.type === 'breakdown') return false;
  if (miIsMiscIncomePlanRow(row)) return false;
  return miIsMiscIncomeAccount(row.label);
}

function miResolveMiscIncomeTargetRow(rows) {
  const matching = rows.filter(miIsMiscIncomeDetailRow);
  const leafRows = matching.filter((row) => row.type === 'item' || row.type === 'sub');
  if (leafRows.length === 1) return leafRows[0];
  const groupRow = matching.find((row) => row.type === 'group');
  if (leafRows.length > 1 && groupRow) return groupRow;
  const items = matching.filter((row) => row.type === 'item');
  if (items.length === 1) return items[0];
  return null;
}

function miBuildPlanRowValues(monthly, fiscalMonths) {
  const values = emptyRawMonthValues();
  for (const m of fiscalMonths) {
    const amount = monthly[m] ?? 0;
    if (amount !== 0) values[m] = amount;
  }
  return enrichRowValues(values, 'flow');
}

function miMakeMiscIncomePlanRow(monthly, fiscalMonths) {
  return {
    id: 'misc-income-plan',
    label: MISC_INCOME_ACCOUNT,
    subLabel: '',
    type: 'plan',
    values: miBuildPlanRowValues(monthly, fiscalMonths),
  };
}

function miSumNonOperatingSectionRows(rows) {
  const total = emptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total') continue;
    if (row.type === 'item' || row.type === 'group' || row.type === 'plan') {
      addRawMonthValues(total, row.values);
    }
  }
  return enrichRowValues(total, 'flow');
}

function miEnrichNonOperatingSection(section, monthly, fiscalMonths, skipPlanFillMonths, forcePlanMonths) {
  const baseRows = section.rows.filter((row) => !miIsMiscIncomePlanRow(row));
  const targetRow = miResolveMiscIncomeTargetRow(baseRows);
  let rows = baseRows;

  if (targetRow) {
    rows = baseRows.map((row) => {
      if (row.id !== targetRow.id) return row;
      return miMergePlanIntoCsvRow(
        row,
        monthly,
        fiscalMonths,
        skipPlanFillMonths,
        forcePlanMonths,
      );
    });
  } else {
    const planRow = miMakeMiscIncomePlanRow(monthly, fiscalMonths);
    const totalIdx = baseRows.findIndex((row) => row.type === 'total');
    if (totalIdx >= 0) {
      rows = [
        ...baseRows.slice(0, totalIdx),
        planRow,
        ...baseRows.slice(totalIdx),
      ];
    } else {
      rows = [...baseRows, planRow];
    }
  }

  const totalIdx = rows.findIndex((row) => row.type === 'total');
  if (totalIdx >= 0) {
    rows = rows.map((row, idx) => {
      if (idx !== totalIdx) return row;
      return {
        ...row,
        values: miSumNonOperatingSectionRows(rows),
      };
    });
  }

  return { ...section, rows };
}

function miCreateNonOperatingSection(monthly, fiscalMonths) {
  const planRow = miMakeMiscIncomePlanRow(monthly, fiscalMonths);
  return {
    id: MI_NON_OPERATING_SECTION_ID,
    label: NON_OPERATING_SECTION_LABEL,
    filter: 'income',
    rows: [
      planRow,
      {
        id: 'no-total',
        label: NON_OPERATING_TOTAL_LABEL,
        subLabel: '',
        type: 'total',
        values: planRow.values,
      },
    ],
  };
}

/** 営業外収益の雑収入行に受注設定の計画をマージする（今期・来期のみ）。 */
export function enrichPlanDataWithMiscIncomeRows(planData, {
  revenuePlans,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  monthDisplayConfig,
}) {
  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    return planData;
  }

  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const monthly = getMiscIncomeMonthly(revenuePlans ?? {}, fiscalPeriod, fiscalMonths);
  if (!miscIncomeHasPlanValues(monthly, fiscalMonths)) {
    return planData;
  }

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

  const sectionIdx = planData.sections.findIndex((s) => s.id === MI_NON_OPERATING_SECTION_ID);
  if (sectionIdx < 0) {
    const section = miCreateNonOperatingSection(monthly, fiscalMonths);
    return {
      ...planData,
      sections: [...planData.sections, section],
    };
  }

  const sections = planData.sections.map((section, idx) => {
    if (idx !== sectionIdx) return section;
    return miEnrichNonOperatingSection(
      section,
      monthly,
      fiscalMonths,
      skipPlanFillMonths,
      forcePlanMonths,
    );
  });

  return { ...planData, sections };
}
