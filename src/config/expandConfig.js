const EXPAND_STORAGE_KEY = 'mga-sub-expand-config';

/** 補助科目1件でも常に展開表示する大項目 */
export const ALWAYS_EXPAND_SECTION_IDS = new Set(['revenue', 'revenueVariance']);

export function expandConfigKey(sectionId, account) {
  return `${sectionId}|${account}`;
}

function defaultExpandEntry() {
  return { collapsible: false, hideTotalWhenExpanded: false };
}

function normalizeExpandEntry(value) {
  if (value == null) return defaultExpandEntry();
  if (typeof value === 'boolean') {
    return { collapsible: value, hideTotalWhenExpanded: false };
  }
  if (typeof value === 'object') {
    return {
      collapsible: Boolean(value.collapsible),
      hideTotalWhenExpanded: Boolean(value.hideTotalWhenExpanded),
    };
  }
  return defaultExpandEntry();
}

function normalizeExpandConfig(config) {
  const result = {};
  for (const [key, val] of Object.entries(config ?? {})) {
    result[key] = normalizeExpandEntry(val);
  }
  return result;
}

export function loadExpandConfig() {
  try {
    const raw = localStorage.getItem(EXPAND_STORAGE_KEY);
    return normalizeExpandConfig(raw ? JSON.parse(raw) : {});
  } catch {
    return {};
  }
}

export function saveExpandConfig(config) {
  localStorage.setItem(EXPAND_STORAGE_KEY, JSON.stringify(normalizeExpandConfig(config)));
}

export function getExpandEntry(config, sectionId, account) {
  const key = expandConfigKey(sectionId, account);
  if (Object.prototype.hasOwnProperty.call(config, key)) {
    return normalizeExpandEntry(config[key]);
  }
  return defaultExpandEntry();
}

export function setExpandEntry(config, sectionId, account, patch) {
  const key = expandConfigKey(sectionId, account);
  const current = getExpandEntry(config, sectionId, account);
  return { ...config, [key]: { ...current, ...patch } };
}

/** true = 折りたたみ可能（グループ行）。false = 補助科目を常にすべて表示 */
export function isCollapsibleGroup(sectionId, account, subCount, config) {
  if (ALWAYS_EXPAND_SECTION_IDS.has(sectionId)) return false;
  return getExpandEntry(config, sectionId, account).collapsible;
}

/** 展開中にグループ行の合計金額を非表示にする */
export function isHideTotalWhenExpanded(sectionId, account, config) {
  if (ALWAYS_EXPAND_SECTION_IDS.has(sectionId)) return false;
  const entry = getExpandEntry(config, sectionId, account);
  return entry.collapsible && entry.hideTotalWhenExpanded;
}
