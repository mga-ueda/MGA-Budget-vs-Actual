/** 自動生成 — 編集は scripts/gen-plan-kpi-config.mjs の PLAN_KPI_MESSAGES から行う */
export const PLAN_KPI_TOOLTIPS = {
  profitMargin: {
    rangeMin: 3,
    rangeMax: 8,
    formula: "経常利益÷(売上高合計+営業外収益合計)×100",
    benchmark: "約3～8％(業種により差が大きい)",
    tipHigh: "利益率は良好です。成長投資（設備・採用・研修）や内部留保のバランスを検討しましょう。",
    tipLow: "売上の確保・単価見直し、外注費・諸経費の見直しで収益改善を検討しましょう。人件費の効率化も確認してください。",
  },
  laborShareRate: {
    rangeMin: 60,
    rangeMax: 70,
    formula: "人件費合計÷付加価値×100",
    formulaNote: "付加価値 = 営業利益 + 人件費合計",
    benchmark: "約60～70％",
    tipHigh: "人件費が付加価値に対して高めです。採用計画・残業・賞与の見直しや、1人あたり売上・利益の向上を検討しましょう。",
    tipLow: "人件費比率が低めです。待遇の競争力や採用・定着リスクがないか確認しましょう。過度なコスト削減になっていないかも点検してください。",
  },
  directorLaborShareRate: {
    rangeMin: 5,
    rangeMax: 15,
    formula: "役員報酬÷付加価値×100",
    formulaNote: "報酬ゼロの役員は人数に含めません",
    benchmark: "約5～15％",
    tipHigh: "役員報酬が付加価値に対して高めです。報酬水準・人数・業務分担の見直しを検討しましょう。",
    tipLow: "役員報酬が低めです。役員の負担過多や、適正な報酬・インセンティブが確保できているか確認しましょう。",
  },
  staffLaborShareRate: {
    rangeMin: 45,
    rangeMax: 60,
    formula: "(人件費合計−役員報酬)÷付加価値×100",
    formulaNote: "社員の人件費は給料・法定福利費などを含みます",
    benchmark: "約45～60％",
    tipHigh: "社員の人件費が高めです。給与・賞与・残業・法定福利費・人数の見直しや生産性向上で改善を検討しましょう。",
    tipLow: "社員の人件費が低めです。給与水準の競争力、採用・定着・モチベーションへの影響を確認しましょう。",
  },
  payGapRatio: {
    rangeMin: 3,
    rangeMax: 6,
    formula: "役員1人あたり平均報酬÷社員1人あたり平均人件費",
    formulaNote: "報酬ゼロの役員は人数に含めません",
    benchmark: "約3～6倍",
    tipHigh: "役員と社員の報酬格差が大きめです。役員報酬の見直しや、社員側の待遇改善のバランスを検討しましょう。",
    tipLow: "報酬格差が小さめです。役員の適正報酬や責任範囲との整合を確認しましょう。",
  }
};

function getKpiValueStatus(value, rangeMin, rangeMax) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (value > rangeMax) return 'high';
  if (value < rangeMin) return 'low';
  return 'ok';
}

export function getPlanKpiTooltip(key, value = null) {
  const item = PLAN_KPI_TOOLTIPS[key];
  if (!item) return '';
  const lines = [`【計算式】`, item.formula, ''];
  if (item.formulaNote) lines.push(item.formulaNote, '');
  lines.push(`【中小企業の目安】`, item.benchmark, '');

  const status = getKpiValueStatus(value, item.rangeMin, item.rangeMax);
  if (status === 'high') lines.push('※現在は目安より高めです', '');
  else if (status === 'low') lines.push('※現在は目安より低めです', '');
  else if (status === 'ok') lines.push('※現在は目安の範囲内です', '');

  lines.push(
    `【TIPS】`,
    '',
    `【目安より高い場合】`,
    item.tipHigh,
    '',
    `【目安より低い場合】`,
    item.tipLow,
  );
  return lines.join('\n');
}
