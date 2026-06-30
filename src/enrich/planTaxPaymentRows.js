import {
  FISCAL_MONTHS,
  EXTRA_COLUMNS,
  enrichRowValues,
  APP_AGGREGATE_LABEL_PREFIX,
} from '../parse/parseJournal.js';
import { buildPastFiscalMonthSet } from '../config/appSettings.js';
import { DEFAULT_SECTION_COLORS } from '../config/sectionColorConfig.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import {
  getPaymentPlansForPeriod,
  getResidentTaxMunicipalityEntries,
  sumResidentTaxMunicipalityMonthly,
  filterVisibleResidentTaxMunicipalities,
  PAYMENT_PLAN_ACCOUNTS,
  PAYMENT_PLAN_SIMPLE_ACCOUNTS,
  PAYMENT_PLAN_OTHER_SECTION_ACCOUNTS,
  PAYMENT_PLAN_TAX_SECTION_ACCOUNTS,
  PAYMENT_PLAN_OTHER_PAY_ACCOUNTS,
  PAYMENT_PLAN_OTHER_PAY_SIMPLE_ACCOUNTS,
  RESIDENT_TAX_ACCOUNT,
  CORPORATE_TAX_ACCOUNT,
} from '../config/taxPaymentConfig.js';
import { visibilityRowKey, rowTypeLabel } from '../config/visibilityConfig.js';

const TAX_PAY_OTHER_SECTION_LABEL = 'その他';
const TAX_PAY_OTHER_TOTAL_LABEL = 'その他合計';
const TAX_PAY_OTHER_PAY_SECTION_LABEL = 'その他支払';
const TAX_PAY_OTHER_PAY_TOTAL_LABEL = 'その他支払合計';
const TAX_PAY_TAX_SECTION_LABEL = '法人税';
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

function taxPayIsAccountRow(row, account) {
  return (row.label ?? '') === account;
}

function taxPayPartitionAccountRows(rows, accounts) {
  const accountSet = new Set(accounts);
  const matched = [];
  const otherRest = [];
  for (const row of rows) {
    if (accountSet.has(row.label ?? '')) matched.push(row);
    else otherRest.push(row);
  }
  return { matched, otherRest };
}

function taxPayRawValuesFromRow(row) {
  const values = taxPayEmptyRawMonthValues();
  taxPayAddRawMonthValues(values, row.values);
  return values;
}

function taxPayIsActualSourceRow(row) {
  return row.type === 'item' || row.type === 'sub';
}

function taxPayMergePlanIntoCsvRow(
  csvRow,
  planMonthValues,
  actualMonthly,
  fiscalMonths,
  pastMonths,
) {
  const months = taxPayRawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (pastMonths.has(m)) {
      if (taxPayIsMissingCsvMonthValue(months[m])) {
        months[m] = actualMonthly[m] ?? 0;
      }
      continue;
    }
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
  planMonthValues,
  actualMonthly,
  fiscalMonths,
  pastMonths,
) {
  if (csvRows.length === 0) return csvRows;
  const primaryIdx = csvRows.findIndex(
    (row) => !row.subLabel || row.subLabel === NO_SUB_LABEL,
  );
  const targetIdx = primaryIdx >= 0 ? primaryIdx : 0;
  return csvRows.map((row, index) => {
    if (index !== targetIdx) return row;
    return taxPayMergePlanIntoCsvRow(
      row,
      planMonthValues,
      actualMonthly,
      fiscalMonths,
      pastMonths,
    );
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
    if (row.type === 'total' || row.type === 'breakdown' || row.type === 'sub') continue;
    if (row.type === 'item' || row.type === 'group' || row.type === 'plan') {
      taxPayAddRawMonthValues(total, row.values);
    }
  }
  return enrichRowValues(total, 'flow');
}

function taxPayBuildResidentTaxPlanTotal(monthlyPlan, fiscalMonths) {
  const values = taxPayEmptyRawMonthValues();
  let hasValue = false;
  for (const m of fiscalMonths) {
    const amount = monthlyPlan[m] ?? 0;
    if (amount !== 0) {
      values[m] = amount;
      hasValue = true;
    }
  }
  if (!hasValue) return null;
  return enrichRowValues(values, 'flow');
}

function taxPayMergeResidentTaxPlanIntoCsvRow(csvRow, planMonthValues, fiscalMonths) {
  const months = taxPayRawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    const planVal = planMonthValues[m];
    months[m] = planVal ?? 0;
    if ((planVal ?? 0) !== 0) planFillMonths.push(m);
  }
  return {
    ...csvRow,
    values: enrichRowValues(months, 'flow'),
    planFillMonths,
  };
}

