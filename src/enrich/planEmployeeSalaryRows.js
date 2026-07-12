import {
  EXTRA_COLUMNS,
  enrichRowValues,
  APP_AGGREGATE_LABEL_PREFIX,
} from '../parse/parseJournal.js';
import { buildBudgetActualMonthSets } from '../config/monthDisplayConfig.js';
import { DEFAULT_SECTION_COLORS } from '../config/sectionColorConfig.js';
import {
  formatEmployeeName,
  isActiveEmployee,
  isSalaryPlanEmployee,
  isDirectorEmployee,
} from '../config/employeeConfig.js';
import {
  getEmployeeSalaryPlan,
  buildFiscalYearMonths,
  getOvertimePlan,
  getTravelAllowancePerPerson,
} from '../config/salaryPlanConfig.js';
import { SETTLEMENT_MONTH_LABEL } from '../config/fiscalCalendar.js';
import {
  computeLegalWelfareAmount,
} from '../config/legalWelfareRateConfig.js';
import {
  emptyRawMonthValues,
  addRawMonthValues,
  isMissingCsvMonthValue,
  rawValuesFromRow,
} from './enrichUtils.js';

const DIRECTOR_ACCOUNT = '役員報酬';
const SALARY_ACCOUNT = '給料手当';
const TRAVEL_ACCOUNT = '旅費交通費';
const TRAVEL_ROW_PATTERN = /旅費交通費|通勤手当/;
const LEGAL_WELFARE_ACCOUNT = '法定福利費';
const PERSONNEL_SECTION_LABEL = '人件費';
const PERSONNEL_TOTAL_LABEL = '人件費合計';
const TOTAL_COLUMN = EXTRA_COLUMNS[0];

function combineMonthlyAndBonusValues(plan, fiscalMonths) {
  const values = {};
  for (const m of fiscalMonths) {
    values[m] = (plan.monthly[m] ?? 0) + (plan.bonusMonthly[m] ?? 0);
  }
  return enrichRowValues(values, 'flow', [...fiscalMonths, SETTLEMENT_MONTH_LABEL]);
}

function makePlanRow(id, label, subLabel, values) {
  return {
    id,
    label,
    subLabel,
    type: 'plan',
    values,
  };
}

function empSumNonPlanRows(rows) {
  const total = emptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total' || row.type === 'breakdown' || row.type === 'sub' || row.type === 'plan') continue;
    if (row.type === 'item' || row.type === 'group') {
      addRawMonthValues(total, row.values);
    }
  }
  return enrichRowValues(total, 'flow');
}

/** 残業手当支払い計画の対象行（固定残業手当は従業員給与計画側） */
function isVariableOvertimeSalaryRow(row) {
  const sub = (row.subLabel ?? '').trim();
  const label = (row.label ?? '').trim();
  if ((sub.includes('固定') && sub.includes('残業'))
    || (label.includes('固定') && label.includes('残業'))) {
    return false;
  }
  return sub === '残業手当' || label === '残業手当';
}

export function isVariableOvertimePlanTableRow(row) {
  return isVariableOvertimeSalaryRow(row);
}

function isTravelExpenseRow(row) {
  const sub = row.subLabel ?? '';
  const label = row.label ?? '';
  return label === TRAVEL_ACCOUNT
    || TRAVEL_ROW_PATTERN.test(label)
    || TRAVEL_ROW_PATTERN.test(sub);
}

function partitionTravelRows(rows) {
  const travelCsv = [];
  const otherRest = [];
  for (const row of rows) {
    if (isTravelExpenseRow(row)) travelCsv.push(row);
    else otherRest.push(row);
  }
  return { travelCsv, otherRest };
}

function isLegalWelfareRow(row) {
  const label = row.label ?? '';
  return label === LEGAL_WELFARE_ACCOUNT || label.startsWith(LEGAL_WELFARE_ACCOUNT);
}

function partitionLegalWelfareRows(rows) {
  const legalWelfareCsv = [];
  const otherRest = [];
  for (const row of rows) {
    if (isLegalWelfareRow(row)) legalWelfareCsv.push(row);
    else otherRest.push(row);
  }
  return { legalWelfareCsv, otherRest };
}

