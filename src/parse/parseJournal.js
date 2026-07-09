import {
  decodeCsvBuffer,
  parseCsvLine,
  formatYen,
  parseNumber,
} from './parser.js';
import { isCollapsibleGroup, isExpandSettingsSection } from '../config/expandConfig.js';
import { collectVisibilityCandidates } from '../config/visibilityConfig.js';
import { DEFAULT_SECTION_COLORS } from '../config/sectionColorConfig.js';
import { mergeExpenseSectionItems, getExpenseSectionAccounts } from '../config/expenseAccountConfig.js';
import {
  getBsCurrentAssetAlwaysVisible,
  getBsInvestmentOtherAlwaysVisible,
  getBsDeferredAssetAlwaysVisible,
} from '../config/bsBalanceSheetAccountConfig.js';
import {
  categorizeAccountKey,
  getCashAccountsSet,
  getCompiledJournalPatterns,
  getPaymentCounterpartsSet,
  isRevenueAccountKey,
} from '../config/journalDefinitionConfig.js';

export { formatYen };

export const FISCAL_MONTHS = [
  '12月', '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '決算整理',
];

export const EXTRA_COLUMNS = ['合計', '平均'];

/** 貸借対照表・現預金の大項目（合計・平均列は表示しない） */
export const BS_SECTION_IDS = new Set([
  'currentAssets', 'fixedAssets', 'deferredAssets', 'currentLiab', 'fixedLiab', 'equity', 'cashBalance',
]);

const COLOR_FALLBACK = { color: '#44403c', barColor: '#292524', textColor: '#ffffff' };

function sectionColors(id) {
  const d = DEFAULT_SECTION_COLORS[id] ?? COLOR_FALLBACK;
  return { color: d.color, barColor: d.barColor, textColor: d.textColor ?? COLOR_FALLBACK.textColor };
}

function isPlIncomeAccountKey(key) {
  const patterns = getCompiledJournalPatterns();
  return isRevenueAccountKey(key) || patterns.specialProfit.some((p) => p.test(key));
}

const BS_SKIP = new Set([
  '諸口合計', '資産の部合計', '負債の部合計', '純資産の部合計', '負債・純資産の部合計',
]);

/** BS の参考表示行（合計に含めない内訳） */
function isBsInformationalSub(sub) {
  return /^（うち/.test(sub ?? '');
}

/** 現金及び預金に属する勘定（口座間資金移動の判定用） */
export function isInterAccountCashTransfer(debitAcct, creditAcct) {
  const cashAccounts = getCashAccountsSet();
  return cashAccounts.has(debitAcct) && cashAccounts.has(creditAcct);
}

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

function makeRow(id, label, subLabel, values, type = 'item', parentId = null, valueMode = 'flow', aggregateFormula = null) {
  const displayLabel = type === 'profit' || type === 'variance'
    ? appAggregateLabel(label)
    : label;
  const row = { id, label: displayLabel, subLabel, type, values: enrichRowValues({ ...values }, valueMode) };
  if (parentId) row.parentId = parentId;
  if (aggregateFormula) row.aggregateFormula = aggregateFormula;
  return row;
}

function buildArMinusRevValues(arValues, revValues) {
  const values = emptyMonthValues();
  for (const m of FISCAL_MONTHS) {
    values[m] = (arValues[m] ?? 0) - (revValues[m] ?? 0);
  }
  return values;
}

function buildArMinusRevVariance(arValues, revValues) {
  return enrichRowValues(buildArMinusRevValues(arValues, revValues));
}

function appendReceivableSubVarianceRows(filteredItems, revenueSection) {
  const revBySub = revenueBySub(revenueSection);
  const rows = [];
  for (const row of filteredItems) {
    rows.push(row);
    if (row.type !== 'item' && row.type !== 'sub') continue;
    const rev = revBySub.get(subSortKey(row.subLabel || '')) ?? emptyMonthValues();
    const diff = buildArMinusRevValues(monthValuesOnly(row.values), rev);
    if (!FISCAL_MONTHS.some((m) => (diff[m] ?? 0) !== 0)) continue;
    rows.push(makeRow(`${row.id}-saiko`, '', '差額有', diff, 'sub-variance', row.id));
  }
  return rows;
}

function sumRawValues(items) {
  const total = emptyMonthValues();
  for (const item of items) {
    for (const m of FISCAL_MONTHS) total[m] += item.values[m] ?? 0;
  }
  return total;
}

function subSortKey(sub) {
  return sub || '補助科目なし';
}

/** 補助科目が1件だけで空のときは非表示。2件以上で空欄は「補助科目なし」 */
function formatSubLabel(rawSub, subCount) {
  if (rawSub) return rawSub;
  if (subCount === 1) return '';
  return '補助科目なし';
}

