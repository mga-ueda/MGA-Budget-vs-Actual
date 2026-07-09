/** write-fiscal-calendar.mjs */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/config/fiscalCalendar.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const monthSuffix = jp(0x6708);

const content = `export const DEFAULT_FISCAL_END_MONTH = 12;

/** ${jp(0x6c7a, 0x7b97, 0x6574, 0x7406, 0x5217, 0x30e9, 0x30d9, 0x30eb)} */
export const SETTLEMENT_MONTH_LABEL = ${JSON.stringify(jp(0x6c7a, 0x7b97, 0x6574, 0x7406))};

export function normalizeFiscalEndMonth(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 12) return DEFAULT_FISCAL_END_MONTH;
  return n;
}

/** ${jp(0x7b2c, 0x4e00, 0x671f, 0x306e, 0x4f1a, 0x8a08, 0x6708)} */
export function getFiscalYearStartMonth(fiscalEndMonth) {
  const end = normalizeFiscalEndMonth(fiscalEndMonth);
  return end === 12 ? 12 : (end % 12) + 1;
}

/** ${jp(0x6c7a, 0x7b97, 0x6708, 0x3092, 0x542b, 0x3080, 0x4f1a, 0x8a08, 0x671f, 0x9593, 0x306e, 0x6708, 0x30e9, 0x30d9, 0x30eb, 0x914d, 0x5217)} */
export function buildFiscalYearMonths(fiscalEndMonth) {
  const start = getFiscalYearStartMonth(fiscalEndMonth);
  const months = [];
  let m = start;
  for (let i = 0; i < 12; i += 1) {
    months.push(\`\${m}${monthSuffix}\`);
    m = (m % 12) + 1;
  }
  return months;
}

/** ${jp(0x6c7a, 0x7b97, 0x6574, 0x7406, 0x3092, 0x542b, 0x3080, 0x4f1a, 0x8a08, 0x671f, 0x9593, 0x306e, 0x6708, 0x30e9, 0x30d9, 0x30eb, 0x914d, 0x5217)} */
export function buildFiscalMonths(fiscalEndMonth) {
  return [...buildFiscalYearMonths(fiscalEndMonth), SETTLEMENT_MONTH_LABEL];
}

/** ${jp(0x4f1a, 0x8a08, 0x671f, 0x9593, 0x306e, 0x6708, 0x7d42, 0x6708)} */
export function getLastRegularFiscalMonth(fiscalEndMonth) {
  const months = buildFiscalYearMonths(fiscalEndMonth);
  return months[months.length - 1];
}

export function monthLabelToNumber(label) {
  const m = String(label).match(/^(\\\\d{1,2})${monthSuffix}$/);
  return m ? parseInt(m[1], 10) : null;
}

export function monthNumberToLabel(num) {
  return \`\${num}${monthSuffix}\`;
}

/** アプリ設定から会計月列を取得（決算月はCSVから判定するためデフォルト） */
export function getAppFiscalMonths() {
  return FISCAL_MONTHS;
}

/** ${jp(0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8)} */
export const FISCAL_MONTHS = buildFiscalMonths(DEFAULT_FISCAL_END_MONTH);
`;

writeFileSync(target, content, { encoding: 'utf8' });
console.log('Wrote', target);
