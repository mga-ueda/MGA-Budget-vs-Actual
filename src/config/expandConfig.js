const EXPAND_STORAGE_KEY = 'mga-sub-expand-config';

/** 補助科目1件でも常に展開表示する大項目（折りたたみ不可） */
export const ALWAYS_EXPAND_SECTION_IDS = new Set(['revenue', 'revenueVariance', 'outsourcing']);

/** 展開設定タブに表示しない大項目（折りたたみ不可のため設定不要） */
export const EXPAND_SETTINGS_EXCLUDED_SECTION_IDS = new Set(['outsourcing']);

export function isExpandSettingsSection(sectionId) {
  return !EXPAND_SETTINGS_EXCLUDED_SECTION_IDS.has(sectionId);
}

export function expandConfigKey(sectionId, account) {
  return `${sectionId}|${account}`;
}

/** 未設定時デフォルトで折りたたむ大項目 */
const DEFAULT_COLLAPSIBLE_SECTION_IDS = new Set(['expense']);

/** 未設定時デフォルトで折りたたむ勘定科目（sectionId|account） */
const DEFAULT_COLLAPSIBLE_ACCOUNT_KEYS = new Set([
  'currentAssets|普通預金',
]);

function defaultExpandEntry(sectionId, account) {
  const key = expandConfigKey(sectionId, account);
  const collapsible = DEFAULT_COLLAPSIBLE_SECTION_IDS.has(sectionId)
    || DEFAULT_COLLAPSIBLE_ACCOUNT_KEYS.has(key);
  return { collapsible, hideTotalWhenExpanded: false };
}

function normalizeExpandEntry(value, sectionId, account) {
  if (value == null) return defaultExpandEntry(sectionId, account);
  if (typeof value === 'boolean') {
    return { collapsible: value, hideTotalWhenExpanded: false };
  }
  if (typeof value === 'object') {
    return {
      collapsible: Boolean(value.collapsible),
      hideTotalWhenExpanded: Boolean(value.hideTotalWhenExpanded),
    };
  }
  return defaultExpandEntry(sectionId, account);
}

function normalizeExpandConfig(config) {
  const result = {};
  for (const [key, val] of Object.entries(config ?? {})) {
    const sep = key.indexOf('|');
    const sectionId = sep >= 0 ? key.slice(0, sep) : '';
    const account = sep >= 0 ? key.slice(sep + 1) : '';
    result[key] = normalizeExpandEntry(val, sectionId, account);
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
    return normalizeExpandEntry(config[key], sectionId, account);
  }
  return defaultExpandEntry(sectionId, account);
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