function taxPayBuildAccountPlanTotal(monthlyPlan, actualMonthly, fiscalMonths, pastMonths) {
  const values = taxPayEmptyRawMonthValues();
  let hasValue = false;
  for (const m of fiscalMonths) {
    const amount = pastMonths.has(m)
      ? (actualMonthly[m] ?? 0)
      : (monthlyPlan[m] ?? 0);
    if (amount !== 0) {
      values[m] = amount;
      hasValue = true;
    }
  }
  if (!hasValue) return null;
  return enrichRowValues(values, 'flow');
}

function taxPayHasFuturePlanAmount(periodPlans, municipalities, fiscalMonths, pastMonths) {
  for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
    const plan = periodPlans[account] ?? {};
    for (const m of fiscalMonths) {
      if (!pastMonths.has(m) && (plan[m] ?? 0) !== 0) return true;
    }
  }
  for (const entry of municipalities) {
    for (const m of fiscalMonths) {
      if (!pastMonths.has(m) && (entry.monthly?.[m] ?? 0) !== 0) return true;
    }
  }
  return false;
}

function taxPayHasPastActualAmount(actualAmounts, fiscalMonths, pastMonths) {
  for (const account of PAYMENT_PLAN_ACCOUNTS) {
    const actual = actualAmounts.get(account) ?? {};
    for (const m of fiscalMonths) {
      if (pastMonths.has(m) && (actual[m] ?? 0) !== 0) return true;
    }
  }
  return false;
}

function taxPayRowMatchesMunicipality(row, municipality) {
  return row.label === RESIDENT_TAX_ACCOUNT && (row.subLabel ?? '') === municipality;
}

function taxPayBuildMunicipalityPlanRows(municipalities, fiscalMonths) {
  const rows = [];
  for (const entry of municipalities) {
    const planTotal = taxPayBuildResidentTaxPlanTotal(
      entry.monthly ?? {},
      fiscalMonths,
    );
    const planRow = taxPayBuildAccountPlanRow(
      RESIDENT_TAX_ACCOUNT,
      planTotal,
      `other-pay-plan-rt-${entry.id}`,
    );
    if (!planRow) continue;
    rows.push({
      ...planRow,
      id: `other-pay-plan-rt-${entry.id}`,
      subLabel: entry.municipality,
    });
  }
  return rows;
}

