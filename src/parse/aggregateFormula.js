import { APP_AGGREGATE_LABEL_PREFIX } from './parseJournal.js';
import { formatYen } from './parser.js';

const MINUS = '\u2212';
const YEN = '\u00a5';

const FORMULA_LABELS = {
  sectionSum: 'セクション内の勘定科目行の合計',
  sectionSumExcludePlan: 'セクション内の勘定科目行の合計（計画行を除く）',
  profitOperating: `売上高合計 ${MINUS} (人件費合計 + 諸経費合計 + 外注費合計 + その他合計)`,
  profitOrdinary: `営業利益 + 営業外収益合計 ${MINUS} 営業外費用合計`,
  profitPreTax: '経常利益',
  profitNet: `税引前当期純利益 ${MINUS} 法人税合計`,
  sgaTaxable: '人件費合計 + 諸経費合計 + 外注費合計',
  sgaTotal: '消費税対象販管費合計 + その他合計',
  cashInflow: '仕訳の借方「普通預金」の合計',
  cashOutflow: '仕訳の貸方「普通預金」の合計',
  corpTax: '仕訳の法人税・消費税勘定の合計',
};

const LABEL_REVENUE_TOTAL = '売上高合計';
const LABEL_PERSONNEL_TOTAL = '人件費合計';
const LABEL_EXPENSE_TOTAL = '諸経費合計';
const LABEL_OUTSOURCING_TOTAL = '外注費合計';
const LABEL_OTHER_TOTAL = 'その他合計';
const LABEL_OPERATING_PROFIT = '営業利益';
const LABEL_NON_OPERATING_REVENUE_TOTAL = '営業外収益合計';
const LABEL_NON_OPERATING_EXPENSE_TOTAL = '営業外費用合計';
const LABEL_ORDINARY_PROFIT = '経常利益';
const LABEL_PRE_TAX_NET_PROFIT = '税引前当期純利益';
const LABEL_TAX_TOTAL = '法人税合計';
const LABEL_SGA_TAXABLE_TOTAL = '消費税対象販管費合計';
const NO_BREAKDOWN = '（内訳なし）';

export function isAggregateRow(row) {
  return Boolean(row?.aggregateFormula || isAggregateLabel(row?.label));
}

export function isAggregateLabel(label) {
  return label?.startsWith(APP_AGGREGATE_LABEL_PREFIX) ?? false;
}

function formatYenAmount(val) {
  if (val === undefined || val === null || val === 0) return `${YEN}0`;
  const sign = val < 0 ? MINUS : '';
  return `${sign}${YEN}${formatYen(Math.abs(val))}`;
}

function stripAggregatePrefix(label) {
  return (label ?? '').replace(APP_AGGREGATE_LABEL_PREFIX, '').trim();
}

function getRowValue(row, columnKey) {
  return row?.values?.[columnKey] ?? 0;
}

function getSectionTotalRow(sections, sectionId) {
  const section = sections.find((s) => s.id === sectionId);
  return section?.rows.find((r) => r.type === 'total');
}

function getSectionTotalValue(sections, sectionId, columnKey) {
  return getRowValue(getSectionTotalRow(sections, sectionId), columnKey);
}

function getSectionRowById(sections, sectionId, rowId) {
  const section = sections.find((s) => s.id === sectionId);
  return section?.rows.find((r) => r.id === rowId);
}

function formatTerm(label, val) {
  return `${label}(${formatYenAmount(val)})`;
}

function formatSumDetail(terms) {
  const nonZero = terms.filter((t) => t.val !== 0);
  if (nonZero.length === 0) return NO_BREAKDOWN;
  const sum = nonZero.reduce((s, t) => s + t.val, 0);
  const expr = nonZero.map((t) => formatTerm(t.label, t.val)).join(' + ');
  return `${expr} = ${formatYenAmount(sum)}`;
}

function formatSubtractDetail(minuendLabel, minuendVal, subtrahendTerms) {
  const subSum = subtrahendTerms.reduce((s, t) => s + t.val, 0);
  const subExpr = subtrahendTerms.map((t) => formatTerm(t.label, t.val)).join(' + ');
  const result = minuendVal - subSum;
  if (subtrahendTerms.length === 1) {
    return `${formatTerm(minuendLabel, minuendVal)} ${MINUS} ${formatTerm(subtrahendTerms[0].label, subtrahendTerms[0].val)} = ${formatYenAmount(result)}`;
  }
  return `${formatTerm(minuendLabel, minuendVal)} ${MINUS} (${subExpr}) = ${formatYenAmount(result)}`;
}

function formatSectionSumDetail(section, columnKey, { excludeTypes = ['plan', 'total', 'breakdown'] } = {}) {
  const terms = [];
  for (const r of section.rows) {
    if (excludeTypes.includes(r.type)) continue;
    if (r.type !== 'item' && r.type !== 'group') continue;
    const val = getRowValue(r, columnKey);
    if (val === 0) continue;
    let label = stripAggregatePrefix(r.label);
    if (r.type === 'sub') label = r.subLabel || label;
    else if (r.subLabel) label = `${label}（${r.subLabel}）`;
    terms.push({ label, val });
  }
  return formatSumDetail(terms);
}

