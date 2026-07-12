import { collectEmployeeResidentTaxMunicipalityNames, getEmployeeResidentTaxMunicipality, employeeHasResidentTaxObligation } from './employeeConfig.js';
import { normalizeAmount, emptyMonthly } from './planAmountUtils.js';
import { formatFiscalPeriodLabel } from './appSettings.js';

const TAX_PAYMENT_STORAGE_KEY = 'mga-tax-payment-plans';
const TAX_PAYMENT_SETTINGS_STORAGE_KEY = 'mga-tax-payment-settings';

export const DEFAULT_PAYMENT_PLAN_YEARS = 5;
const MIN_PAYMENT_PLAN_YEARS = 1;
const MAX_PAYMENT_PLAN_YEARS = 30;

export const RESIDENT_TAX_ACCOUNT = '住民税';

/** 予実表「法人税」セクションに反映する勘定 */
export const CORPORATE_TAX_ACCOUNT = '法人税等';
export const CORPORATE_TAX_SECTION_LABEL = '法人税';

/** 支払い設定で管理する勘定科目（表示・集計用） */
export const PAYMENT_PLAN_ACCOUNTS = [
  '租税公課',
  '保険積立金',
  '長期未払金',
  '長期借入金',
  '未払消費税',
  '未払法人税等',
  '住民税',
  '役員借入金',
  CORPORATE_TAX_ACCOUNT,
];

/** 単一行で編集する勘定科目 */
export const PAYMENT_PLAN_SIMPLE_ACCOUNTS = [
  '租税公課',
  '保険積立金',
  '長期未払金',
  '長期借入金',
  '未払消費税',
  '未払法人税等',
  '役員借入金',
  CORPORATE_TAX_ACCOUNT,
];

const RESIDENT_TAX_MUNICIPALITIES_KEY = 'residentTaxMunicipalities';

/** 予実表の「その他」セクションに反映する勘定 */
export const PAYMENT_PLAN_OTHER_SECTION_ACCOUNTS = new Set(['租税公課']);

/** 予実表の「法人税」セクションに反映する勘定 */
export const PAYMENT_PLAN_TAX_SECTION_ACCOUNTS = new Set([CORPORATE_TAX_ACCOUNT]);

/** 支払い計画表で勘定科目列にセクション名を表示する行 */
export const PAYMENT_PLAN_ACCOUNT_SECTION_LABELS = {
  [CORPORATE_TAX_ACCOUNT]: CORPORATE_TAX_SECTION_LABEL,
};

/** 予実表の「その他支払」セクションに反映する勘定 */
export const PAYMENT_PLAN_OTHER_PAY_ACCOUNTS = new Set([
  '保険積立金',
  '長期未払金',
  '長期借入金',
  '未払消費税',
  '未払法人税等',
  '住民税',
  '役員借入金',
]);

/** 単一行で編集する「その他支払」勘定 */
export const PAYMENT_PLAN_OTHER_PAY_SIMPLE_ACCOUNTS = [
  '保険積立金',
  '長期未払金',
  '長期借入金',
  '未払消費税',
  '未払法人税等',
  '役員借入金',
];

/** 予実表で直接編集できる支払い計画（補助科目なし行） */
export const PLAN_TABLE_TAX_PAYMENT_NO_SUB_LABEL = '補助科目なし';

export const PLAN_TABLE_TAX_PAYMENT_OTHER_ACCOUNT = '租税公課';

export const PLAN_TABLE_TAX_PAYMENT_OTHER_PAY_EDITABLE_ACCOUNTS = [
  '未払消費税',
  '未払法人税等',
];

/** 予実表「法人税」セクションで直接編集できる支払い計画勘定 */
export const PLAN_TABLE_TAX_PAYMENT_TAX_EDITABLE_ACCOUNTS = [
  CORPORATE_TAX_ACCOUNT,
];

export function normalizeTaxPaymentPlan(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan && typeof plan === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan[month]);
    }
  }
  return monthly;
}

function normalizePeriodPlans(stored, fiscalMonths) {
  if (!stored || typeof stored !== 'object') return {};
  const result = {};
  for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
    result[account] = normalizeTaxPaymentPlan(stored[account], fiscalMonths);
  }
  return result;
}

function getPeriodStorageRaw(plans, fiscalPeriod) {
  const stored = plans[String(fiscalPeriod)];
  if (!stored || typeof stored !== 'object') return {};
  return stored;
}

export function createResidentTaxMunicipalityId(municipality) {
  const base = String(municipality ?? '').trim();
  return `rt-m-${encodeURIComponent(base).replace(/%/g, '_')}`;
}

export function normalizeResidentTaxMunicipalityEntry(entry, fiscalMonths) {
  if (!entry || typeof entry !== 'object') return null;
  const municipality = String(entry.municipality ?? '').trim();
  if (!municipality) return null;
  const id = String(entry.id ?? '').trim() || createResidentTaxMunicipalityId(municipality);
  return {
    id,
    municipality,
    monthly: normalizeTaxPaymentPlan(entry.monthly, fiscalMonths),
    manual: entry.manual === true,
  };
}

