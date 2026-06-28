import {
  decodeCsvBuffer,
  parseCsvLine,
  formatYen,
  parseNumber,
} from './parser.js';
import { isCollapsibleGroup, ALWAYS_EXPAND_SECTION_IDS } from '../config/expandConfig.js';
import { collectVisibilityCandidates } from '../config/visibilityConfig.js';
import { DEFAULT_SECTION_COLORS } from '../config/sectionColorConfig.js';

export { formatYen };

export const FISCAL_MONTHS = [
  '12月', '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '決算整理',
];

export const EXTRA_COLUMNS = ['合計', '平均'];

const COLOR_FALLBACK = { color: '#44403c', barColor: '#292524' };

function sectionColors(id) {
  const d = DEFAULT_SECTION_COLORS[id] ?? COLOR_FALLBACK;
  return { color: d.color, barColor: d.barColor };
}

const REVENUE_ACCOUNTS = new Set(['売上高', '受取利息', '雑収入', '営業外収益']);

const PERSONNEL_PATTERNS = [
  /^役員報酬/,
  /^給料手当/,
  /^法定福利費/,
  /^賞与/,
  /^退職/,
  /旅費交通費\|通勤手当/,
];

const OUTSOURCING_PATTERNS = [/^外注費/];
const OTHER_PATTERNS = [/^租税公課/, /^減価償却費/];
const NON_OPERATING_EXPENSE_PATTERNS = [/^支払利息/, /^雑損失/, /^貸倒引当金繰入/];
const TAX_PATTERNS = [/^法人税等$/, /^未払法人税等$/];

const BS_SKIP = new Set([
  '諸口合計', '資産の部合計', '負債の部合計', '純資産の部合計', '負債・純資産の部合計',
]);

const PAYMENT_COUNTERPARTS = new Set([
  '長期未払金', '保険積立金', '役員借入金', '短期借入金', '未払法人税等', '未払消費税',
]);

function monthKey(dateStr) {
  const m = parseInt(dateStr.split('/')[1], 10);
  return m === 12 ? '12月' : `${m}月`;
}

function emptyMonthValues() {
  const v = {};
  for (const m of FISCAL_MONTHS) v[m] = 0;
  return v;
}

export function enrichRowValues(values, mode = 'flow') {
  if (mode === 'balance') return enrichBalanceRowValues(values);
  const monthsWithData = FISCAL_MONTHS.filter((m) => (values[m] ?? 0) !== 0);
  const total = FISCAL_MONTHS.reduce((s, m) => s + (values[m] ?? 0), 0);
  const avg = monthsWithData.length > 0 ? Math.round(total / monthsWithData.length) : 0;
  return { ...values, 合計: total, 平均: avg };
}

/** BS 残高行: 合計=期末残高、平均=月次残高の平均 */
function enrichBalanceRowValues(values) {
  const monthsWithData = FISCAL_MONTHS.filter((m) => (values[m] ?? 0) !== 0);
  const endBalance = values['決算整理']
    ?? values['11月']
    ?? (monthsWithData.length ? values[monthsWithData[monthsWithData.length - 1]] : 0)
    ?? 0;
  const avg = monthsWithData.length > 0
    ? Math.round(monthsWithData.reduce((s, m) => s + (values[m] ?? 0), 0) / monthsWithData.length)
    : 0;
  return { ...values, 合計: endBalance, 平均: avg };
}

/** 仕訳・BS CSV にない、アプリ側で集計した行のラベル接頭辞 */
export const APP_AGGREGATE_LABEL_PREFIX = '∑ ';

function appAggregateLabel(label) {
  if (label.startsWith(APP_AGGREGATE_LABEL_PREFIX)) return label;
  return `${APP_AGGREGATE_LABEL_PREFIX}${label}`;
}

function makeRow(id, label, subLabel, values, type = 'item', parentId = null, valueMode = 'flow') {
  const displayLabel = type === 'profit' || type === 'variance'
    ? appAggregateLabel(label)
    : label;
  const row = { id, label: displayLabel, subLabel, type, values: enrichRowValues({ ...values }, valueMode) };
  if (parentId) row.parentId = parentId;
  return row;
}

function sumRawValues(items) {
  const total = emptyMonthValues();
  for (const item of items) {
    for (const m of FISCAL_MONTHS) total[m] += item.values[m] ?? 0;
  }
  return total;
}

