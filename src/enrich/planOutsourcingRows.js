import {
  FISCAL_MONTHS,
  EXTRA_COLUMNS,
  enrichRowValues,
} from '../parse/parseJournal.js';
import {
  buildPastFiscalMonthSet,
  buildMonthYearMap,
  parseCorpEntityMarkers,
  isCorporateSubLabel,
} from '../config/appSettings.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { getPeriodVendorEntries } from '../config/outsourcingPlanConfig.js';
import { getConsumptionTaxRatePercent } from '../config/consumptionTaxRateConfig.js';
import { calcWithholdingTax } from '../config/withholdingTaxRateConfig.js';
import { visibilityRowKey, rowTypeLabel } from '../config/visibilityConfig.js';

const OUT_NO_SUB_LABEL = '\u88dc\u52a9\u79d1\u76ee\u306a\u3057';
const OUTSOURCING_SECTION_LABEL = '\u5916\u6ce8\u8cbb';
const BREAKDOWN_LABELS = {
  remuneration: '\u5831\u916c\u91d1\u984d',
  consumptionTax: '\u6d88\u8cbb\u7a0e\u984d',
  withholdingTax: '\u6e90\u6cc9\u6240\u5f97\u7a0e\u984d',
  netReceived: '\u53d7\u3051\u53d6\u308b\u91d1\u984d',
};
const BREAKDOWN_DEFS = [
  { key: 'remuneration', label: BREAKDOWN_LABELS.remuneration },
  { key: 'consumptionTax', label: BREAKDOWN_LABELS.consumptionTax },
  { key: 'withholdingTax', label: BREAKDOWN_LABELS.withholdingTax },
  { key: 'netReceived', label: BREAKDOWN_LABELS.netReceived },
];

function outEmptyRawMonthValues() {
  const values = {};
  for (const m of FISCAL_MONTHS) values[m] = 0;
  return values;
}

function outAddRawMonthValues(target, source) {
  for (const m of FISCAL_MONTHS) {
    target[m] += source[m] ?? 0;
  }
}

function outIsMissingCsvMonthValue(value) {
  return value === undefined || value === null || value === 0;
}

function outRawValuesFromRow(row) {
  const values = outEmptyRawMonthValues();
  outAddRawMonthValues(values, row.values);
  return values;
}

function outIsOutsourcingDetailRow(row) {
  return row.type === 'item' || row.type === 'sub';
}

function outMakePlanRow(id, label, subLabel, values) {
  return {
    id,
    label,
    subLabel,
    type: 'plan',
    values,
  };
}

function outMergePlanIntoCsvRow(csvRow, planMonthValues, fiscalMonths, skipPlanFillMonths = null) {
  const months = outRawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    if (outIsMissingCsvMonthValue(months[m]) && (planMonthValues[m] ?? 0) !== 0) {
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

function outBuildVendorPlanValues(vendor, fiscalMonths) {
  const values = outEmptyRawMonthValues();
  for (const m of fiscalMonths) {
    const amount = vendor.monthly[m] ?? 0;
    if (amount !== 0) values[m] = amount;
  }
  return enrichRowValues(values, 'flow');
}

function outBuildVendorPlanRows(vendors, fiscalMonths) {
  const rows = [];
  for (const vendor of vendors) {
    const values = outBuildVendorPlanValues(vendor, fiscalMonths);
    if ((values[EXTRA_COLUMNS[0]] ?? 0) === 0) continue;
    rows.push(outMakePlanRow(
      `out-plan-${vendor.id}`,
      vendor.accountLabel,
      vendor.subLabel,
      values,
    ));
  }
  return rows;
}

function outRowMatchesVendor(row, vendor) {
  return row.label === vendor.accountLabel && row.subLabel === vendor.subLabel;
}

function outRebuildOutsourcingRows(rows, vendors, fiscalMonths, skipPlanFillMonths = null) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total');
  const planRows = outBuildVendorPlanRows(vendors, fiscalMonths);
  const matchedVendorIds = new Set();

  const rebuiltBody = body.map((row) => {
    if (!outIsOutsourcingDetailRow(row)) return row;
    const vendor = vendors.find((v) => outRowMatchesVendor(row, v));
    if (!vendor) return row;
    matchedVendorIds.add(vendor.id);
    const planMonths = outRawValuesFromRow({ values: outBuildVendorPlanValues(vendor, fiscalMonths) });
    return outMergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths);
  });

  const orphanPlanRows = planRows.filter((row) => {
    const vendor = vendors.find((v) => row.id === `out-plan-${v.id}`);
    return vendor && !matchedVendorIds.has(vendor.id);
  });

  const rebuilt = [...rebuiltBody, ...orphanPlanRows];
  if (totalRow) rebuilt.push(totalRow);
  return rebuilt;
}

function outSumNonPlanRows(rows) {
  const total = outEmptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'plan' || row.type === 'total' || row.type === 'breakdown') continue;
    outAddRawMonthValues(total, row.values);
  }
  return enrichRowValues(total, 'flow');
}

