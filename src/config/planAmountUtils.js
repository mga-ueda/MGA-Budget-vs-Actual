export function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function emptyMonthly(fiscalMonths) {
  const monthly = {};
  for (const month of fiscalMonths) monthly[month] = null;
  return monthly;
}
