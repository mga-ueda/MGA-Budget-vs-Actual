import { parseCsvLine } from './parser.js';
import {
  formatYen,
  FISCAL_MONTHS,
  EXTRA_COLUMNS,
  BS_SECTION_IDS,
  categorizeAccount,
} from './parseJournal.js';

const PL_SECTION_CATEGORY = {
  revenue: 'revenue',
  nonOperating: 'nonOperating',
  nonOperatingExpense: 'nonOperatingExpense',
  personnel: 'personnel',
  expense: 'expense',
  outsourcing: 'outsourcing',
  other: 'other',
  tax: 'tax',
};

function normalizeSub(sub) {
  if (!sub || sub === '補助科目なし') return '';
  return sub;
}

function resolveMonths(month) {
  if (month === '合計' || month === '平均') return [...FISCAL_MONTHS];
  return [month];
}

/** 仕訳CSVを明細行に展開 */
export function parseJournalEntries(text) {
  if (!text) return [];
  const entries = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const date = cells[1]?.trim();
    if (!date) continue;

    const settlement = cells[22]?.trim();
    const memo = cells[19]?.trim();
    if (memo === '開始仕訳') continue;

    entries.push({
      no: cells[0]?.trim() ?? '',
      date,
      monthKey: settlement === '決算整理仕訳' ? '決算整理' : monthKey(date),
      debitAcct: cells[2]?.trim() ?? '',
      debitSub: cells[3]?.trim() ?? '',
      debitAmt: parseInt(cells[8], 10) || 0,
      creditAcct: cells[10]?.trim() ?? '',
      creditSub: cells[11]?.trim() ?? '',
      creditAmt: parseInt(cells[16], 10) || 0,
      summary: cells[18]?.trim() ?? '',
      memo: memo ?? '',
      settlement: settlement ?? '',
    });
  }
  return entries;
}

function sideMatches(entry, side, account, subFilter) {
  const acct = side === 'debit' ? entry.debitAcct : entry.creditAcct;
  const sub = side === 'debit' ? entry.debitSub : entry.creditSub;
  const amt = side === 'debit' ? entry.debitAmt : entry.creditAmt;
  if (!acct || amt === 0) return false;
  if (acct !== account) return false;
  if (subFilter !== undefined && normalizeSub(sub) !== subFilter) return false;
  return true;
}

function entryMatchesAccount(entry, account, subFilter) {
  return sideMatches(entry, 'debit', account, subFilter)
    || sideMatches(entry, 'credit', account, subFilter);
}

function entryMatchesAnyAccount(entry, accountKeys) {
  for (const { account, subLabel } of accountKeys) {
    const sub = subLabel === undefined ? undefined : normalizeSub(subLabel);
    if (entryMatchesAccount(entry, account, sub)) return true;
  }
  return false;
}