function outParseMonthLabelNumber(label) {
  const m = String(label).match(/^(\d{1,2})\u6708$/);
  return m ? parseInt(m[1], 10) : null;
}

function outGetCalendarYearMonth(monthLabel, monthYearMap, fiscalEndMonth) {
  const year = monthYearMap[monthLabel];
  if (year == null) return null;
  if (monthLabel === '\u6c7a\u7b97\u6574\u7406') {
    return { year, month: fiscalEndMonth };
  }
  const month = outParseMonthLabelNumber(monthLabel);
  if (month == null) return null;
  return { year, month };
}

function outCalcRemunerationFromTaxInclusiveTotal(totalYen, ratePercent) {
  const total = Math.max(0, Math.floor(Number(totalYen) || 0));
  if (total === 0) return 0;
  if (!ratePercent || ratePercent <= 0) return total;
  return Math.floor(total * 100 / (100 + ratePercent));
}

/** ÅžŽx•¥Šz‚©‚çŒÂlŽ–‹ÆŽåŒü‚¯ŠO’”ï“à–ó‚ðŽZo */
export function calcOutsourcingBreakdownForMonth(
  totalYen,
  calendarYear,
  calendarMonth,
  consumptionTaxRates,
  withholdingTaxRates,
) {
  const total = Math.max(0, Math.floor(Number(totalYen) || 0));
  if (total === 0) {
    return {
      remuneration: 0,
      consumptionTax: 0,
      withholdingTax: 0,
      netReceived: 0,
    };
  }

  const ratePercent = getConsumptionTaxRatePercent(
    calendarYear,
    calendarMonth,
    consumptionTaxRates,
  ) ?? 0;
  const remuneration = outCalcRemunerationFromTaxInclusiveTotal(total, ratePercent);
  const consumptionTax = total - remuneration;
  const withholdingTax = calcWithholdingTax(
    remuneration,
    calendarYear,
    calendarMonth,
    withholdingTaxRates,
  );
  const netReceived = total - withholdingTax;

  return { remuneration, consumptionTax, withholdingTax, netReceived };
}

function outBuildBreakdownMonthlyValues(
  parentRow,
  fiscalMonths,
  monthYearMap,
  fiscalEndMonth,
  consumptionTaxRates,
  withholdingTaxRates,
  field,
) {
  const values = outEmptyRawMonthValues();
  for (const m of fiscalMonths) {
    const total = parentRow.values[m] ?? 0;
    if (total === 0) continue;
    const ym = outGetCalendarYearMonth(m, monthYearMap, fiscalEndMonth);
    if (!ym) continue;
    const breakdown = calcOutsourcingBreakdownForMonth(
      total,
      ym.year,
      ym.month,
      consumptionTaxRates,
      withholdingTaxRates,
    );
    values[m] = breakdown[field];
  }
  return enrichRowValues(values, 'flow');
}

function outMakeBreakdownRow(parentRow, breakdownKey, subLabel, values) {
  return {
    id: `${parentRow.id}-bd-${breakdownKey}`,
    label: '',
    subLabel,
    type: 'breakdown',
    parentVendorRowId: parentRow.id,
    values,
  };
}

function outIsOutsourcingVendorRow(row) {
  if (row.type === 'breakdown' || row.type === 'total' || row.type === 'group') return false;
  if (row.type === 'item' || row.type === 'sub' || row.type === 'plan') {
    const sub = String(row.subLabel ?? '').trim();
    return Boolean(sub) && sub !== OUT_NO_SUB_LABEL;
  }
  return false;
}

function outVendorRowHasAmount(row, fiscalMonths) {
  return fiscalMonths.some((m) => (row.values[m] ?? 0) !== 0);
}

function outInsertIndividualBreakdownRows(rows, {
  fiscalMonths,
  monthYearMap,
  fiscalEndMonth,
  corpEntityMarkers,
  consumptionTaxRates,
  withholdingTaxRates,
}) {
  const markers = parseCorpEntityMarkers(corpEntityMarkers);
  const bodyWithoutBreakdown = rows.filter((r) => r.type !== 'breakdown');
  const result = [];

  for (const row of bodyWithoutBreakdown) {
    result.push(row);
    if (!outIsOutsourcingVendorRow(row)) continue;
    if (isCorporateSubLabel(row.subLabel, markers)) continue;
    if (!outVendorRowHasAmount(row, fiscalMonths)) continue;

    for (const def of BREAKDOWN_DEFS) {
      result.push(outMakeBreakdownRow(
        row,
        def.key,
        def.label,
        outBuildBreakdownMonthlyValues(
          row,
          fiscalMonths,
          monthYearMap,
          fiscalEndMonth,
          consumptionTaxRates,
          withholdingTaxRates,
          def.key,
        ),
      ));
    }
  }

  return result;
}

function outCollectBreakdownVisibilityCandidates(rows) {
  return rows.filter((row) => row.type === 'breakdown').map((row) => ({
    key: visibilityRowKey('outsourcing', row),
    sectionId: 'outsourcing',
    sectionLabel: OUTSOURCING_SECTION_LABEL,
    account: '',
    subLabel: row.subLabel || '',
    rowType: row.type,
    rowTypeLabel: rowTypeLabel(row.type),
  }));
}

