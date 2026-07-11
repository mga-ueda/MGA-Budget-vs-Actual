/**
 * taxSimulationConfig.js / nextPeriodTaxForecast.js generator
 * node scripts/gen-tax-forecast-sources.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nextPeriodPath = resolve(repoRoot, 'src/enrich/nextPeriodTaxForecast.js');
const taxSimPath = resolve(repoRoot, 'src/config/taxSimulationConfig.js');

// Do not overwrite modern itemized tax sources with this legacy generator
if (existsSync(nextPeriodPath) && existsSync(taxSimPath)) {
  const nextPeriod = readFileSync(nextPeriodPath, 'utf8');
  const taxSim = readFileSync(taxSimPath, 'utf8');
  if (
    nextPeriod.includes('computeItemizedCorporateTax')
    || taxSim.includes('DEFAULT_ITEMIZED_TAX_PARAMS')
  ) {
    console.log('Skip gen-tax-forecast-sources: modern itemized tax sources already present');
    process.exit(0);
  }
}

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function sq(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const taxSimulationConfig = `import { buildFiscalYearMonths } from './fiscalCalendar.js';

/** ${jp(0x5730, 0x57df, 0x5225, 0x6cd5, 0x4eba, 0x7a0e, 0x30fb, 0x6d88, 0x8cbb, 0x7a0e, 0x306e, 0x30b7, 0x30df, 0x30e5, 0x30ec, 0x30fc, 0x30b7, 0x30e7, 0x30f3, 0x8a2d, 0x5b9a, 0xFF08, 0x5e74, 0x5ea6, 0x3054, 0x3068, 0x3067, 0x306f, 0x4e0d, 0x8981, 0xFF09)} */
export const DEFAULT_TAX_SIMULATION = {
  regionPreset: 'custom',
  effectiveCorporateTaxRatePercent: 34,
  profitEstimateMethod: 'annualize',
  provisionalTaxEnabled: true,
  provisionalTaxInstallments: 2,
  corporateTaxSettlementMonthIndex: 1,
  provisionalTaxMonthIndices: [7, 10],
  consumptionTaxMethod: 'general',
  simplifiedDeemedPurchaseRatePercent: 50,
  consumptionTaxInterimEnabled: true,
  consumptionTaxSettlementMonthIndex: 1,
  consumptionTaxInterimMonthIndex: 7,
  lossCarryforwardDeduction: 0,
};

export const TAX_REGION_PRESETS = {
  custom: {
    label: ${sq(jp(0x30ab, 0x30b9, 0x30bf, 0x30e0))},
    effectiveCorporateTaxRatePercent: null,
  },
  tokyo_standard: {
    label: ${sq(jp(0x6771, 0x4eac, 0xFF08, 0x6a19, 0x6e96, 0x7a0e, 0x7387, 0xFF09))},
    effectiveCorporateTaxRatePercent: 30.62,
  },
  tokyo_small: {
    label: ${sq(jp(0x6771, 0x4eac, 0xFF08, 0x4e2d, 0x5c0f, 0x6cd5, 0x4eba, 0xFF09))},
    effectiveCorporateTaxRatePercent: 34.59,
  },
  osaka_standard: {
    label: ${sq(jp(0x5927, 0x962a, 0xFF08, 0x6a19, 0x6e96, 0x7a0e, 0x7387, 0xFF09))},
    effectiveCorporateTaxRatePercent: 30.62,
  },
  osaka_small: {
    label: ${sq(jp(0x5927, 0x962a, 0xFF08, 0x4e2d, 0x5c0f, 0x6cd5, 0x4eba, 0xFF09))},
    effectiveCorporateTaxRatePercent: 34.59,
  },
  nagoya_standard: {
    label: ${sq(jp(0x540d, 0x53e4, 0x5c4b, 0xFF08, 0x6a19, 0x6e96, 0x7a0e, 0x7387, 0xFF09))},
    effectiveCorporateTaxRatePercent: 30.62,
  },
  fukuoka_standard: {
    label: ${sq(jp(0x798f, 0x5ca1, 0xFF08, 0x6a19, 0x6e96, 0x7a0e, 0x7387, 0xFF09))},
    effectiveCorporateTaxRatePercent: 30.62,
  },
};