/** 年間合計（会計年度の月次合算） */
function annualTotal(values) {
  return FISCAL_MONTHS.reduce((s, m) => s + (values[m] ?? 0), 0);
}

/** 勘定科目ソート用: 年間合計の絶対値 */
function sortByAnnualTotal(values) {
  return Math.abs(annualTotal(values));
}

function accountGroupTotal(items) {
  return sortByAnnualTotal(sumRawValues(items));
}

function itemSortTotal(item) {
  return sortByAnnualTotal(item.values);
}

/** 補助科目1件のみのときは非表示（売上高・売掛金は除く）。2件以上で空欄は「補助科目なし」 */
function formatSubLabel(rawSub, subCount, sectionId) {
  if (subCount === 1 && !ALWAYS_EXPAND_SECTION_IDS.has(sectionId)) return '';
  return rawSub || '補助科目なし';
}

/** 展開設定タブ用: 補助科目を持つ勘定科目一覧 */
function collectExpandCandidatesFromItems(sectionId, sectionLabel, rawItems) {
  const groups = new Map();
  for (const r of rawItems) {
    if (!groups.has(r.account)) groups.set(r.account, []);
    groups.get(r.account).push(r);
  }
  const candidates = [];
  for (const [account, items] of groups) {
    const subCount = items.length;
    if (subCount <= 1) continue;
    const subLabels = items.map((i) => i.sub || '補助科目なし');
    candidates.push({ sectionId, sectionLabel, account, subCount, subLabels });
  }
  return candidates;
}

/** 勘定科目でグループ化。合計金額の大きい順。折りたたみ設定に従い表示 */
function buildGroupedAccountRows(rawItems, idPrefix, sectionId, expandConfig = {}, valueMode = 'flow') {
  const groups = new Map();
  for (const r of rawItems) {
    if (!groups.has(r.account)) groups.set(r.account, []);
    groups.get(r.account).push(r);
  }

  const sorted = [...groups.entries()].sort(
    (a, b) => accountGroupTotal(b[1]) - accountGroupTotal(a[1]),
  );
  const rows = [];
  let idx = 0;

  for (const [account, items] of sorted) {
    const subCount = items.length;
    const collapsible = isCollapsibleGroup(sectionId, account, subCount, expandConfig);

    if (!collapsible) {
      const subs = [...items].sort(
        (a, b) => itemSortTotal(b) - itemSortTotal(a),
      );
      for (const item of subs) {
        rows.push(makeRow(
          `${idPrefix}-${idx++}`,
          account,
          formatSubLabel(item.sub, subCount, sectionId),
          item.values,
          'item',
        ));
      }
      continue;
    }

    if (subCount === 1) {
      const item = items[0];
      rows.push(makeRow(
        `${idPrefix}-${idx++}`,
        account,
        formatSubLabel(item.sub, 1, sectionId),
        item.values,
        'item',
      ));
      continue;
    }

    const groupId = `${idPrefix}-g-${idx++}`;
    rows.push(makeRow(groupId, account, '', sumRawValues(items), 'group'));

    const subs = [...items].sort(
      (a, b) => itemSortTotal(b) - itemSortTotal(a),
    );
    subs.forEach((item, j) => {
      rows.push(makeRow(
        `${groupId}-s-${j}`,
        account,
        formatSubLabel(item.sub, subCount, sectionId),
        item.values,
        'sub',
        groupId,
      ));
    });
  }
  return rows;
}

function sumTopLevelRows(rows) {
  return sumValues(rows.filter((r) => r.type === 'item' || r.type === 'group'));
}

function makeTotalRow(id, label, values, valueMode = 'flow') {
  const displayLabel = valueMode === 'balance' ? label : appAggregateLabel(label);
  return makeRow(id, displayLabel, '', values, 'total', null, valueMode);
}

function sumValues(rows) {
  const total = emptyMonthValues();
  for (const row of rows) {
    for (const m of FISCAL_MONTHS) total[m] += row.values[m] ?? 0;
  }
  return total;
}

function subtractValues(a, b) {
  const r = emptyMonthValues();
  for (const m of FISCAL_MONTHS) r[m] = (a[m] ?? 0) - (b[m] ?? 0);
  for (const c of EXTRA_COLUMNS) r[c] = (a[c] ?? 0) - (b[c] ?? 0);
  return enrichRowValues(r);
}