function sumRowClusterMonthValues(rows) {
  const total = emptyRawMonthValues();
  for (const row of rows) {
    addRawMonthValues(total, row.values);
  }
  return total;
}

/** 計画行があればその合計、なければ CSV 行の合計 */
function combineCsvAndPlanClusterTotals(csvRows, planRows, fiscalMonths) {
  if (planRows.length > 0) {
    return sumRowClusterMonthValues(planRows);
  }
  return sumRowClusterMonthValues(csvRows);
}

function buildLegalWelfarePlanTotal(
  directorCsvMerged,
  directorRows,
  salaryRows,
  salaryMainMerged,
  salaryOvertimeMerged,
  overtimePlanRow,
  fiscalMonths,
  legalWelfareRate,
) {
  const directorBase = combineCsvAndPlanClusterTotals(
    directorCsvMerged,
    directorRows,
    fiscalMonths,
  );
  const salaryMainBase = combineCsvAndPlanClusterTotals(
    salaryMainMerged,
    salaryRows,
    fiscalMonths,
  );
  const overtimeBase = combineCsvAndPlanClusterTotals(
    salaryOvertimeMerged,
    overtimePlanRow ? [overtimePlanRow] : [],
    fiscalMonths,
  );
  const values = emptyRawMonthValues();
  for (const m of fiscalMonths) {
    const directorTotal = directorBase[m] ?? 0;
    const salaryTotal = (salaryMainBase[m] ?? 0) + (overtimeBase[m] ?? 0);
    if (directorTotal === 0 && salaryTotal === 0) continue;
    const amount = computeLegalWelfareAmount(
      directorTotal,
      salaryTotal,
      legalWelfareRate,
    );
    if (amount !== 0) values[m] = amount;
  }
  const enriched = enrichRowValues(values, 'flow');
  if ((enriched[TOTAL_COLUMN] ?? 0) === 0) return null;
  return enriched;
}

function employeeHasMonthlySalaryInMonth(plan, month) {
  return (plan.monthly[month] ?? 0) > 0;
}

function collectGroupIds(rows, accountLabel) {
  const ids = new Set();
  for (const row of rows) {
    if (row.label === accountLabel && row.type === 'group') ids.add(row.id);
  }
  return ids;
}

function belongsToAccountCluster(row, rows, accountLabel, groupIds) {
  if (row.label === accountLabel) return true;
  if (row.parentId && groupIds.has(row.parentId)) return true;
  return false;
}

function partitionCsvPersonnelRows(rows) {
  const body = rows.filter((r) => r.type !== 'plan' && r.type !== 'total');
  const directorGroupIds = collectGroupIds(body, DIRECTOR_ACCOUNT);
  const salaryGroupIds = collectGroupIds(body, SALARY_ACCOUNT);

  const directorCsv = [];
  const salaryMain = [];
  const salaryOvertime = [];
  const rest = [];

  for (const row of body) {
    if (belongsToAccountCluster(row, body, DIRECTOR_ACCOUNT, directorGroupIds)) {
      directorCsv.push(row);
      continue;
    }
    if (belongsToAccountCluster(row, body, SALARY_ACCOUNT, salaryGroupIds)) {
      if (isVariableOvertimeSalaryRow(row)) salaryOvertime.push(row);
      else salaryMain.push(row);
      continue;
    }
    rest.push(row);
  }

  return { directorCsv, salaryMain, salaryOvertime, rest };
}

function empMergePlanIntoCsvRow(
  csvRow,
  planMonthValues,
  fiscalMonths,
  skipPlanFillMonths = null,
  forcePlanMonths = null,
  planTargetTag = null,
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
    ...(planTargetTag ? { planTargetTag } : {}),
  };
}