export function getResidentTaxMunicipalityEntries(plans, fiscalPeriod, fiscalMonths) {
  const raw = getPeriodStorageRaw(plans, fiscalPeriod);
  const entries = (Array.isArray(raw[RESIDENT_TAX_MUNICIPALITIES_KEY])
    ? raw[RESIDENT_TAX_MUNICIPALITIES_KEY]
    : [])
    .map((entry) => normalizeResidentTaxMunicipalityEntry(entry, fiscalMonths))
    .filter(Boolean);
  const seen = new Set();
  const unique = entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  if (unique.length > 0) return unique;
  return [];
}

function serializePeriodStorage(periodPlans, municipalities, fiscalMonths) {
  const data = {};
  for (const account of PAYMENT_PLAN_SIMPLE_ACCOUNTS) {
    data[account] = periodPlans[account] ?? normalizeTaxPaymentPlan(null, fiscalMonths);
  }
  data[RESIDENT_TAX_MUNICIPALITIES_KEY] = municipalities.map((entry) => ({
    id: entry.id,
    municipality: entry.municipality,
    monthly: normalizeTaxPaymentPlan(entry.monthly, fiscalMonths),
    ...(entry.manual ? { manual: true } : {}),
  }));
  return data;
}

export function setResidentTaxMunicipalityEntries(plans, fiscalPeriod, municipalities, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const periodPlans = getPaymentPlansForPeriod(plans, fiscalPeriod, fiscalMonths);
  const normalized = municipalities
    .map((entry) => normalizeResidentTaxMunicipalityEntry(entry, fiscalMonths))
    .filter(Boolean);
  return saveTaxPaymentPlans({
    ...plans,
    [periodKey]: serializePeriodStorage(periodPlans, normalized, fiscalMonths),
  });
}

export function setResidentTaxMunicipalityEntry(plans, fiscalPeriod, entry, fiscalMonths) {
  const normalized = normalizeResidentTaxMunicipalityEntry(entry, fiscalMonths);
  if (!normalized) return plans;
  const entries = getResidentTaxMunicipalityEntries(plans, fiscalPeriod, fiscalMonths);
  const idx = entries.findIndex((e) => e.id === normalized.id);
  const next = [...entries];
  if (idx >= 0) next[idx] = normalized;
  else next.push(normalized);
  return setResidentTaxMunicipalityEntries(plans, fiscalPeriod, next, fiscalMonths);
}

export function removeResidentTaxMunicipalityEntry(plans, fiscalPeriod, municipalityId, fiscalMonths) {
  const entries = getResidentTaxMunicipalityEntries(plans, fiscalPeriod, fiscalMonths);
  return setResidentTaxMunicipalityEntries(
    plans,
    fiscalPeriod,
    entries.filter((e) => e.id !== municipalityId),
    fiscalMonths,
  );
}

export function createManualResidentTaxMunicipality({ municipality }) {
  const name = String(municipality ?? '').trim();
  if (!name) return null;
  return {
    id: createResidentTaxMunicipalityId(name),
    municipality: name,
    monthly: {},
    manual: true,
  };
}

export function sumResidentTaxMunicipalityMonthly(municipalities, fiscalMonths) {
  const total = emptyMonthly(fiscalMonths);
  for (const entry of municipalities) {
    for (const month of fiscalMonths) {
      const amount = entry.monthly?.[month] ?? 0;
      if (amount !== 0) {
        total[month] = (total[month] ?? 0) + amount;
      }
    }
  }
  for (const month of fiscalMonths) {
    if (total[month] === 0) total[month] = null;
  }
  return total;
}

export function mergeResidentTaxMunicipalitiesFromNames(
  plans,
  fiscalPeriod,
  municipalityNames,
  fiscalMonths,
) {
  if (!Array.isArray(municipalityNames) || municipalityNames.length === 0) return plans;
  const entries = getResidentTaxMunicipalityEntries(plans, fiscalPeriod, fiscalMonths);
  const existing = new Set(entries.map((e) => e.municipality));
  let changed = false;
  const next = [...entries];
  for (const rawName of municipalityNames) {
    const municipality = String(rawName ?? '').trim();
    if (!municipality || existing.has(municipality)) continue;
    existing.add(municipality);
    const created = createManualResidentTaxMunicipality({ municipality });
    if (created) {
      next.push(normalizeResidentTaxMunicipalityEntry(created, fiscalMonths));
      changed = true;
    }
  }
  if (!changed) return plans;
  return setResidentTaxMunicipalityEntries(plans, fiscalPeriod, next, fiscalMonths);
}

export function syncResidentTaxMunicipalitiesFromReference(
  plans,
  targetPeriod,
  referencePeriod,
  fiscalMonths,
) {
  const refEntries = getResidentTaxMunicipalityEntries(plans, referencePeriod, fiscalMonths);
  const targetEntries = getResidentTaxMunicipalityEntries(plans, targetPeriod, fiscalMonths);
  const targetNames = new Set(targetEntries.map((e) => e.municipality));
  let changed = false;
  const next = [...targetEntries];
  for (const ref of refEntries) {
    if (targetNames.has(ref.municipality)) continue;
    targetNames.add(ref.municipality);
    next.push({
      id: createResidentTaxMunicipalityId(ref.municipality),
      municipality: ref.municipality,
      monthly: emptyMonthly(fiscalMonths),
      manual: ref.manual === true,
    });
    changed = true;
  }
  if (!changed) return plans;
  return setResidentTaxMunicipalityEntries(plans, targetPeriod, next, fiscalMonths);
}

