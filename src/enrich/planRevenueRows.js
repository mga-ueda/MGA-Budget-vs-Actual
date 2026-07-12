import {
  EXTRA_COLUMNS,
  enrichRowValues,
} from '../parse/parseJournal.js';
import { buildBudgetActualMonthSets } from '../config/monthDisplayConfig.js';
import {
  buildMonthYearMap,
} from '../config/appSettings.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import {
  getPeriodClientEntries,
  computeClientMonthlyRevenue,
  clientHasManMonthPlan,
} from '../config/revenuePlanConfig.js';
import { visibilityRowKey, rowTypeLabel } from '../config/visibilityConfig.js';
import {
  emptyRawMonthValues,
  addRawMonthValues,
  isMissingCsvMonthValue,
  rawValuesFromRow,
  collectActualAmountsFromPlanData,
  collectSubaccountsFromPlanData,
} from './enrichUtils.js';

const REV_NO_SUB_LABEL = '補助科目なし';
const REVENUE_SECTION_LABEL = '売上高';
const REVENUE_ACCOUNT_LABEL = '売上高';
const REV_MAN_MONTH_SUB_LABEL = '人月';

function revIsRevenueDetailRow(row) {
  return row.type === 'item' || row.type === 'sub';
}

function revMakePlanRow(id, label, subLabel, values) {
  return {
    id,
    label,
    subLabel,
    type: 'plan',
    values,
  };
}

function revMergePlanIntoCsvRow(
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

function revBuildTaxOptions(
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  consumptionTaxRates,
  accountingTaxBasis,
) {
  if (!consumptionTaxRates) return null;
  return {
    consumptionTaxRates,
    accountingTaxBasis,
    monthYearMap: buildMonthYearMap(businessStartYear, fiscalPeriod),
    fiscalEndMonth,
  };
}

function revBuildClientPlanValues(client, fiscalMonths, taxOptions = null) {
  const values = emptyRawMonthValues();
  const monthly = computeClientMonthlyRevenue(client, fiscalMonths, taxOptions);
  for (const m of fiscalMonths) {
    const amount = monthly[m] ?? 0;
    if (amount !== 0) values[m] = amount;
  }
  return enrichRowValues(values, 'flow');
}

function revBuildClientPlanRows(clients, fiscalMonths, taxOptions = null) {
  const rows = [];
  for (const client of clients) {
    const values = revBuildClientPlanValues(client, fiscalMonths, taxOptions);
    if ((values[EXTRA_COLUMNS[0]] ?? 0) === 0) continue;
    rows.push(revMakePlanRow(
      `rev-plan-${client.id}`,
      client.accountLabel,
      client.subLabel,
      values,
    ));
  }
  return rows;
}

function revRowMatchesClient(row, client) {
  return row.label === client.accountLabel && row.subLabel === client.subLabel;
}

function revBuildManMonthRowValues(client, fiscalMonths) {
  const values = emptyRawMonthValues();
  for (const m of fiscalMonths) {
    const mm = client.manMonths[m];
    if (mm != null && mm !== 0) values[m] = mm;
  }
  return enrichRowValues(values, 'flow');
}

function revRowHasPlanData(row) {
  return row.type === 'plan' || (row.planFillMonths?.length ?? 0) > 0;
}

function revMakeManMonthRow(parentRow, client, fiscalMonths) {
  return {
    id: `${parentRow.id}-mm`,
    label: '',
    subLabel: REV_MAN_MONTH_SUB_LABEL,
    type: 'man-month',
    revenueClientId: client.id,
    parentRevenueRowId: parentRow.id,
    values: revBuildManMonthRowValues(client, fiscalMonths),
  };
}

function revInsertManMonthRows(rows, clients, fiscalMonths) {
  const result = [];
  for (const row of rows) {
    result.push(row);
    if (row.type === 'total' || row.type === 'man-month') continue;
    if (!revIsRevenueDetailRow(row) && row.type !== 'plan') continue;
    if (!revRowHasPlanData(row)) continue;
    const client = clients.find((v) => revRowMatchesClient(row, v));
    if (!client || !clientHasManMonthPlan(client, fiscalMonths)) continue;
    result.push(revMakeManMonthRow(row, client, fiscalMonths));
  }
  return result;
}

function revHasBudgetActualMonthFilter(skipPlanFillMonths, forcePlanMonths) {
  return (skipPlanFillMonths?.size ?? 0) > 0 || (forcePlanMonths?.size ?? 0) > 0;
}

/** 計画行・人月行: 実績表示月では計画値を非表示（予実モード）。 */
function revApplyBudgetActualMonthDisplayToPlanRow(
  row,
  fiscalMonths,
  skipPlanFillMonths,
  forcePlanMonths,
) {
  if (row.type !== 'plan' && row.type !== 'man-month') return row;
  if (!revHasBudgetActualMonthFilter(skipPlanFillMonths, forcePlanMonths)) return row;

  const months = rawValuesFromRow(row);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) {
      months[m] = 0;
      continue;
    }
    if (forcePlanMonths?.has(m) && (months[m] ?? 0) !== 0) {
      planFillMonths.push(m);
    }
  }
  return {
    ...row,
    values: enrichRowValues(months, 'flow'),
    planFillMonths,
  };
}

