/** 適用開始日（年月）ごとの消費税率（％）。昇順で並べ、該当日以降に有効。 */
export const DEFAULT_CONSUMPTION_TAX_RATES = [
  { year: 1989, month: 4, ratePercent: 3 },
  { year: 1997, month: 4, ratePercent: 5 },
  { year: 2014, month: 4, ratePercent: 8 },
  { year: 2019, month: 10, ratePercent: 10 },
];

export function normalizeConsumptionTaxRateEntry(entry) {
  const year = parseInt(entry?.year, 10);
  const month = parseInt(entry?.month, 10);
  const ratePercent = Number(entry?.ratePercent);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) return null;
  return {
    year,
    month,
    ratePercent: Math.round(ratePercent * 100) / 100,
  };
}

export function normalizeConsumptionTaxRates(rates) {
  if (!Array.isArray(rates) || rates.length === 0) {
    return DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r }));
  }
  const seen = new Map();
  for (const entry of rates) {
    const normalized = normalizeConsumptionTaxRateEntry(entry);
    if (!normalized) continue;
    seen.set(normalized.year * 100 + normalized.month, normalized);
  }
  if (seen.size === 0) {
    return DEFAULT_CONSUMPTION_TAX_RATES.map((r) => ({ ...r }));
  }
  return [...seen.values()].sort((a, b) => {
    const ka = a.year * 100 + a.month;
    const kb = b.year * 100 + b.month;
    return ka - kb;
  });
}

/** 指定年月時点で有効な消費税率（％）。該当なしは null */
export function getConsumptionTaxRatePercent(calendarYear, calendarMonth, rates) {
  const normalized = normalizeConsumptionTaxRates(rates);
  const target = calendarYear * 100 + calendarMonth;
  let found = null;
  for (const row of normalized) {
    const key = row.year * 100 + row.month;
    if (key <= target) found = row.ratePercent;
    else break;
  }
  return found;
}

/** 税抜金額を税率定義に基づき税込に換算（円・四捨五入） */
export function calcTaxInclusiveFromTaxExclusiveAmount(
  taxExclusiveYen,
  calendarYear,
  calendarMonth,
  rates,
) {
  const base = Math.max(0, Math.floor(Number(taxExclusiveYen) || 0));
  if (base === 0) return 0;
  const ratePercent = getConsumptionTaxRatePercent(calendarYear, calendarMonth, rates);
  if (ratePercent == null || ratePercent <= 0) return base;
  return Math.round(base * (100 + ratePercent) / 100);
}