function addValues(a, b) {
  const r = emptyMonthValues();
  for (const m of FISCAL_MONTHS) r[m] = (a[m] ?? 0) + (b[m] ?? 0);
  for (const c of EXTRA_COLUMNS) r[c] = (a[c] ?? 0) + (b[c] ?? 0);
  return enrichRowValues(r);
}

function getTotalRow(section) {
  return section?.rows.find((r) => r.type === 'total');
}

export function categorizeAccount(key) {
  const [account] = key.split('|');
  if (REVENUE_ACCOUNTS.has(account)) {
    return account === '売上高' ? 'revenue' : 'nonOperating';
  }
  if (PERSONNEL_PATTERNS.some((p) => p.test(key))) return 'personnel';
  if (OUTSOURCING_PATTERNS.some((p) => p.test(key))) return 'outsourcing';
  if (OTHER_PATTERNS.some((p) => p.test(key))) return 'other';
  if (NON_OPERATING_EXPENSE_PATTERNS.some((p) => p.test(key))) return 'nonOperatingExpense';
  if (TAX_PATTERNS.some((p) => p.test(key))) return 'tax';
  const skip = new Set([
    '普通預金', '売掛金', '貸倒引当金', '未払金', '未払費用', '前払金', '前払費用',
    '長期前払費用', '保険積立金', '資本金', '繰越利益剰余金', '長期未払金',
    '工具器具備品', '車両運搬具', 'ソフトウェア', '貯蔵品', '少額資産', '仮払消費税',
    '未払消費税', '役員借入金', '預り金', '仮受消費税', '仮払金', '立替金', '未収還付法人税等',
  ]);
  if (skip.has(account)) return null;
  return 'expense';
}

function pushSection(sections, cfg) {
  if (cfg.rows?.length) sections.push(cfg);
}

function aggregateJournal(text) {
  const aggregated = new Map();
  const receivables = new Map();
  const cashFlow = { inflow: emptyMonthValues(), outflow: emptyMonthValues() };
  const otherPayments = new Map();
  const corpTax = emptyMonthValues();

  const trackReceivable = (debitAcct, debitSub, debitAmt, creditAcct, creditSub, creditAmt, month) => {
    if (debitAcct !== '売掛金' || creditAcct !== '売上高' || debitAmt === 0) return;
    if (debitAmt !== creditAmt) return;
    const sub = debitSub || creditSub || '';
    const key = sub ? `売掛金|${sub}` : '売掛金';
    if (!receivables.has(key)) receivables.set(key, emptyMonthValues());
    receivables.get(key)[month] += debitAmt;
  };

  const trackPayment = (account, sub, amount, month) => {
    const key = sub ? `${account}|${sub}` : account;
    if (!otherPayments.has(key)) otherPayments.set(key, emptyMonthValues());
    otherPayments.get(key)[month] += amount;
  };

  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const date = cells[1]?.trim();
    if (!date) continue;

    const settlement = cells[22]?.trim();
    const memo = cells[19]?.trim();
    if (memo === '開始仕訳') continue;

    const mk = settlement === '決算整理仕訳' ? '決算整理' : monthKey(date);

    const debitAcct = cells[2]?.trim();
    const debitSub = cells[3]?.trim();
    const debitAmt = parseInt(cells[8], 10) || 0;
    const creditAcct = cells[10]?.trim();
    const creditSub = cells[11]?.trim();
    const creditAmt = parseInt(cells[16], 10) || 0;

    if (debitAcct === '普通預金' && debitAmt > 0) cashFlow.inflow[mk] += debitAmt;
    if (creditAcct === '普通預金' && creditAmt > 0) cashFlow.outflow[mk] += creditAmt;

    if (creditAcct === '普通預金' && debitAmt > 0 && PAYMENT_COUNTERPARTS.has(debitAcct)) {
      trackPayment(debitAcct, debitSub, debitAmt, mk);
    }
    if (debitAcct === '普通預金' && creditAmt > 0 && PAYMENT_COUNTERPARTS.has(creditAcct)) {
      trackPayment(creditAcct, creditSub, creditAmt, mk);
    }

    if (/法人税|消費税/.test(debitAcct ?? '') && debitAmt > 0) corpTax[mk] += debitAmt;
    if (/法人税|消費税/.test(creditAcct ?? '') && creditAmt > 0) corpTax[mk] += creditAmt;

    const processSide = (account, sub, amountStr, side) => {
      const amount = parseInt(amountStr, 10) || 0;
      if (!account || amount === 0) return;
      const key = sub ? `${account}|${sub}` : account;
      const cat = categorizeAccount(key);
      if (!cat) return;
      if (!aggregated.has(key)) aggregated.set(key, { category: cat, values: emptyMonthValues() });
      const entry = aggregated.get(key);
      const isRevenue = REVENUE_ACCOUNTS.has(account);
      const delta = isRevenue
        ? side === 'credit' ? amount : -amount
        : side === 'debit' ? amount : -amount;
      entry.values[mk] = (entry.values[mk] ?? 0) + delta;
    };

    processSide(debitAcct, debitSub, cells[8], 'debit');
    processSide(creditAcct, creditSub, cells[16], 'credit');
    trackReceivable(debitAcct, debitSub, debitAmt, creditAcct, creditSub, creditAmt, mk);
  }

  return { aggregated, receivables, cashFlow, otherPayments, corpTax };
}