function revApplyBudgetActualMonthDisplayToRows(
  rows,
  fiscalMonths,
  skipPlanFillMonths,
  forcePlanMonths,
) {
  if (!revHasBudgetActualMonthFilter(skipPlanFillMonths, forcePlanMonths)) return rows;
  return rows.map((row) => revApplyBudgetActualMonthDisplayToPlanRow(
    row,
    fiscalMonths,
    skipPlanFillMonths,
    forcePlanMonths,
  ));
}

function revRebuildRevenueRows(
  rows,
  clients,
  fiscalMonths,
  skipPlanFillMonths = null,
  taxOptions = null,
  forcePlanMonths = null,
) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total' && r.type !== 'man-month');
  const planRows = revBuildClientPlanRows(clients, fiscalMonths, taxOptions);
  const matchedClientIds = new Set();

  const rebuiltBody = body.map((row) => {
    if (!revIsRevenueDetailRow(row)) return row;
    const client = clients.find((v) => revRowMatchesClient(row, v));
    if (!client) return row;
    matchedClientIds.add(client.id);
    const planMonths = rawValuesFromRow({ values: revBuildClientPlanValues(client, fiscalMonths, taxOptions) });
    return revMergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths, forcePlanMonths);
  });

  const orphanPlanRows = planRows.filter((row) => {
    const client = clients.find((v) => row.id === `rev-plan-${v.id}`);
    return client && !matchedClientIds.has(client.id);
  });

  const rebuilt = [...rebuiltBody, ...orphanPlanRows];
  if (totalRow) rebuilt.push(totalRow);
  return rebuilt;
}

function revSumRevenueSectionRows(rows) {
  const total = emptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total') continue;
    if (row.type === 'plan') {
      addRawMonthValues(total, row.values);
    } else if (row.type === 'item' || row.type === 'group') {
      addRawMonthValues(total, row.values);
    }
  }
  return enrichRowValues(total, 'flow');
}

function revCollectPlanVisibilityCandidates(planRows) {
  return planRows.map((row) => ({
    key: visibilityRowKey('revenue', row),
    sectionId: 'revenue',
    sectionLabel: REVENUE_SECTION_LABEL,
    account: row.label,
    subLabel: row.subLabel || '',
    rowType: row.type,
    rowTypeLabel: rowTypeLabel(row.type),
  }));
}

/** 売上高セクションに受注計画をマージする（予算・予実モード）。 */
export function enrichPlanDataWithRevenueRows(planData, {
  revenuePlans,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  consumptionTaxRates,
  accountingTaxBasis,
  monthDisplayConfig,
}) {
  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const revenueIdx = planData.sections.findIndex((s) => s.id === 'revenue');
  const taxOptions = revBuildTaxOptions(
    businessStartYear,
    fiscalPeriod,
    fiscalEndMonth,
    consumptionTaxRates,
    accountingTaxBasis,
  );

  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    return planData;
  }

  const clients = getPeriodClientEntries(revenuePlans ?? {}, fiscalPeriod, fiscalMonths);
  const planRows = revBuildClientPlanRows(clients, fiscalMonths, taxOptions);
  const canEnrich = planRows.length > 0 || revenueIdx >= 0;
  if (!canEnrich) {
    return planData;
  }

  const extraCandidates = revCollectPlanVisibilityCandidates(planRows);
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

  if (revenueIdx < 0) {
    if (planRows.length === 0) return planData;
    let rowsWithManMonths = revInsertManMonthRows(planRows, clients, fiscalMonths);
    rowsWithManMonths = revApplyBudgetActualMonthDisplayToRows(
      rowsWithManMonths,
      fiscalMonths,
      skipPlanFillMonths,
      forcePlanMonths,
    );
    return {
      ...planData,
      sections: [...planData.sections, {
        id: 'revenue',
        label: REVENUE_SECTION_LABEL,
        filter: 'income',
        rows: rowsWithManMonths,
      }],
      visibilityCandidates: [
        ...(planData.visibilityCandidates ?? []),
        ...extraCandidates,
      ],
    };
  }

  const revenue = planData.sections[revenueIdx];
  let rows = revRebuildRevenueRows(
    revenue.rows,
    clients,
    fiscalMonths,
    skipPlanFillMonths,
    taxOptions,
    forcePlanMonths,
  );

  rows = revInsertManMonthRows(rows, clients, fiscalMonths);
  rows = revApplyBudgetActualMonthDisplayToRows(
    rows,
    fiscalMonths,
    skipPlanFillMonths,
    forcePlanMonths,
  );

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: revSumRevenueSectionRows(rows),
    };
  }

  const sections = planData.sections.map((section, idx) => {
    if (idx !== revenueIdx) return section;
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

/** 予実データから売上実績の月別金額を受注先ごとに抽出。 */
export function collectRevenueActualAmountsFromPlanData(planData, fiscalMonths) {
  return collectActualAmountsFromPlanData(
    planData,
    fiscalMonths,
    'revenue',
    revIsRevenueDetailRow,
    REV_NO_SUB_LABEL,
    REVENUE_ACCOUNT_LABEL,
  );
}

/** 予実データから売上高の補助科目一覧を抽出。 */
export function collectRevenueSubaccountsFromPlanData(planData) {
  return collectSubaccountsFromPlanData(
    planData,
    'revenue',
    revIsRevenueDetailRow,
    REV_NO_SUB_LABEL,
    REVENUE_ACCOUNT_LABEL,
  );
}
