import {
  FISCAL_MONTHS,
  EXTRA_COLUMNS,
  enrichRowValues,
  APP_AGGREGATE_LABEL_PREFIX,
} from '../parse/parseJournal.js';
import { buildPastFiscalMonthSet } from '../config/appSettings.js';
import { DEFAULT_SECTION_COLORS } from '../config/sectionColorConfig.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { getTaxPaymentPlan } from '../config/taxPaymentConfig.js';
import { visibilityRowKey, rowTypeLabel } from '../config/visibilityConfig.js';

const TAX_PAY_ACCOUNT = '租税公課';
const TAX_PAY_OTHER_SECTION_LABEL = 'その他';
const TAX_PAY_OTHER_TOTAL_LABEL = 'その他合計';
const NO_SUB_LABEL = '補助科目なし';

function taxPayEmptyRawMonthValues() {
  const values = {};
  for (const m of FISCAL_MONTHS) values[m] = 0;
  return values;
}

function taxPayAddRawMonthValues(target, source) {
  for (const m of FISCAL_MONTHS) {
    target[m] += source[m] ?? 0;
  }
}

function taxPayIsMissingCsvMonthValue(value) {
  return value === undefined || value === null || value === 0;
}

function taxPayIsTaxPublicChargeRow(row) {
  return (row.label ?? '') === TAX_PAY_ACCOUNT;
}

function taxPayPartitionTaxPublicChargeRows(rows) {
  const taxPublicChargeCsv = [];
  const otherRest = [];
  for (const row of rows) {
    if (taxPayIsTaxPublicChargeRow(row)) taxPublicChargeCsv.push(row);
    else otherRest.push(row);
  }
  return { taxPublicChargeCsv, otherRest };
}

function taxPayRawValuesFromRow(row) {
  const values = taxPayEmptyRawMonthValues();
  taxPayAddRawMonthValues(values, row.values);
  return values;
}

function taxPayMergePlanIntoCsvRow(csvRow, planMonthValues, fiscalMonths, skipPlanFillMonths = null) {
  const months = taxPayRawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    if (taxPayIsMissingCsvMonthValue(months[m]) && (planMonthValues[m] ?? 0) !== 0) {
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

function taxPayMergePlanIntoPrimaryCsvRow(
  csvRows,
  planTotal,
  fiscalMonths,
  skipPlanFillMonths = null,
) {
  if (csvRows.length === 0 || !planTotal) return csvRows;
  const planMonths = taxPayRawValuesFromRow({ values: planTotal });
  const primaryIdx = csvRows.findIndex(
    (row) => !row.subLabel || row.subLabel === NO_SUB_LABEL,
  );
  const targetIdx = primaryIdx >= 0 ? primaryIdx : 0;
  return csvRows.map((row, index) => {
    if (index !== targetIdx) return row;
    return taxPayMergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths);
  });
}

function taxPayMakePlanRow(id, label, subLabel, values) {
  return {
    id,
    label,
    subLabel,
    type: 'plan',
    values,
  };
}

function taxPaySumNonPlanRows(rows) {
  const total = taxPayEmptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'plan' || row.type === 'total') continue;
    taxPayAddRawMonthValues(total, row.values);
  }
  return enrichRowValues(total, 'flow');
}

function taxPayBuildTaxPaymentPlanTotal(taxPaymentPlans, fiscalPeriod, fiscalMonths) {
  const plan = getTaxPaymentPlan(taxPaymentPlans ?? {}, fiscalPeriod, fiscalMonths);
  const values = taxPayEmptyRawMonthValues();
  for (const m of fiscalMonths) {
    const amount = plan[m] ?? 0;
    if (amount !== 0) values[m] = amount;
  }
  const enriched = enrichRowValues(values, 'flow');
  if ((enriched[EXTRA_COLUMNS[0]] ?? 0) === 0) return null;
  return enriched;
}

function taxPayBuildTaxPaymentPlanRow(planTotal) {
  if (!planTotal) return null;
  return taxPayMakePlanRow(
    'tax-pay-plan',
    TAX_PAY_ACCOUNT,
    '',
    planTotal,
  );
}