const VALID_REGION_PRESETS = new Set(Object.keys(TAX_REGION_PRESETS));
const VALID_PROFIT_METHODS = new Set(['annualize', 'fullYear']);
const VALID_CONSUMPTION_METHODS = new Set(['general', 'simplified']);

function clampPercent(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return Math.round(n * 100) / 100;
}

function clampNonNegativeInt(value, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function normalizeMonthIndex(value, fallback, fiscalMonths) {
  const n = Math.floor(Number(value));
  const max = Math.max(0, fiscalMonths.length - 1);
  if (!Number.isFinite(n) || n < 0 || n > max) return fallback;
  return n;
}

function normalizeMonthIndexList(values, fallback, fiscalMonths) {
  if (!Array.isArray(values) || values.length === 0) return [...fallback];
  const max = Math.max(0, fiscalMonths.length - 1);
  const result = [];
  for (const raw of values) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0 || n > max) continue;
    if (!result.includes(n)) result.push(n);
  }
  return result.length > 0 ? result : [...fallback];
}

/** ${jp(0x4f1a, 0x8a08, 0x6708, 0x304b, 0x3089, 0x7d0d, 0x7a0e, 0x306e, 0x652f, 0x6255, 0x6708, 0x30a4, 0x30f3, 0x30c7, 0x30c3, 0x30af, 0x30b9, 0x3092, 0x5c0e, 0x51fa, 0x3059, 0x308b)} */
export function resolveDefaultTaxPaymentMonthIndices(fiscalEndMonth) {
  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
  return {
    fiscalMonths,
    corporateTaxSettlementMonthIndex: 1,
    provisionalTaxMonthIndices: [7, 10],
    consumptionTaxSettlementMonthIndex: 1,
    consumptionTaxInterimMonthIndex: 7,
  };
}

export function monthLabelFromIndex(fiscalMonths, index) {
  if (!Array.isArray(fiscalMonths) || index == null) return '';
  return fiscalMonths[index] ?? '';
}

export function normalizeTaxSimulation(raw, fiscalEndMonth = 12) {
  const defaults = resolveDefaultTaxPaymentMonthIndices(fiscalEndMonth);
  const fiscalMonths = defaults.fiscalMonths;
  const base = { ...DEFAULT_TAX_SIMULATION, ...defaults };
  const source = raw && typeof raw === 'object' ? raw : {};
  const regionPreset = VALID_REGION_PRESETS.has(source.regionPreset)
    ? source.regionPreset
    : base.regionPreset;
  const presetRate = TAX_REGION_PRESETS[regionPreset]?.effectiveCorporateTaxRatePercent;
  const effectiveCorporateTaxRatePercent = regionPreset === 'custom'
    ? clampPercent(source.effectiveCorporateTaxRatePercent, base.effectiveCorporateTaxRatePercent)
    : clampPercent(presetRate, base.effectiveCorporateTaxRatePercent);
  const profitEstimateMethod = VALID_PROFIT_METHODS.has(source.profitEstimateMethod)
    ? source.profitEstimateMethod
    : base.profitEstimateMethod;
  const consumptionTaxMethod = VALID_CONSUMPTION_METHODS.has(source.consumptionTaxMethod)
    ? source.consumptionTaxMethod
    : base.consumptionTaxMethod;
  const provisionalTaxInstallments = source.provisionalTaxInstallments === 1 ? 1 : 2;
  const provisionalTaxMonthIndices = normalizeMonthIndexList(
    source.provisionalTaxMonthIndices,
    defaults.provisionalTaxMonthIndices,
    fiscalMonths,
  ).slice(0, provisionalTaxInstallments);
  return {
    regionPreset,
    effectiveCorporateTaxRatePercent,
    profitEstimateMethod,
    provisionalTaxEnabled: source.provisionalTaxEnabled !== false,
    provisionalTaxInstallments,
    corporateTaxSettlementMonthIndex: normalizeMonthIndex(
      source.corporateTaxSettlementMonthIndex,
      defaults.corporateTaxSettlementMonthIndex,
      fiscalMonths,
    ),
    provisionalTaxMonthIndices,
    consumptionTaxMethod,
    simplifiedDeemedPurchaseRatePercent: clampPercent(
      source.simplifiedDeemedPurchaseRatePercent,
      base.simplifiedDeemedPurchaseRatePercent,
    ),
    consumptionTaxInterimEnabled: source.consumptionTaxInterimEnabled !== false,
    consumptionTaxSettlementMonthIndex: normalizeMonthIndex(
      source.consumptionTaxSettlementMonthIndex,
      defaults.consumptionTaxSettlementMonthIndex,
      fiscalMonths,
    ),
    consumptionTaxInterimMonthIndex: normalizeMonthIndex(
      source.consumptionTaxInterimMonthIndex,
      defaults.consumptionTaxInterimMonthIndex,
      fiscalMonths,
    ),
    lossCarryforwardDeduction: clampNonNegativeInt(
      source.lossCarryforwardDeduction,
      base.lossCarryforwardDeduction,
    ),
  };
}