function buildPlSections(aggregated, expandConfig, expandCandidates) {
  const bySection = {
    revenue: [], nonOperating: [], nonOperatingExpense: [], personnel: [], expense: [],
    outsourcing: [], other: [], tax: [],
  };

  for (const [key, { category, values }] of aggregated) {
    const total = FISCAL_MONTHS.reduce((s, m) => s + Math.abs(values[m] ?? 0), 0);
    if (total === 0) continue;
    const [account, sub] = key.split('|');
    bySection[category].push({ account, sub: sub ?? '', values });
  }

  for (const cat of Object.keys(bySection)) {
    bySection[cat].sort((a, b) => {
      const ta = FISCAL_MONTHS.reduce((s, m) => s + Math.abs(a.values[m] ?? 0), 0);
      const tb = FISCAL_MONTHS.reduce((s, m) => s + Math.abs(b.values[m] ?? 0), 0);
      return tb - ta;
    });
  }

  const sections = [];
  const plDefs = [
    { id: 'revenue', label: '売上高', filter: 'income', key: 'revenue', prefix: 'rev', totalLabel: '売上合計' },
    { id: 'nonOperating', label: '営業外収益', filter: 'income', key: 'nonOperating', prefix: 'no', totalLabel: '営業外収益合計' },
    { id: 'nonOperatingExpense', label: '営業外費用', filter: 'expense', key: 'nonOperatingExpense', prefix: 'noe', totalLabel: '営業外費用合計' },
    { id: 'personnel', label: '人件費', filter: 'personnel', key: 'personnel', prefix: 'per', totalLabel: '人件費合計' },
    { id: 'expense', label: '諸経費', filter: 'expense', key: 'expense', prefix: 'exp', totalLabel: '諸経費合計' },
    { id: 'outsourcing', label: '外注費', filter: 'outsourcing', key: 'outsourcing', prefix: 'out', totalLabel: '外注費合計' },
    { id: 'other', label: 'その他', filter: 'other', key: 'other', prefix: 'oth', totalLabel: 'その他合計' },
    { id: 'tax', label: '税金', filter: 'tax', key: 'tax', prefix: 'tax', totalLabel: '税金合計' },
  ];

  for (const def of plDefs) {
    const raw = bySection[def.key];
    if (!raw.length) continue;
    expandCandidates.push(...collectExpandCandidatesFromItems(def.id, def.label, raw));
    const items = buildGroupedAccountRows(raw, def.prefix, def.id, expandConfig);
    pushSection(sections, {
      id: def.id, label: def.label, filter: def.filter, ...sectionColors(def.id),
      rows: [...items, makeTotalRow(`${def.prefix}-total`, def.totalLabel, sumTopLevelRows(items))],
    });
  }

  return sections;
}

function buildVarianceValues(revValues, arValues) {
  const values = emptyMonthValues();
  for (const m of FISCAL_MONTHS) {
    values[m] = (revValues[m] ?? 0) - (arValues[m] ?? 0);
  }
  return enrichRowValues(values);
}

