/** Round down to the nearest unit (e.g. 1000 yen). */
export function roundDownToUnit(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || unit <= 0) return 0;
  return Math.floor(n / unit) * unit;
}

/** Tiered tax: each tier applies rate to the slice within [prevLimit, limit). */
function computeTieredTax(amount, tiers) {
  let remaining = Math.max(0, Number(amount) || 0);
  let prevLimit = 0;
  let total = 0;
  for (const tier of tiers) {
    const limit = tier.limit ?? Infinity;
    const slice = Math.min(remaining, limit - prevLimit);
    if (slice <= 0) break;
    total += slice * (Number(tier.ratePercent) || 0) / 100;
    remaining -= slice;
    prevLimit = limit;
    if (remaining <= 0) break;
  }
  return total;
}

/**
 * Itemized corporate tax (Osaka-style verification sheet).
 * Rounding: taxable income -> 1000 yen; most taxes -> 100 yen.
 * Dependent taxes use corporate tax rounded down to 1000 yen.
 */
export function computeItemizedCorporateTax(preTaxProfitAfterLossDeduction, params) {
  const taxableIncome = roundDownToUnit(Math.max(0, preTaxProfitAfterLossDeduction), 1000);

  let corporateTaxRaw;
  if (params.isSmallCorporation) {
    const threshold = Number(params.corporateTaxThreshold) || 8_000_000;
    const lowRate = Number(params.corporateTaxRateLowPercent) || 15;
    const highRate = Number(params.corporateTaxRateHighPercent) || 23.2;
    const tier1 = Math.min(taxableIncome, threshold);
    const tier2 = Math.max(0, taxableIncome - threshold);
    corporateTaxRaw = tier1 * lowRate / 100 + tier2 * highRate / 100;
  } else {
    const rate = Number(params.corporateTaxRateHighPercent) || 23.2;
    corporateTaxRaw = taxableIncome * rate / 100;
  }
  const corporateTax = roundDownToUnit(corporateTaxRaw, 100);
  const corporateTaxBase = roundDownToUnit(corporateTax, 1000);

  const localCorporateTax = roundDownToUnit(
    corporateTaxBase * (Number(params.localCorporateTaxRatePercent) || 10.3) / 100,
    100,
  );
  const prefecturalIncomeTax = roundDownToUnit(
    corporateTaxBase * (Number(params.prefecturalIncomeTaxRatePercent) || 1) / 100,
    100,
  );
  const prefecturalPerCapita = Math.max(0, Math.floor(Number(params.prefecturalPerCapita) || 0));
  const enterpriseTax = roundDownToUnit(
    computeTieredTax(taxableIncome, params.enterpriseTaxTiers),
    100,
  );
  const specialLocalEnterpriseTax = roundDownToUnit(
    enterpriseTax * (Number(params.specialLocalEnterpriseTaxRatePercent) || 37) / 100,
    100,
  );
  const municipalIncomeTax = roundDownToUnit(
    corporateTaxBase * (Number(params.municipalIncomeTaxRatePercent) || 6) / 100,
    100,
  );
  const municipalPerCapita = Math.max(0, Math.floor(Number(params.municipalPerCapita) || 0));

  const total = corporateTax
    + localCorporateTax
    + prefecturalIncomeTax
    + prefecturalPerCapita
    + enterpriseTax
    + specialLocalEnterpriseTax
    + municipalIncomeTax
    + municipalPerCapita;

  const effectiveRatePercent = taxableIncome > 0
    ? Math.round((total / taxableIncome) * 10000) / 100
    : 0;

  return {
    taxableIncome,
    total,
    effectiveRatePercent,
    breakdown: [
      { id: 'corporateTax', amount: corporateTax },
      { id: 'localCorporateTax', amount: localCorporateTax },
      { id: 'prefecturalIncomeTax', amount: prefecturalIncomeTax },
      { id: 'prefecturalPerCapita', amount: prefecturalPerCapita },
      { id: 'enterpriseTax', amount: enterpriseTax },
      { id: 'specialLocalEnterpriseTax', amount: specialLocalEnterpriseTax },
      { id: 'municipalIncomeTax', amount: municipalIncomeTax },
      { id: 'municipalPerCapita', amount: municipalPerCapita },
    ],
    corporateTaxBase,
  };
}

export const ITEMIZED_TAX_LINE_LABELS = {
  taxableIncome: '課税所得',
  corporateTax: '法人税',
  localCorporateTax: '地方法人税',
  prefecturalIncomeTax: '道府県民税（所得分）',
  prefecturalPerCapita: '道府県民税（均等割）',
  enterpriseTax: '事業税',
  specialLocalEnterpriseTax: '特別法人事業税',
  municipalIncomeTax: '市町村民税（所得分）',
  municipalPerCapita: '市町村民税（均等割）',
  total: '法人税等合計',
};
