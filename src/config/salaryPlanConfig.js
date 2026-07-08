import { normalizeFiscalEndMonth } from './appSettings.js';
import { computeMonthlySalary } from './employeeConfig.js';
import { normalizeAmount, emptyMonthly } from './planAmountUtils.js';

const SALARY_PLAN_STORAGE_KEY = 'mga-salary-plans';
const SALARY_PLAN_SETTINGS_STORAGE_KEY = 'mga-salary-plan-settings';
const MAX_BONUS_COUNT = 2;
export const DEFAULT_BONUS_PAYMENT_MONTHS = [6, 12];
export const DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON = 20000;

export function buildFiscalYearMonths(fiscalEndMonth) {
  const end = normalizeFiscalEndMonth(fiscalEndMonth);
  // 決算月12月の場合は表示順も12月始まり（12月→11月）
  const start = end === 12 ? 12 : (end % 12) + 1;
  const months = [];
  let m = start;
  for (let i = 0; i < 12; i += 1) {
    months.push(`${m}月`);
    m = (m % 12) + 1;
  }
  return months;
}

export function monthLabelToNumber(label) {
  const m = String(label).match(/^(\d{1,2})月$/);
  return m ? parseInt(m[1], 10) : null;
}

export function monthNumberToLabel(num) {
  return `${num}月`;
}

export function normalizeBonusPaymentMonths(raw, fiscalMonths) {
  const validNumbers = new Set(fiscalMonths.map(monthLabelToNumber));
  const result = [];
  const source = Array.isArray(raw) ? raw : DEFAULT_BONUS_PAYMENT_MONTHS;
  for (const item of source) {
    let num = typeof item === 'number' ? item : monthLabelToNumber(item);
    if (num == null && typeof item === 'string' && item !== '') {
      num = parseInt(item, 10);
    }
    if (!Number.isInteger(num) || num < 1 || num > 12) continue;
    if (!validNumbers.has(num)) continue;
    if (result.includes(num)) continue;
    result.push(num);
    if (result.length >= MAX_BONUS_COUNT) break;
  }
  return result;
}

export function bonusPaymentMonthLabels(monthNumbers) {
  return monthNumbers.map(monthNumberToLabel);
}

export function loadSalaryPlanSettings() {
  try {
    const raw = localStorage.getItem(SALARY_PLAN_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSalaryPlanSettings(settings) {
  localStorage.setItem(SALARY_PLAN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export function getBonusPaymentMonths(settings, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const raw = settings[periodKey]?.bonusMonths;
  return normalizeBonusPaymentMonths(raw ?? DEFAULT_BONUS_PAYMENT_MONTHS, fiscalMonths);
}

export function setBonusPaymentMonths(settings, fiscalPeriod, monthNumbers, fiscalMonths) {
  const normalized = normalizeBonusPaymentMonths(monthNumbers, fiscalMonths);
  const periodKey = String(fiscalPeriod);
  const existing = settings[periodKey] ?? {};
  return saveSalaryPlanSettings({
    ...settings,
    [periodKey]: { ...existing, bonusMonths: normalized },
  });
}

export function normalizeOvertimeMonthly(raw, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (raw && typeof raw === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(raw[month]);
    }
  }
  return monthly;
}

export function getOvertimePlan(settings, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const raw = settings[periodKey]?.overtimeMonthly;
  return normalizeOvertimeMonthly(raw, fiscalMonths);
}

export function setOvertimePlan(settings, fiscalPeriod, overtimeMonthly, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const existing = settings[periodKey] ?? {};
  return saveSalaryPlanSettings({
    ...settings,
    [periodKey]: {
      ...existing,
      overtimeMonthly: normalizeOvertimeMonthly(overtimeMonthly, fiscalMonths),
    },
  });
}

export function sumOvertimePlanTotal(overtimeMonthly, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += overtimeMonthly[month] ?? 0;
  }
  return total;
}

export function normalizeTravelAllowancePerPerson(value) {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON;
  }
  return num;
}

export function getTravelAllowancePerPerson(settings, fiscalPeriod) {
  const periodKey = String(fiscalPeriod);
  const raw = settings[periodKey]?.travelAllowancePerPerson;
  if (raw === null || raw === undefined) {
    return DEFAULT_TRAVEL_ALLOWANCE_PER_PERSON;
  }
  return normalizeTravelAllowancePerPerson(raw);
}

export function setTravelAllowancePerPerson(settings, fiscalPeriod, amount) {
  const periodKey = String(fiscalPeriod);
  const existing = settings[periodKey] ?? {};
  return saveSalaryPlanSettings({
    ...settings,
    [periodKey]: {
      ...existing,
      travelAllowancePerPerson: normalizeTravelAllowancePerPerson(amount),
    },
  });
}

export function pruneBonusMonthly(bonusMonthly, bonusMonthLabels, fiscalMonths) {
  const allowed = new Set(bonusMonthLabels);
  const next = emptyMonthly(fiscalMonths);
  for (const month of fiscalMonths) {
    next[month] = allowed.has(month) ? bonusMonthly[month] : null;
  }
  return next;
}

export function prunePeriodSalaryPlanBonuses(plans, bonusMonthLabels, fiscalPeriod, employees, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  if (!plans[periodKey]) return plans;
  const nextPeriod = { ...plans[periodKey] };
  for (const emp of employees) {
    if (!nextPeriod[emp.id]) continue;
    const plan = normalizeEmployeeSalaryPlan(nextPeriod[emp.id], fiscalMonths);
    nextPeriod[emp.id] = {
      ...plan,
      bonusMonthly: pruneBonusMonthly(plan.bonusMonthly, bonusMonthLabels, fiscalMonths),
    };
  }
  return saveSalaryPlans({ ...plans, [periodKey]: nextPeriod });
}

export function parseSalaryPlanAmountInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

/** Shift+Enter 反映時、入力が空でもセルに 0 など既存値がある場合はその値を使う */
export function parseSalaryPlanAmountInputWithFillForward(raw, fillForward, existingValue) {
  const parsed = parseSalaryPlanAmountInput(raw);
  if (!fillForward || parsed !== null || String(raw ?? '').trim() !== '') return parsed;
  if (existingValue === null || existingValue === undefined) return null;
  return existingValue;
}

export function formatSalaryPlanAmount(value) {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return num.toLocaleString('ja-JP');
}

export function formatSalaryPlanYen(value) {
  if (value === null || value === undefined || value === 0) return '';
  return `\u00a5${value.toLocaleString('ja-JP')}`;
}

export function normalizeEmployeeSalaryPlan(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan?.monthly && typeof plan.monthly === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan.monthly[month]);
    }
  }
  const bonusMonthly = emptyMonthly(fiscalMonths);
  if (plan?.bonusMonthly && typeof plan.bonusMonthly === 'object') {
    for (const month of fiscalMonths) {
      bonusMonthly[month] = normalizeAmount(plan.bonusMonthly[month]);
    }
  }
  return { monthly, bonusMonthly };
}

