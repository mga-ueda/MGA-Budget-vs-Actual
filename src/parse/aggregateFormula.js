import { APP_AGGREGATE_LABEL_PREFIX } from './parseJournal.js';

const FORMULA_LABELS = {
  sectionSum: 'セクション内の勘定科目行の合計',
  sectionSumExcludePlan: 'セクション内の勘定科目行の合計（計画行を除く）',
  sectionSumOtherPay: '保険積立金・長期未払金・長期借入金・未払消費税・未払法人税等・住民税の合計',
  profitOperating: '売上高合計 − (人件費合計 + 諸経費合計 + 外注費合計 + その他合計)',
  profitOrdinary: '営業利益 + 営業外収益合計 − 営業外費用合計',
  profitPreTax: '経常利益 + 特別利益合計 − 特別損失合計',
  profitNet: '税引前当期純利益 − 法人税合計',
  sgaTaxable: '人件費合計 + 諸経費合計 + 外注費合計',
  sgaTotal: '消費税対象販管費合計 + その他合計',
  cashInflow: '仕訳の借方「普通預金」の合計',
  cashOutflow: '仕訳の貸方「普通預金」の合計',
};

export function isAggregateRow(row) {
  return Boolean(row?.aggregateFormula || isAggregateLabel(row?.label));
}

export function isAggregateLabel(label) {
  return label?.startsWith(APP_AGGREGATE_LABEL_PREFIX) ?? false;
}

export function getAggregateFormulaLabel(row, section = null) {
  if (row?.aggregateFormula === 'sectionSumExcludePlan' && section?.id === 'otherPay') {
    return FORMULA_LABELS.sectionSumOtherPay;
  }
  if (row?.aggregateFormula && FORMULA_LABELS[row.aggregateFormula]) {
    return FORMULA_LABELS[row.aggregateFormula];
  }
  if (isAggregateLabel(row?.label)) {
    return FORMULA_LABELS.sectionSum;
  }
  return null;
}

export function getAggregateFormulaDetail(row, section, planData, columnKey) {
  return getAggregateFormulaLabel(row, section);
}