/** 展開設定タブ用: 補助科目を持つ勘定科目一覧 */
function collectExpandCandidatesFromItems(sectionId, sectionLabel, rawItems) {
  if (!isExpandSettingsSection(sectionId)) return [];
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

/** 展開設定タブ用: 諸経費はハードコード一覧の全科目を表示（補助科目1件以下も含む） */
function collectExpenseExpandCandidates(sectionId, sectionLabel, rawItems) {
  const groups = new Map();
  for (const r of rawItems) {
    if (!groups.has(r.account)) groups.set(r.account, []);
    groups.get(r.account).push(r);
  }

  const candidates = [];
  const listed = new Set(getExpenseSectionAccounts());

  for (const account of getExpenseSectionAccounts()) {
    const items = groups.get(account) ?? [{ account, sub: '' }];
    candidates.push({
      sectionId,
      sectionLabel,
      account,
      subCount: items.length,
      subLabels: items.map((i) => i.sub || '補助科目なし'),
    });
  }

  for (const [account, items] of groups) {
    if (listed.has(account) || items.length <= 1) continue;
    candidates.push({
      sectionId,
      sectionLabel,
      account,
      subCount: items.length,
      subLabels: items.map((i) => i.sub || '補助科目なし'),
    });
  }

  return candidates;
}

/** 勘定科目でグループ化。入力順（MF CSV の並び）を維持し、折りたたみ設定に従い表示 */
function buildGroupedAccountRows(rawItems, idPrefix, sectionId, expandConfig = {}, valueMode = 'flow') {
  const groups = new Map();
  for (const r of rawItems) {
    if (!groups.has(r.account)) groups.set(r.account, []);
    groups.get(r.account).push(r);
  }

  const rows = [];
  let idx = 0;

  const appendInformationalBreakdowns = (account, items, parentRowId) => {
    if (!parentRowId) return;
    for (const item of items) {
      rows.push(makeRow(
        `${idPrefix}-${idx++}`,
        account,
        item.sub,
        item.values,
        'breakdown',
        parentRowId,
        valueMode,
      ));
    }
  };

  for (const [account, items] of groups) {
    const informational = items.filter((i) => isBsInformationalSub(i.sub));
    const regular = items.filter((i) => !isBsInformationalSub(i.sub));
    const subCount = regular.length;
    const collapsible = isCollapsibleGroup(sectionId, account, subCount, expandConfig);

    if (!collapsible) {
      let parentRowId = null;
      for (const item of regular) {
        const rowId = `${idPrefix}-${idx++}`;
        parentRowId = rowId;
        rows.push(makeRow(
          rowId,
          account,
          formatSubLabel(item.sub, subCount),
          item.values,
          'item',
          null,
          valueMode,
        ));
      }
      appendInformationalBreakdowns(account, informational, parentRowId);
      continue;
    }

    if (subCount === 1) {
      const item = regular[0];
      const rowId = `${idPrefix}-${idx++}`;
      rows.push(makeRow(
        rowId,
        account,
        formatSubLabel(item.sub, 1),
        item.values,
        'item',
        null,
        valueMode,
      ));
      appendInformationalBreakdowns(account, informational, rowId);
      continue;
    }

    const groupId = `${idPrefix}-g-${idx++}`;
    rows.push(makeRow(groupId, account, '', sumRawValues(regular), 'group', null, valueMode));

    regular.forEach((item, j) => {
      rows.push(makeRow(
        `${groupId}-s-${j}`,
        account,
        formatSubLabel(item.sub, subCount),
        item.values,
        'sub',
        groupId,
        valueMode,
      ));
    });
    appendInformationalBreakdowns(account, informational, groupId);
  }
  return rows;
}

function sumTopLevelRows(rows) {
  return sumValues(rows.filter((r) => r.type === 'item' || r.type === 'group'));
}

function makeTotalRow(id, label, values, valueMode = 'flow', aggregateFormula = 'sectionSum') {
  const displayLabel = valueMode === 'balance' ? label : appAggregateLabel(label);
  const row = makeRow(id, displayLabel, '', values, 'total', null, valueMode);
  if (valueMode !== 'balance' && aggregateFormula) row.aggregateFormula = aggregateFormula;
  return row;
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
  return categorizeAccountKey(key);
}

function pushSection(sections, cfg) {
  if (cfg.rows?.length) sections.push(cfg);
}

function aggregateJournal(text) {
  const aggregated = new Map();
  const cashFlow = { inflow: emptyMonthValues(), outflow: emptyMonthValues() };
  const otherPayments = new Map();
  const paymentCounterparts = getPaymentCounterpartsSet();

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

    if (debitAcct === '普通預金' && debitAmt > 0
      && !isInterAccountCashTransfer(debitAcct, creditAcct)) {
      cashFlow.inflow[mk] += debitAmt;
    }
    if (creditAcct === '普通預金' && creditAmt > 0
      && !isInterAccountCashTransfer(debitAcct, creditAcct)) {
      cashFlow.outflow[mk] += creditAmt;
    }

    if (creditAcct === '普通預金' && debitAmt > 0 && paymentCounterparts.has(debitAcct)) {
      trackPayment(debitAcct, debitSub, debitAmt, mk);
    }
    if (debitAcct === '普通預金' && creditAmt > 0 && paymentCounterparts.has(creditAcct)) {
      trackPayment(creditAcct, creditSub, creditAmt, mk);
    }

    const processSide = (account, sub, amountStr, side) => {
      const amount = parseInt(amountStr, 10) || 0;
      if (!account || amount === 0) return;
      const key = sub ? `${account}|${sub}` : account;
      const cat = categorizeAccount(key);
      if (!cat) return;
      if (!aggregated.has(key)) aggregated.set(key, { category: cat, values: emptyMonthValues() });
      const entry = aggregated.get(key);
      const isRevenue = isPlIncomeAccountKey(key);
      const delta = isRevenue
        ? side === 'credit' ? amount : -amount
        : side === 'debit' ? amount : -amount;
      entry.values[mk] = (entry.values[mk] ?? 0) + delta;
    };

    processSide(debitAcct, debitSub, cells[8], 'debit');
    processSide(creditAcct, creditSub, cells[16], 'credit');
  }

  return { aggregated, cashFlow, otherPayments };
}

