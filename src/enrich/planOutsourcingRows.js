import {
  EXTRA_COLUMNS,
  enrichRowValues,
} from '../parse/parseJournal.js';
import { buildBudgetActualMonthSets } from '../config/monthDisplayConfig.js';
import {
  buildMonthYearMap,
  parseCorpEntityMarkers,
  isCorporateSubLabel,
  isPlanOnlyPeriod,
} from '../config/appSettings.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import { getPeriodVendorEntries } from '../config/outsourcingPlanConfig.js';
import {
  getConsumptionTaxRatePercent,
  isAccountingTaxExclusive,
} from '../config/consumptionTaxRateConfig.js';
import { calcWithholdingTax } from '../config/withholdingTaxRateConfig.js';
import { visibilityRowKey, rowTypeLabel } from '../config/visibilityConfig.js';
import {
  emptyRawMonthValues,
  addRawMonthValues,
  isMissingCsvMonthValue,
  rawValuesFromRow,
  collectActualAmountsFromPlanData,
  collectSubaccountsFromPlanData,
} from './enrichUtils.js';

const OUT_NO_SUB_LABEL = '補助科目なし';
const OUTSOURCING_SECTION_LABEL = '外注費';
const BREAKDOWN_LABELS = {
  remuneration: '報酬金額',
  consumptionTax: '消費税額',
  withholdingTax: '源泉所得税額',
  netReceived: '受け取る金額',
};
const BREAKDOWN_DEFS = [
  { key: 'remuneration', label: BREAKDOWN_LABELS.remuneration },
  { key: 'consumptionTax', label: BREAKDOWN_LABELS.consumptionTax },
  { key: 'withholdingTax', label: BREAKDOWN_LABELS.withholdingTax },
  { key: 'netReceived', label: BREAKDOWN_LABELS.netReceived },
];

function outIsOutsourcingDetailRow(row) {
  return row.type === 'item' || row.type === 'sub';
}

function outMakePlanRow(id, label, subLabel, values, vendorId) {
  return {
    id,
    label,
    subLabel,
    type: 'plan',
    values,
    outsourcingVendorId: vendorId,
  };
}

function outMergePlanIntoCsvRow(
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

function outBuildVendorPlanValues(vendor, fiscalMonths) {
  const values = emptyRawMonthValues();
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
      vendor.id,
    ));
  }
  return rows;
}

function outRowMatchesVendor(row, vendor) {
  return row.label === vendor.accountLabel && row.subLabel === vendor.subLabel;
}

function outRebuildOutsourcingRows(
  rows,
  vendors,
  fiscalMonths,
  skipPlanFillMonths = null,
  forcePlanMonths = null,
  dropUnmatchedCsvDetail = false,
) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total');
  const planRows = outBuildVendorPlanRows(vendors, fiscalMonths);
  const matchedVendorIds = new Set();

  const rebuiltBody = body.map((row) => {
    if (!outIsOutsourcingDetailRow(row)) return row;
    const vendor = vendors.find((v) => outRowMatchesVendor(row, v));
    if (!vendor) return row;
    matchedVendorIds.add(vendor.id);
    const planMonths = rawValuesFromRow({ values: outBuildVendorPlanValues(vendor, fiscalMonths) });
    return {
      ...outMergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths, forcePlanMonths),
      outsourcingVendorId: vendor.id,
    };
  }).filter((row) => {
    // 来期など計画専用期は、今期CSV由来の仕訳補助科目を残さない（計画にある発注先のみ）
    if (!dropUnmatchedCsvDetail) return true;
    if (!outIsOutsourcingDetailRow(row)) return true;
    return vendors.some((v) => outRowMatchesVendor(row, v));
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
  const total = emptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total' || row.type === 'breakdown' || row.type === 'sub') continue;
    if (row.type === 'item' || row.type === 'group' || row.type === 'plan') {
      addRawMonthValues(total, row.values);
    }
  }
  return enrichRowValues(total, 'flow');
}

function outParseMonthLabelNumber(label) {
  const m = String(label).match(/^(\d{1,2})月$/);
  return m ? parseInt(m[1], 10) : null;
}

