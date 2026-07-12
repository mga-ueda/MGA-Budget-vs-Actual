const SECTION_COLOR_STORAGE_KEY = 'mga-section-colors';

const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_DARK_TEXT_COLOR = '#000000';

/** 大項目ごとのデフォルト色（ダークモード） */
export const DEFAULT_SECTION_COLORS_DARK = {
  revenue: { color: '#002061', barColor: '#002061', textColor: DEFAULT_TEXT_COLOR },
  revenueVariance: { color: '#660000', barColor: '#660000', textColor: DEFAULT_TEXT_COLOR },
  nonOperating: { color: '#003666', barColor: '#003666', textColor: DEFAULT_TEXT_COLOR },
  nonOperatingExpense: { color: '#273c91', barColor: '#273c91', textColor: DEFAULT_TEXT_COLOR },
  specialLoss: { color: '#660000', barColor: '#660000', textColor: DEFAULT_TEXT_COLOR },
  specialProfit: { color: '#002061', barColor: '#002061', textColor: DEFAULT_TEXT_COLOR },
  personnel: { color: '#664d00', barColor: '#664d00', textColor: DEFAULT_TEXT_COLOR },
  expense: { color: '#183d00', barColor: '#183d00', textColor: DEFAULT_TEXT_COLOR },
  other: { color: '#143300', barColor: '#143300', textColor: DEFAULT_TEXT_COLOR },
  outsourcing: { color: '#344d00', barColor: '#344d00', textColor: DEFAULT_TEXT_COLOR },
  tax: { color: '#5f2411', barColor: '#5f2411', textColor: DEFAULT_TEXT_COLOR },
  profit: { color: '#ffc000', barColor: '#ffc000', textColor: DEFAULT_DARK_TEXT_COLOR },
  currentAssets: { color: '#153a5b', barColor: '#153a5b', textColor: DEFAULT_TEXT_COLOR },
  fixedAssets: { color: '#153a5b', barColor: '#153a5b', textColor: DEFAULT_TEXT_COLOR },
  deferredAssets: { color: '#153a5b', barColor: '#153a5b', textColor: DEFAULT_TEXT_COLOR },
  currentLiab: { color: '#4f4f4f', barColor: '#4f4f4f', textColor: DEFAULT_TEXT_COLOR },
  fixedLiab: { color: '#4f4f4f', barColor: '#4f4f4f', textColor: DEFAULT_TEXT_COLOR },
  equity: { color: '#ffc000', barColor: '#ffc000', textColor: DEFAULT_DARK_TEXT_COLOR },
  otherPay: { color: '#00549e', barColor: '#00549e', textColor: DEFAULT_TEXT_COLOR },
  cfIn: { color: '#2d7000', barColor: '#2d7000', textColor: DEFAULT_TEXT_COLOR },
  cfOut: { color: '#b34700', barColor: '#b34700', textColor: DEFAULT_TEXT_COLOR },
  cashBalance: { color: '#003399', barColor: '#003399', textColor: DEFAULT_TEXT_COLOR },
  sgaTaxable: { color: '#143300', barColor: '#143300', textColor: DEFAULT_TEXT_COLOR },
  sgaTotal: { color: '#143300', barColor: '#143300', textColor: DEFAULT_TEXT_COLOR },
};

