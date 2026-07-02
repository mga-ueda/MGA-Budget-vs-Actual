const SECTION_COLOR_STORAGE_KEY = 'mga-section-colors';

const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_DARK_TEXT_COLOR = '#000000';

/** 大項目ごとのデフォルト色（parseJournal.js から参照） */
export const DEFAULT_SECTION_COLORS = {
  revenue: { color: '#203764', barColor: '#203764', textColor: DEFAULT_TEXT_COLOR },
  nonOperating: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  nonOperatingExpense: { color: '#4338ca', barColor: '#3730a3', textColor: DEFAULT_TEXT_COLOR },
  specialLoss: { color: '#991b1b', barColor: '#7f1d1d', textColor: DEFAULT_TEXT_COLOR },
  specialProfit: { color: '#166534', barColor: '#14532d', textColor: DEFAULT_TEXT_COLOR },
  personnel: { color: '#806000', barColor: '#806000', textColor: DEFAULT_TEXT_COLOR },
  expense: { color: '#375623', barColor: '#375623', textColor: DEFAULT_TEXT_COLOR },
  other: { color: '#375623', barColor: '#375623', textColor: DEFAULT_TEXT_COLOR },
  outsourcing: { color: '#548235', barColor: '#548235', textColor: DEFAULT_TEXT_COLOR },
  tax: { color: '#9a3412', barColor: '#7c2d12', textColor: DEFAULT_TEXT_COLOR },
  revenueVariance: { color: '#c00000', barColor: '#c00000', textColor: DEFAULT_TEXT_COLOR },
  profit: { color: '#ffc000', barColor: '#ffc000', textColor: DEFAULT_DARK_TEXT_COLOR },
  currentAssets: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  fixedAssets: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  deferredAssets: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  currentLiab: { color: '#595959', barColor: '#595959', textColor: DEFAULT_TEXT_COLOR },
  fixedLiab: { color: '#595959', barColor: '#595959', textColor: DEFAULT_TEXT_COLOR },
  equity: { color: '#bf8f00', barColor: '#bf8f00', textColor: DEFAULT_DARK_TEXT_COLOR },
  otherPay: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  cfIn: { color: '#548235', barColor: '#548235', textColor: DEFAULT_TEXT_COLOR },
  cfOut: { color: '#c65911', barColor: '#c65911', textColor: DEFAULT_TEXT_COLOR },
  cashBalance: { color: '#203764', barColor: '#203764', textColor: DEFAULT_TEXT_COLOR },
  sgaTaxable: { color: '#375623', barColor: '#375623', textColor: DEFAULT_TEXT_COLOR },
  sgaTotal: { color: '#375623', barColor: '#375623', textColor: DEFAULT_TEXT_COLOR },
};

/** 色設定に常に表示する大項目（予実表の並びに準拠） */
export const SECTION_COLOR_SECTION_DEFS = [
  { id: 'revenue', label: '売上高' },
  { id: 'revenueVariance', label: '売上高差異（売掛金）' },
  { id: 'nonOperating', label: '営業外収益' },
  { id: 'nonOperatingExpense', label: '営業外費用' },
  { id: 'personnel', label: '人件費' },
  { id: 'expense', label: '諸経費' },
  { id: 'outsourcing', label: '外注費' },
  { id: 'sgaTaxable', label: '消費税対象販管費合計' },
  { id: 'other', label: 'その他' },
  { id: 'sgaTotal', label: '販管費合計' },
  { id: 'specialProfit', label: '特別利益' },
  { id: 'specialLoss', label: '特別損失' },
  { id: 'tax', label: '法人税' },
  { id: 'profit', label: '利益' },
  { id: 'currentAssets', label: '流動資産' },
  { id: 'fixedAssets', label: '固定資産' },
  { id: 'deferredAssets', label: '繰延資産' },
  { id: 'currentLiab', label: '流動負債' },
  { id: 'fixedLiab', label: '固定負債' },
  { id: 'equity', label: '純資産' },
  { id: 'otherPay', label: 'その他支払' },
  { id: 'cfIn', label: '入金' },
  { id: 'cfOut', label: '出金' },
  { id: 'cashBalance', label: '現預金' },
];

const FALLBACK = { color: '#44403c', barColor: '#292524', textColor: DEFAULT_TEXT_COLOR };

/** 表示フィルター → 代表大項目（section.filter と対応） */
export const FILTER_SECTION_IDS = {
  income: 'revenue',
  personnel: 'personnel',
  expense: 'expense',
  other: 'other',
  outsourcing: 'outsourcing',
  tax: 'tax',
  trends: 'profit',
};

export function getFilterSectionId(filterId) {
  return FILTER_SECTION_IDS[filterId] ?? null;
}

export function loadSectionColorConfig() {
  try {
    const raw = localStorage.getItem(SECTION_COLOR_STORAGE_KEY);
    const config = raw ? JSON.parse(raw) : {};
    return normalizeSectionColorConfig(config);
  } catch {
    return {};
  }
}

export function saveSectionColorConfig(config) {
  localStorage.setItem(SECTION_COLOR_STORAGE_KEY, JSON.stringify(normalizeSectionColorConfig(config)));
}

const SECTION_COLOR_MODE_KEYS = new Set(['dark', 'light']);

function isPerModeSectionColorConfig(config) {
  if (!config || typeof config !== 'object') return false;
  const keys = Object.keys(config);
  if (keys.length === 0) return false;
  return keys.every((key) => SECTION_COLOR_MODE_KEYS.has(key));
}

