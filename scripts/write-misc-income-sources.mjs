import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function sq(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const miscIncomeAccount = jp(0x96d1, 0x53ce, 0x5165);
const currentLabel = jp(0x4eca, 0x671f);
const nextLabel = jp(0x6765, 0x671f);
const miscIncomeComment = jp(
  0x96d1, 0x53ce, 0x5165, 0x8a08, 0x753b, 0x306e, 0x5bfe, 0x8c61, 0x671f, 0x9593,
  0xff08, 0x4eca, 0x671f, 0x30fb, 0x6765, 0x671f, 0xff09,
);
const nonOpLabel = jp(0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca);
const nonOpTotalLabel = jp(0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca, 0x5408, 0x8a08);
const enrichComment = jp(
  0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca, 0x306e, 0x96d1, 0x53ce, 0x5165, 0x884c,
  0x306b, 0x53d7, 0x6ce8, 0x8a2d, 0x5b9a, 0x306e, 0x8a08, 0x753b, 0x3092, 0x30de,
  0x30fc, 0x30b8, 0x3059, 0x308b, 0xff08, 0x4eca, 0x671f, 0x30fb, 0x6765, 0x671f,
  0x306e, 0x307f, 0xff09, 0x3002,
);

const revenueTail = `
export const MISC_INCOME_ACCOUNT = ${sq(miscIncomeAccount)};

/** ${miscIncomeComment} */
export function buildMiscIncomePlanPeriodEntries(currentPeriod) {
  return [
    { period: currentPeriod, label: ${sq(currentLabel)} },
    { period: currentPeriod + 1, label: ${sq(nextLabel)} },
  ];
}

function normalizeMiscIncomeMonthly(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan && typeof plan === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan[month]);
    }
  }
  return monthly;
}

export function getMiscIncomeMonthly(plans, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const raw = plans[periodKey]?.miscIncome;
  return normalizeMiscIncomeMonthly(raw, fiscalMonths);
}

export function setMiscIncomeMonthly(plans, fiscalPeriod, monthly, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const prev = plans[periodKey] ?? {};
  return saveRevenuePlans({
    ...plans,
    [periodKey]: {
      ...prev,
      miscIncome: normalizeMiscIncomeMonthly(monthly, fiscalMonths),
    },
  });
}

export function miscIncomeHasPlanValues(monthly, fiscalMonths) {
  return fiscalMonths.some((month) => (monthly[month] ?? 0) !== 0);
}
`;

const revenuePath = resolve(repoRoot, 'src/config/revenuePlanConfig.js');
let revenueSource = readFileSync(revenuePath, 'utf8');
const cutMarker = 'export function sumClientMonthlyTotal(entry, fiscalMonths) {';
const cutIdx = revenueSource.indexOf(cutMarker);
if (cutIdx < 0) throw new Error('revenuePlanConfig cut marker not found');
const sumFnEnd = revenueSource.indexOf('\n}', cutIdx) + 2;
revenueSource = revenueSource.slice(0, sumFnEnd) + revenueTail;
writeFileSync(revenuePath, revenueSource, 'utf8');

const planMiscIncomeRows = `import {
  FISCAL_MONTHS,
  enrichRowValues,
} from '../parse/parseJournal.js';
import { buildBudgetActualMonthSets } from '../config/monthDisplayConfig.js';
import { buildFiscalYearMonths } from '../config/salaryPlanConfig.js';
import {
  MISC_INCOME_ACCOUNT,
  getMiscIncomeMonthly,
  miscIncomeHasPlanValues,
} from '../config/revenuePlanConfig.js';

const MI_NON_OPERATING_SECTION_ID = 'nonOperating';
const NON_OPERATING_SECTION_LABEL = ${sq(nonOpLabel)};
const NON_OPERATING_TOTAL_LABEL = ${sq(nonOpTotalLabel)};

function miEmptyRawMonthValues() {
  const values = {};
  for (const m of FISCAL_MONTHS) values[m] = 0;
  return values;
}

function miAddRawMonthValues(target, source) {
  for (const m of FISCAL_MONTHS) {
    target[m] += source[m] ?? 0;
  }
}

function miIsMissingCsvMonthValue(value) {
  return value === undefined || value === null || value === 0;
}

function miRawValuesFromRow(row) {
  const values = miEmptyRawMonthValues();
  miAddRawMonthValues(values, row.values);
  return values;
}

function miMergePlanIntoCsvRow(
  csvRow,
  planMonthValues,
  fiscalMonths,
  skipPlanFillMonths = null,
  forcePlanMonths = null,
) {
  const months = miRawValuesFromRow(csvRow);
  const planFillMonths = [];
  for (const m of fiscalMonths) {
    if (skipPlanFillMonths?.has(m)) continue;
    if (forcePlanMonths?.has(m)) {
      months[m] = planMonthValues[m] ?? 0;
      planFillMonths.push(m);
      continue;
    }
    if (miIsMissingCsvMonthValue(months[m]) && (planMonthValues[m] ?? 0) !== 0) {
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
  const values = miEmptyRawMonthValues();
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
  const total = miEmptyRawMonthValues();
  for (const row of rows) {
    if (row.type === 'total') continue;
    if (row.type === 'item' || row.type === 'group' || row.type === 'plan') {
      miAddRawMonthValues(total, row.values);
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

/** ${enrichComment} */
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
`;

writeFileSync(resolve(repoRoot, 'src/enrich/planMiscIncomeRows.js'), planMiscIncomeRows, 'utf8');

console.log('Wrote misc income source files with UTF-8');
