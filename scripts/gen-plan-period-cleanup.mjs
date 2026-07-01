import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = resolve(repoRoot, 'src/config/planPeriodCleanup.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const content = `import { getFiscalPeriodForDate } from './appSettings.js';

/** ${jp(0x671f, 0x756a, 0x53f7, 0x30ad, 0x30fc, 0x306e, 0x30a8, 0x30f3, 0x30c8, 0x30ea, 0x304b, 0x3089, 0x6307, 0x5b9a, 0x671f, 0x672a, 0x672a, 0x306e, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x524a, 0x9664, 0x3059, 0x308b, 0x3002)} */
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

/** ${jp(0x7d42, 0x4e86, 0x3057, 0x305f, 0x671f, 0x306e, 0x8a08, 0x753b, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x307e, 0x3068, 0x306b, 0x524a, 0x9664, 0x3059, 0x308b, 0x3002)} */
export function purgeClosedPeriodPlanStorage({
  businessStartYear,
  date = new Date(),
  revenuePlans,
  salaryPlans,
  salaryPlanSettings,
  taxPaymentPlans,
  outsourcingPlans,
  expensePlanOverrides,
  monthDisplayConfig,
}) {
  const firstKeptPeriod = getFiscalPeriodForDate(businessStartYear, date);
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
`;

writeFileSync(path, content, { encoding: 'utf8' });
console.log('Wrote src/config/planPeriodCleanup.js');
