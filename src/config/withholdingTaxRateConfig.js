/** 1回の支払額に対する源泉徴収の段階税率（基本・超過分・個人事業主向け） */
export const DEFAULT_WITHHOLDING_THRESHOLD_YEN = 1000000;

/** 適用開始年月ごとの段階税率。古い順、該当日以降に有効。 */
export const DEFAULT_WITHHOLDING_TAX_RATES = [
  {
    year: 1984,
    month: 1,
    thresholdYen: DEFAULT_WITHHOLDING_THRESHOLD_YEN,
    baseRatePercent: 10,
    excessRatePercent: 20,
  },
  {
    year: 2013,
    month: 1,
    thresholdYen: DEFAULT_WITHHOLDING_THRESHOLD_YEN,
    baseRatePercent: 10.21,
    excessRatePercent: 20.42,
  },
];

function inferExcessRatePercent(baseRatePercent) {
  if (baseRatePercent === 10.21) return 20.42;
  if (baseRatePercent === 10) return 20;
  return Math.round(baseRatePercent * 2 * 100) / 100;
}

export function normalizeWithholdingTaxRateEntry(entry) {
  const year = parseInt(entry?.year, 10);
  const month = parseInt(entry?.month, 10);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  let thresholdYen = parseInt(entry?.thresholdYen, 10);
  let baseRatePercent = Number(entry?.baseRatePercent);
  let excessRatePercent = Number(entry?.excessRatePercent);

  if (!Number.isFinite(baseRatePercent) && Number.isFinite(Number(entry?.ratePercent))) {
    baseRatePercent = Number(entry.ratePercent);
    thresholdYen = DEFAULT_WITHHOLDING_THRESHOLD_YEN;
    excessRatePercent = inferExcessRatePercent(baseRatePercent);
  }

  if (!Number.isInteger(thresholdYen) || thresholdYen < 0) return null;
  if (!Number.isFinite(baseRatePercent) || baseRatePercent < 0 || baseRatePercent > 100) return null;
  if (!Number.isFinite(excessRatePercent) || excessRatePercent < 0 || excessRatePercent > 100) return null;

  return {
    year,
    month,
    thresholdYen,
    baseRatePercent: Math.round(baseRatePercent * 100) / 100,
    excessRatePercent: Math.round(excessRatePercent * 100) / 100,
  };
}

export function normalizeWithholdingTaxRates(rates) {
  if (!Array.isArray(rates) || rates.length === 0) {
    return DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r }));
  }
  const seen = new Map();
  for (const entry of rates) {
    const normalized = normalizeWithholdingTaxRateEntry(entry);
    if (!normalized) continue;
    seen.set(normalized.year * 100 + normalized.month, normalized);
  }
  if (seen.size === 0) {
    return DEFAULT_WITHHOLDING_TAX_RATES.map((r) => ({ ...r }));
  }
  return [...seen.values()].sort((a, b) => {
    const ka = a.year * 100 + a.month;
    const kb = b.year * 100 + b.month;
    return ka - kb;
  });
}

/** 指定年月時点で有効な段階税率定義 */
export function getEffectiveWithholdingSchedule(calendarYear, calendarMonth, rates) {
  const normalized = normalizeWithholdingTaxRates(rates);
  const target = calendarYear * 100 + calendarMonth;
  let found = null;
  for (const row of normalized) {
    const key = row.year * 100 + row.month;
    if (key <= target) found = row;
    else break;
  }
  return found;
}

/**
 * 源泉徴収税額（円・1円未満切り捨て）。
 * paymentYen: 1回の支払額（税抜報酬。消費税区分がある場合は本体額）
 */
export function calcWithholdingTax(paymentYen, calendarYear, calendarMonth, rates) {
  const amount = Math.max(0, Math.floor(Number(paymentYen) || 0));
  if (amount === 0) return 0;

  const schedule = getEffectiveWithholdingSchedule(calendarYear, calendarMonth, rates);
  if (!schedule) return 0;

  const { thresholdYen, baseRatePercent, excessRatePercent } = schedule;
  if (amount <= thresholdYen) {
    return Math.floor(amount * baseRatePercent / 100);
  }

  const baseTax = Math.floor(thresholdYen * baseRatePercent / 100);
  const excessTax = Math.floor((amount - thresholdYen) * excessRatePercent / 100);
  return baseTax + excessTax;
}