function formatProfitOperatingDetail(sections, columnKey) {
  const rev = getSectionTotalValue(sections, 'revenue', columnKey);
  const costs = [
    { label: LABEL_PERSONNEL_TOTAL, val: getSectionTotalValue(sections, 'personnel', columnKey) },
    { label: LABEL_EXPENSE_TOTAL, val: getSectionTotalValue(sections, 'expense', columnKey) },
    { label: LABEL_OUTSOURCING_TOTAL, val: getSectionTotalValue(sections, 'outsourcing', columnKey) },
    { label: LABEL_OTHER_TOTAL, val: getSectionTotalValue(sections, 'other', columnKey) },
  ];
  return formatSubtractDetail(LABEL_REVENUE_TOTAL, rev, costs);
}

function formatProfitOrdinaryDetail(sections, columnKey) {
  const operating = getRowValue(getSectionRowById(sections, 'profit', 'op-profit'), columnKey);
  const nonOp = getSectionTotalValue(sections, 'nonOperating', columnKey);
  const nonOpExp = getSectionTotalValue(sections, 'nonOperatingExpense', columnKey);
  const afterNonOp = operating + nonOp;
  const nonOpPart = nonOp !== 0
    ? `${formatTerm(LABEL_OPERATING_PROFIT, operating)} + ${formatTerm(LABEL_NON_OPERATING_REVENUE_TOTAL, nonOp)}`
    : formatTerm(LABEL_OPERATING_PROFIT, operating);
  if (nonOpExp === 0) {
    return `${nonOpPart} = ${formatYenAmount(afterNonOp)}`;
  }
  return `${nonOpPart} ${MINUS} ${formatTerm(LABEL_NON_OPERATING_EXPENSE_TOTAL, nonOpExp)} = ${formatYenAmount(afterNonOp - nonOpExp)}`;
}

function formatProfitPreTaxDetail(sections, columnKey) {
  const ordinary = getRowValue(getSectionRowById(sections, 'profit', 'ord-profit'), columnKey);
  return `${formatTerm(LABEL_ORDINARY_PROFIT, ordinary)} = ${formatYenAmount(ordinary)}`;
}

function formatProfitNetDetail(sections, columnKey) {
  const preTaxNet = getRowValue(getSectionRowById(sections, 'profit', 'pre-tax-net'), columnKey);
  const tax = getSectionTotalValue(sections, 'tax', columnKey);
  return formatSubtractDetail(LABEL_PRE_TAX_NET_PROFIT, preTaxNet, [{ label: LABEL_TAX_TOTAL, val: tax }]);
}

function formatSgaTaxableDetail(sections, columnKey) {
  const terms = [
    { label: LABEL_PERSONNEL_TOTAL, val: getSectionTotalValue(sections, 'personnel', columnKey) },
    { label: LABEL_EXPENSE_TOTAL, val: getSectionTotalValue(sections, 'expense', columnKey) },
    { label: LABEL_OUTSOURCING_TOTAL, val: getSectionTotalValue(sections, 'outsourcing', columnKey) },
  ];
  return formatSumDetail(terms);
}

function formatSgaTotalDetail(sections, columnKey) {
  const taxable = getRowValue(getSectionRowById(sections, 'sgaTaxable', 'sgaTaxable-row'), columnKey);
  const other = getSectionTotalValue(sections, 'other', columnKey);
  return formatSumDetail([
    { label: LABEL_SGA_TAXABLE_TOTAL, val: taxable },
    { label: LABEL_OTHER_TOTAL, val: other },
  ]);
}

function formatStaticValueDetail(label, columnKey, row) {
  const val = getRowValue(row, columnKey);
  return `${label} = ${formatYenAmount(val)}`;
}

export function getAggregateFormulaLabel(row) {
  if (row?.aggregateFormula && FORMULA_LABELS[row.aggregateFormula]) {
    return FORMULA_LABELS[row.aggregateFormula];
  }
  if (isAggregateLabel(row?.label)) {
    return FORMULA_LABELS.sectionSum;
  }
  return null;
}

export function getAggregateFormulaDetail(row, section, planData, columnKey) {
  const sections = planData?.sections ?? [];
  const key = row?.aggregateFormula;

  switch (key) {
    case 'sectionSum':
      return formatSectionSumDetail(section, columnKey);
    case 'sectionSumExcludePlan':
      return formatSectionSumDetail(section, columnKey, { excludeTypes: ['plan', 'total', 'breakdown'] });
    case 'profitOperating':
      return formatProfitOperatingDetail(sections, columnKey);
    case 'profitOrdinary':
      return formatProfitOrdinaryDetail(sections, columnKey);
    case 'profitPreTax':
      return formatProfitPreTaxDetail(sections, columnKey);
    case 'profitNet':
      return formatProfitNetDetail(sections, columnKey);
    case 'sgaTaxable':
      return formatSgaTaxableDetail(sections, columnKey);
    case 'sgaTotal':
      return formatSgaTotalDetail(sections, columnKey);
    case 'cashInflow':
      return formatStaticValueDetail(FORMULA_LABELS.cashInflow, columnKey, row);
    case 'cashOutflow':
      return formatStaticValueDetail(FORMULA_LABELS.cashOutflow, columnKey, row);
    case 'corpTax':
      return formatStaticValueDetail(FORMULA_LABELS.corpTax, columnKey, row);
    default:
      if (isAggregateLabel(row?.label) && section) {
        return formatSectionSumDetail(section, columnKey);
      }
      return getAggregateFormulaLabel(row);
  }
}