/** 大項目ごとのデフォルト色（ライトモード） */
export const DEFAULT_SECTION_COLORS_LIGHT = {
  revenue: { color: '#3b67bf', barColor: '#3b67bf', textColor: DEFAULT_TEXT_COLOR },
  revenueVariance: { color: '#c35555', barColor: '#c35555', textColor: DEFAULT_TEXT_COLOR },
  nonOperating: { color: '#2d6495', barColor: '#2d6495', textColor: DEFAULT_TEXT_COLOR },
  nonOperatingExpense: { color: '#4e62b1', barColor: '#4e62b1', textColor: DEFAULT_TEXT_COLOR },
  specialLoss: { color: '#c35555', barColor: '#c35555', textColor: DEFAULT_TEXT_COLOR },
  specialProfit: { color: '#3b67bf', barColor: '#3b67bf', textColor: DEFAULT_TEXT_COLOR },
  personnel: { color: '#9f832d', barColor: '#9f832d', textColor: DEFAULT_TEXT_COLOR },
  expense: { color: '#488023', barColor: '#488023', textColor: DEFAULT_TEXT_COLOR },
  other: { color: '#488023', barColor: '#488023', textColor: DEFAULT_TEXT_COLOR },
  outsourcing: { color: '#7aa225', barColor: '#7aa225', textColor: DEFAULT_TEXT_COLOR },
  tax: { color: '#9f5138', barColor: '#9f5138', textColor: DEFAULT_TEXT_COLOR },
  profit: { color: '#ffc000', barColor: '#ffc000', textColor: DEFAULT_DARK_TEXT_COLOR },
  currentAssets: { color: '#3e6b93', barColor: '#3e6b93', textColor: DEFAULT_TEXT_COLOR },
  fixedAssets: { color: '#3e6b93', barColor: '#3e6b93', textColor: DEFAULT_TEXT_COLOR },
  deferredAssets: { color: '#3e6b93', barColor: '#3e6b93', textColor: DEFAULT_TEXT_COLOR },
  currentLiab: { color: '#878787', barColor: '#878787', textColor: DEFAULT_TEXT_COLOR },
  fixedLiab: { color: '#878787', barColor: '#878787', textColor: DEFAULT_TEXT_COLOR },
  equity: { color: '#ffc000', barColor: '#ffc000', textColor: DEFAULT_DARK_TEXT_COLOR },
  otherPay: { color: '#3285cd', barColor: '#3285cd', textColor: DEFAULT_TEXT_COLOR },
  cfIn: { color: '#5fa72f', barColor: '#5fa72f', textColor: DEFAULT_TEXT_COLOR },
  cfOut: { color: '#d77433', barColor: '#d77433', textColor: DEFAULT_TEXT_COLOR },
  cashBalance: { color: '#3258a4', barColor: '#3258a4', textColor: DEFAULT_TEXT_COLOR },
  sgaTaxable: { color: '#488023', barColor: '#488023', textColor: DEFAULT_TEXT_COLOR },
  sgaTotal: { color: '#488023', barColor: '#488023', textColor: DEFAULT_TEXT_COLOR },
};

/** parseJournal.js 等の後方互換用（ダークモード既定） */
export const DEFAULT_SECTION_COLORS = DEFAULT_SECTION_COLORS_DARK;

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

function getDefaultSectionColor(sectionId, mode = 'dark') {
  const defaults = mode === 'light' ? DEFAULT_SECTION_COLORS_LIGHT : DEFAULT_SECTION_COLORS_DARK;
  return defaults[sectionId] ?? FALLBACK;
}

function getEffectiveSectionOverrideColors(sectionId, override, mode = 'dark') {
  const defaults = getDefaultSectionColor(sectionId, mode);
  if (!override || typeof override !== 'object') {
    return { barColor: defaults.barColor, textColor: defaults.textColor };
  }
  return {
    barColor: override.barColor ?? defaults.barColor,
    textColor: override.textColor ?? defaults.textColor,
  };
}

function sectionOverrideMatchesDefault(sectionId, override, mode = 'dark') {
  const defaults = getDefaultSectionColor(sectionId, mode);
  const effective = getEffectiveSectionOverrideColors(sectionId, override, mode);
  return effective.barColor === defaults.barColor && effective.textColor === defaults.textColor;
}

export function isSectionColorCustom(config, mode, sectionId) {
  const bucket = getSectionColorModeBucket(config, mode);
  const override = bucket[sectionId];
  if (override == null) return false;
  return !sectionOverrideMatchesDefault(sectionId, override, mode);
}

function normalizeSectionOverrides(raw = {}, mode = 'dark') {
  const normalized = {};
  if (!raw || typeof raw !== 'object') return normalized;
  for (const [id, val] of Object.entries(raw)) {
    if (!val || typeof val !== 'object') continue;
    const entry = {};
    if (typeof val.barColor === 'string') entry.barColor = val.barColor;
    if (typeof val.textColor === 'string') entry.textColor = val.textColor;
    if (Object.keys(entry).length && !sectionOverrideMatchesDefault(id, entry, mode)) {
      normalized[id] = entry;
    }
  }
  return normalized;
}

export function normalizeSectionColorConfig(config = {}) {
  if (!config || typeof config !== 'object') {
    return { dark: {}, light: {} };
  }
  if (!isPerModeSectionColorConfig(config)) {
    return { dark: {}, light: {} };
  }
  return {
    dark: normalizeSectionOverrides(config.dark, 'dark'),
    light: normalizeSectionOverrides(config.light, 'light'),
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
  const defaults = getDefaultSectionColor(sectionId, mode);
  const bucket = getSectionColorModeBucket(config, mode);
  const override = bucket[sectionId];
  if (!override || typeof override !== 'object') return { ...defaults };
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
    const defaults = getDefaultSectionColor(id, mode);
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
      isCustom: isSectionColorCustom(config, mode, id),
    };
  });

  for (const s of sections) {
    if (registryIds.has(s.id)) continue;
    const defaults = getDefaultSectionColor(s.id, mode);
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
      isCustom: isSectionColorCustom(config, mode, s.id),
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