function buildPlSections(aggregated, expandConfig, expandCandidates) {
  const bySection = {
    revenue: [], nonOperating: [], nonOperatingExpense: [], personnel: [], expense: [],
    outsourcing: [], other: [], specialProfit: [], specialLoss: [], tax: [],
  };

  for (const [key, { category, values }] of aggregated) {
    const total = FISCAL_MONTHS.reduce((s, m) => s + Math.abs(values[m] ?? 0), 0);
    if (total === 0) continue;
    const [account, sub] = key.split('|');
    bySection[category].push({ account, sub: sub ?? '', values });
  }

  const sections = [];
  const plDefs = [
    { id: 'revenue', label: '売上高', filter: 'income', key: 'revenue', prefix: 'rev', totalLabel: '売上高合計' },
    { id: 'nonOperating', label: '営業外収益', filter: 'income', key: 'nonOperating', prefix: 'no', totalLabel: '営業外収益合計' },
    { id: 'nonOperatingExpense', label: '営業外費用', filter: 'expense', key: 'nonOperatingExpense', prefix: 'noe', totalLabel: '営業外費用合計' },
    { id: 'personnel', label: '人件費', filter: 'personnel', key: 'personnel', prefix: 'per', totalLabel: '人件費合計' },
    { id: 'expense', label: '諸経費', filter: 'expense', key: 'expense', prefix: 'exp', totalLabel: '諸経費合計' },
    { id: 'outsourcing', label: '外注費', filter: 'outsourcing', key: 'outsourcing', prefix: 'out', totalLabel: '外注費合計' },
    { id: 'other', label: 'その他', filter: 'other', key: 'other', prefix: 'oth', totalLabel: 'その他合計' },
    { id: 'specialProfit', label: '特別利益', filter: 'income', key: 'specialProfit', prefix: 'spp', totalLabel: '特別利益合計' },
    { id: 'specialLoss', label: '特別損失', filter: 'expense', key: 'specialLoss', prefix: 'spl', totalLabel: '特別損失合計' },
    { id: 'tax', label: '法人税', filter: 'tax', key: 'tax', prefix: 'tax', totalLabel: '法人税合計' },
  ];

  for (const def of plDefs) {
    let raw = bySection[def.key];
    if (def.key === 'expense') {
      raw = mergeExpenseSectionItems(raw, emptyMonthValues);
      expandCandidates.push(...collectExpenseExpandCandidates(def.id, def.label, raw));
    } else {
      if (!raw.length) continue;
      expandCandidates.push(...collectExpandCandidatesFromItems(def.id, def.label, raw));
    }
    const items = buildGroupedAccountRows(raw, def.prefix, def.id, expandConfig);
    pushSection(sections, {
      id: def.id, label: def.label, filter: def.filter, ...sectionColors(def.id),
      rows: [...items, makeTotalRow(`${def.prefix}-total`, def.totalLabel, sumTopLevelRows(items))],
    });
  }

  return sections;
}

function buildVarianceValues(revValues, arValues) {
  return buildArMinusRevVariance(arValues, revValues);
}

function extractReceivableRowsFromBs(bsText) {
  const rows = extractBsRows(bsText, ['売上債権'], '売上債権合計', false);
  return rows.filter((r) => r.account === '売掛金');
}

function monthValuesOnly(values) {
  const months = {};
  for (const m of FISCAL_MONTHS) months[m] = values[m] ?? 0;
  return months;
}

