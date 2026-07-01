const VISIBILITY_STORAGE_KEY = 'mga-row-visibility';

/** 表示設定の対象外（常に表示・大きく表示。外注費は塗り色１も固定） */
export const VISIBILITY_FIXED_SECTION_IDS = new Set(['revenue', 'revenueVariance', 'outsourcing']);

export const OUTSOURCING_SECTION_ID = 'outsourcing';

export function isVisibilityFixedSection(sectionId) {
  return VISIBILITY_FIXED_SECTION_IDS.has(sectionId);
}

export function isOutsourcingFixedDisplaySection(sectionId) {
  return sectionId === OUTSOURCING_SECTION_ID;
}

/** 個人事業主向け源泉内訳（報酬金額・消費税額など）。表示スタイル固定の対象外 */
export function isOutsourcingBreakdownRow(sectionId, row) {
  return isOutsourcingFixedDisplaySection(sectionId) && row?.type === 'breakdown';
}

/** 売上高の人月計画行。小さく表示する */
export function isRevenueManMonthRow(sectionId, row) {
  return sectionId === 'revenue' && row?.type === 'man-month';
}

const ROW_TYPE_LABELS = {
  total: '合計',
  group: 'グループ',
  sub: '補助科目',
  item: '明細',
  plan: '計画',
  breakdown: '内訳',
  'man-month': '\u4eba\u6708',
  profit: '利益',
  variance: '差異',
  warningSummary: '警告',
};

export function visibilityRowKey(sectionId, row) {
  if (row.type === 'total') return `${sectionId}|total|${row.label}`;
  if (row.type === 'profit') return `${sectionId}|profit|${row.label}`;
  if (row.type === 'variance') return `${sectionId}|variance|${row.label}`;
  if (row.type === 'group') return `${sectionId}|group|${row.label}`;
  if (row.type === 'plan') return `${sectionId}|plan|${row.label}|${row.subLabel}`;
  if (row.type === 'breakdown') return `${sectionId}|breakdown|${row.parentVendorRowId}|${row.subLabel}`;
  if (row.type === 'man-month') return `${sectionId}|man-month|${row.parentRevenueRowId}|${row.revenueClientId}`;
  if (row.type === 'sub') return `${sectionId}|sub|${row.label}|${row.subLabel}`;
  return `${sectionId}|item|${row.label}|${row.subLabel || ''}`;
}

export function loadVisibilityConfig() {
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveVisibilityConfig(config) {
  localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(config));
}

/** false が明示された行のみ非表示。未設定は表示 */
export function isRowVisible(sectionId, row, config) {
  if (isVisibilityFixedSection(sectionId)) return true;
  const key = visibilityRowKey(sectionId, row);
  return config[key] !== false;
}

export function rowTypeLabel(type) {
  return ROW_TYPE_LABELS[type] || type;
}

export function collectVisibilityCandidates(sections) {
  const candidates = [];
  for (const section of sections) {
    if (isVisibilityFixedSection(section.id)) continue;
    for (const row of section.rows) {
      candidates.push({
        key: visibilityRowKey(section.id, row),
        sectionId: section.id,
        sectionLabel: section.label,
        account: row.label,
        subLabel: row.subLabel || '',
        rowType: row.type,
        rowTypeLabel: rowTypeLabel(row.type),
      });
    }
  }
  return candidates;
}