function outGetCalendarYearMonth(monthLabel, monthYearMap, fiscalEndMonth) {
  const year = monthYearMap[monthLabel];
  if (year == null) return null;
  if (monthLabel === '決算整理') {
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

/** 支払額から個人事業主向け源泉内訳を算出（税込／税抜に対応） */
export function calcOutsourcingBreakdownForMonth(
  totalYen,
  calendarYear,
  calendarMonth,
  consumptionTaxRates,
  withholdingTaxRates,
  accountingTaxBasis,
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

  let remuneration;
  let consumptionTax;
  let paymentGross;
  if (isAccountingTaxExclusive(accountingTaxBasis)) {
    // 税抜: 本体額＝報酬、消費税は別計算（源泉対象は報酬のみ）
    remuneration = total;
    consumptionTax = ratePercent > 0
      ? Math.round(total * ratePercent / 100)
      : 0;
    paymentGross = total + consumptionTax;
  } else {
    remuneration = outCalcRemunerationFromTaxInclusiveTotal(total, ratePercent);
    consumptionTax = total - remuneration;
    paymentGross = total;
  }

  const withholdingTax = calcWithholdingTax(
    remuneration,
    calendarYear,
    calendarMonth,
    withholdingTaxRates,
  );
  const netReceived = paymentGross - withholdingTax;

  return { remuneration, consumptionTax, withholdingTax, netReceived };
}

function outBuildBreakdownMonthlyValues(
  parentRow,
  fiscalMonths,
  monthYearMap,
  fiscalEndMonth,
  consumptionTaxRates,
  withholdingTaxRates,
  accountingTaxBasis,
  field,
) {
  const values = emptyRawMonthValues();
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
      accountingTaxBasis,
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
  accountingTaxBasis,
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
          accountingTaxBasis,
          def.key,
        ),
      ));
    }
  }

  return result;
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

/** 外注費セクションに支払計画をマージする（予算・予実モード） */
export function enrichPlanDataWithOutsourcingRows(planData, {
  outsourcingPlans,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  corpEntityMarkers,
  consumptionTaxRates,
  withholdingTaxRates,
  accountingTaxBasis,
  monthDisplayConfig,
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
    accountingTaxBasis,
  });

  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    if (outsourcingIdx < 0) return planData;
    const outsourcing = planData.sections[outsourcingIdx];
    const rows = applyBreakdown(outsourcing.rows);
    const sections = planData.sections.map((section, idx) => (
      idx === outsourcingIdx ? { ...section, rows } : section
    ));
    return { ...planData, sections };
  }

  const vendors = getPeriodVendorEntries(outsourcingPlans ?? {}, fiscalPeriod, fiscalMonths);
  const planRows = outBuildVendorPlanRows(vendors, fiscalMonths);
  const canEnrich = planRows.length > 0 || outsourcingIdx >= 0;
  if (!canEnrich) {
    return planData;
  }

  const extraCandidates = outCollectPlanVisibilityCandidates(planRows);
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

  if (outsourcingIdx < 0) {
    if (planRows.length === 0) return planData;
    const rows = applyBreakdown(planRows);
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
      ],
    };
  }

  const dropUnmatchedCsvDetail = isPlanOnlyPeriod(
    businessStartYear,
    fiscalPeriod,
    undefined,
    fiscalEndMonth,
  );
  const outsourcing = planData.sections[outsourcingIdx];
  let rows = outRebuildOutsourcingRows(
    outsourcing.rows,
    vendors,
    fiscalMonths,
    skipPlanFillMonths,
    forcePlanMonths,
    dropUnmatchedCsvDetail,
  );

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: outSumNonPlanRows(rows),
    };
  }

  rows = applyBreakdown(rows);

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
    ],
  };
}

/** 予実データから外注実績の月別金額を取引先ごとに抽出 */
export function collectOutsourcingActualAmountsFromPlanData(planData, fiscalMonths) {
  return collectActualAmountsFromPlanData(
    planData,
    fiscalMonths,
    'outsourcing',
    outIsOutsourcingDetailRow,
    OUT_NO_SUB_LABEL,
  );
}

/** 予実データから外注の補助科目一覧を抽出 */
export function collectOutsourcingSubaccountsFromPlanData(planData) {
  return collectSubaccountsFromPlanData(
    planData,
    'outsourcing',
    outIsOutsourcingDetailRow,
    OUT_NO_SUB_LABEL,
  );
}