function taxPayRebuildOtherRows(rows, taxPaymentPlanTotal, fiscalMonths, skipPlanFillMonths = null) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total');
  const { taxPublicChargeCsv, otherRest } = taxPayPartitionTaxPublicChargeRows(body);
  const taxPublicChargeCsvMerged = taxPayMergePlanIntoPrimaryCsvRow(
    taxPublicChargeCsv,
    taxPaymentPlanTotal,
    fiscalMonths,
    skipPlanFillMonths,
  );
  const taxPaymentPlanRow = taxPublicChargeCsv.length === 0
    ? taxPayBuildTaxPaymentPlanRow(taxPaymentPlanTotal)
    : null;

  const rebuilt = [
    ...taxPublicChargeCsvMerged,
    ...(taxPaymentPlanRow ? [taxPaymentPlanRow] : []),
    ...otherRest,
  ];
  if (totalRow) rebuilt.push(totalRow);
  return rebuilt;
}

function taxPayCreateOtherSection(rows) {
  const colors = DEFAULT_SECTION_COLORS.other ?? {
    color: '#375623',
    barColor: '#375623',
    textColor: '#ffffff',
  };
  const totalValues = taxPaySumNonPlanRows(rows);
  const totalRow = {
    id: 'oth-total',
    label: `${APP_AGGREGATE_LABEL_PREFIX}${TAX_PAY_OTHER_TOTAL_LABEL}`,
    subLabel: '',
    type: 'total',
    values: totalValues,
    aggregateFormula: 'sectionSumExcludePlan',
  };
  return {
    id: 'other',
    label: TAX_PAY_OTHER_SECTION_LABEL,
    filter: 'other',
    color: colors.color,
    barColor: colors.barColor,
    textColor: colors.textColor,
    rows: [...rows, totalRow],
  };
}

function taxPayCollectPlanVisibilityCandidates(planRow) {
  if (!planRow) return [];
  return [{
    key: visibilityRowKey('other', planRow),
    sectionId: 'other',
    sectionLabel: TAX_PAY_OTHER_SECTION_LABEL,
    account: planRow.label,
    subLabel: planRow.subLabel || '',
    rowType: planRow.type,
    rowTypeLabel: rowTypeLabel(planRow.type),
  }];
}

/** 税金・公租公課の支払計画をその他セクションにマージ（予算・予実モード）。 */
export function enrichPlanDataWithTaxPaymentRows(planData, {
  taxPaymentPlans,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
}) {
  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    return planData;
  }

  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const taxPaymentPlanTotal = taxPayBuildTaxPaymentPlanTotal(
    taxPaymentPlans,
    fiscalPeriod,
    fiscalMonths,
  );
  const taxPaymentPlanRow = taxPayBuildTaxPaymentPlanRow(taxPaymentPlanTotal);
  const otherIdx = planData.sections.findIndex((s) => s.id === 'other');
  const canEnrich = taxPaymentPlanTotal || otherIdx >= 0;
  if (!canEnrich) {
    return planData;
  }

  const extraCandidates = taxPayCollectPlanVisibilityCandidates(taxPaymentPlanRow);
  const skipPlanFillMonths = displayMode === 'budget-actual'
    ? buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths)
    : null;

  if (otherIdx < 0) {
    const planRows = taxPaymentPlanRow ? [taxPaymentPlanRow] : [];
    if (planRows.length === 0) return planData;
    const section = taxPayCreateOtherSection(planRows);
    return {
      ...planData,
      sections: [...planData.sections, section],
      visibilityCandidates: [
        ...(planData.visibilityCandidates ?? []),
        ...extraCandidates,
      ],
    };
  }

  const other = planData.sections[otherIdx];
  const rows = taxPayRebuildOtherRows(
    other.rows,
    taxPaymentPlanTotal,
    fiscalMonths,
    skipPlanFillMonths,
  );

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: taxPaySumNonPlanRows(rows),
      aggregateFormula: 'sectionSumExcludePlan',
    };
  }

  const sections = planData.sections.map((section, idx) => {
    if (idx !== otherIdx) return section;
    return { ...section, rows };
  });

  return {
    ...planData,
    sections,
    visibilityCandidates: [
      ...(planData.visibilityCandidates ?? []),
      ...extraCandidates,
    ],
  };
}