function normalizeSectionOverrides(raw = {}) {
  const normalized = {};
  const migrated = { ...raw };
  if (migrated.receivables && !migrated.revenueVariance) {
    migrated.revenueVariance = migrated.receivables;
  }
  delete migrated.receivables;
  for (const [id, val] of Object.entries(migrated)) {
    if (typeof val === 'string') {
      normalized[id] = val;
    } else if (val) {
      const entry = {};
      if (typeof val.barColor === 'string') entry.barColor = val.barColor;
      if (typeof val.textColor === 'string') entry.textColor = val.textColor;
      if (Object.keys(entry).length) normalized[id] = entry;
    }
  }
  return normalized;
}

export function normalizeSectionColorConfig(config = {}) {
  if (!config || typeof config !== 'object') {
    return { dark: {}, light: {} };
  }
  if (isPerModeSectionColorConfig(config)) {
    return {
      dark: normalizeSectionOverrides(config.dark),
      light: normalizeSectionOverrides(config.light),
    };
  }
  return {
    dark: normalizeSectionOverrides(config),
    light: {},
  };
}

function getSectionColorModeBucket(config, mode = 'dark') {
  const normalized = normalizeSectionColorConfig(config);
  return normalized[mode === 'light' ? 'light' : 'dark'] ?? {};
}

export function setSectionColorOverride(config, mode, sectionId, { barColor, textColor }) {
  const normalized = normalizeSectionColorConfig(config);
  const modeKey = mode === 'light' ? 'light' : 'dark';
  return {
    ...normalized,
    [modeKey]: {
      ...normalized[modeKey],
      [sectionId]: { barColor, textColor },
    },
  };
}

export function resetSectionColorOverride(config, mode, sectionId) {
  const normalized = normalizeSectionColorConfig(config);
  const modeKey = mode === 'light' ? 'light' : 'dark';
  const bucket = { ...normalized[modeKey] };
  delete bucket[sectionId];
  return { ...normalized, [modeKey]: bucket };
}

/** 指定モードの大項目色上書きをすべて削除 */
export function resetSectionColorModeOverrides(config, mode = 'dark') {
  const normalized = normalizeSectionColorConfig(config);
  const modeKey = mode === 'light' ? 'light' : 'dark';
  return { ...normalized, [modeKey]: {} };
}

export function getSectionColors(sectionId, config = {}, mode = 'dark') {
  const defaults = DEFAULT_SECTION_COLORS[sectionId] ?? FALLBACK;
  const bucket = getSectionColorModeBucket(config, mode);
  const override = bucket[sectionId]
    ?? (sectionId === 'revenueVariance' ? bucket.receivables : undefined);
  if (!override) return { ...defaults };
  if (typeof override === 'string') return { ...defaults, barColor: override };
  return {
    ...defaults,
    barColor: override.barColor ?? defaults.barColor,
    textColor: override.textColor ?? defaults.textColor,
  };
}

export function applySectionColors(sections, config, mode = 'dark') {
  return sections.map((s) => {
    const { color, barColor, textColor } = getSectionColors(s.id, config, mode);
    return { ...s, color, barColor, textColor };
  });
}

function resolveSectionColorLabel(section) {
  if (section.label) return section.label;
  const totalRow = section.rows?.find((r) => r.type === 'total');
  if (totalRow?.label) return totalRow.label;
  const registry = SECTION_COLOR_SECTION_DEFS.find((d) => d.id === section.id);
  return registry?.label ?? section.id;
}

export function collectSectionColorDefs(sections = [], config = {}, mode = 'dark') {
  const labels = new Map(SECTION_COLOR_SECTION_DEFS.map((d) => [d.id, d.label]));
  for (const s of sections) {
    labels.set(s.id, resolveSectionColorLabel(s));
  }

  const bucket = getSectionColorModeBucket(config, mode);
  const registryIds = new Set(SECTION_COLOR_SECTION_DEFS.map((d) => d.id));
  const defs = SECTION_COLOR_SECTION_DEFS.map(({ id }) => {
    const defaults = DEFAULT_SECTION_COLORS[id] ?? FALLBACK;
    const current = getSectionColors(id, config, mode);
    return {
      sectionId: id,
      label: labels.get(id) ?? id,
      color: current.color,
      barColor: current.barColor,
      textColor: current.textColor,
      defaultColor: defaults.color,
      defaultBarColor: defaults.barColor,
      defaultTextColor: defaults.textColor,
      isCustom: Object.prototype.hasOwnProperty.call(bucket, id),
    };
  });

  for (const s of sections) {
    if (registryIds.has(s.id)) continue;
    const defaults = DEFAULT_SECTION_COLORS[s.id] ?? FALLBACK;
    const current = getSectionColors(s.id, config, mode);
    defs.push({
      sectionId: s.id,
      label: resolveSectionColorLabel(s),
      color: current.color,
      barColor: current.barColor,
      textColor: current.textColor,
      defaultColor: defaults.color,
      defaultBarColor: defaults.barColor,
      defaultTextColor: defaults.textColor,
      isCustom: Object.prototype.hasOwnProperty.call(bucket, s.id),
    });
  }

  return defs;
}

export function getSectionBarColor(sectionId, sections, config = {}, mode = 'dark') {
  const section = sections?.find((s) => s.id === sectionId);
  if (section?.barColor) return section.barColor;
  return getSectionColors(sectionId, config, mode).barColor;
}

export function getSectionTextColor(sectionId, sections, config = {}, mode = 'dark') {
  const section = sections?.find((s) => s.id === sectionId);
  if (section?.textColor) return section.textColor;
  return getSectionColors(sectionId, config, mode).textColor;
}