function collectSectionAccountKeys(section, row) {
  if (row.type === 'total') {
    const keys = [];
    const seen = new Set();
    for (const r of section.rows) {
      if (r.type !== 'item' && r.type !== 'sub') continue;
      const key = `${r.label}\0${normalizeSub(r.subLabel)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push({ account: r.label, subLabel: normalizeSub(r.subLabel) });
    }
    return keys;
  }
  if (row.type === 'group') {
    return [{ account: row.label, subLabel: undefined }];
  }
  return [{ account: row.label, subLabel: normalizeSub(row.subLabel) }];
}

function accountKey(account, sub) {
  const normalizedSub = normalizeSub(sub);
  return normalizedSub ? `${account}|${normalizedSub}` : account;
}

function entrySideBelongsToCategory(entry, side, category) {
  const acct = side === 'debit' ? entry.debitAcct : entry.creditAcct;
  const sub = side === 'debit' ? entry.debitSub : entry.creditSub;
  const amt = side === 'debit' ? entry.debitAmt : entry.creditAmt;
  if (!acct || amt === 0) return false;
  return categorizeAccount(accountKey(acct, sub)) === category;
}

function entryBelongsToSectionCategory(entry, sectionId) {
  const category = PL_SECTION_CATEGORY[sectionId];
  if (!category) return true;
  return entrySideBelongsToCategory(entry, 'debit', category)
    || entrySideBelongsToCategory(entry, 'credit', category);
}

function filterPl(entries, section, row, months) {
  const keys = collectSectionAccountKeys(section, row);
  return entries.filter((e) => months.includes(e.monthKey)
    && entryMatchesAnyAccount(e, keys)
    && entryBelongsToSectionCategory(e, section.id));
}

function filterReceivables(entries, section, row, months) {
  return entries.filter((e) => {
    if (!months.includes(e.monthKey)) return false;
    if (row.type === 'variance') return false;
    const debitIsAr = e.debitAcct === '売掛金' && e.debitAmt > 0;
    const creditIsAr = e.creditAcct === '売掛金' && e.creditAmt > 0;
    if (!debitIsAr && !creditIsAr) return false;
    if (row.type === 'total') return true;
    if (row.type === 'group') return row.label === '売掛金';
    const sub = normalizeSub(row.subLabel);
    if (debitIsAr && normalizeSub(e.debitSub) === sub) return true;
    if (creditIsAr && normalizeSub(e.creditSub) === sub) return true;
    return false;
  });
}

function filterCashflow(entries, row, months) {
  return entries.filter((e) => {
    if (!months.includes(e.monthKey)) return false;
    if (row.id === 'cf-in') return e.debitAcct === '普通預金' && e.debitAmt > 0;
    if (row.id === 'cf-out') return e.creditAcct === '普通預金' && e.creditAmt > 0;
    return false;
  });
}

function filterOtherPay(entries, section, row, months) {
  const keys = collectSectionAccountKeys(section, row);
  return entries.filter((e) => {
    if (!months.includes(e.monthKey)) return false;
    const debitPay = e.creditAcct === '普通預金' && e.debitAmt > 0
      && PAYMENT_COUNTERPARTS.has(e.debitAcct);
    const creditPay = e.debitAcct === '普通預金' && e.creditAmt > 0
      && PAYMENT_COUNTERPARTS.has(e.creditAcct);
    if (!debitPay && !creditPay) return false;
    if (row.type === 'total') return true;
    const counterpart = debitPay ? e.debitAcct : e.creditAcct;
    const counterpartSub = debitPay ? e.debitSub : e.creditSub;
    for (const { account, subLabel } of keys) {
      if (account !== counterpart) continue;
      if (subLabel === undefined) return true;
      if (normalizeSub(counterpartSub) === subLabel) return true;
    }
    return false;
  });
}

function filterBs(entries, section, row, months) {
  const keys = collectSectionAccountKeys(section, row);
  return entries.filter((e) => months.includes(e.monthKey)
    && entryMatchesAnyAccount(e, keys));
}

export function isDrilldownAvailable(section, row) {
  if (row.type === 'profit' || row.type === 'variance' || row.type === 'plan' || row.type === 'man-month') {
    return false;
  }
  if (row.type === 'variance' || row.type === 'sub-variance' || row.type === 'warningSummary') return false;
  if (section.id === 'profit') return false;
  return true;
}

export function findRelatedJournalEntries(entries, section, row, month) {
  const months = resolveMonths(month);

  switch (section.id) {
    case 'revenueVariance':
      return filterReceivables(entries, section, row, months);
    case 'cfIn':
    case 'cfOut':
      return filterCashflow(entries, row, months);
    case 'otherPay':
      return filterOtherPay(entries, section, row, months);
    default:
      if (BS_SECTION_IDS.has(section.id)) {
        return filterBs(entries, section, row, months);
      }
      return filterPl(entries, section, row, months);
  }
}

export function drilldownCellKey(sectionId, row, month) {
  return `${sectionId}|${row.type}|${row.label}|${normalizeSub(row.subLabel)}|${month}`;
}

/** 仕訳のあるセルキー一覧（データ読込時に1回構築） */
export function buildDrilldownIndex(entries, sections) {
  const index = new Set();
  if (!entries.length || !sections?.length) return index;

  const months = [...FISCAL_MONTHS, ...EXTRA_COLUMNS];
  for (const section of sections) {
    for (const row of section.rows) {
      if (!isDrilldownAvailable(section, row)) continue;
      for (const month of months) {
        if (findRelatedJournalEntries(entries, section, row, month).length > 0) {
          index.add(drilldownCellKey(section.id, row, month));
        }
      }
    }
  }
  return index;
}

export function hasDrilldownEntries(index, section, row, month) {
  return index?.has(drilldownCellKey(section.id, row, month)) ?? false;
}

export function buildDrilldownTitle(section, row, month) {
  const parts = [section.label];
  if (row.type !== 'total') {
    if (row.label) parts.push(row.label);
    if (row.subLabel) parts.push(row.subLabel);
  } else {
    parts.push(row.label);
  }
  parts.push(month);
  return parts.filter(Boolean).join(' / ');
}

export function formatEntryAmount(n) {
  if (!n) return '';
  return formatYen(n);
}