function revenueBySub(revenueSection) {
  const bySub = new Map();
  for (const row of revenueSection.rows) {
    if (row.type !== 'item' && row.type !== 'sub') continue;
    const key = subSortKey(row.subLabel || '');
    if (!bySub.has(key)) bySub.set(key, emptyMonthValues());
    const bucket = bySub.get(key);
    for (const m of FISCAL_MONTHS) {
      bucket[m] = (bucket[m] ?? 0) + (row.values[m] ?? 0);
    }
  }
  return bySub;
}

function sumRevValues(revBySub, subKeys) {
  const sum = emptyMonthValues();
  for (const key of subKeys) {
    const rev = revBySub.get(key) ?? emptyMonthValues();
    for (const m of FISCAL_MONTHS) sum[m] += rev[m] ?? 0;
  }
  return sum;
}

function sectionValuesBySub(section) {
  const bySub = new Map();
  if (!section) return bySub;
  for (const row of section.rows) {
    if (row.type !== 'item' && row.type !== 'sub') continue;
    const key = subSortKey(row.subLabel || '');
    if (!bySub.has(key)) bySub.set(key, emptyMonthValues());
    const bucket = bySub.get(key);
    for (const m of FISCAL_MONTHS) {
      bucket[m] = (bucket[m] ?? 0) + (row.values[m] ?? 0);
    }
  }
  return bySub;
}

function compareAmountAtMonth(aValues, bValues, month) {
  return (aValues[month] ?? 0) !== (bValues[month] ?? 0);
}

function sumReceivablesArBalance(receivablesSection) {
  if (!receivablesSection) return emptyMonthValues();
  return sumValues(receivablesSection.rows.filter((r) => r.type === 'item' || r.type === 'group'));
}

/** 売上高差異の月次突合用ルックアップ（売上高側と比較） */
export function buildRevenueReceivablesCrossVarianceContext(sections) {
  const revenueSection = sections.find((s) => s.id === 'revenue');
  const revenueVarianceSection = sections.find((s) => s.id === 'revenueVariance');
  return {
    revenueBySub: sectionValuesBySub(revenueSection),
    revTotal: getTotalRow(revenueSection)?.values ?? emptyMonthValues(),
    arTotal: sumReceivablesArBalance(revenueVarianceSection),
  };
}

/** 売上高差異: 売上高と差異がある月だけ金額を表示 */
export function shouldShowCrossVarianceMonth(section, row, month, ctx) {
  if (section.id !== 'revenueVariance') return true;

  if (row.type === 'sub-variance') {
    return (row.values[month] ?? 0) !== 0;
  }

  if (row.type === 'warningSummary') {
    return compareAmountAtMonth(ctx.revTotal, ctx.arTotal, month);
  }

  if (row.type === 'item' || row.type === 'sub') {
    const key = subSortKey(row.subLabel || '');
    const rev = ctx.revenueBySub.get(key) ?? emptyMonthValues();
    return compareAmountAtMonth(row.values, rev, month);
  }

  if (row.type === 'group') {
    const subs = section.rows
      .filter((r) => r.parentId === row.id && (r.type === 'sub' || r.type === 'item'))
      .map((r) => subSortKey(r.subLabel || ''));
    const rev = sumRevValues(ctx.revenueBySub, subs);
    return compareAmountAtMonth(row.values, rev, month);
  }

  return true;
}

function hasAnyMonthDifference(aValues, bValues) {
  return FISCAL_MONTHS.some((m) => (aValues[m] ?? 0) !== (bValues[m] ?? 0));
}

/** 相手側の補助科目別月次と全月一致する明細行を除外 */
function filterDetailRowsByCrossVariance(plainItems, otherBySub) {
  const keptIds = new Set();

  for (const row of plainItems) {
    if (row.type === 'item' || row.type === 'sub') {
      const other = otherBySub.get(subSortKey(row.subLabel || '')) ?? emptyMonthValues();
      if (hasAnyMonthDifference(row.values, other)) keptIds.add(row.id);
      continue;
    }
    if (row.type === 'group') {
      const subKeys = plainItems
        .filter((r) => r.parentId === row.id && (r.type === 'sub' || r.type === 'item'))
        .map((r) => subSortKey(r.subLabel || ''));
      const other = sumRevValues(otherBySub, subKeys);
      if (hasAnyMonthDifference(row.values, other)) keptIds.add(row.id);
    }
  }

  for (const row of plainItems) {
    if (row.type === 'group' && plainItems.some((r) => r.parentId === row.id && keptIds.has(r.id))) {
      keptIds.add(row.id);
    }
  }

  return plainItems.filter((r) => keptIds.has(r.id));
}

function extractReceivableRawItems(bsText) {
  if (!bsText) return [];
  return filterBsDuplicateParents(extractReceivableRowsFromBs(bsText))
    .filter((r) => !r.isTotal)
    .map((r) => ({ account: r.account, sub: r.sub ?? '', values: r.values }))
    .filter((item) => FISCAL_MONTHS.some((m) => (item.values[m] ?? 0) !== 0));
}