function mergePlanIntoPrimaryCsvRow(
  csvRows,
  planTotal,
  fiscalMonths,
  skipPlanFillMonths = null,
  forcePlanMonths = null,
  planTargetTag = null,
) {
  if (csvRows.length === 0) return csvRows;
  const primaryIdx = csvRows.findIndex(
    (row) => !row.subLabel || row.subLabel === '補助科目なし',
  );
  const targetIdx = primaryIdx >= 0 ? primaryIdx : 0;
  return csvRows.map((row, index) => {
    if (index !== targetIdx) return row;
    if (!planTotal) {
      return planTargetTag ? { ...row, planTargetTag } : row;
    }
    const planMonths = rawValuesFromRow({ values: planTotal });
    return empMergePlanIntoCsvRow(
      row,
      planMonths,
      fiscalMonths,
      skipPlanFillMonths,
      forcePlanMonths,
      planTargetTag,
    );
  });
}

/**
 * 並び順：役員CSV→役員計画行→一般職計画行→給与CSV→残業CSV（計画補完）→出張CSV（計画補完）→その他。
 */
function rebuildPersonnelRows(
  rows,
  directorRows,
  salaryRows,
  directorPlanTotal,
  staffPlanTotal,
  overtimePlanTotal,
  travelPlanTotal,
  fiscalMonths,
  overtimeSkipPlanFillMonths = null,
  overtimeForcePlanMonths = null,
  legalWelfareRate,
) {
  const totalRow = rows.find((r) => r.type === 'total');
  const { directorCsv, salaryMain, salaryOvertime, rest } = partitionCsvPersonnelRows(rows);
  const { travelCsv, otherRest: restAfterTravel } = partitionTravelRows(rest);
  const { legalWelfareCsv, otherRest } = partitionLegalWelfareRows(restAfterTravel);
  const directorCsvMerged = mergePlanIntoPrimaryCsvRow(
    directorCsv,
    directorPlanTotal,
    fiscalMonths,
  );
  const salaryMainMerged = mergePlanIntoPrimaryCsvRow(
    salaryMain,
    staffPlanTotal,
    fiscalMonths,
  );
  const salaryOvertimeMerged = mergePlanIntoPrimaryCsvRow(
    salaryOvertime,
    overtimePlanTotal,
    fiscalMonths,
    overtimeSkipPlanFillMonths,
    overtimeForcePlanMonths,
    'overtime',
  ).map((row) => (
    isVariableOvertimeSalaryRow(row) ? { ...row, planTargetTag: 'overtime' } : row
  ));
  const overtimePlanRow = salaryOvertime.length === 0 && overtimePlanTotal
    ? { ...makePlanRow('overtime-plan', SALARY_ACCOUNT, '残業手当', overtimePlanTotal), planTargetTag: 'overtime' }
    : null;
  const travelCsvMerged = mergePlanIntoPrimaryCsvRow(
    travelCsv,
    travelPlanTotal,
    fiscalMonths,
  );
  const legalWelfarePlanTotal = buildLegalWelfarePlanTotal(
    directorCsvMerged,
    directorRows,
    salaryRows,
    salaryMainMerged,
    salaryOvertimeMerged,
    overtimePlanRow,
    fiscalMonths,
    legalWelfareRate,
  );
  const legalWelfareMerged = mergePlanIntoPrimaryCsvRow(
    legalWelfareCsv,
    legalWelfarePlanTotal,
    fiscalMonths,
  );

  const salaryCluster = [
    ...directorCsvMerged,
    ...directorRows,
    ...salaryRows,
    ...salaryMainMerged,
    ...(overtimePlanRow ? [overtimePlanRow] : []),
    ...salaryOvertimeMerged,
    ...travelCsvMerged,
  ];

  const rebuilt = [...salaryCluster, ...legalWelfareMerged, ...otherRest];
  if (totalRow) rebuilt.push(totalRow);
  return rebuilt;
}