function taxPayRebuildResidentTaxRows(
  rows,
  municipalities,
  actualByMunicipality,
  actualTotal,
  fiscalMonths,
  pastMonths,
) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total');
  const residentTaxCsv = body.filter((r) => r.label === RESIDENT_TAX_ACCOUNT);
  const otherRest = body.filter((r) => r.label !== RESIDENT_TAX_ACCOUNT);
  const summedPlanMonthly = sumResidentTaxMunicipalityMonthly(municipalities, fiscalMonths);
  const matchedMunicipalityIds = new Set();
  const rebuiltResidentTax = [];

  for (const row of residentTaxCsv) {
    if (!taxPayIsActualSourceRow(row)) {
      rebuiltResidentTax.push(row);
      continue;
    }
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === NO_SUB_LABEL) {
      rebuiltResidentTax.push(taxPayMergeResidentTaxPlanIntoCsvRow(
        row,
        summedPlanMonthly,
        fiscalMonths,
      ));
      continue;
    }
    const municipality = municipalities.find((entry) => entry.municipality === sub);
    if (!municipality) {
      rebuiltResidentTax.push(row);
      continue;
    }
    matchedMunicipalityIds.add(municipality.id);
    rebuiltResidentTax.push(taxPayMergeResidentTaxPlanIntoCsvRow(
      row,
      municipality.monthly ?? {},
      fiscalMonths,
    ));
  }

  const orphanPlanRows = taxPayBuildMunicipalityPlanRows(
    municipalities.filter((entry) => !matchedMunicipalityIds.has(entry.id)),
    fiscalMonths,
  );

  if (residentTaxCsv.length === 0 && orphanPlanRows.length > 0) {
    const rebuilt = [...orphanPlanRows, ...otherRest];
    if (totalRow) rebuilt.push(totalRow);
    return rebuilt;
  }

  const rebuilt = [...rebuiltResidentTax, ...orphanPlanRows, ...otherRest];
  if (totalRow) rebuilt.push(totalRow);
  return rebuilt;
}

function taxPayCollectResidentTaxPlanVisibilityCandidates(
  municipalities,
  actualByMunicipality,
  fiscalMonths,
  pastMonths,
) {
  const candidates = [];
  for (const entry of municipalities) {
    const planTotal = taxPayBuildResidentTaxPlanTotal(
      entry.monthly ?? {},
      fiscalMonths,
    );
    const planRow = taxPayBuildAccountPlanRow(
      RESIDENT_TAX_ACCOUNT,
      planTotal,
      `other-pay-plan-rt-${entry.id}`,
    );
    if (!planRow) continue;
    candidates.push(...taxPayCollectPlanVisibilityCandidates(
      { ...planRow, subLabel: entry.municipality },
      'otherPay',
      TAX_PAY_OTHER_PAY_SECTION_LABEL,
    ));
  }
  return candidates;
}

function taxPayBuildAccountPlanRow(account, planTotal, idPrefix) {
  if (!planTotal) return null;
  return taxPayMakePlanRow(
    `${idPrefix}-${account}`,
    account,
    '',
    planTotal,
  );
}

function taxPayCollectPlanVisibilityCandidates(planRow, sectionId, sectionLabel) {
  if (!planRow) return [];
  return [{
    key: visibilityRowKey(sectionId, planRow),
    sectionId,
    sectionLabel,
    account: planRow.label,
    subLabel: planRow.subLabel || '',
    rowType: planRow.type,
    rowTypeLabel: rowTypeLabel(planRow.type),
  }];
}

