import { buildFiscalYearMonths } from './fiscalCalendar.js';

/** 大阪・中小法人の検算用税率（参考資料ベース） */
export const DEFAULT_ITEMIZED_TAX_PARAMS = {
  isSmallCorporation: true,
  corporateTaxThreshold: 8_000_000,
  corporateTaxRateLowPercent: 15,
  corporateTaxRateHighPercent: 23.2,
  localCorporateTaxRatePercent: 10.3,
  prefecturalIncomeTaxRatePercent: 1,
  prefecturalPerCapita: 20_000,
  enterpriseTaxTiers: [
    { limit: 4_000_000, ratePercent: 3.5 },
    { limit: 8_000_000, ratePercent: 5.3 },
    { limit: Infinity, ratePercent: 7 },
  ],
  specialLocalEnterpriseTaxRatePercent: 37,
  municipalIncomeTaxRatePercent: 6,
  municipalPerCapita: 50_000,
};

/** 地域別法人税・消費税のシミュレーション設定（年度ごとでは不要） */
export const DEFAULT_TAX_SIMULATION = {
  regionPreset: 'custom',
  corporateTaxMethod: 'itemized',
  effectiveCorporateTaxRatePercent: 34,
  itemizedPrefecturalPerCapita: null,
  itemizedMunicipalPerCapita: null,
  profitEstimateMethod: 'fullYear',
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
    label: 'カスタム',
    effectiveCorporateTaxRatePercent: null,
  },
  tokyo_standard: {
    label: '東京（標準税率）',
    effectiveCorporateTaxRatePercent: 30.62,
    itemized: { ...DEFAULT_ITEMIZED_TAX_PARAMS, isSmallCorporation: false },
  },
  tokyo_small: {
    label: '東京（中小法人）',
    effectiveCorporateTaxRatePercent: 34.59,
    itemized: { ...DEFAULT_ITEMIZED_TAX_PARAMS, isSmallCorporation: true },
  },
  osaka_standard: {
    label: '大阪（標準税率）',
    effectiveCorporateTaxRatePercent: 30.62,
    itemized: { ...DEFAULT_ITEMIZED_TAX_PARAMS, isSmallCorporation: false },
  },
  osaka_small: {
    label: '大阪（中小法人）',
    effectiveCorporateTaxRatePercent: 34.59,
    itemized: { ...DEFAULT_ITEMIZED_TAX_PARAMS, isSmallCorporation: true },
  },
  nagoya_standard: {
    label: '名古屋（標準税率）',
    effectiveCorporateTaxRatePercent: 30.62,
  },
  fukuoka_standard: {
    label: '福岡（標準税率）',
    effectiveCorporateTaxRatePercent: 30.62,
  },
};

const VALID_REGION_PRESETS = new Set(Object.keys(TAX_REGION_PRESETS));
const VALID_PROFIT_METHODS = new Set(['annualize', 'fullYear']);
const VALID_CONSUMPTION_METHODS = new Set(['general', 'simplified']);
const VALID_CORPORATE_TAX_METHODS = new Set(['effectiveRate', 'itemized']);

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

/** 会計月から納税の支払月インデックスを導出する */
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

/** 検算モード用の税率パラメータを解決する */
export function resolveItemizedTaxParams(simulation) {
  const preset = TAX_REGION_PRESETS[simulation.regionPreset];
  const base = preset?.itemized
    ? { ...DEFAULT_ITEMIZED_TAX_PARAMS, ...preset.itemized }
    : { ...DEFAULT_ITEMIZED_TAX_PARAMS };
  if (simulation.itemizedPrefecturalPerCapita != null) {
    base.prefecturalPerCapita = clampNonNegativeInt(
      simulation.itemizedPrefecturalPerCapita,
      base.prefecturalPerCapita,
    );
  }
  if (simulation.itemizedMunicipalPerCapita != null) {
    base.municipalPerCapita = clampNonNegativeInt(
      simulation.itemizedMunicipalPerCapita,
      base.municipalPerCapita,
    );
  }
  return base;
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
  const corporateTaxMethod = VALID_CORPORATE_TAX_METHODS.has(source.corporateTaxMethod)
    ? source.corporateTaxMethod
    : base.corporateTaxMethod;
  const provisionalTaxInstallments = source.provisionalTaxInstallments === 1 ? 1 : 2;
  const provisionalTaxMonthIndices = normalizeMonthIndexList(
    source.provisionalTaxMonthIndices,
    defaults.provisionalTaxMonthIndices,
    fiscalMonths,
  ).slice(0, provisionalTaxInstallments);
  return {
    regionPreset,
    corporateTaxMethod,
    effectiveCorporateTaxRatePercent,
    itemizedPrefecturalPerCapita: source.itemizedPrefecturalPerCapita == null
      || source.itemizedPrefecturalPerCapita === ''
      ? null
      : clampNonNegativeInt(source.itemizedPrefecturalPerCapita, 0),
    itemizedMunicipalPerCapita: source.itemizedMunicipalPerCapita == null
      || source.itemizedMunicipalPerCapita === ''
      ? null
      : clampNonNegativeInt(source.itemizedMunicipalPerCapita, 0),
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
  return `${Math.round(n * 100) / 100}%`;
}

/** 前年度法人税等の額から予定納税回数を決定する（48万円超は2回） */
export function resolveProvisionalTaxInstallments(corporateTaxAmount) {
  const amount = Math.max(0, Math.floor(Number(corporateTaxAmount) || 0));
  return amount > 480_000 ? 2 : 1;
}

export const TAX_REGION_PRESET_TOOLTIP = '標準税率: 資本金1億円超など一定規模以上の法人向け。中小法人: 資本金1億円以下などの中小法人向け（軽減税率・均等割等が異なります）。';