function buildEmployeePlanRows(activeEmployees, salaryPlans, fiscalPeriod, fiscalMonths) {
  const directors = activeEmployees.filter(isDirectorEmployee);
  const staff = activeEmployees.filter((emp) => !isDirectorEmployee(emp));
  const directorRows = [];
  const salaryRows = [];
  const directorPlanTotal = emptyRawMonthValues();
  const staffPlanTotal = emptyRawMonthValues();

  for (const emp of directors) {
    const plan = getEmployeeSalaryPlan(salaryPlans, fiscalPeriod, emp.id, emp, fiscalMonths);
    const name = formatEmployeeName(emp);
    const values = combineMonthlyAndBonusValues(plan, fiscalMonths);
    const total = values[TOTAL_COLUMN] ?? 0;
    if (total === 0) continue;

    addRawMonthValues(directorPlanTotal, values);
    directorRows.push(makePlanRow(
      `emp-plan-d-${emp.id}`,
      DIRECTOR_ACCOUNT,
      name,
      values,
    ));
  }

  for (const emp of staff) {
    const plan = getEmployeeSalaryPlan(salaryPlans, fiscalPeriod, emp.id, emp, fiscalMonths);
    const name = formatEmployeeName(emp);
    const values = combineMonthlyAndBonusValues(plan, fiscalMonths);
    const total = values[TOTAL_COLUMN] ?? 0;
    if (total === 0) continue;

    addRawMonthValues(staffPlanTotal, values);
    salaryRows.push(makePlanRow(
      `emp-plan-m-${emp.id}`,
      SALARY_ACCOUNT,
      name,
      values,
    ));
  }

  const directorPlanTotalEnriched = enrichRowValues(directorPlanTotal, 'flow');
  const staffPlanTotalEnriched = enrichRowValues(staffPlanTotal, 'flow');
  const hasDirectorPlan = (directorPlanTotalEnriched[TOTAL_COLUMN] ?? 0) !== 0;
  const hasStaffPlan = (staffPlanTotalEnriched[TOTAL_COLUMN] ?? 0) !== 0;

  return {
    directorRows,
    salaryRows,
    directorPlanTotal: hasDirectorPlan ? directorPlanTotalEnriched : null,
    staffPlanTotal: hasStaffPlan ? staffPlanTotalEnriched : null,
  };
}

function buildOvertimePlanTotal(salaryPlanSettings, fiscalPeriod, fiscalMonths) {
  const overtime = getOvertimePlan(salaryPlanSettings, fiscalPeriod, fiscalMonths);
  const values = emptyRawMonthValues();
  for (const m of fiscalMonths) {
    const amount = overtime[m] ?? 0;
    if (amount !== 0) values[m] = amount;
  }
  const enriched = enrichRowValues(values, 'flow');
  if ((enriched[TOTAL_COLUMN] ?? 0) === 0) return null;
  return enriched;
}

function buildTravelAllowancePlanTotal(
  activeEmployees,
  salaryPlans,
  salaryPlanSettings,
  fiscalPeriod,
  fiscalMonths,
) {
  if (activeEmployees.length === 0) return null;

  const perPerson = getTravelAllowancePerPerson(salaryPlanSettings ?? {}, fiscalPeriod);
  if (perPerson <= 0) return null;

  const staffEmployees = activeEmployees.filter((emp) => !isDirectorEmployee(emp));
  if (staffEmployees.length === 0) return null;

  const values = emptyRawMonthValues();
  for (const m of fiscalMonths) {
    let headcount = 0;
    for (const emp of staffEmployees) {
      const plan = getEmployeeSalaryPlan(
        salaryPlans,
        fiscalPeriod,
        emp.id,
        emp,
        fiscalMonths,
      );
      if (employeeHasMonthlySalaryInMonth(plan, m)) headcount += 1;
    }
    if (headcount > 0) values[m] = headcount * perPerson;
  }

  const enriched = enrichRowValues(values, 'flow');
  if ((enriched[TOTAL_COLUMN] ?? 0) === 0) return null;
  return enriched;
}