function taxPayRebuildRowsForAccounts(
  rows,
  accounts,
  periodPlans,
  actualAmounts,
  fiscalMonths,
  pastMonths,
  planRowIdPrefix,
) {
  const totalRow = rows.find((r) => r.type === 'total');
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total');
  const { matched, otherRest } = taxPayPartitionAccountRows(body, accounts);

  const rebuiltAccountRows = [];
  const planRows = [];

  for (const account of accounts) {
    const accountCsv = matched.filter((row) => taxPayIsAccountRow(row, account));
    const monthlyPlan = periodPlans[account] ?? {};
    const actualMonthly = actualAmounts.get(account) ?? {};
    const mergedCsv = taxPayMergePlanIntoPrimaryCsvRow(
      accountCsv,
      monthlyPlan,
      actualMonthly,
      fiscalMonths,
      pastMonths,
    );
    const planTotal = taxPayBuildAccountPlanTotal(
      monthlyPlan,
      actualMonthly,
      fiscalMonths,
      pastMonths,
    );
    const planRow = accountCsv.length === 0
      ? taxPayBuildAccountPlanRow(account, planTotal, planRowIdPrefix)
      : null;
    rebuiltAccountRows.push(...mergedCsv);
    if (planRow) planRows.push(planRow);
  }

  const nonTargetRest = otherRest.filter(
    (row) => !accounts.includes(row.label ?? ''),
  );

  const rebuilt = [...rebuiltAccountRows, ...planRows, ...nonTargetRest];
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

function taxPayCreateOtherPaySection(rows) {
  const colors = DEFAULT_SECTION_COLORS.otherPay ?? {
    color: '#1f4e78',
    barColor: '#1f4e78',
    textColor: '#ffffff',
  };
  const totalValues = taxPaySumNonPlanRows(rows);
  const totalRow = {
    id: 'pay-total',
    label: `${APP_AGGREGATE_LABEL_PREFIX}${TAX_PAY_OTHER_PAY_TOTAL_LABEL}`,
    subLabel: '',
    type: 'total',
    values: totalValues,
    aggregateFormula: 'sectionSumExcludePlan',
  };
  return {
    id: 'otherPay',
    label: TAX_PAY_OTHER_PAY_SECTION_LABEL,
    filter: 'cashflow',
    color: colors.color,
    barColor: colors.barColor,
    textColor: colors.textColor,
    rows: [...rows, totalRow],
  };
}

function taxPayHasAnyPlanAmount(periodPlans, municipalities, actualAmounts, fiscalMonths, pastMonths) {
  return taxPayHasFuturePlanAmount(periodPlans, municipalities, fiscalMonths, pastMonths)
    || taxPayHasPastActualAmount(actualAmounts, fiscalMonths, pastMonths);
}

function taxPayCollectAllPlanVisibilityCandidates(
  periodPlans,
  municipalities,
  actualAmounts,
  actualResidentTaxByMunicipality,
  fiscalMonths,
  pastMonths,
) {
  const candidates = [];
  for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
    const planTotal = taxPayBuildAccountPlanTotal(
      periodPlans[account] ?? {},
      actualAmounts.get(account) ?? {},
      fiscalMonths,
      pastMonths,
    );
    const planRow = taxPayBuildAccountPlanRow(account, planTotal, 'tax-pay-plan');
    if (!planRow) continue;
    if (PAYMENT_PLAN_OTHER_SECTION_ACCOUNTS.has(account)) {
      candidates.push(...taxPayCollectPlanVisibilityCandidates(
        planRow,
        'other',
        TAX_PAY_OTHER_SECTION_LABEL,
      ));
    }
    if (PAYMENT_PLAN_OTHER_PAY_SIMPLE_ACCOUNTS.includes(account)) {
      candidates.push(...taxPayCollectPlanVisibilityCandidates(
        planRow,
        'otherPay',
        TAX_PAY_OTHER_PAY_SECTION_LABEL,
      ));
    }
    if (PAYMENT_PLAN_TAX_SECTION_ACCOUNTS.has(account)) {
      candidates.push(...taxPayCollectPlanVisibilityCandidates(
        planRow,
        'tax',
        TAX_PAY_TAX_SECTION_LABEL,
      ));
    }
  }
  candidates.push(...taxPayCollectResidentTaxPlanVisibilityCandidates(
    municipalities,
    actualResidentTaxByMunicipality,
    fiscalMonths,
    pastMonths,
  ));
  return candidates;
}

function taxPayEnrichOtherSection(section, periodPlans, actualAmounts, fiscalMonths, pastMonths) {
  const accounts = [...PAYMENT_PLAN_OTHER_SECTION_ACCOUNTS];
  const rows = taxPayRebuildRowsForAccounts(
    section.rows,
    accounts,
    periodPlans,
    actualAmounts,
    fiscalMonths,
    pastMonths,
    'tax-pay-plan',
  );
  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: taxPaySumNonPlanRows(rows),
      aggregateFormula: 'sectionSumExcludePlan',
    };
  }
  return { ...section, rows };
}

function taxPayEnrichTaxSection(section, periodPlans, actualAmounts, fiscalMonths, pastMonths) {
  const accounts = [...PAYMENT_PLAN_TAX_SECTION_ACCOUNTS];
  const rows = taxPayRebuildRowsForAccounts(
    section.rows,
    accounts,
    periodPlans,
    actualAmounts,
    fiscalMonths,
    pastMonths,
    'corp-tax-plan',
  );
  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: taxPaySumNonPlanRows(rows),
    };
  }
  return { ...section, rows };
}

