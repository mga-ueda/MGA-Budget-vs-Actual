import {
  FISCAL_MONTHS,
  EXTRA_COLUMNS,
  enrichRowValues,
} from '../parse/parseJournal.js';
import {
  buildPastFiscalMonthSet,
  buildMonthYearMap,
} from '../config/appSettings.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import {
  getPeriodClientEntries,
  computeClientMonthlyRevenue,
  clientHasManMonthPlan,
} from '../config/revenuePlanConfig.js';
import { visibilityRowKey, rowTypeLabel } from '../config/visibilityConfig.js';

const REV_NO_SUB_LABEL = '補助科目なし';
const REVENUE_SECTION_LABEL = '売上高';
const REVENUE_ACCOUNT_LABEL = '売上高';
const REV_MAN_MONTH_SUB_LABEL = '\u4eba\u6708';

function revEmptyRawMonthValues() {
  const values = {};
  for (const m of FISCAL_MONTHS) values[m] = 0;
  return values;
}

function revAddRawMonthValues(target, source) {
  for (const m of FISCAL_MONTHS) {
    target[m] += source[m] ?? 0;
  }
}

function revIsMissingCsvMonthValue(value) {
  return value === undefined || value === null || value === 0;
}

function revRawValuesFromRow(row) {
  const values = revEmptyRawMonthValues();
  revAddRawMonthValues(values, row.values);
  return values;
}

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

function revMergePlanIntoCsvRow(csvRow, planMonthValues, fiscalMonths, skipPlanFillMonths = null) {
  const months = revRawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    if (revIsMissingCsvMonthValue(months[m]) && (planMonthValues[m] ?? 0) !== 0) {
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

function revBuildTaxOptions(businessStartYear, fiscalPeriod, fiscalEndMonth, consumptionTaxRates) {
  if (!consumptionTaxRates) return null;
  return {
    consumptionTaxRates,
    monthYearMap: buildMonthYearMap(businessStartYear, fiscalPeriod),
    fiscalEndMonth,
  };
}

function revBuildClientPlanValues(client, fiscalMonths, taxOptions = null) {
  const values = revEmptyRawMonthValues();
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
  const values = revEmptyRawMonthValues();
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

function revRebuildRevenueRows(rows, clients, fiscalMonths, skipPlanFillMonths = null, taxOptions = null) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total' && r.type !== 'man-month');
  const planRows = revBuildClientPlanRows(clients, fiscalMonths, taxOptions);
  const matchedClientIds = new Set();

  const rebuiltBody = body.map((row) => {
    if (!revIsRevenueDetailRow(row)) return row;
    const client = clients.find((v) => revRowMatchesClient(row, v));
    if (!client) return row;
    matchedClientIds.add(client.id);
    const planMonths = revRawValuesFromRow({ values: revBuildClientPlanValues(client, fiscalMonths, taxOptions) });
    return revMergePlanIntoCsvRow(row, planMonths, fiscalMonths, skipPlanFillMonths);
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
  const total = revEmptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total') continue;
    if (row.type === 'plan') {
      revAddRawMonthValues(total, row.values);
    } else if (row.type === 'item' || row.type === 'group') {
      revAddRawMonthValues(total, row.values);
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
}) {
  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const revenueIdx = planData.sections.findIndex((s) => s.id === 'revenue');
  const taxOptions = revBuildTaxOptions(
    businessStartYear,
    fiscalPeriod,
    fiscalEndMonth,
    consumptionTaxRates,
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
  const skipPlanFillMonths = displayMode === 'budget-actual'
    ? buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths)
    : null;

  if (revenueIdx < 0) {
    if (planRows.length === 0) return planData;
    const rowsWithManMonths = revInsertManMonthRows(planRows, clients, fiscalMonths);
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
  );

  rows = revInsertManMonthRows(rows, clients, fiscalMonths);

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
  const section = planData?.sections?.find((s) => s.id === 'revenue');
  if (!section) return new Map();
  const result = new Map();
  for (const row of section.rows) {
    if (!revIsRevenueDetailRow(row)) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === REV_NO_SUB_LABEL) continue;
    const account = String(row.label ?? '').trim();
    if (!account || account !== REVENUE_ACCOUNT_LABEL) continue;
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

/** 予実データから売上高の補助科目一覧を抽出。 */
export function collectRevenueSubaccountsFromPlanData(planData) {
  const section = planData?.sections?.find((s) => s.id === 'revenue');
  if (!section) return [];
  const result = [];
  const seen = new Set();
  for (const row of section.rows) {
    if (!revIsRevenueDetailRow(row)) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === REV_NO_SUB_LABEL) continue;
    const account = String(row.label ?? '').trim();
    if (!account || account !== REVENUE_ACCOUNT_LABEL) continue;
    const key = `${account}\x00${sub}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ accountLabel: account, subLabel: sub });
  }
  return result;
}
