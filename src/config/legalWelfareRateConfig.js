/** 法定福利費等の概算の掛け率（役員報酬＋給与・手当に対する比率） */
export const DEFAULT_LEGAL_WELFARE_RATE = 0.2;

export function normalizeLegalWelfareRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_LEGAL_WELFARE_RATE;
  return Math.round(n * 10000) / 10000;
}

export function computeLegalWelfareAmount(directorTotal, salaryTotal, rate) {
  const director = Number(directorTotal) || 0;
  const salary = Number(salaryTotal) || 0;
  const base = director + salary;
  if (base === 0) return 0;
  return Math.round(base * normalizeLegalWelfareRate(rate));
}

export function formatLegalWelfareRatePercent(rate) {
  return `${Math.round(normalizeLegalWelfareRate(rate) * 1000) / 10}%`;
}