function taxPayCreateTaxSectionFromPlans(periodPlans, actualAmounts, fiscalMonths, pastMonths) {
  const planRows = [];
  for (const account of PAYMENT_PLAN_TAX_SECTION_ACCOUNTS) {
    const planTotal = taxPayBuildAccountPlanTotal(
      periodPlans[account] ?? {},
      actualAmounts.get(account) ?? {},
      fiscalMonths,
      pastMonths,
    );
    const planRow = taxPayBuildAccountPlanRow(account, planTotal, 'corp-tax-plan');
    if (planRow) planRows.push(planRow);
  }
  if (planRows.length === 0) return null;
  const colors = DEFAULT_SECTION_COLORS.tax ?? {
    color: '#7030a0',
    barColor: '#7030a0',
    textColor: '#ffffff',
  };
  const totalValues = taxPaySumNonPlanRows(planRows);
  const totalRow = {
    id: 'tax-total',
    label: `${APP_AGGREGATE_LABEL_PREFIX}法人税合計`,
    subLabel: '',
    type: 'total',
    values: totalValues,
  };
  return {
    id: 'tax',
    label: TAX_PAY_TAX_SECTION_LABEL,
    filter: 'tax',
    color: colors.color,
    barColor: colors.barColor,
    textColor: colors.textColor,
    rows: [...planRows, totalRow],
  };
}

function taxPayEnrichOtherPaySection(
  section,
  periodPlans,
  municipalities,
  actualAmounts,
  actualResidentTaxByMunicipality,
  fiscalMonths,
  pastMonths,
) {
  const accounts = [...PAYMENT_PLAN_OTHER_PAY_SIMPLE_ACCOUNTS];
  let rows = taxPayRebuildRowsForAccounts(
    section.rows,
    accounts,
    periodPlans,
    actualAmounts,
    fiscalMonths,
    pastMonths,
    'other-pay-plan',
  );
  rows = taxPayRebuildResidentTaxRows(
    rows,
    municipalities,
    actualResidentTaxByMunicipality,
    actualAmounts.get(RESIDENT_TAX_ACCOUNT) ?? {},
    fiscalMonths,
    pastMonths,
  );
  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: taxPaySumNonPlanRows(rows),
      aggregateFormula: 'sectionSumExcludePlan',
    };
  }
  return { ...section, rows };
}

function taxPayCreateOtherSectionFromPlans(periodPlans, actualAmounts, fiscalMonths, pastMonths) {
  const planRows = [];
  for (const account of PAYMENT_PLAN_OTHER_SECTION_ACCOUNTS) {
    const planTotal = taxPayBuildAccountPlanTotal(
      periodPlans[account] ?? {},
      actualAmounts.get(account) ?? {},
      fiscalMonths,
      pastMonths,
    );
    const planRow = taxPayBuildAccountPlanRow(account, planTotal, 'tax-pay-plan');
    if (planRow) planRows.push(planRow);
  }
  if (planRows.length === 0) return null;
  return taxPayCreateOtherSection(planRows);
}

function taxPayCreateOtherPaySectionFromPlans(
  periodPlans,
  municipalities,
  actualAmounts,
  actualResidentTaxByMunicipality,
  fiscalMonths,
  pastMonths,
) {
  const planRows = [];
  for (const account of PAYMENT_PLAN_OTHER_PAY_SIMPLE_ACCOUNTS) {
    const planTotal = taxPayBuildAccountPlanTotal(
      periodPlans[account] ?? {},
      actualAmounts.get(account) ?? {},
      fiscalMonths,
      pastMonths,
    );
    const planRow = taxPayBuildAccountPlanRow(account, planTotal, 'other-pay-plan');
    if (planRow) planRows.push(planRow);
  }
  planRows.push(...taxPayBuildMunicipalityPlanRows(
    municipalities,
    fiscalMonths,
  ));
  if (planRows.length === 0) return null;
  return taxPayCreateOtherPaySection(planRows);
}

