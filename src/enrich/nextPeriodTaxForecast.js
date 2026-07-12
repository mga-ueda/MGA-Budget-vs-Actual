import { buildFiscalMonths } from '../config/fiscalCalendar.js';
import {
  getConsumptionTaxRatePercent,
  isAccountingTaxExclusive,
  getAccountingTaxBasisLabel,
  calcConsumptionTaxYenFromAmount,
} from '../config/consumptionTaxRateConfig.js';
import {
  monthLabelFromIndex,
  normalizeTaxSimulation,
  resolveDefaultTaxPaymentMonthIndices,
  resolveItemizedTaxParams,
  TAX_REGION_PRESETS,
  formatTaxSimulationRatePercent,
  resolveProvisionalTaxInstallments,
  resolveProvisionalTaxMonthIndices,
  resolveConsumptionTaxInterimInstallments,
  resolveConsumptionTaxInterimMonthIndices,
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
  accountingTaxBasis,
}) {
  const exclusive = isAccountingTaxExclusive(accountingTaxBasis);
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
      // 税抜: 本体×税率。税込: 税込額から税額を抽出
      outputTax += calcConsumptionTaxYenFromAmount(revenue, rate, accountingTaxBasis);
      inputTax += calcConsumptionTaxYenFromAmount(purchases, rate, accountingTaxBasis);
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
    const taxableBase = exclusive
      ? Math.max(0, Math.round(taxableSales))
      : Math.max(0, Math.round(taxableSales / 1.1));
    const netTax = Math.round(taxableBase * 0.1 * (1 - deemedRate / 100));
    return {
      amount: Math.max(0, netTax),
      basis: '簡易課税（みなし仕入率）',
      detail: exclusive
        ? "課税売上（税抜）×税率×（1-みなし仕入率）、年間換算して扱います"
        : `課税売上×10%×（1-みなし仕入率）、年間換算して扱います`,
      taxableSales,
      deemedRate,
      accountingTaxBasis: exclusive ? 'exclusive' : 'inclusive',
      accountingTaxBasisLabel: getAccountingTaxBasisLabel(accountingTaxBasis),
    };
  }
  const amount = Math.max(0, outputTax - inputTax);
  return {
    amount,
    basis: '本則課税（仮受消費税-仮払消費税）',
    detail: exclusive
      ? "売上は税抜き、仕入は消費税対象仕入として概算、年間換算して扱います"
      : "売上は税込み、仕入は消費税対象仕入として概算、年間換算して扱います",
    taxableSales,
    taxablePurchases,
    outputTax,
    inputTax,
    accountingTaxBasis: exclusive ? 'exclusive' : 'inclusive',
    accountingTaxBasisLabel: getAccountingTaxBasisLabel(accountingTaxBasis),
  };
}

function findPlanAccountRow(planData, sectionIds, accountName) {
  for (const sectionId of sectionIds) {
    const section = planData?.sections?.find((s) => s.id === sectionId);
    if (!section?.rows?.length) continue;
    const row = section.rows.find((r) => {
      if (r.type === 'total') return false;
      const name = r.label || r.account || '';
      return name === accountName;
    });
    if (row) return row;
  }
  return null;
}

function getBalanceAccountTotal(planData, accountName) {
  const row = findPlanAccountRow(
    planData,
    ['currentLiab', 'currentAssets', 'fixedLiab', 'fixedAssets'],
    accountName,
  );
  if (!row?.values) return null;
  const total = Number(row.values.合計);
  return Number.isFinite(total) ? total : null;
}

function getBalanceAccountPeak(planData, accountName, fiscalMonths) {
  const row = findPlanAccountRow(
    planData,
    ['currentLiab', 'currentAssets', 'fixedLiab', 'fixedAssets'],
    accountName,
  );
  if (!row?.values) return 0;
  let peak = 0;
  for (const month of fiscalMonths) {
    if (month === '決算整理') continue;
    peak = Math.max(peak, Number(row.values[month]) || 0);
  }
  return peak;
}

