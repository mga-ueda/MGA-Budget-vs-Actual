import { buildFiscalMonths } from '../config/fiscalCalendar.js';
import { getConsumptionTaxRatePercent } from '../config/consumptionTaxRateConfig.js';
import {
  monthLabelFromIndex,
  normalizeTaxSimulation,
  resolveDefaultTaxPaymentMonthIndices,
  resolveItemizedTaxParams,
  TAX_REGION_PRESETS,
  formatTaxSimulationRatePercent,
  resolveProvisionalTaxInstallments,
} from '../config/taxSimulationConfig.js';
import {
  computeItemizedCorporateTax,
  ITEMIZED_TAX_LINE_LABELS,
} from './corporateTaxItemized.js';
import { formatFiscalPeriodLabel } from '../config/appSettings.js';

function sumRegularMonths(values, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    if (month === '決算整理') continue;
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

/** 税引前利益の年間見込を計算する */
export function estimateAnnualPreTaxProfit(values, fiscalMonths, pastMonths, method) {
  if (!values) return { amount: 0, basis: '税引前利益データがありません' };
  const regularMonths = fiscalMonths.filter((m) => m !== '決算整理');
  if (method === 'fullYear') {
    const amount = Number(values.合計) || sumRegularMonths(values, fiscalMonths);
    return {
      amount,
      basis: '当期通期見込税引前利益の合計をそのまま使用',
      detail: '合計を年間利益として扱います',
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
      basis: '実績月がないため合計を使用',
      detail: '実績がないため、通期合計を利用します',
    };
  }
  const amount = Math.round((ytd / pastCount) * 12);
  return {
    amount,
    basis: '実績月の税引前利益から年間換算',
    detail: `${pastCount}ヶ月分の実績合計で年間換算（合計÷月数×12）`,
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
  const regularMonths = fiscalMonths.filter((m) => m !== '決算整理');
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
      basis: '簡易課税（みなし仕入率）',
      detail: `課税売上×10%×（1-みなし仕入率）、年間換算して扱います`,
      taxableSales,
      deemedRate,
    };
  }
  const amount = Math.max(0, outputTax - inputTax);
  return {
    amount,
    basis: '本則課税（仮受消費税-仮払消費税）',
    detail: '売上は税込み、仕入は消費税対象仕入として概算、年間換算して扱います',
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
    label: '当期分　確定納付',
    monthLabel: monthLabelFromIndex(fiscalMonths, simulation.corporateTaxSettlementMonthIndex),
    amount: corporateTaxAmount,
  });
  if (simulation.provisionalTaxEnabled && simulation.provisionalTaxMonthIndices.length > 0) {
    const installments = resolveProvisionalTaxInstallments(corporateTaxAmount);
    const indices = simulation.provisionalTaxMonthIndices.slice(0, installments);
    let assigned = 0;
    indices.forEach((index, idx) => {
      const isLast = idx === indices.length - 1;
      const amount = isLast
        ? corporateTaxAmount - assigned
        : Math.round(corporateTaxAmount / indices.length);
      assigned += amount;
      schedule.push({
        kind: 'provisional',
        label: `来期　予定納税 ${idx + 1}`,
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
    label: '当期分　確定納付',
    monthLabel: monthLabelFromIndex(fiscalMonths, simulation.consumptionTaxSettlementMonthIndex),
    amount: consumptionTaxAmount,
  });
  if (simulation.consumptionTaxInterimEnabled) {
    schedule.push({
      kind: 'interim',
      label: '来期　中間納税',
      monthLabel: monthLabelFromIndex(fiscalMonths, simulation.consumptionTaxInterimMonthIndex),
      amount: Math.round(consumptionTaxAmount / 2),
    });
  }
  return schedule;
}

/** 当期のリザルトから来期に支払予定の納税見込を計算する */
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
    warnings.push('当期の予実データがありません。CSVを読み込んでください');
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
  let corporateTaxAmount;
  let corporateTaxRatePercent;
  let corporateTaxRateLabel;
  let itemizedResult = null;
  if (simulation.corporateTaxMethod === 'itemized') {
    const itemizedParams = resolveItemizedTaxParams(simulation);
    itemizedResult = computeItemizedCorporateTax(taxableProfit, itemizedParams);
    corporateTaxAmount = itemizedResult.total;
    corporateTaxRatePercent = itemizedResult.effectiveRatePercent;
    corporateTaxRateLabel = `${formatTaxSimulationRatePercent(corporateTaxRatePercent)}（検算）`;
    if (simulation.regionPreset === 'custom') {
      warnings.push('カスタム地域は大阪・中小法人の検算税率を使用しています');
    }
    if (!TAX_REGION_PRESETS[simulation.regionPreset]?.itemized) {
      warnings.push('選択地域に検算プリセットがないため、大阪・中小法人の税率を使用しています');
    }
  } else {
    corporateTaxAmount = Math.round(
      taxableProfit * simulation.effectiveCorporateTaxRatePercent / 100,
    );
    corporateTaxRatePercent = simulation.effectiveCorporateTaxRatePercent;
    corporateTaxRateLabel = formatTaxSimulationRatePercent(simulation.effectiveCorporateTaxRatePercent);
  }
  const revenueValues = getSectionTotalValues(currentPeriodPlanData, 'revenue');
  const sgaTaxableValues = getSectionTotalValues(currentPeriodPlanData, 'sgaTaxable');
  if (!sgaTaxableValues) {
    warnings.push('消費税対象仕入がないため、本則課税は概算精度が低くなります');
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
      ratePercent: corporateTaxRatePercent,
      rateLabel: corporateTaxRateLabel,
      method: simulation.corporateTaxMethod,
      lossDeduction: simulation.lossCarryforwardDeduction,
      itemized: itemizedResult
        ? {
            taxableIncome: itemizedResult.taxableIncome,
            breakdown: itemizedResult.breakdown.map((row) => ({
              ...row,
              label: ITEMIZED_TAX_LINE_LABELS[row.id] ?? row.id,
            })),
            total: itemizedResult.total,
            effectiveRatePercent: itemizedResult.effectiveRatePercent,
          }
        : null,
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