/** 予実データから住民税の市区町村別実績を抽出 */
export function collectResidentTaxActualByMunicipality(planData, fiscalMonths) {
  const byMunicipality = new Map();
  const total = {};
  for (const m of fiscalMonths) total[m] = 0;

  const otherPaySection = planData?.sections?.find((s) => s.id === 'otherPay');
  if (!otherPaySection) {
    return { byMunicipality, total };
  }

  for (const row of otherPaySection.rows) {
    if (!taxPayIsActualSourceRow(row)) continue;
    if (row.label !== RESIDENT_TAX_ACCOUNT) continue;
    const sub = String(row.subLabel ?? '').trim();
    if (!sub || sub === NO_SUB_LABEL) {
      for (const m of fiscalMonths) {
        total[m] += row.values[m] ?? 0;
      }
      continue;
    }
    if (!byMunicipality.has(sub)) {
      const monthly = {};
      for (const m of fiscalMonths) monthly[m] = 0;
      byMunicipality.set(sub, monthly);
    }
    const monthly = byMunicipality.get(sub);
    for (const m of fiscalMonths) {
      monthly[m] += row.values[m] ?? 0;
      total[m] += row.values[m] ?? 0;
    }
  }

  return { byMunicipality, total };
}

/** 仕訳から住民税の市区町村（補助科目）一覧を抽出 */
export function collectResidentTaxSubaccountsFromPlanData(planData) {
  const section = planData?.sections?.find((s) => s.id === 'otherPay');
  if (!section) return [];
  const result = [];
  const seen = new Set();
  for (const row of section.rows) {
    if (!taxPayIsActualSourceRow(row)) continue;
    if (row.label !== RESIDENT_TAX_ACCOUNT) continue;
    const municipality = String(row.subLabel ?? '').trim();
    if (!municipality || municipality === NO_SUB_LABEL || seen.has(municipality)) continue;
    seen.add(municipality);
    result.push({ municipality });
  }
  return result;
}

/** 予実データから支払い実績の月別金額を勘定科目ごとに抽出 */
export function collectPaymentActualAmountsFromPlanData(planData, fiscalMonths) {
  const result = new Map();
  for (const account of PAYMENT_PLAN_ACCOUNTS) {
    const monthly = {};
    for (const m of fiscalMonths) monthly[m] = 0;
    result.set(account, monthly);
  }

  const otherSection = planData?.sections?.find((s) => s.id === 'other');
  if (otherSection) {
    for (const row of otherSection.rows) {
      if (!taxPayIsActualSourceRow(row)) continue;
      if (row.label !== '租税公課') continue;
      const monthly = result.get('租税公課');
      for (const m of fiscalMonths) {
        monthly[m] += row.values[m] ?? 0;
      }
    }
  }

  const otherPaySection = planData?.sections?.find((s) => s.id === 'otherPay');
  if (otherPaySection) {
    for (const row of otherPaySection.rows) {
      if (!taxPayIsActualSourceRow(row)) continue;
      const account = row.label ?? '';
      if (!PAYMENT_PLAN_OTHER_PAY_ACCOUNTS.has(account)) continue;
      const monthly = result.get(account);
      for (const m of fiscalMonths) {
        monthly[m] += row.values[m] ?? 0;
      }
    }
  }

  const taxSection = planData?.sections?.find((s) => s.id === 'tax');
  if (taxSection) {
    for (const row of taxSection.rows) {
      if (!taxPayIsActualSourceRow(row)) continue;
      if (row.label !== CORPORATE_TAX_ACCOUNT) continue;
      const monthly = result.get(CORPORATE_TAX_ACCOUNT);
      for (const m of fiscalMonths) {
        monthly[m] += row.values[m] ?? 0;
      }
    }
  }

  return result;
}