function buildReceivablesSection(bsText, revenueSection, expandConfig, expandCandidates) {
  if (!revenueSection || !bsText) return null;

  const rawItems = extractReceivableRawItems(bsText);
  if (rawItems.length === 0) return null;

  const plainItems = buildGroupedAccountRows(rawItems, 'ar', 'revenueVariance', expandConfig);
  const arTotalRaw = sumTopLevelRows(plainItems);
  const revTotal = getTotalRow(revenueSection);
  const revMinusAr = subtractValues(revTotal?.values ?? enrichRowValues(emptyMonthValues()), arTotalRaw);
  if ((revMinusAr.合計 ?? 0) === 0) return null;

  expandCandidates.push(...collectExpandCandidatesFromItems('revenueVariance', '売掛金', rawItems));
  const filteredItems = filterDetailRowsByCrossVariance(plainItems, revenueBySub(revenueSection));

  const detailRows = appendReceivableSubVarianceRows(
    filteredItems.map((r) => ({
      ...r,
      values: enrichRowValues(monthValuesOnly(r.values), 'balance'),
    })),
    revenueSection,
  );

  return {
    id: 'revenueVariance',
    label: '売上高差異',
    labelNote: '（差額有のみ）',
    filter: 'income',
    ...sectionColors('revenueVariance'),
    rows: [
      ...detailRows,
      makeRow('rev-ar-total', '売上高－売掛金', '', revMinusAr, 'warningSummary'),
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
  const specialProfit = getTotalRow(sections.find((s) => s.id === 'specialProfit'));
  const specialLoss = getTotalRow(sections.find((s) => s.id === 'specialLoss'));
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
  const preTaxNet = subtractValues(
    addValues(ordinary, specialProfit?.values ?? enrichRowValues(emptyMonthValues())),
    specialLoss?.values ?? enrichRowValues(emptyMonthValues()),
  );
  const net = subtractValues(preTaxNet, tax?.values ?? enrichRowValues(emptyMonthValues()));

  return {
    id: 'profit',
    label: '利益',
    filter: 'trends',
    ...sectionColors('profit'),
    rows: [
      makeRow('op-profit', '営業利益', '', operating, 'profit', null, 'flow', 'profitOperating'),
      makeRow('ord-profit', '経常利益', '', ordinary, 'profit', null, 'flow', 'profitOrdinary'),
      makeRow('pre-tax-net', '税引前当期純利益', '', preTaxNet, 'profit', null, 'flow', 'profitPreTax'),
      { ...makeRow('net-profit', '当期純利益', '', net, 'profit', null, 'flow', 'profitNet'), accentTotal: true },
    ],
  };
}

/** 計画・予実マージ後に各セクション合計から利益セクションを再計算する */
export function rebuildProfitSectionInPlanData(planData) {
  if (!planData?.sections?.length) return planData;
  const profitSection = buildProfitSection(planData.sections);
  if (!profitSection) return planData;
  const profitIdx = planData.sections.findIndex((s) => s.id === 'profit');
  const sections = [...planData.sections];
  if (profitIdx >= 0) {
    sections[profitIdx] = profitSection;
  } else {
    const taxIdx = sections.findIndex((s) => s.id === 'tax');
    const insertAt = taxIdx >= 0 ? taxIdx + 1 : sections.length;
    sections.splice(insertAt, 0, profitSection);
  }
  return { ...planData, sections };
}

/** 消費税対象販管費（人件費＋諸経費＋外注費）と販管費合計をその他セクション前後に挿入する */
export function insertSgaSummarySections(planData) {
  if (!planData?.sections) return planData;
  if (planData.sections.some((s) => s.id === 'sgaTaxable')) return planData;

  const per = getTotalRow(planData.sections.find((s) => s.id === 'personnel'));
  const exp = getTotalRow(planData.sections.find((s) => s.id === 'expense'));
  const out = getTotalRow(planData.sections.find((s) => s.id === 'outsourcing'));
  const otherSec = planData.sections.find((s) => s.id === 'other');
  const other = getTotalRow(otherSec);

  const empty = enrichRowValues(emptyMonthValues());
  const taxableV = addValues(
    addValues(per?.values ?? empty, exp?.values ?? empty),
    out?.values ?? empty,
  );
  const sgaV = addValues(taxableV, other?.values ?? empty);

  const hasSga = [taxableV, sgaV].some((v) => (v.合計 ?? 0) !== 0);
  if (!hasSga) return planData;

  const makeSummarySection = (id, totalLabel, values, aggregateFormula) => ({
    id,
    label: '',
    hideCategory: true,
    filter: 'other',
    ...sectionColors(id),
    rows: [makeTotalRow(`${id}-row`, totalLabel, values, 'flow', aggregateFormula)],
  });

  const taxableSection = makeSummarySection('sgaTaxable', '消費税対象販管費合計', taxableV, 'sgaTaxable');
  const sgaTotalSection = makeSummarySection('sgaTotal', '販管費合計', sgaV, 'sgaTotal');

  const sections = [];
  for (const section of planData.sections) {
    if (section.id === 'other') {
      sections.push(taxableSection);
      sections.push({
        ...section,
        hideSectionTotal: true,
        categorySpanExcludesTotal: true,
      });
      sections.push(sgaTotalSection);
      continue;
    }
    sections.push(section);
  }

  if (!otherSec) {
    const taxIdx = sections.findIndex((s) => s.id === 'tax');
    const insertAt = taxIdx >= 0 ? taxIdx : sections.length;
    sections.splice(insertAt, 0, taxableSection, sgaTotalSection);
  }

  return { ...planData, sections };
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

/** BS セクション末尾の最終合計行のみ取得（明細は含めない） */
function extractBsEndTotalRow(text, startMarkers, endMarker) {
  const rows = extractBsRows(text, startMarkers, endMarker, true);
  const total = rows.find((r) => r.isTotal && r.account === endMarker);
  return total ? [total] : [];
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

const BS_SECTION_ACCENT_TOTAL = {
  currentAssets: '流動資産合計',
  fixedAssets: ['固定資産合計', '有形固定資産合計'],
  deferredAssets: '繰延資産合計',
  currentLiab: '流動負債合計',
  fixedLiab: '固定負債合計',
  equity: '純資産の部合計',
  cashBalance: '現金及び預金合計',
};

function resolveBsAccentTotalLabel(sectionId, totals) {
  const preferred = BS_SECTION_ACCENT_TOTAL[sectionId];
  if (!preferred) return null;
  const labels = Array.isArray(preferred) ? preferred : [preferred];
  for (const label of labels) {
    if (totals.some((r) => r.account === label)) return label;
  }
  return null;
}

function filterBsDuplicateParents(rows) {
  const accountsWithSubs = new Set();
  for (const r of rows) {
    if (r.sub && !r.isTotal && !isBsInformationalSub(r.sub)) accountsWithSubs.add(r.account);
  }
  return rows.filter((r) => {
    if (r.isTotal) return true;
    if (!r.sub && accountsWithSubs.has(r.account)) return false;
    return true;
  });
}

/** 貸借対照表CSVに行がない場合も常時表示する勘定を補完する */
function appendMissingBsAccountRows(rawRows, alwaysVisibleAccounts) {
  if (!alwaysVisibleAccounts?.length) return rawRows;
  const detailAccounts = new Set(
    rawRows
      .filter((r) => !r.isTotal && !isBsInformationalSub(r.sub))
      .map((r) => r.account),
  );
  const sampleValues = rawRows.find((r) => r.values)?.values;
  const monthKeys = sampleValues ? Object.keys(sampleValues) : [...FISCAL_MONTHS];
  const additions = [];
  for (const account of alwaysVisibleAccounts) {
    if (detailAccounts.has(account)) continue;
    const values = {};
    for (const m of monthKeys) values[m] = 0;
    additions.push({ account, sub: '', values, isTotal: false });
  }
  if (!additions.length) return rawRows;
  const totals = rawRows.filter((r) => r.isTotal);
  const details = rawRows.filter((r) => !r.isTotal);
  return [...details, ...additions, ...totals];
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
  const accentLabel = resolveBsAccentTotalLabel(id, totals);
  const rows = [
    ...items.map((r) => ({ ...r, values: enrichRowValues(r.values, 'balance') })),
    ...totals.map((r, i) => {
      const row = makeTotalRow(`${id}-t-${i}`, r.account, r.values, 'balance');
      if (accentLabel && r.account === accentLabel) row.accentTotal = true;
      return row;
    }),
  ];
  return { id, label, filter, ...sectionColors(id), rows };
}

function buildBsSections(bsText, expandConfig, expandCandidates) {
  const sections = [];

  const currentAssets = appendMissingBsAccountRows(
    extractBsRows(bsText, ['流動資産'], '流動資産合計'),
    getBsCurrentAssetAlwaysVisible(),
  );
  if (currentAssets.length) {
    sections.push(bsRowsToSection(
      'currentAssets', '流動資産', 'assets', currentAssets, expandConfig, expandCandidates,
    ));
  }

  const investmentOtherAssets = appendMissingBsAccountRows(
    extractBsRows(bsText, ['投資その他の資産'], '投資その他の資産合計'),
    getBsInvestmentOtherAlwaysVisible(),
  );
  const fixedAssets = [
    ...extractBsRows(bsText, ['有形固定資産'], '有形固定資産合計'),
    ...extractBsRows(bsText, ['無形固定資産'], '無形固定資産合計', false),
    ...investmentOtherAssets,
    ...extractBsEndTotalRow(bsText, ['固定資産'], '固定資産合計'),
  ];
  if (fixedAssets.length) {
    sections.push(bsRowsToSection(
      'fixedAssets', '固定資産', 'assets', fixedAssets, expandConfig, expandCandidates,
    ));
  }

  const deferredAssets = appendMissingBsAccountRows(
    extractBsRows(bsText, ['繰延資産'], '繰延資産合計'),
    getBsDeferredAssetAlwaysVisible(),
  );
  if (deferredAssets.length) {
    sections.push(bsRowsToSection(
      'deferredAssets', '繰延資産', 'assets', deferredAssets, expandConfig, expandCandidates,
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

function buildCashFlowSections(cashFlow, otherPayments, bsText, expandConfig, expandCandidates) {
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
    rows: [makeRow('cf-in', appAggregateLabel('入金実績'), '', cashFlow.inflow, 'item', null, 'flow', 'cashInflow')],
  });

  pushSection(sections, {
    id: 'cfOut', label: '出金', filter: 'cashflow', ...sectionColors('cfOut'),
    rows: [makeRow('cf-out', appAggregateLabel('出金実績'), '', cashFlow.outflow, 'item', null, 'flow', 'cashOutflow')],
  });

  const cashBalance = extractBsRows(bsText, ['現金及び預金'], '現金及び預金合計', true);
  const cashItems = cashBalance.filter((r) => !r.isTotal || r.account === '現金及び預金合計');
  if (cashItems.length) {
    sections.push(bsRowsToSection(
      'cashBalance', '現預金', 'cashflow', cashItems, expandConfig, expandCandidates,
    ));
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
  const { aggregated, cashFlow, otherPayments } = aggregateJournal(journalText);
  const expandCandidates = [];
  const plSections = buildPlSections(aggregated, expandConfig, expandCandidates);
  const revenueSection = plSections.find((s) => s.id === 'revenue');
  const receivablesSection = buildReceivablesSection(
    bsText, revenueSection, expandConfig, expandCandidates,
  );
  const plWithAr = insertReceivablesAfterRevenue(plSections, receivablesSection);
  const profitSection = buildProfitSection(plWithAr);
  const bsSections = bsText ? buildBsSections(bsText, expandConfig, expandCandidates) : [];
  const cfSections = bsText
    ? buildCashFlowSections(cashFlow, otherPayments, bsText, expandConfig, expandCandidates)
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

const DIRECTOR_LABOR_PATTERN = /^役員報酬/;
const STAFF_LABOR_PATTERN = /^給料手当/;
const KPI_OVERTIME_SUB_PATTERN = /残業手当/;

function getProfitMarginDenominator(data) {
  const revenue = data?.sections?.find((s) => s.id === 'revenue');
  const revTotal = getTotalRow(revenue);
  const nonOperating = data?.sections?.find((s) => s.id === 'nonOperating');
  const nonOpTotal = getTotalRow(nonOperating);
  const sales = revTotal?.values.合計 ?? 0;
  const nonOpIncome = nonOpTotal?.values.合計 ?? 0;
  return sales + nonOpIncome;
}

/** 労働分配率の分母（付加価値 = 営業利益 + 人件費合計） */
function getLaborShareDenominator(data) {
  const profitSection = data?.sections?.find((s) => s.id === 'profit');
  const operating = profitSection?.rows.find((r) => r.id === 'op-profit')?.values.合計 ?? 0;
  const personnel = data?.sections?.find((s) => s.id === 'personnel');
  const personnelTotal = getTotalRow(personnel)?.values.合計 ?? 0;
  return operating + personnelTotal;
}

function sumPersonnelAccountByPattern(section, labelPattern) {
  if (!section?.rows) return 0;
  let total = 0;
  for (const row of section.rows) {
    if (row.type !== 'item' && row.type !== 'group') continue;
    if (!labelPattern.test(row.label ?? '')) continue;
    total += row.values?.合計 ?? 0;
  }
  return total;
}

function calcShareRatePercent(numerator, denominator) {
  if (!denominator) return null;
  return (numerator / denominator) * 100;
}

function countPersonnelHeadcountByPattern(section, labelPattern, { excludeOvertime = false } = {}) {
  if (!section?.rows) return 0;
  let count = 0;
  for (const row of section.rows) {
    if (!labelPattern.test(row.label ?? '')) continue;
    if ((row.values?.合計 ?? 0) === 0) continue;
    if (row.type === 'sub') {
      if (excludeOvertime && KPI_OVERTIME_SUB_PATTERN.test(row.subLabel ?? '')) continue;
      if (row.subLabel && row.subLabel !== '補助科目なし') count += 1;
      continue;
    }
    if (row.type === 'item' && row.subLabel && row.subLabel !== '補助科目なし') {
      count += 1;
    }
  }
  return count;
}

/** 人件費行から役員・社員人数を推定（従業員マスタ未設定時のフォールバック） */
function inferPersonnelHeadcounts(personnel) {
  if (!personnel?.rows) return { directorCount: 0, staffCount: 0 };
  let directorCount = 0;
  let staffCount = 0;
  for (const row of personnel.rows) {
    if (row.type !== 'plan') continue;
    if (row.id?.startsWith('emp-plan-d-')) {
      if ((row.values?.合計 ?? 0) !== 0) directorCount += 1;
    } else if (row.id?.startsWith('emp-plan-m-')) staffCount += 1;
  }
  if (directorCount > 0 || staffCount > 0) {
    return { directorCount, staffCount };
  }
  return {
    directorCount: countPersonnelHeadcountByPattern(personnel, DIRECTOR_LABOR_PATTERN),
    staffCount: countPersonnelHeadcountByPattern(personnel, STAFF_LABOR_PATTERN, {
      excludeOvertime: true,
    }),
  };
}

function calcPayGapRatio(directorTotal, staffTotal, directorCount, staffCount) {
  if (!directorCount || !staffCount || staffTotal <= 0) return null;
  const directorAvg = directorTotal / directorCount;
  const staffAvg = staffTotal / staffCount;
  if (staffAvg <= 0) return null;
  return directorAvg / staffAvg;
}

function extractPlanKpiComponents(data, options = {}) {
  if (!data?.sections) return null;
  const profitDenominator = getProfitMarginDenominator(data);
  const valueAdded = getLaborShareDenominator(data);

  const profitSection = data.sections.find((s) => s.id === 'profit');
  const ordinaryProfit = profitSection?.rows.find((r) => r.id === 'ord-profit');
  const ordinary = ordinaryProfit?.values.合計 ?? 0;

  const personnel = data.sections.find((s) => s.id === 'personnel');
  const personnelTotal = getTotalRow(personnel)?.values.合計 ?? 0;
  const directorTotal = sumPersonnelAccountByPattern(personnel, DIRECTOR_LABOR_PATTERN);
  const staffTotal = personnelTotal - directorTotal;

  let directorCount = options.directorCount;
  let staffCount = options.staffCount;
  if (directorCount == null || staffCount == null) {
    const inferred = inferPersonnelHeadcounts(personnel);
    directorCount = directorCount ?? inferred.directorCount;
    staffCount = staffCount ?? inferred.staffCount;
  }

  return {
    ordinary,
    profitDenominator,
    personnelTotal,
    valueAdded,
    directorTotal,
    staffTotal,
    directorCount,
    staffCount,
  };
}

function calcPlanKpiMetricsFromComponents({
  ordinary,
  profitDenominator,
  personnelTotal,
  valueAdded,
  directorTotal,
  staffTotal,
  directorCount,
  staffCount,
}) {
  const nullLabor = {
    laborShareRate: null,
    directorLaborShareRate: null,
    staffLaborShareRate: null,
    payGapRatio: calcPayGapRatio(directorTotal, staffTotal, directorCount, staffCount),
  };

  return {
    profitMargin: profitDenominator
      ? calcShareRatePercent(ordinary, profitDenominator)
      : null,
    ...(valueAdded > 0
      ? {
        laborShareRate: calcShareRatePercent(personnelTotal, valueAdded),
        directorLaborShareRate: calcShareRatePercent(directorTotal, valueAdded),
        staffLaborShareRate: calcShareRatePercent(staffTotal, valueAdded),
        payGapRatio: calcPayGapRatio(directorTotal, staffTotal, directorCount, staffCount),
      }
      : nullLabor),
  };
}

/** 総利益率・労働分配率・格差倍率（ヘッダー KPI 用） */
export function calcPlanKpiMetrics(data, options = {}) {
  const components = extractPlanKpiComponents(data, options);
  if (!components) return null;
  return calcPlanKpiMetricsFromComponents(components);
}

/** 全期表示: 各期の分子・分母を合算して KPI を算出する */
export function calcPlanKpiMetricsAllPeriods(allPeriodDatas, buildOptionsForPeriod = () => ({})) {
  if (!allPeriodDatas?.length) return null;

  const summed = {
    ordinary: 0,
    profitDenominator: 0,
    personnelTotal: 0,
    valueAdded: 0,
    directorTotal: 0,
    staffTotal: 0,
    directorCount: 0,
    staffCount: 0,
  };

  for (const { fiscalPeriod, data } of allPeriodDatas) {
    const options = buildOptionsForPeriod(fiscalPeriod) ?? {};
    const components = extractPlanKpiComponents(data, options);
    if (!components) continue;
    summed.ordinary += components.ordinary;
    summed.profitDenominator += components.profitDenominator;
    summed.personnelTotal += components.personnelTotal;
    summed.valueAdded += components.valueAdded;
    summed.directorTotal += components.directorTotal;
    summed.staffTotal += components.staffTotal;
    summed.directorCount += components.directorCount ?? 0;
    summed.staffCount += components.staffCount ?? 0;
  }

  return calcPlanKpiMetricsFromComponents(summed);
}

export function calcTotalProfitMargin(data) {
  return calcPlanKpiMetrics(data)?.profitMargin ?? null;
}
