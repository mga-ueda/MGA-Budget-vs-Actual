import { getLastRegularFiscalMonth } from '../config/fiscalCalendar.js';
import { hasPeriodCsvInCache } from '../csv/csvFolder.js';
import { loadReferencePeriodPlanData } from './enrichUtils.js';

const CPE_CASH_BALANCE_SECTION_ID = 'cashBalance';
const CPE_CASH_BALANCE_TOTAL_LABEL = "現金及び預金合計";
const CPE_COL_TOTAL_LABEL = "合計";

/** 現金及び預金合計行を探す */
export function findCashBalanceTotalRow(section) {
  if (!section) return null;
  return section.rows.find((r) =>
    r.type === 'total'
    && (r.label === CPE_CASH_BALANCE_TOTAL_LABEL || String(r.label ?? '').includes(CPE_CASH_BALANCE_TOTAL_LABEL)),
  ) ?? section.rows.find((r) => r.type === 'total' && r.accentTotal);
}

/** BS等の報告期末残高（合計列） */
export function getCashBalanceReportedEnd(planData) {
  const section = planData?.sections?.find((s) => s.id === CPE_CASH_BALANCE_SECTION_ID);
  const totalRow = findCashBalanceTotalRow(section);
  return totalRow?.values?.[CPE_COL_TOTAL_LABEL] ?? 0;
}

/** キャッシュフロー予測後の期末残高（最終通常月） */
export function getCashBalanceForecastEnd(planData, fiscalEndMonth) {
  const section = planData?.sections?.find((s) => s.id === CPE_CASH_BALANCE_SECTION_ID);
  const totalRow = findCashBalanceTotalRow(section);
  if (!totalRow) return 0;
  const lastRegular = getLastRegularFiscalMonth(fiscalEndMonth);
  return totalRow.values?.[lastRegular] ?? 0;
}

/**
 * 前期末の現預金残高を決定する。
 * 当期に CSV があれば前期は閉鎖済みとみなし報告期末を使う。
 * なければ前期の期末予測残高を使う。
 */
export function resolvePriorPeriodEndCashBalance({
  expandConfig,
  businessStartYear,
  fiscalPeriod,
  fiscalEndMonth,
  getEnrichedPriorPlanData,
}) {
  if (fiscalPeriod < 2) return 0;

  const priorPeriod = fiscalPeriod - 1;
  const refPlanData = loadReferencePeriodPlanData(expandConfig, businessStartYear, priorPeriod);
  if (!refPlanData) return 0;

  if (hasPeriodCsvInCache({ businessStartYear, fiscalPeriod })) {
    return getCashBalanceReportedEnd(refPlanData);
  }

  if (typeof getEnrichedPriorPlanData === 'function') {
    const enrichedPrior = getEnrichedPriorPlanData(priorPeriod);
    if (enrichedPrior) {
      return getCashBalanceForecastEnd(
        enrichedPrior,
        enrichedPrior.fiscalEndMonth ?? fiscalEndMonth,
      );
    }
  }

  return getCashBalanceReportedEnd(refPlanData);
}