/** 支払い計画を予実表の「その他」「その他支払」セクションにマージ（予算・予実モード）。 */
export function enrichPlanDataWithTaxPaymentRows(planData, {
  taxPaymentPlans,
  employees,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  actualSourcePlanData = null,
}) {
  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    return planData;
  }

  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const pastMonths = buildPastFiscalMonthSet(businessStartYear, fiscalPeriod, fiscalMonths);
  const actualSource = actualSourcePlanData ?? planData;
  const actualAmounts = collectPaymentActualAmountsFromPlanData(
    actualSource,
    fiscalMonths,
  );
  const { byMunicipality: actualResidentTaxByMunicipality } = collectResidentTaxActualByMunicipality(
    actualSource,
    fiscalMonths,
  );
  const periodPlans = getPaymentPlansForPeriod(
    taxPaymentPlans ?? {},
    fiscalPeriod,
    fiscalMonths,
  );
  const municipalities = filterVisibleResidentTaxMunicipalities(
    getResidentTaxMunicipalityEntries(
      taxPaymentPlans ?? {},
      fiscalPeriod,
      fiscalMonths,
    ),
    {
      employees,
      fiscalMonths,
      actualByMunicipality: actualResidentTaxByMunicipality,
    },
  );
  const hasPlans = taxPayHasAnyPlanAmount(
    periodPlans,
    municipalities,
    actualAmounts,
    fiscalMonths,
    pastMonths,
  );
  const otherIdx = planData.sections.findIndex((s) => s.id === 'other');
  const otherPayIdx = planData.sections.findIndex((s) => s.id === 'otherPay');
  const taxIdx = planData.sections.findIndex((s) => s.id === 'tax');
  const canEnrich = hasPlans || otherIdx >= 0 || otherPayIdx >= 0 || taxIdx >= 0;
  if (!canEnrich) {
    return planData;
  }

  const extraCandidates = taxPayCollectAllPlanVisibilityCandidates(
    periodPlans,
    municipalities,
    actualAmounts,
    actualResidentTaxByMunicipality,
    fiscalMonths,
    pastMonths,
  );

  let sections = [...planData.sections];

  if (otherIdx >= 0) {
    sections[otherIdx] = taxPayEnrichOtherSection(
      sections[otherIdx],
      periodPlans,
      actualAmounts,
      fiscalMonths,
      pastMonths,
    );
  } else if (hasPlans) {
    const created = taxPayCreateOtherSectionFromPlans(
      periodPlans,
      actualAmounts,
      fiscalMonths,
      pastMonths,
    );
    if (created) sections = [...sections, created];
  }

  const updatedOtherPayIdx = sections.findIndex((s) => s.id === 'otherPay');
  if (updatedOtherPayIdx >= 0) {
    sections[updatedOtherPayIdx] = taxPayEnrichOtherPaySection(
      sections[updatedOtherPayIdx],
      periodPlans,
      municipalities,
      actualAmounts,
      actualResidentTaxByMunicipality,
      fiscalMonths,
      pastMonths,
    );
  } else if (hasPlans) {
    const created = taxPayCreateOtherPaySectionFromPlans(
      periodPlans,
      municipalities,
      actualAmounts,
      actualResidentTaxByMunicipality,
      fiscalMonths,
      pastMonths,
    );
    if (created) sections = [...sections, created];
  }

  const updatedTaxIdx = sections.findIndex((s) => s.id === 'tax');
  if (updatedTaxIdx >= 0) {
    sections[updatedTaxIdx] = taxPayEnrichTaxSection(
      sections[updatedTaxIdx],
      periodPlans,
      actualAmounts,
      fiscalMonths,
      pastMonths,
    );
  } else if (hasPlans) {
    const created = taxPayCreateTaxSectionFromPlans(
      periodPlans,
      actualAmounts,
      fiscalMonths,
      pastMonths,
    );
    if (created) sections = [...sections, created];
  }

  return {
    ...planData,
    sections,
    visibilityCandidates: [
      ...(planData.visibilityCandidates ?? []),
      ...extraCandidates,
    ],
  };
}
