const SECTION_COLOR_STORAGE_KEY = 'mga-section-colors';

const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_DARK_TEXT_COLOR = '#000000';

/** 大項目ごとのデフォルト色（parseJournal.js から参照） */
export const DEFAULT_SECTION_COLORS = {
  revenue: { color: '#203764', barColor: '#203764', textColor: DEFAULT_TEXT_COLOR },
  nonOperating: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  nonOperatingExpense: { color: '#4338ca', barColor: '#3730a3', textColor: DEFAULT_TEXT_COLOR },
  personnel: { color: '#806000', barColor: '#806000', textColor: DEFAULT_TEXT_COLOR },
  expense: { color: '#375623', barColor: '#375623', textColor: DEFAULT_TEXT_COLOR },
  other: { color: '#375623', barColor: '#375623', textColor: DEFAULT_TEXT_COLOR },
  outsourcing: { color: '#548235', barColor: '#548235', textColor: DEFAULT_TEXT_COLOR },
  tax: { color: '#9a3412', barColor: '#7c2d12', textColor: DEFAULT_TEXT_COLOR },
  revenueVariance: { color: '#c00000', barColor: '#c00000', textColor: DEFAULT_TEXT_COLOR },
  profit: { color: '#ffc000', barColor: '#ffc000', textColor: DEFAULT_DARK_TEXT_COLOR },
  currentAssets: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  fixedAssets: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  currentLiab: { color: '#595959', barColor: '#595959', textColor: DEFAULT_TEXT_COLOR },
  fixedLiab: { color: '#595959', barColor: '#595959', textColor: DEFAULT_TEXT_COLOR },
  equity: { color: '#bf8f00', barColor: '#bf8f00', textColor: DEFAULT_DARK_TEXT_COLOR },
  otherPay: { color: '#1f4e78', barColor: '#1f4e78', textColor: DEFAULT_TEXT_COLOR },
  cfIn: { color: '#548235', barColor: '#548235', textColor: DEFAULT_TEXT_COLOR },
  cfOut: { color: '#c65911', barColor: '#c65911', textColor: DEFAULT_TEXT_COLOR },
  cashBalance: { color: '#203764', barColor: '#203764', textColor: DEFAULT_TEXT_COLOR },
};

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

function normalizeSectionColorConfig(config) {
  const normalized = {};
  const migrated = { ...config };
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

export function getSectionColors(sectionId, config = {}) {
  const defaults = DEFAULT_SECTION_COLORS[sectionId] ?? FALLBACK;
  const override = config[sectionId]
    ?? (sectionId === 'revenueVariance' ? config.receivables : undefined);
  if (!override) return { ...defaults };
  if (typeof override === 'string') return { ...defaults, barColor: override };
  return {
    ...defaults,
    barColor: override.barColor ?? defaults.barColor,
    textColor: override.textColor ?? defaults.textColor,
  };
}

export function applySectionColors(sections, config) {
  return sections.map((s) => {
    const { color, barColor, textColor } = getSectionColors(s.id, config);
    return { ...s, color, barColor, textColor };
  });
}

export function collectSectionColorDefs(sections, config = {}) {
  const seen = new Set();
  const defs = [];
  for (const s of sections) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const defaults = DEFAULT_SECTION_COLORS[s.id] ?? FALLBACK;
    const current = getSectionColors(s.id, config);
    defs.push({
      sectionId: s.id,
      label: s.label,
      color: current.color,
      barColor: current.barColor,
      textColor: current.textColor,
      defaultColor: defaults.color,
      defaultBarColor: defaults.barColor,
      defaultTextColor: defaults.textColor,
      isCustom: Object.prototype.hasOwnProperty.call(config, s.id),
    });
  }
  return defs;
}

export function getSectionBarColor(sectionId, sections, config = {}) {
  const section = sections?.find((s) => s.id === sectionId);
  if (section?.barColor) return section.barColor;
  return getSectionColors(sectionId, config).barColor;
}

export function getSectionTextColor(sectionId, sections, config = {}) {
  const section = sections?.find((s) => s.id === sectionId);
  if (section?.textColor) return section.textColor;
  return getSectionColors(sectionId, config).textColor;
}