function buildReceivablesSection(receivables, plSections, expandConfig, expandCandidates) {
  const revenueSection = plSections.find((s) => s.id === 'revenue');
  if (!revenueSection || receivables.size === 0) return null;

  const rawItems = [];
  for (const [key, values] of receivables) {
    const total = FISCAL_MONTHS.reduce((s, m) => s + Math.abs(values[m] ?? 0), 0);
    if (total === 0) continue;
    const [account, sub] = key.split('|');
    rawItems.push({ account, sub: sub ?? '', values });
  }
  if (rawItems.length === 0) return null;

  expandCandidates.push(...collectExpandCandidatesFromItems('receivables', '売掛金', rawItems));
  const items = buildGroupedAccountRows(rawItems, 'ar', 'receivables', expandConfig);
  const arTotal = sumTopLevelRows(items);
  const revTotal = getTotalRow(revenueSection);
  const variance = buildVarianceValues(revTotal?.values ?? {}, arTotal);

  return {
    id: 'receivables',
    label: '売掛金',
    filter: 'income',
    ...sectionColors('receivables'),
    rows: [
      ...items,
      makeTotalRow('ar-total', '売掛金合計', arTotal),
      makeRow('ar-variance', '差異（売上−売掛）', '', variance, 'variance'),
    ],
  };
}

function insertReceivablesAfterRevenue(plSections, receivablesSection) {
  if (!receivablesSection) return plSections;
  const result = [];
  for (const s of plSections) {
    result.push(s);
    if (s.id === 'revenue') result.push(receivablesSection);
  }
  return result;
}

function buildProfitSection(sections) {
  const rev = getTotalRow(sections.find((s) => s.id === 'revenue'));
  const nonOp = getTotalRow(sections.find((s) => s.id === 'nonOperating'));
  const nonOpExp = getTotalRow(sections.find((s) => s.id === 'nonOperatingExpense'));
  const per = getTotalRow(sections.find((s) => s.id === 'personnel'));
  const exp = getTotalRow(sections.find((s) => s.id === 'expense'));
  const out = getTotalRow(sections.find((s) => s.id === 'outsourcing'));
  const other = getTotalRow(sections.find((s) => s.id === 'other'));
  const tax = getTotalRow(sections.find((s) => s.id === 'tax'));

  const revV = rev?.values ?? enrichRowValues(emptyMonthValues());
  const nonOpV = nonOp?.values ?? enrichRowValues(emptyMonthValues());
  const nonOpExpV = nonOpExp?.values ?? enrichRowValues(emptyMonthValues());
  const costV = addValues(
    addValues(addValues(
      addValues(
        per?.values ?? enrichRowValues(emptyMonthValues()),
        exp?.values ?? enrichRowValues(emptyMonthValues()),
      ),
      out?.values ?? enrichRowValues(emptyMonthValues()),
    ),
    other?.values ?? enrichRowValues(emptyMonthValues())),
    emptyMonthValues(),
  );

  const operating = subtractValues(revV, costV);
  const ordinary = subtractValues(addValues(operating, nonOpV), nonOpExpV);
  const net = subtractValues(ordinary, tax?.values ?? enrichRowValues(emptyMonthValues()));

  return {
    id: 'profit',
    label: '利益',
    filter: 'trends',
    ...sectionColors('profit'),
    rows: [
      makeTotalRow('sga-total', '販管費', costV),
      makeRow('op-profit', '営業利益', '', operating, 'profit'),
      makeRow('ord-profit', '経常利益', '', ordinary, 'profit'),
      makeRow('net-profit', '当期純利益', '', net, 'profit'),
    ],
  };
}