function getPlanCorporateTaxActualTotal(planData, fiscalMonths) {
  const section = planData?.sections?.find((sec) => sec.id === 'tax');
  if (!section?.rows?.length) return null;
  const totalRow = section.rows.find((row) => row.type === 'total');
  if (totalRow?.values) {
    const total = Number(totalRow.values.合計);
    if (Number.isFinite(total)) return total;
    return sumRegularMonths(totalRow.values, fiscalMonths);
  }
  const accountRow = section.rows.find((row) => {
    const name = row.label || row.account || '';
    return name === '法人税等' || /^法人税[、,]/.test(name);
  });
  if (accountRow?.values) {
    const total = Number(accountRow.values.合計);
    if (Number.isFinite(total)) return total;
    return sumRegularMonths(accountRow.values, fiscalMonths);
  }
  return null;
}

/**
 * 資金繰り用の法人税等。
 * 確定納付 = 期末未払。予定の基礎年税額 = 未払 + 当期に消えた仮払（なければ未払）。
 */
function resolveCorporateCashTax(planData, fiscalMonths, calculatedAmount) {
  const unpaid = getBalanceAccountTotal(planData, '未払法人税等');
  const prepaidPeak = getBalanceAccountPeak(planData, '仮払法人税等', fiscalMonths);
  const prepaidEnd = getBalanceAccountTotal(planData, '仮払法人税等');
  const planActual = getPlanCorporateTaxActualTotal(planData, fiscalMonths);
  const calc = Math.max(0, Math.floor(Number(calculatedAmount) || 0));
  if (unpaid != null && unpaid > 0) {
    const prepaidCleared = Math.max(0, prepaidPeak - Math.max(0, prepaidEnd ?? 0));
    const annual = unpaid + prepaidCleared;
    return {
      settlement: unpaid,
      annual,
      source: 'bs',
      sourceLabel: '資産負債の期末未払残高',
      planActual,
      calculatedAmount: calc,
      incompletePeriod: false,
    };
  }
  const plan = planActual != null && Number.isFinite(planActual)
    ? Math.max(0, Math.floor(planActual))
    : null;
  // 期末未払が無いのに予実法人税等が検算より大幅に小さい = 通期未確定（源泉等のみ）のことが多い
  const planLooksPartial = plan != null && calc > 0 && plan < Math.max(100_000, Math.round(calc * 0.3));
  if (plan != null && !planLooksPartial) {
    return {
      settlement: plan,
      annual: plan,
      source: 'plan',
      sourceLabel: '予実の法人税等実績',
      planActual: plan,
      calculatedAmount: calc,
      incompletePeriod: false,
    };
  }
  return {
    settlement: calc,
    annual: calc,
    source: 'calc',
    sourceLabel: planLooksPartial ? '期末未払が未計上のため検算税額を使用' : '税引前利益からの検算',
    planActual: plan,
    calculatedAmount: calc,
    incompletePeriod: Boolean(planLooksPartial || (plan == null && calc > 0)),
  };
}

/**
 * 資金繰り用の消費税。
 * 確定納付 = 期末未払。中間の基礎年税額 = 未払 + 当期に消えた仮払消費税。
 */
