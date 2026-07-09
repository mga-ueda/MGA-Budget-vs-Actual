import { getFiscalPeriodForDate } from './appSettings.js';

/** 期番号キーのエントリから指定した期より前のデータを削除する。 */
export function purgePeriodKeyedStorage(storageObject, firstKeptPeriod) {
  if (!storageObject || typeof storageObject !== 'object') {
    return { data: storageObject, changed: false };
  }
  const next = { ...storageObject };
  let changed = false;
  for (const key of Object.keys(storageObject)) {
    const period = Number(key);
    if (Number.isInteger(period) && period > 0 && period < firstKeptPeriod) {
      delete next[key];
      changed = true;
    }
  }
  return { data: next, changed };
}

/** 終了した期の計画データをまとめて削除する。 */
export function purgeClosedPeriodPlanStorage({
  businessStartYear,
  fiscalEndMonth,
  date = new Date(),
  revenuePlans,
  salaryPlans,
  salaryPlanSettings,
  taxPaymentPlans,
  outsourcingPlans,
  expensePlanOverrides,
  monthDisplayConfig,
}) {
  const firstKeptPeriod = getFiscalPeriodForDate(businessStartYear, date, fiscalEndMonth);
  const parts = {
    revenuePlans: purgePeriodKeyedStorage(revenuePlans, firstKeptPeriod),
    salaryPlans: purgePeriodKeyedStorage(salaryPlans, firstKeptPeriod),
    salaryPlanSettings: purgePeriodKeyedStorage(salaryPlanSettings, firstKeptPeriod),
    taxPaymentPlans: purgePeriodKeyedStorage(taxPaymentPlans, firstKeptPeriod),
    outsourcingPlans: purgePeriodKeyedStorage(outsourcingPlans, firstKeptPeriod),
    expensePlanOverrides: purgePeriodKeyedStorage(expensePlanOverrides, firstKeptPeriod),
    monthDisplayConfig: purgePeriodKeyedStorage(monthDisplayConfig, firstKeptPeriod),
  };
  return {
    firstKeptPeriod,
    revenuePlans: parts.revenuePlans.data,
    salaryPlans: parts.salaryPlans.data,
    salaryPlanSettings: parts.salaryPlanSettings.data,
    taxPaymentPlans: parts.taxPaymentPlans.data,
    outsourcingPlans: parts.outsourcingPlans.data,
    expensePlanOverrides: parts.expensePlanOverrides.data,
    monthDisplayConfig: parts.monthDisplayConfig.data,
    changed: Object.values(parts).some((part) => part.changed),
  };
}