export function createDefaultEmployeeSalaryPlan(employee, fiscalMonths) {
  const defaultSalary = computeMonthlySalary(employee);
  const monthly = emptyMonthly(fiscalMonths);
  if (defaultSalary > 0) {
    for (const month of fiscalMonths) monthly[month] = defaultSalary;
  }
  return { monthly, bonusMonthly: emptyMonthly(fiscalMonths) };
}

export function loadSalaryPlans() {
  try {
    const raw = localStorage.getItem(SALARY_PLAN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSalaryPlans(plans) {
  localStorage.setItem(SALARY_PLAN_STORAGE_KEY, JSON.stringify(plans));
  return plans;
}

export function getEmployeeSalaryPlan(plans, fiscalPeriod, employeeId, employee, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const stored = plans[periodKey]?.[employeeId];
  if (stored) return normalizeEmployeeSalaryPlan(stored, fiscalMonths);
  return createDefaultEmployeeSalaryPlan(employee, fiscalMonths);
}

export function setEmployeeSalaryPlan(plans, fiscalPeriod, employeeId, plan) {
  const periodKey = String(fiscalPeriod);
  const next = { ...plans };
  if (!next[periodKey]) next[periodKey] = {};
  next[periodKey] = {
    ...next[periodKey],
    [employeeId]: plan,
  };
  return saveSalaryPlans(next);
}

export function applyAmountFromMonthForward(source, fiscalMonths, startMonth, amount) {
  const next = { ...source };
  const startIndex = fiscalMonths.indexOf(startMonth);
  if (startIndex < 0) return next;
  next[startMonth] = amount;
  for (let i = startIndex + 1; i < fiscalMonths.length; i += 1) {
    next[fiscalMonths[i]] = amount;
  }
  return next;
}

/** 支払い計画など。過去月を除き、0・空欄も後続月へ反映する */
export function applyAmountFromMonthForwardSkippingPast(
  source,
  fiscalMonths,
  startMonth,
  amount,
  pastMonths,
) {
  const next = { ...source };
  const startIndex = fiscalMonths.indexOf(startMonth);
  if (startIndex < 0) return next;
  next[startMonth] = amount;
  for (let i = startIndex + 1; i < fiscalMonths.length; i += 1) {
    const month = fiscalMonths[i];
    if (pastMonths?.has(month)) continue;
    next[month] = amount;
  }
  return next;
}

export function salaryPlanAmountDiffersFromPrevious(prev, current) {
  const p = normalizeAmount(prev) ?? 0;
  const c = normalizeAmount(current) ?? 0;
  if (p === 0 && c === 0) return false;
  return p !== c;
}

export function computeSalaryPlanEmployeeTotal(plan, fiscalMonths, includeBonus = true) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += plan.monthly[month] ?? 0;
    if (includeBonus) total += plan.bonusMonthly[month] ?? 0;
  }
  return total;
}

export function computeSalaryPlanMonthlyTotals(employees, plans, fiscalPeriod, fiscalMonths, rowKind) {
  const totals = emptyMonthly(fiscalMonths);
  for (const emp of employees) {
    const plan = getEmployeeSalaryPlan(plans, fiscalPeriod, emp.id, emp, fiscalMonths);
    const source = rowKind === 'bonus' ? plan.bonusMonthly : plan.monthly;
    for (const month of fiscalMonths) {
      totals[month] = (totals[month] ?? 0) + (source[month] ?? 0);
    }
  }
  return totals;
}

export function sumMonthlyPlanTotal(plan, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += plan.monthly[month] ?? 0;
  }
  return total;
}

export function computeSalaryIncreaseRate(currentTotal, nextTotal) {
  if (!Number.isFinite(currentTotal) || currentTotal <= 0) return null;
  if (!Number.isFinite(nextTotal)) return null;
  return ((nextTotal - currentTotal) / currentTotal) * 100;
}

export function formatSalaryIncreaseRate(ratePercent) {
  if (ratePercent === null || !Number.isFinite(ratePercent)) return '';
  const rounded = Math.round(ratePercent * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%`;
}

export { MAX_BONUS_COUNT };