function resolveConsumptionCashTax(planData, fiscalMonths, estimatedAmount) {
  const unpaid = getBalanceAccountTotal(planData, '未払消費税');
  const prepaidPeak = getBalanceAccountPeak(planData, '仮払消費税', fiscalMonths);
  const prepaidEnd = getBalanceAccountTotal(planData, '仮払消費税');
  const estimate = Math.max(0, Math.floor(Number(estimatedAmount) || 0));
  if (unpaid != null && unpaid > 0) {
    const prepaidCleared = Math.max(0, prepaidPeak - Math.max(0, prepaidEnd ?? 0));
    return {
      settlement: unpaid,
      annual: unpaid + prepaidCleared,
      interimPaid: prepaidCleared,
      source: 'bs',
      sourceLabel: '資産負債の期末未払残高',
      estimatedAmount: estimate,
      incompletePeriod: false,
    };
  }
  // 期末未払未計上: 既払の仮払があれば年税額概算から差し引き、確定見込を抑える
  const prepaidOnHand = Math.max(0, prepaidEnd ?? prepaidPeak ?? 0);
  const settlement = Math.max(0, estimate - prepaidOnHand);
  return {
    settlement,
    annual: estimate,
    interimPaid: prepaidOnHand,
    source: 'calc',
    sourceLabel: prepaidOnHand > 0 ? '期末未払が未計上のため検算税額を使用' : '税引前利益からの検算',
    estimatedAmount: estimate,
    incompletePeriod: true,
  };
}

function maybePushCorporateTaxDivergenceWarning(warnings, calculatedAmount, cashAnnual) {
  if (cashAnnual == null || !Number.isFinite(cashAnnual)) return;
  const calc = Math.max(0, Math.floor(Number(calculatedAmount) || 0));
  const cash = Math.max(0, Math.floor(cashAnnual));
  const diff = Math.abs(calc - cash);
  const threshold = Math.max(50_000, Math.round(Math.max(calc, cash) * 0.1));
  if (diff <= threshold) return;
  warnings.push('検算税額と資金繰り用の税額（未払・予実実績）が乖離しています。支払スケジュールは現金基準を優先します');
}

/** 法人税等の支払スケジュール（確定=未払相当、予定=年税額の約半額） */
function buildCorporateTaxSchedule(settlementAmount, simulation, fiscalMonths, options = {}) {
  const schedule = [];
  schedule.push({
    kind: 'settlement',
    label: '当期分　確定納付',
    monthLabel: monthLabelFromIndex(fiscalMonths, simulation.corporateTaxSettlementMonthIndex),
    amount: Math.max(0, Math.floor(Number(settlementAmount) || 0)),
  });
  const provisionalBase = Math.max(0, Math.floor(Number(options.provisionalBase ?? settlementAmount) || 0));
  if (provisionalBase > 0 && simulation.provisionalTaxEnabled) {
    const installments = resolveProvisionalTaxInstallments({
      installments: simulation.provisionalTaxInstallments,
      maxInstallments: simulation.provisionalTaxMaxInstallments,
      isSmallCorporation: options.isSmallCorporation !== false,
      provisionalBase,
    });
    const indices = resolveProvisionalTaxMonthIndices(
      fiscalMonths,
      installments,
      simulation.provisionalTaxMonthIndices,
    );
    if (installments > 0 && indices.length > 0) {
      const provisionalTotal = Math.round(provisionalBase / 2);
      let assigned = 0;
      indices.forEach((index, idx) => {
        const isLast = idx === indices.length - 1;
        const amount = isLast
          ? provisionalTotal - assigned
          : Math.round(provisionalTotal / indices.length);
        assigned += amount;
        schedule.push({
          kind: 'provisional',
          label: indices.length === 1
            ? '来期　予定納税'
            : `来期　予定納税 ${idx + 1}/${indices.length}`,
          monthLabel: monthLabelFromIndex(fiscalMonths, index),
          amount,
        });
      });
    }
  }
  return schedule;
}