export function collectResidentTaxMunicipalityNamesFromEmployees(employees) {
  return collectEmployeeResidentTaxMunicipalityNames(employees);
}

/** 計画・実績・社員マスタから、表示対象の市区町村か判定 */
export function isResidentTaxMunicipalityVisible(entry, { employees, actualMonthly, fiscalMonths }) {
  if (!entry) return false;
  if (entry.manual) return true;
  for (const month of fiscalMonths) {
    if ((entry.monthly?.[month] ?? 0) !== 0) return true;
    if ((actualMonthly?.[month] ?? 0) !== 0) return true;
  }
  const municipality = String(entry.municipality ?? '').trim();
  if (!municipality || municipality === '未設定') return false;
  for (const employee of employees ?? []) {
    if (getEmployeeResidentTaxMunicipality(employee) !== municipality) continue;
    if (employeeHasResidentTaxObligation(employee)) return true;
  }
  return false;
}

export function filterVisibleResidentTaxMunicipalities(entries, { employees, actualByMunicipality, fiscalMonths }) {
  const actualMap = actualByMunicipality instanceof Map ? actualByMunicipality : null;
  return entries.filter((entry) => isResidentTaxMunicipalityVisible(entry, {
    employees,
    actualMonthly: actualMap
      ? (actualMap.get(entry.municipality) ?? {})
      : (actualByMunicipality?.[entry.municipality] ?? {}),
    fiscalMonths,
  }));
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

export function getPaymentPlansForPeriod(plans, fiscalPeriod, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const stored = plans[periodKey];
  return normalizePeriodPlans(stored, fiscalMonths);
}

export function getTaxPaymentPlan(plans, fiscalPeriod, fiscalMonths) {
  const periodPlans = getPaymentPlansForPeriod(plans, fiscalPeriod, fiscalMonths);
  return periodPlans['租税公課'] ?? normalizeTaxPaymentPlan(null, fiscalMonths);
}

export function getPaymentPlanAccount(plans, fiscalPeriod, account, fiscalMonths) {
  const periodPlans = getPaymentPlansForPeriod(plans, fiscalPeriod, fiscalMonths);
  return periodPlans[account] ?? normalizeTaxPaymentPlan(null, fiscalMonths);
}

export function setPaymentPlanAccount(plans, fiscalPeriod, account, monthly, fiscalMonths) {
  if (account === RESIDENT_TAX_ACCOUNT) return plans;
  const periodKey = String(fiscalPeriod);
  const periodPlans = getPaymentPlansForPeriod(plans, fiscalPeriod, fiscalMonths);
  const municipalities = getResidentTaxMunicipalityEntries(plans, fiscalPeriod, fiscalMonths);
  periodPlans[account] = normalizeTaxPaymentPlan(monthly, fiscalMonths);
  return saveTaxPaymentPlans({
    ...plans,
    [periodKey]: serializePeriodStorage(periodPlans, municipalities, fiscalMonths),
  });
}

export function setTaxPaymentPlan(plans, fiscalPeriod, monthly, fiscalMonths) {
  return setPaymentPlanAccount(plans, fiscalPeriod, '租税公課', monthly, fiscalMonths);
}

export function sumTaxPaymentPlanTotal(plan, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) {
    total += plan[month] ?? 0;
  }
  return total;
}

export function normalizePaymentPlanYears(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_PAYMENT_PLAN_YEARS;
  return Math.min(MAX_PAYMENT_PLAN_YEARS, Math.max(MIN_PAYMENT_PLAN_YEARS, n));
}

export function loadPaymentPlanSettings() {
  try {
    const raw = localStorage.getItem(TAX_PAYMENT_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePaymentPlanSettings(settings) {
  localStorage.setItem(TAX_PAYMENT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export function getPaymentPlanYears(settings) {
  return normalizePaymentPlanYears(settings?.planYears ?? DEFAULT_PAYMENT_PLAN_YEARS);
}

export function setPaymentPlanYears(settings, planYears) {
  return savePaymentPlanSettings({
    ...settings,
    planYears: normalizePaymentPlanYears(planYears),
  });
}

/** 予実表の「その他支払」合計行ラベル */
export const TAX_PAY_OTHER_PAY_TOTAL_LABEL = 'その他支払合計';

/** 今期を起点に、計画対象の会計期リストを生成 */
export function buildPaymentPlanPeriodEntries(currentPeriod, planYears) {
  const years = normalizePaymentPlanYears(planYears);
  const entries = [];
  for (let i = 0; i < years; i += 1) {
    const period = currentPeriod + i;
    entries.push({ period, label: formatFiscalPeriodLabel(period) });
  }
  return entries;
}
