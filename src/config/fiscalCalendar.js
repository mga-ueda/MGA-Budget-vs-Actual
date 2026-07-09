export const DEFAULT_FISCAL_END_MONTH = 12;

/** 決算整理列ラベル */
export const SETTLEMENT_MONTH_LABEL = "決算整理";

export function normalizeFiscalEndMonth(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 12) return DEFAULT_FISCAL_END_MONTH;
  return n;
}

/** 第一期の会計月 */
export function getFiscalYearStartMonth(fiscalEndMonth) {
  const end = normalizeFiscalEndMonth(fiscalEndMonth);
  return end === 12 ? 12 : (end % 12) + 1;
}

/** 決算月を含む会計期間の月ラベル配列 */
export function buildFiscalYearMonths(fiscalEndMonth) {
  const start = getFiscalYearStartMonth(fiscalEndMonth);
  const months = [];
  let m = start;
  for (let i = 0; i < 12; i += 1) {
    months.push(`${m}月`);
    m = (m % 12) + 1;
  }
  return months;
}

/** 決算整理を含む会計期間の月ラベル配列 */
export function buildFiscalMonths(fiscalEndMonth) {
  return [...buildFiscalYearMonths(fiscalEndMonth), SETTLEMENT_MONTH_LABEL];
}

/** 会計期間の月終月 */
export function getLastRegularFiscalMonth(fiscalEndMonth) {
  const months = buildFiscalYearMonths(fiscalEndMonth);
  return months[months.length - 1];
}

export function monthLabelToNumber(label) {
  const m = String(label).match(/^(\d{1,2})月$/);
  return m ? parseInt(m[1], 10) : null;
}

export function monthNumberToLabel(num) {
  return `${num}月`;
}

/** アプリ設定から会計月列を取得（決算月はCSVから判定するためデフォルト） */
export function getAppFiscalMonths() {
  return FISCAL_MONTHS;
}

/** デフォルト */
export const FISCAL_MONTHS = buildFiscalMonths(DEFAULT_FISCAL_END_MONTH);