/** 消費税の支払スケジュール（確定=未払、中間=年税額から回数自動） */
function buildConsumptionTaxSchedule(settlementAmount, annualAmount, simulation, fiscalMonths) {
  const schedule = [];
  schedule.push({
    kind: 'settlement',
    label: '当期分　確定納付',
    monthLabel: monthLabelFromIndex(fiscalMonths, simulation.consumptionTaxSettlementMonthIndex),
    amount: Math.max(0, Math.floor(Number(settlementAmount) || 0)),
  });
  if (!simulation.consumptionTaxInterimEnabled) return schedule;
  const annual = Math.max(0, Math.floor(Number(annualAmount) || 0));
  const installments = resolveConsumptionTaxInterimInstallments(annual);
  const indices = resolveConsumptionTaxInterimMonthIndices(
    fiscalMonths,
    installments,
    simulation.consumptionTaxInterimMonthIndex,
  );
  if (installments <= 0 || indices.length === 0) return schedule;
  const twelfthsPerPayment = installments === 1 ? 6 : installments === 3 ? 3 : 1;
  const interimTotal = Math.round(annual * twelfthsPerPayment * installments / 12);
  let assigned = 0;
  indices.slice(0, installments).forEach((index, idx, arr) => {
    const isLast = idx === arr.length - 1;
    const amount = isLast
      ? interimTotal - assigned
      : Math.round(interimTotal / arr.length);
    assigned += amount;
    schedule.push({
      kind: 'interim',
      label: arr.length === 1
        ? '来期　中間納税'
        : `${'来期　中間納税'} ${idx + 1}/${arr.length}`,
      monthLabel: monthLabelFromIndex(fiscalMonths, index),
      amount,
    });
  });
  return schedule;
}


