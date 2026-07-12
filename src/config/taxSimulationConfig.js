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

/** 法人税・消費税のシミュレーション設定（年度ごとでは不要） */
export const DEFAULT_TAX_SIMULATION = {
  regionPreset: 'small',
  corporateTaxMethod: 'itemized',
  effectiveCorporateTaxRatePercent: 34.59,
  itemizedPrefecturalPerCapita: null,
  itemizedMunicipalPerCapita: null,
  profitEstimateMethod: 'fullYear',
  provisionalTaxEnabled: true,
  provisionalTaxInstallments: 'auto',
  provisionalTaxMaxInstallments: 2,
  corporateTaxSettlementMonthIndex: 1,
  provisionalTaxMonthIndices: [6],
  consumptionTaxMethod: 'general',
  simplifiedDeemedPurchaseRatePercent: 50,
  consumptionTaxExempt: false,
  consumptionTaxInterimEnabled: true,
  consumptionTaxSettlementMonthIndex: 1,
  consumptionTaxInterimMonthIndex: 6,
  lossCarryforwardDeduction: 0,
  /** 当期支払事業税のうち前期末申告納付分（課税所得の減算） */
  enterpriseTaxSettlementDeduction: 0,
  /** 当期支払事業税のうち予定納税分（課税所得の減算） */
  enterpriseTaxProvisionalDeduction: 0,
  /** 所得税額の還付（課税所得の加算。会計未反映分の調整用） */
  incomeTaxRefundAddition: 0,
};

/** 法人区分プリセット（標準／中小）。メニュー順は中小を先頭 */
export const TAX_REGION_PRESETS = {
  small: {
    label: '中小法人',
    effectiveCorporateTaxRatePercent: 34.59,
    itemized: { ...DEFAULT_ITEMIZED_TAX_PARAMS, isSmallCorporation: true },
  },
  standard: {
    label: '標準税率',
    effectiveCorporateTaxRatePercent: 30.62,
    itemized: { ...DEFAULT_ITEMIZED_TAX_PARAMS, isSmallCorporation: false },
  },
};

const VALID_REGION_PRESETS = new Set(Object.keys(TAX_REGION_PRESETS));

function resolveRegionPresetKey(rawKey, fallback) {
  if (VALID_REGION_PRESETS.has(rawKey)) return rawKey;
  return fallback;
}
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
    provisionalTaxMonthIndices: [6],
    consumptionTaxSettlementMonthIndex: 1,
    consumptionTaxInterimMonthIndex: 6,
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
  const regionPreset = resolveRegionPresetKey(source.regionPreset, base.regionPreset);
  const presetRate = TAX_REGION_PRESETS[regionPreset]?.effectiveCorporateTaxRatePercent;
  // 簡易時は手入力を保持。未設定時は法人区分の参考税率にフォールバック
  const effectiveCorporateTaxRatePercent = clampPercent(
    source.effectiveCorporateTaxRatePercent,
    presetRate ?? base.effectiveCorporateTaxRatePercent,
  );
  const profitEstimateMethod = VALID_PROFIT_METHODS.has(source.profitEstimateMethod)
    ? source.profitEstimateMethod
    : base.profitEstimateMethod;
  const consumptionTaxMethod = VALID_CONSUMPTION_METHODS.has(source.consumptionTaxMethod)
    ? source.consumptionTaxMethod
    : base.consumptionTaxMethod;
  const corporateTaxMethod = VALID_CORPORATE_TAX_METHODS.has(source.corporateTaxMethod)
    ? source.corporateTaxMethod
    : base.corporateTaxMethod;
  const provisionalTaxInstallments = source.provisionalTaxInstallments === 1 || source.provisionalTaxInstallments === 2
    ? source.provisionalTaxInstallments
    : 'auto';
  const provisionalTaxMaxInstallments = clampProvisionalMax(
    source.provisionalTaxMaxInstallments,
    base.provisionalTaxMaxInstallments ?? 2,
  );
  const provisionalTaxMonthIndices = normalizeMonthIndexList(
    source.provisionalTaxMonthIndices,
    defaults.provisionalTaxMonthIndices,
    fiscalMonths,
  ).slice(0, provisionalTaxMaxInstallments);
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
    provisionalTaxMaxInstallments,
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
    consumptionTaxExempt: source.consumptionTaxExempt === true,
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
    enterpriseTaxSettlementDeduction: clampNonNegativeInt(
      source.enterpriseTaxSettlementDeduction,
      base.enterpriseTaxSettlementDeduction,
    ),
    enterpriseTaxProvisionalDeduction: clampNonNegativeInt(
      source.enterpriseTaxProvisionalDeduction,
      base.enterpriseTaxProvisionalDeduction,
    ),
    incomeTaxRefundAddition: clampNonNegativeInt(
      source.incomeTaxRefundAddition,
      base.incomeTaxRefundAddition,
    ),
  };
}