function outCollectPlanVisibilityCandidates(planRows) {
  return planRows.map((row) => ({
    key: visibilityRowKey('outsourcing', row),
    sectionId: 'outsourcing',
    sectionLabel: OUTSOURCING_SECTION_LABEL,
    account: row.label,
    subLabel: row.subLabel || '',
    rowType: row.type,
    rowTypeLabel: rowTypeLabel(row.type),
  }));
}

/** Merge outsourcing payment plans into outsourcing section (plan / budget-actual modes). */
export function enrichPlanDataWithOutsourcingRows(planData, {
  outsourcingPlans,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  corpEntityMarkers,
  consumptionTaxRates,
  withholdingTaxRates,
}) {
  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const monthYearMap = buildMonthYearMap(businessStartYear, fiscalPeriod);
  const outsourcingIdx = planData.sections.findIndex((s) => s.id === 'outsourcing');

  const applyBreakdown = (rows) => outInsertIndividualBreakdownRows(rows, {
    fiscalMonths,
    monthYearMap,
    fiscalEndMonth,
    corpEntityMarkers,
    consumptionTaxRates,
    withholdingTaxRates,
  });

  const mergeVisibilityCandidates = (sections, ...extraLists) => ({
    ...planData,
    sections,
    visibilityCandidates: [
      ...(planData.visibilityCandidates ?? []),
      ...extraLists.flat(),
    ],
  });

  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    if (outsourcingIdx < 0) return planData;
    const outsourcing = planData.sections[outsourcingIdx];
    const rows = applyBreakdown(outsourcing.rows);
    const breakdownCandidates = outCollectBreakdownVisibilityCandidates(rows);
    const sections = planData.sections.map((section, idx) => (
      idx === outsourcingIdx ? { ...section, rows } : section
    ));
    return mergeVisibilityCandidates(sections, breakdownCandidates);
  }

  const vendors = getPeriodVendorEntries(outsourcingPlans ?? {}, fiscalPeriod, fiscalMonths);
  const planRows = outBuildVendorPlanRows(vendors, fiscalMonths);
  const canEnrich = planRows.length > 0 || outsourcingIdx >= 0;
  if (!canEnrich) {
    return planData;
  }

  const extraCandidates = outCollectPlanVisibilityCandidates(planRows);
  const skipPlanFillMonths = displayMode === 'budget-actual'
    ? buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths)
    : null;

  if (outsourcingIdx < 0) {
    if (planRows.length === 0) return planData;
    const rows = applyBreakdown(planRows);
    const breakdownCandidates = outCollectBreakdownVisibilityCandidates(rows);
    return {
      ...planData,
      sections: [...planData.sections, {
        id: 'outsourcing',
        label: OUTSOURCING_SECTION_LABEL,
        filter: 'outsourcing',
        rows,
      }],
      visibilityCandidates: [
        ...(planData.visibilityCandidates ?? []),
        ...extraCandidates,
        ...breakdownCandidates,
      ],
    };
  }

  const outsourcing = planData.sections[outsourcingIdx];
  let rows = outRebuildOutsourcingRows(
    outsourcing.rows,
    vendors,
    fiscalMonths,
    skipPlanFillMonths,
  );

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: outSumNonPlanRows(rows),
    };
  }

  rows = applyBreakdown(rows);
  const breakdownCandidates = outCollectBreakdownVisibilityCandidates(rows);

  const sections = planData.sections.map((section, idx) => {
    if (idx !== outsourcingIdx) return section;
    return { ...section, rows };
  });

  return {
    ...planData,
    sections,
    visibilityCandidates: [
      ...(planData.visibilityCandidates ?? []),
      ...extraCandidates,
      ...breakdownCandidates,
    ],
  };
}

/** ?\???\?f?[?^????O???????????????????o???? */
export function collectOutsourcingActualAmountsFromPlanData(planData, fiscalMonths) {
  const section = planData?.sections?.find((s) => s.id === 'outsourcing');
  if (!section) return new Map();
  const result = new Map();
  for (const row of section.rows) {
    if (!outIsOutsourcingDetailRow(row)) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === OUT_NO_SUB_LABEL) continue;
    const account = String(row.label ?? '').trim();
    if (!account) continue;
    const key = `${account}\x00${sub}`;
    const monthly = {};
    for (const m of fiscalMonths) {
      const val = row.values[m];
      if (val != null && val !== 0) monthly[m] = val;
    }
    result.set(key, monthly);
  }
  return result;
}

/** ?\???\?f?[?^????O????????????o???? */
export function collectOutsourcingSubaccountsFromPlanData(planData) {
  const section = planData?.sections?.find((s) => s.id === 'outsourcing');
  if (!section) return [];
  const result = [];
  const seen = new Set();
  for (const row of section.rows) {
    if (!outIsOutsourcingDetailRow(row)) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === OUT_NO_SUB_LABEL) continue;
    const account = String(row.label ?? '').trim();
    if (!account) continue;
    const key = `${account}\x00${sub}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ accountLabel: account, subLabel: sub });
  }
  return result;
}