export function formatTaxSimulationRatePercent(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '—';
  return \`\${Math.round(n * 100) / 100}%\`;
}
`;

const nextPeriodTaxForecast = `import { buildFiscalMonths } from '../config/fiscalCalendar.js';
import { getConsumptionTaxRatePercent } from '../config/consumptionTaxRateConfig.js';
import {
  monthLabelFromIndex,
  normalizeTaxSimulation,
  resolveDefaultTaxPaymentMonthIndices,
  TAX_REGION_PRESETS,
  formatTaxSimulationRatePercent,
} from '../config/taxSimulationConfig.js';
import { formatFiscalPeriodLabel } from '../config/appSettings.js';

function sumRegularMonths(values, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    if (month === ${sq(jp(0x6c7a, 0x7b97, 0x6574, 0x7406))}) continue;
    total += Number(values?.[month]) || 0;
  }
  return total;
}

function getSectionTotalValues(planData, sectionId) {
  const section = planData?.sections?.find((s) => s.id === sectionId);
  if (!section) return null;
  const totalRow = section.rows?.find((row) => row.type === 'total');
  return totalRow?.values ?? null;
}

function getProfitRowValues(planData, aggregateFormula) {
  const section = planData?.sections?.find((s) => s.id === 'profit');
  if (!section) return null;
  const row = section.rows?.find((r) => r.aggregateFormula === aggregateFormula);
  return row?.values ?? null;
}

/** ${jp(0x7a0e, 0x5f15, 0x524d, 0x5229, 0x76ca, 0x306e, 0x5e74, 0x9593, 0x898b, 0x8fbc, 0x3092, 0x8a08, 0x7b97, 0x3059, 0x308b)} */
export function estimateAnnualPreTaxProfit(values, fiscalMonths, pastMonths, method) {
  if (!values) return { amount: 0, basis: ${sq(jp(0x7a0e, 0x5f15, 0x524d, 0x5229, 0x76ca, 0x30c7, 0x30fc, 0x30bf, 0x304c, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093))} };
  const regularMonths = fiscalMonths.filter((m) => m !== ${sq(jp(0x6c7a, 0x7b97, 0x6574, 0x7406))});
  if (method === 'fullYear') {
    const amount = Number(values.合計) || sumRegularMonths(values, fiscalMonths);
    return {
      amount,
      basis: ${sq(jp(0x5f53, 0x671f, 0x901a, 0x671f, 0x898b, 0x8fbc, 0x7a0e, 0x5f15, 0x524d, 0x5229, 0x76ca, 0x306e, 0x5408, 0x8a08, 0x3092, 0x305d, 0x306e, 0x307e, 0x307e, 0x4f7f, 0x7528))},
      detail: ${sq(jp(0x5408, 0x8a08, 0x3092, 0x5e74, 0x9593, 0x5229, 0x76ca, 0x3068, 0x3057, 0x3066, 0x6271, 0x3044, 0x307e, 0x3059))},
    };
  }
  let ytd = 0;
  let pastCount = 0;
  for (const month of regularMonths) {
    if (!pastMonths.has(month)) continue;
    ytd += Number(values[month]) || 0;
    pastCount += 1;
  }
  if (pastCount === 0) {
    const amount = Number(values.合計) || sumRegularMonths(values, fiscalMonths);
    return {
      amount,
      basis: ${sq(jp(0x5b9f, 0x7e3e, 0x6708, 0x304c, 0x306a, 0x3044, 0x305f, 0x3081, 0x5408, 0x8a08, 0x3092, 0x4f7f, 0x7528))},
      detail: ${sq(jp(0x5b9f, 0x7e3e, 0x304c, 0x306a, 0x3044, 0x305f, 0x3081, 0x3001, 0x901a, 0x671f, 0x5408, 0x8a08, 0x3092, 0x5229, 0x7528, 0x3057, 0x307e, 0x3059))},
    };
  }
  const amount = Math.round((ytd / pastCount) * 12);
  return {
    amount,
    basis: ${sq(jp(0x5b9f, 0x7e3e, 0x6708, 0x306e, 0x7a0e, 0x5f15, 0x524d, 0x5229, 0x76ca, 0x304b, 0x3089, 0x5e74, 0x9593, 0x63db, 0x7b97))},
    detail: \`\${pastCount}${jp(0x30f6, 0x6708, 0x5206, 0x306e, 0x5b9f, 0x7e3e, 0x5408, 0x8a08, 0x3067, 0x5e74, 0x9593, 0x63db, 0x7b97, 0xFF08, 0x5408, 0x8a08, 0x00f7, 0x6708, 0x6570, 0x00d7, 0x31, 0x32, 0xFF09)}\`,
    ytd,
    pastCount,
  };
}

function estimateAnnualConsumptionTax({
  revenueValues,
  sgaTaxableValues,
  fiscalMonths,
  pastMonths,
  method,
  simplifiedDeemedPurchaseRatePercent,
  monthYearMap,
  consumptionTaxRates,
}) {
  const regularMonths = fiscalMonths.filter((m) => m !== ${sq(jp(0x6c7a, 0x7b97, 0x6574, 0x7406))});
  let outputTax = 0;
  let inputTax = 0;
  let taxableSales = 0;
  let taxablePurchases = 0;
  for (const month of regularMonths) {
    const revenue = Number(revenueValues?.[month]) || 0;
    const purchases = Number(sgaTaxableValues?.[month]) || 0;
    const year = monthYearMap?.[month];
    const monthNum = parseInt(String(month).replace(/[^0-9]/g, ''), 10);
    const ratePercent = year && monthNum
      ? getConsumptionTaxRatePercent(year, monthNum, consumptionTaxRates)
      : 10;
    const rate = Number.isFinite(ratePercent) && ratePercent > 0 ? ratePercent : 10;
    if (pastMonths.has(month) || pastMonths.size === 0) {
      taxableSales += revenue;
      taxablePurchases += purchases;
      outputTax += Math.round(revenue * rate / (100 + rate));
      inputTax += Math.round(purchases * rate / (100 + rate));
    }
  }
  if (pastMonths.size > 0) {
    const pastCount = regularMonths.filter((m) => pastMonths.has(m)).length;
    if (pastCount > 0 && pastCount < regularMonths.length) {
      const factor = 12 / pastCount;
      taxableSales = Math.round(taxableSales * factor);
      taxablePurchases = Math.round(taxablePurchases * factor);
      outputTax = Math.round(outputTax * factor);
      inputTax = Math.round(inputTax * factor);
    }
  } else {
    taxableSales = sumRegularMonths(revenueValues, fiscalMonths);
    taxablePurchases = sumRegularMonths(sgaTaxableValues, fiscalMonths);
  }
  if (method === 'simplified') {
    const deemedRate = Number(simplifiedDeemedPurchaseRatePercent) || 0;
    const taxableBase = Math.max(0, Math.round(taxableSales / 1.1));
    const netTax = Math.round(taxableBase * 0.1 * (1 - deemedRate / 100));
    return {
      amount: Math.max(0, netTax),
      basis: ${sq(jp(0x7c21, 0x6613, 0x8ab2, 0x7a0e, 0xFF08, 0x307f, 0x306a, 0x3057, 0x4ed5, 0x5165, 0x7387, 0xFF09))},
      detail: \`${jp(0x8ab2, 0x7a0e, 0x58f2, 0x4e0a, 0x00d7, 0x31, 0x30, 0x25, 0x00d7, 0xFF08, 0x31, 0x002d, 0x307f, 0x306a, 0x3057, 0x4ed5, 0x5165, 0x7387, 0xFF09, 0x3001, 0x5e74, 0x9593, 0x63db, 0x7b97, 0x3057, 0x3066, 0x6271, 0x3044, 0x307e, 0x3059)}\`,
      taxableSales,
      deemedRate,
    };
  }
  const amount = Math.max(0, outputTax - inputTax);
  return {
    amount,
    basis: ${sq(jp(0x672c, 0x5247, 0x8ab2, 0x7a0e, 0xFF08, 0x4eee, 0x53d7, 0x6d88, 0x8cbb, 0x7a0e, 0x002d, 0x4eee, 0x6255, 0x6d88, 0x8cbb, 0x7a0e, 0xFF09))},
    detail: ${sq(jp(0x58f2, 0x4e0a, 0x306f, 0x7a0e, 0x8fbc, 0x307f, 0x3001, 0x4ed5, 0x5165, 0x306f, 0x6d88, 0x8cbb, 0x7a0e, 0x5bfe, 0x8c61, 0x4ed5, 0x5165, 0x3068, 0x3057, 0x3066, 0x6982, 0x7b97, 0x3001, 0x5e74, 0x9593, 0x63db, 0x7b97, 0x3057, 0x3066, 0x6271, 0x3044, 0x307e, 0x3059))},
    taxableSales,
    taxablePurchases,
    outputTax,
    inputTax,
  };
}

function buildCorporateTaxSchedule(corporateTaxAmount, simulation, fiscalMonths) {
  const schedule = [];
  schedule.push({
    kind: 'settlement',
    label: ${sq(jp(0x5f53, 0x671f, 0x5206, 0x3000, 0x78ba, 0x5b9a, 0x7d0d, 0x4ed8))},
    monthLabel: monthLabelFromIndex(fiscalMonths, simulation.corporateTaxSettlementMonthIndex),
    amount: corporateTaxAmount,
  });
  if (simulation.provisionalTaxEnabled && simulation.provisionalTaxMonthIndices.length > 0) {
    const indices = simulation.provisionalTaxMonthIndices.slice(0, simulation.provisionalTaxInstallments);
    let assigned = 0;
    indices.forEach((index, idx) => {
      const isLast = idx === indices.length - 1;
      const amount = isLast
        ? corporateTaxAmount - assigned
        : Math.round(corporateTaxAmount / indices.length);
      assigned += amount;
      schedule.push({
        kind: 'provisional',
        label: \`${jp(0x6765, 0x671f, 0x3000, 0x4e88, 0x5b9a, 0x7d0d, 0x7a0e)} \${idx + 1}\`,
        monthLabel: monthLabelFromIndex(fiscalMonths, index),
        amount,
      });
    });
  }
  return schedule;
}

function buildConsumptionTaxSchedule(consumptionTaxAmount, simulation, fiscalMonths) {
  const schedule = [];
  schedule.push({
    kind: 'settlement',
    label: ${sq(jp(0x5f53, 0x671f, 0x5206, 0x3000, 0x78ba, 0x5b9a, 0x7d0d, 0x4ed8))},
    monthLabel: monthLabelFromIndex(fiscalMonths, simulation.consumptionTaxSettlementMonthIndex),
    amount: consumptionTaxAmount,
  });
  if (simulation.consumptionTaxInterimEnabled) {
    schedule.push({
      kind: 'interim',
      label: ${sq(jp(0x6765, 0x671f, 0x3000, 0x4e2d, 0x9593, 0x7d0d, 0x7a0e))},
      monthLabel: monthLabelFromIndex(fiscalMonths, simulation.consumptionTaxInterimMonthIndex),
      amount: Math.round(consumptionTaxAmount / 2),
    });
  }
  return schedule;
}

/** ${jp(0x5f53, 0x671f, 0x306e, 0x30ea, 0x30b6, 0x30eb, 0x30c8, 0x304b, 0x3089, 0x6765, 0x671f, 0x306b, 0x652f, 0x6255, 0x4e88, 0x5b9a, 0x306e, 0x7d0d, 0x7a0e, 0x898b, 0x8fbc, 0x3092, 0x8a08, 0x7b97, 0x3059, 0x308b)} */
export function computeNextPeriodTaxForecast({
  currentPeriodPlanData,
  currentPeriod,
  nextPeriod,
  businessStartYear,
  fiscalEndMonth,
  taxSimulation,
  consumptionTaxRates,
  monthYearMap,
  pastMonths,
  date = new Date(),
}) {
  const simulation = normalizeTaxSimulation(taxSimulation, fiscalEndMonth);
  const fiscalMonths = buildFiscalMonths(fiscalEndMonth);
  const nextFiscalMonths = resolveDefaultTaxPaymentMonthIndices(fiscalEndMonth).fiscalMonths;
  const warnings = [];
  if (!currentPeriodPlanData) {
    warnings.push(${sq(jp(0x5f53, 0x671f, 0x306e, 0x4e88, 0x5b9f, 0x30c7, 0x30fc, 0x30bf, 0x304c, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093, 0x3002, 0x43, 0x53, 0x56, 0x3092, 0x8aad, 0x307f, 0x8fbc, 0x3093, 0x3067, 0x304f, 0x3060, 0x3055, 0x3044))});
  }
  const preTaxValues = getProfitRowValues(currentPeriodPlanData, 'profitPreTax');
  const profitEstimate = estimateAnnualPreTaxProfit(
    preTaxValues,
    fiscalMonths,
    pastMonths ?? new Set(),
    simulation.profitEstimateMethod,
  );
  const taxableProfit = Math.max(
    0,
    profitEstimate.amount - simulation.lossCarryforwardDeduction,
  );
  const corporateTaxAmount = Math.round(
    taxableProfit * simulation.effectiveCorporateTaxRatePercent / 100,
  );
  const revenueValues = getSectionTotalValues(currentPeriodPlanData, 'revenue');
  const sgaTaxableValues = getSectionTotalValues(currentPeriodPlanData, 'sgaTaxable');
  if (!sgaTaxableValues) {
    warnings.push(${sq(jp(0x6d88, 0x8cbb, 0x7a0e, 0x5bfe, 0x8c61, 0x4ed5, 0x5165, 0x304c, 0x306a, 0x3044, 0x305f, 0x3081, 0x3001, 0x672c, 0x5247, 0x8ab2, 0x7a0e, 0x306f, 0x6982, 0x7b97, 0x7cbe, 0x5ea6, 0x304c, 0x4f4e, 0x304f, 0x306a, 0x308a, 0x307e, 0x3059))});
  }
  const consumptionEstimate = estimateAnnualConsumptionTax({
    revenueValues,
    sgaTaxableValues,
    fiscalMonths,
    pastMonths: pastMonths ?? new Set(),
    method: simulation.consumptionTaxMethod,
    simplifiedDeemedPurchaseRatePercent: simulation.simplifiedDeemedPurchaseRatePercent,
    monthYearMap,
    consumptionTaxRates,
  });
  const corporateProvisionalSchedule = buildCorporateTaxSchedule(
    corporateTaxAmount,
    simulation,
    nextFiscalMonths,
  );
  const consumptionSchedule = buildConsumptionTaxSchedule(
    consumptionEstimate.amount,
    simulation,
    nextFiscalMonths,
  );
  const corporateTotal = corporateProvisionalSchedule.reduce((sum, row) => sum + (row.amount || 0), 0);
  const consumptionTotal = consumptionSchedule.reduce((sum, row) => sum + (row.amount || 0), 0);
  const regionLabel = TAX_REGION_PRESETS[simulation.regionPreset]?.label
    ?? TAX_REGION_PRESETS.custom.label;
  return {
    currentPeriod,
    nextPeriod,
    currentPeriodLabel: formatFiscalPeriodLabel(currentPeriod),
    nextPeriodLabel: formatFiscalPeriodLabel(nextPeriod),
    warnings,
    simulation,
    regionLabel,
    profitEstimate,
    taxableProfit,
    corporateTax: {
      annualAmount: corporateTaxAmount,
      ratePercent: simulation.effectiveCorporateTaxRatePercent,
      rateLabel: formatTaxSimulationRatePercent(simulation.effectiveCorporateTaxRatePercent),
      lossDeduction: simulation.lossCarryforwardDeduction,
      schedule: corporateProvisionalSchedule,
      totalPaymentInNextPeriod: corporateTotal,
    },
    consumptionTax: {
      annualAmount: consumptionEstimate.amount,
      estimate: consumptionEstimate,
      schedule: consumptionSchedule,
      totalPaymentInNextPeriod: consumptionTotal,
    },
    grandTotalPaymentInNextPeriod: corporateTotal + consumptionTotal,
    computedAt: date.toISOString(),
  };
}

export { formatTaxSimulationRatePercent };
`;

writeFileSync(resolve(repoRoot, 'src/config/taxSimulationConfig.js'), taxSimulationConfig, 'utf8');
writeFileSync(resolve(repoRoot, 'src/enrich/nextPeriodTaxForecast.js'), nextPeriodTaxForecast, 'utf8');
console.log('Generated tax forecast source files');