function createPersonnelSection(rows) {
  const colors = DEFAULT_SECTION_COLORS.personnel ?? {
    color: '#806000',
    barColor: '#806000',
    textColor: '#ffffff',
  };
  const totalValues = empSumNonPlanRows(rows);
  const totalRow = {
    id: 'per-total',
    label: `${APP_AGGREGATE_LABEL_PREFIX}${PERSONNEL_TOTAL_LABEL}`,
    subLabel: '',
    type: 'total',
    values: totalValues,
    aggregateFormula: 'sectionSumExcludePlan',
  };
  return {
    id: 'personnel',
    label: PERSONNEL_SECTION_LABEL,
    filter: 'personnel',
    color: colors.color,
    barColor: colors.barColor,
    textColor: colors.textColor,
    rows: [...rows, totalRow],
  };
}

function collectPlanVisibilityCandidates(planRows) {
  return planRows.map((row) => ({
    key: visibilityRowKey('personnel', row),
    sectionId: 'personnel',
    sectionLabel: PERSONNEL_SECTION_LABEL,
    account: row.label,
    subLabel: row.subLabel || '',
    rowType: row.type,
    rowTypeLabel: rowTypeLabel(row.type),
  }));
}

/** 人件費セクションに従業員給与計画行をマージ（予算・予実モード）。 */
export function enrichPlanDataWithEmployeeSalaryRows(planData, {
  employees,
  salaryPlans,
  salaryPlanSettings,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  displayMode,
  legalWelfareRate,
  monthDisplayConfig,
}) {
  if (displayMode !== 'plan' && displayMode !== 'budget-actual') {
    return planData;
  }

  const activeEmployees = employees.filter(isSalaryPlanEmployee);
  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  const { directorRows, salaryRows, directorPlanTotal, staffPlanTotal } = activeEmployees.length > 0
    ? buildEmployeePlanRows(activeEmployees, salaryPlans, fiscalPeriod, fiscalMonths)
    : {
      directorRows: [],
      salaryRows: [],
      directorPlanTotal: null,
      staffPlanTotal: null,
    };
  const overtimePlanTotal = buildOvertimePlanTotal(
    salaryPlanSettings ?? {},
    fiscalPeriod,
    fiscalMonths,
  );
  const travelPlanTotal = buildTravelAllowancePlanTotal(
    activeEmployees,
    salaryPlans,
    salaryPlanSettings,
    fiscalPeriod,
    fiscalMonths,
  );
  const planRows = [...directorRows, ...salaryRows];
  const personnelIdx = planData.sections.findIndex((s) => s.id === 'personnel');
  const canEnrich = planRows.length > 0
    || directorPlanTotal
    || staffPlanTotal
    || overtimePlanTotal
    || travelPlanTotal
    || personnelIdx >= 0;
  if (!canEnrich) {
    return planData;
  }

  const extraCandidates = collectPlanVisibilityCandidates(planRows);

  if (personnelIdx < 0) {
    const section = createPersonnelSection(planRows);
    return {
      ...planData,
      sections: [...planData.sections, section],
      visibilityCandidates: [
        ...(planData.visibilityCandidates ?? []),
        ...extraCandidates,
      ],
    };
  }

  const personnel = planData.sections[personnelIdx];
  let overtimeSkipPlanFillMonths = null;
  let overtimeForcePlanMonths = null;
  if (displayMode === 'budget-actual') {
    ({ skipPlanFillMonths: overtimeSkipPlanFillMonths, forcePlanMonths: overtimeForcePlanMonths } = buildBudgetActualMonthSets({
      config: monthDisplayConfig,
      businessStartYear,
      fiscalPeriod,
      fiscalMonths,
    }));
  }
  const rows = rebuildPersonnelRows(
    personnel.rows,
    directorRows,
    salaryRows,
    directorPlanTotal,
    staffPlanTotal,
    overtimePlanTotal,
    travelPlanTotal,
    fiscalMonths,
    overtimeSkipPlanFillMonths,
    overtimeForcePlanMonths,
    legalWelfareRate,
  );

  const totalIdx = rows.findIndex((r) => r.type === 'total');
  if (totalIdx >= 0) {
    rows[totalIdx] = {
      ...rows[totalIdx],
      values: empSumNonPlanRows(rows),
      aggregateFormula: 'sectionSumExcludePlan',
    };
  }

  const sections = planData.sections.map((section, idx) => {
    if (idx !== personnelIdx) return section;
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
