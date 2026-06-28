const TAX_PAYMENT_STORAGE_KEY = 'mga-tax-payment-plans';

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function emptyMonthly(fiscalMonths) {
  const monthly = {};
  for (const month of fiscalMonths) monthly[month] = null;
  return monthly;
}

export function normalizeTaxPaymentPlan(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan && typeof plan === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan[month]);
    }
  }
  return monthly;
}

export function loadTaxPaymentPlans() {
  try {
    const raw = localStorage.getItem(TAX_PAYMENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTaxPaymentPlans(plans) {
  localStorage.setItem(TAX_PAYMENT_STORAGE_KEY, JSON.stringify(plans));
  return plans;
}

export function getTaxPaymentPlan(plans, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const stored = plans[periodKey];
  return normalizeTaxPaymentPlan(stored, fiscalMonths);
}

export function setTaxPaymentPlan(plans, fiscalPeriod, monthly, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  return saveTaxPaymentPlans({
    ...plans,
    [periodKey]: normalizeTaxPaymentPlan(monthly, fiscalMonths),
  });
}

export function sumTaxPaymentPlanTotal(plan, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += plan[month] ?? 0;
  }
  return total;
}