export function formatTaxSimulationRatePercent(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n * 100) / 100}%`;
}

function clampProvisionalMax(value, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(4, Math.max(1, n));
}

/** 中間納付が不要になる半期税額の上限（円） */
export const PROVISIONAL_TAX_MIN_HALF_AMOUNT = 100_000;

/**
 * 予定納税回数を決定する。
 * auto: 中小法人は1回、それ以外は最大2回まで。半期税額10万円以下は0回。
 */
export function resolveProvisionalTaxInstallments({
  installments = 'auto',
  maxInstallments = 2,
  isSmallCorporation = true,
  provisionalBase = 0,
} = {}) {
  const max = clampProvisionalMax(maxInstallments, 2);
  const base = Math.max(0, Math.floor(Number(provisionalBase) || 0));
  const half = Math.round(base / 2);
  if (base <= 0 || half <= PROVISIONAL_TAX_MIN_HALF_AMOUNT) return 0;
  if (installments === 1 || installments === 2) return Math.min(installments, max);
  // auto
  const auto = isSmallCorporation ? 1 : Math.min(2, max);
  return Math.min(auto, max);
}

/** 予定納税月のインデックスを決定する（中間月を基準） */
export function resolveProvisionalTaxMonthIndices(fiscalMonths, installments, configuredIndices = []) {
  const count = Math.max(0, Math.floor(Number(installments) || 0));
  if (count <= 0) return [];
  const maxIdx = Math.max(0, (fiscalMonths?.length ?? 1) - 2);
  const mid = Math.min(6, maxIdx);
  const configured = (Array.isArray(configuredIndices) ? configuredIndices : [])
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= maxIdx);
  if (configured.length >= count) return configured.slice(0, count);
  if (count === 1) return [configured[0] ?? mid];
  const second = Math.min(mid + 3, maxIdx);
  const first = configured[0] ?? mid;
  const fallbackSecond = configured[1] ?? (second === first ? Math.min(first + 1, maxIdx) : second);
  return [first, fallbackSecond].slice(0, count);
}



/** 消費税中間申告の回数判定用閾値（国税分概算） */
export const CONSUMPTION_TAX_INTERIM_NATIONAL_THRESHOLDS = {
  noneMax: 480_000,
  onceMax: 4_000_000,
  thriceMax: 48_000_000,
};

/**
 * 消費税中間納税の回数を決定する。
 * 年間見込額（国税+地方）から国税分を78/100で概算して判定する。
 * @returns {0|1|3|11}
 */
export function resolveConsumptionTaxInterimInstallments(annualAmount) {
  const total = Math.max(0, Math.floor(Number(annualAmount) || 0));
  // 10%時の国税:地方 = 78:22。帳簿の合計納付額から国税分を概算する
  const national = Math.round(total * 78 / 100);
  if (national <= CONSUMPTION_TAX_INTERIM_NATIONAL_THRESHOLDS.noneMax) return 0;
  if (national <= CONSUMPTION_TAX_INTERIM_NATIONAL_THRESHOLDS.onceMax) return 1;
  if (national <= CONSUMPTION_TAX_INTERIM_NATIONAL_THRESHOLDS.thriceMax) return 3;
  return 11;
}

/** 消費税中間納税月のインデックスを決定する */
export function resolveConsumptionTaxInterimMonthIndices(fiscalMonths, installments, baseMonthIndex = 6) {
  const maxIdx = Math.max(0, (Array.isArray(fiscalMonths) ? fiscalMonths.length : 1) - 2);
  const count = Math.floor(Number(installments) || 0);
  if (count <= 0) return [];
  const base = Math.min(maxIdx, Math.max(0, Math.floor(Number(baseMonthIndex) || 6)));
  if (count === 1) return [base];
  if (count === 3) {
    // 3か月ごと・各期末の翌々月目安（12月始まりなら4・7・10月）
    return [4, 7, 10].map((i) => Math.min(i, maxIdx));
  }
  // 11回: 決算整理を除く月初寄りから11か月分
  const months = [];
  for (let i = 0; i <= maxIdx && months.length < 11; i += 1) months.push(i);
  return months;
}

export const TAX_REGION_PRESET_TOOLTIP = '標準税率: 資本金1億円超など一定規模以上の法人向け。中小法人: 資本金1億円以下などの中小法人向け（軽減税率・均等割等が異なります）。';