function extractBsRows(text, startMarkers, endMarker, includeTotals = true) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]);
  const months = headerCells.slice(3).filter(Boolean);
  const result = [];
  let capturing = false;
  let currentAccount = '';

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const col0 = cells[0]?.trim() ?? '';
    const col1 = cells[1]?.trim() ?? '';
    const col2 = cells[2]?.trim() ?? '';
    const heading = col0 || col1 || col2;

    if (startMarkers.some((m) => heading === m)) {
      capturing = true;
      if (col1) currentAccount = col1;
      continue;
    }
    if (!capturing) continue;

    if (heading === endMarker) {
      if (includeTotals) {
        const values = readMonthValues(cells, months);
        if (values) result.push({ account: heading, sub: '', values, isTotal: true });
      }
      break;
    }

    const values = readMonthValues(cells, months);
    if (!values) {
      if (col1) currentAccount = col1;
      continue;
    }
    if (BS_SKIP.has(heading)) continue;

    const isTotal = heading.endsWith('合計');
    if (col1) currentAccount = col1;

    if (col1 && col2) {
      result.push({ account: col1, sub: col2, values, isTotal });
    } else if (col1) {
      result.push({ account: col1, sub: '', values, isTotal });
    } else if (col2 && currentAccount) {
      result.push({ account: currentAccount, sub: col2, values, isTotal: false });
    } else if (col0 && values) {
      result.push({ account: col0, sub: '', values, isTotal });
    }
  }
  return result;
}

function readMonthValues(cells, months) {
  const valueCells = cells.slice(3);
  const values = {};
  let hasValues = false;
  months.forEach((month, idx) => {
    const num = parseNumber(valueCells[idx] ?? '');
    if (num !== null) { values[month] = num; hasValues = true; }
  });
  return hasValues ? values : null;
}

function filterBsDuplicateParents(rows) {
  const accountsWithSubs = new Set();
  for (const r of rows) {
    if (r.sub && !r.isTotal) accountsWithSubs.add(r.account);
  }
  return rows.filter((r) => {
    if (r.isTotal) return true;
    if (!r.sub && accountsWithSubs.has(r.account)) return false;
    return true;
  });
}

function bsRowsToSection(id, label, filter, rawRows, expandConfig, expandCandidates) {
  const filtered = filterBsDuplicateParents(rawRows);
  const totals = filtered.filter((r) => r.isTotal);
  const detailRows = filtered.filter((r) => !r.isTotal);
  const rawItems = detailRows.map((r) => ({
    account: r.account,
    sub: r.sub ?? '',
    values: r.values,
  }));
  expandCandidates.push(...collectExpandCandidatesFromItems(id, label, rawItems));
  const items = buildGroupedAccountRows(rawItems, id, id, expandConfig, 'balance');
  const rows = [
    ...items.map((r) => ({ ...r, values: enrichRowValues(r.values, 'balance') })),
    ...totals.map((r, i) =>
      makeTotalRow(`${id}-t-${i}`, r.account, r.values, 'balance'),
    ),
  ];
  return { id, label, filter, ...sectionColors(id), rows };
}

function buildBsSections(bsText, expandConfig, expandCandidates) {
  const sections = [];

  const currentAssets = extractBsRows(bsText, ['流動資産'], '流動資産合計');
  if (currentAssets.length) {
    sections.push(bsRowsToSection(
      'currentAssets', '流動資産', 'assets', currentAssets, expandConfig, expandCandidates,
    ));
  }

  const fixedAssets = [
    ...extractBsRows(bsText, ['有形固定資産'], '有形固定資産合計'),
    ...extractBsRows(bsText, ['無形固定資産'], '無形固定資産合計', false),
    ...extractBsRows(bsText, ['投資その他の資産'], '投資その他の資産合計'),
  ];
  if (fixedAssets.length) {
    sections.push(bsRowsToSection(
      'fixedAssets', '固定資産', 'assets', fixedAssets, expandConfig, expandCandidates,
    ));
  }

  const currentLiab = extractBsRows(bsText, ['流動負債'], '流動負債合計');
  if (currentLiab.length) {
    sections.push(bsRowsToSection(
      'currentLiab', '流動負債', 'liabilities', currentLiab, expandConfig, expandCandidates,
    ));
  }

  const fixedLiab = extractBsRows(bsText, ['固定負債'], '固定負債合計');
  if (fixedLiab.length) {
    sections.push(bsRowsToSection(
      'fixedLiab', '固定負債', 'liabilities', fixedLiab, expandConfig, expandCandidates,
    ));
  }

  const equity = extractBsRows(bsText, ['純資産の部', '株主資本'], '純資産の部合計');
  if (equity.length) {
    sections.push(bsRowsToSection(
      'equity', '純資産', 'liabilities', equity, expandConfig, expandCandidates,
    ));
  }

  return sections;
}