/** 当期のリザルトから来期に支払予定の納税見込を計算する（資金繰り基準） */
export function computeNextPeriodTaxForecast({
  currentPeriodPlanData,
  currentPeriod,
  nextPeriod,
  businessStartYear,
  fiscalEndMonth,
  taxSimulation,
  consumptionTaxRates,
  accountingTaxBasis,
  monthYearMap,
  pastMonths,
  date = new Date(),
}) {
  const simulation = normalizeTaxSimulation(taxSimulation, fiscalEndMonth);
  const fiscalMonths = buildFiscalMonths(fiscalEndMonth);
  const nextFiscalMonths = resolveDefaultTaxPaymentMonthIndices(fiscalEndMonth).fiscalMonths;
  const warnings = [];
  if (!currentPeriodPlanData) {
    warnings.push('当期の予実デタがありません。CSVを読み込んでください');
  }
  const preTaxValues = getProfitRowValues(currentPeriodPlanData, 'profitPreTax');
  const profitEstimate = estimateAnnualPreTaxProfit(
    preTaxValues,
    fiscalMonths,
    pastMonths ?? new Set(),
    simulation.profitEstimateMethod,
  );
  const enterpriseTaxPaidDeduction = Math.max(
    0,
    (Number(simulation.enterpriseTaxSettlementDeduction) || 0)
      + (Number(simulation.enterpriseTaxProvisionalDeduction) || 0),
  );
  const incomeTaxRefundAddition = Math.max(
    0,
    Number(simulation.incomeTaxRefundAddition) || 0,
  );
  const taxableProfit = Math.max(
    0,
    profitEstimate.amount
      - simulation.lossCarryforwardDeduction
      - enterpriseTaxPaidDeduction
      + incomeTaxRefundAddition,
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
  } else {
    corporateTaxAmount = Math.round(
      taxableProfit * simulation.effectiveCorporateTaxRatePercent / 100,
    );
    corporateTaxRatePercent = simulation.effectiveCorporateTaxRatePercent;
    corporateTaxRateLabel = formatTaxSimulationRatePercent(simulation.effectiveCorporateTaxRatePercent);
  }
  const corporateCash = resolveCorporateCashTax(
    currentPeriodPlanData,
    fiscalMonths,
    corporateTaxAmount,
  );
  maybePushCorporateTaxDivergenceWarning(warnings, corporateTaxAmount, corporateCash.annual);
  if (corporateCash.incompletePeriod) {
    warnings.push('期末未払が未計上のため、法人税等の支払見込は検算税額を使用しています（通期未確定）');
  }
  const revenueValues = getSectionTotalValues(currentPeriodPlanData, 'revenue');
  const sgaTaxableValues = getSectionTotalValues(currentPeriodPlanData, 'sgaTaxable');
  if (!sgaTaxableValues && !simulation.consumptionTaxExempt) {
    warnings.push('消費税対象仕入がないため、本則課税は概算精度が低くなります');
  }
  const consumptionEstimate = simulation.consumptionTaxExempt
    ? {
        amount: 0,
        basis: '免税事業者',
        detail: '免税事業者のため消費税の支払見込はありません',
      }
    : estimateAnnualConsumptionTax({
        revenueValues,
        sgaTaxableValues,
        fiscalMonths,
        pastMonths: pastMonths ?? new Set(),
        method: simulation.consumptionTaxMethod,
        simplifiedDeemedPurchaseRatePercent: simulation.simplifiedDeemedPurchaseRatePercent,
        monthYearMap,
        consumptionTaxRates,
        accountingTaxBasis,
      });
  const consumptionCash = simulation.consumptionTaxExempt
    ? {
        settlement: 0,
        annual: 0,
        interimPaid: 0,
        source: 'exempt',
        sourceLabel: '免税事業者',
        estimatedAmount: 0,
        incompletePeriod: false,
      }
    : resolveConsumptionCashTax(
        currentPeriodPlanData,
        fiscalMonths,
        consumptionEstimate.amount,
      );
  if (simulation.consumptionTaxExempt) {
    warnings.push('免税事業者のため消費税の支払見込は0です');
  } else if (consumptionCash.incompletePeriod) {
    warnings.push('消費税の期末未払が未計上のため、売上仕入からの概算を使用しています');
  }
  // 予定納税の基礎は資金繰り上の年税額。均等割のみ等で少額なら回数判定で0回になる
  const provisionalBase = corporateCash.annual > 0 ? corporateCash.annual : 0;
  const itemizedParamsForSchedule = simulation.corporateTaxMethod === 'itemized'
    ? resolveItemizedTaxParams(simulation)
    : null;
  const corporateProvisionalSchedule = buildCorporateTaxSchedule(
    corporateCash.settlement,
    simulation,
    nextFiscalMonths,
    {
      provisionalBase,
      isSmallCorporation: itemizedParamsForSchedule?.isSmallCorporation !== false,
    },
  );
  const consumptionSchedule = simulation.consumptionTaxExempt
    ? []
    : buildConsumptionTaxSchedule(
        consumptionCash.settlement,
        consumptionCash.annual,
        simulation,
        nextFiscalMonths,
      );
  const corporateTotal = corporateProvisionalSchedule.reduce((sum, row) => sum + (row.amount || 0), 0);
  const consumptionTotal = consumptionSchedule.reduce((sum, row) => sum + (row.amount || 0), 0);
  const regionLabel = TAX_REGION_PRESETS[simulation.regionPreset]?.label
    ?? TAX_REGION_PRESETS.small.label;
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
      annualAmount: corporateCash.annual,
      calculatedAmount: corporateTaxAmount,
      settlementAmount: corporateCash.settlement,
      cashSource: corporateCash.source,
      cashSourceLabel: corporateCash.sourceLabel,
      ratePercent: corporateTaxRatePercent,
      rateLabel: corporateTaxRateLabel,
      method: simulation.corporateTaxMethod,
      lossDeduction: simulation.lossCarryforwardDeduction,
      enterpriseTaxSettlementDeduction: simulation.enterpriseTaxSettlementDeduction,
      enterpriseTaxProvisionalDeduction: simulation.enterpriseTaxProvisionalDeduction,
      enterpriseTaxPaidDeduction,
      incomeTaxRefundAddition,
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
      annualAmount: consumptionCash.annual,
      settlementAmount: consumptionCash.settlement,
      estimatedAmount: consumptionEstimate.amount,
      cashSource: consumptionCash.source,
      cashSourceLabel: consumptionCash.sourceLabel,
      estimate: consumptionEstimate,
      schedule: consumptionSchedule,
      totalPaymentInNextPeriod: consumptionTotal,
    },
    grandTotalPaymentInNextPeriod: corporateTotal + consumptionTotal,
    computedAt: date.toISOString(),
  };
}

export { formatTaxSimulationRatePercent };