function buildCashFlowSections(cashFlow, otherPayments, corpTax, bsText, expandConfig, expandCandidates) {
  const sections = [];

  if (otherPayments.size > 0) {
    const rawItems = [...otherPayments.entries()].map(([key, values]) => {
      const [account, sub] = key.split('|');
      return { account, sub: sub ?? '', values };
    });
    expandCandidates.push(...collectExpandCandidatesFromItems('otherPay', 'その他支払', rawItems));
    const items = buildGroupedAccountRows(rawItems, 'pay', 'otherPay', expandConfig);
    pushSection(sections, {
      id: 'otherPay', label: 'その他支払', filter: 'cashflow', ...sectionColors('otherPay'),
      rows: [...items, makeTotalRow('pay-total', 'その他支払合計', sumTopLevelRows(items))],
    });
  }

  pushSection(sections, {
    id: 'cfIn', label: '入金', filter: 'cashflow', ...sectionColors('cfIn'),
    rows: [makeRow('cf-in', appAggregateLabel('入金実績'), '', cashFlow.inflow, 'item')],
  });

  pushSection(sections, {
    id: 'cfOut', label: '出金', filter: 'cashflow', ...sectionColors('cfOut'),
    rows: [makeRow('cf-out', appAggregateLabel('出金実績'), '', cashFlow.outflow, 'item')],
  });

  const cashBalance = extractBsRows(bsText, ['現金及び預金'], '現金及び預金合計', true);
  const cashItems = cashBalance.filter((r) => !r.isTotal || r.account === '現金及び預金合計');
  if (cashItems.length) {
    sections.push(bsRowsToSection(
      'cashBalance', '現預金', 'cashflow', cashItems, expandConfig, expandCandidates,
    ));
  }

  const taxTotal = enrichRowValues(corpTax);
  if (taxTotal.合計 !== 0) {
    pushSection(sections, {
      id: 'corpTax', label: '法人税・消費税', filter: 'tax', ...sectionColors('corpTax'),
      rows: [makeTotalRow('corp-tax-total', '法人税・消費税合計', corpTax)],
    });
  }

  return sections;
}

export function zeroOutPlanData(planData) {
  if (!planData) return buildFullPlan('', null);
  return {
    ...planData,
    sections: planData.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        values: enrichRowValues(emptyMonthValues(), row.valueMode ?? 'flow'),
      })),
    })),
  };
}

export function buildFullPlan(journalText, bsText, expandConfig = {}) {
  const { aggregated, receivables, cashFlow, otherPayments, corpTax } = aggregateJournal(journalText);
  const expandCandidates = [];
  const plSections = buildPlSections(aggregated, expandConfig, expandCandidates);
  const receivablesSection = buildReceivablesSection(receivables, plSections, expandConfig, expandCandidates);
  const plWithAr = insertReceivablesAfterRevenue(plSections, receivablesSection);
  const profitSection = buildProfitSection(plWithAr);
  const bsSections = bsText ? buildBsSections(bsText, expandConfig, expandCandidates) : [];
  const cfSections = bsText
    ? buildCashFlowSections(cashFlow, otherPayments, corpTax, bsText, expandConfig, expandCandidates)
    : [];

  const sections = [
    ...plWithAr,
    ...(profitSection ? [profitSection] : []),
    ...bsSections,
    ...cfSections,
  ];

  return {
    months: [...FISCAL_MONTHS, ...EXTRA_COLUMNS],
    fiscalMonths: FISCAL_MONTHS,
    sections,
    expandCandidates,
    visibilityCandidates: collectVisibilityCandidates(sections),
  };
}

export function parseJournalCsv(text) {
  return buildFullPlan(text, null);
}

export function calcTotalProfitMargin(data) {
  const profitSection = data.sections.find((s) => s.id === 'profit');
  const ordinaryProfit = profitSection?.rows.find((r) => r.id === 'ord-profit');

  const revenue = data.sections.find((s) => s.id === 'revenue');
  const revTotal = getTotalRow(revenue);

  const nonOperating = data.sections.find((s) => s.id === 'nonOperating');
  const nonOpTotal = getTotalRow(nonOperating);

  const sales = revTotal?.values.合計 ?? 0;
  const nonOpIncome = nonOpTotal?.values.合計 ?? 0;
  const denominator = sales + nonOpIncome;
  if (denominator === 0) return null;

  const ordinary = ordinaryProfit?.values.合計 ?? 0;
  return (ordinary / denominator) * 100;
}
