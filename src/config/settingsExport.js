import { normalizeUiColorConfig } from './uiColorConfig.js';
import { normalizeSectionColorConfig } from './sectionColorConfig.js';

export const SETTINGS_EXPORT_FORMAT = 'mga-budget-settings';
export const SETTINGS_EXPORT_VERSION = 1;

const SETTINGS_EXPORT_APP_KEY = 'mga-app-settings';

function prepareSettingsValueForExport(key, value) {
  if (key === 'mga-ui-colors') return normalizeUiColorConfig(value);
  if (key === 'mga-section-colors') return normalizeSectionColorConfig(value);
  if (key !== SETTINGS_EXPORT_APP_KEY) return value;
  return stripAppSettingsForExport(value);
}

function prepareSettingsValueForImport(key, value) {
  if (key === 'mga-ui-colors') return normalizeUiColorConfig(value);
  if (key === 'mga-section-colors') return normalizeSectionColorConfig(value);
  if (key !== SETTINGS_EXPORT_APP_KEY) return value;
  return mergeAppSettingsForImport(value);
}

/** エクスポート／インポート対象外（端末ごとのフォント倍率・行余白）。 */
const APP_SETTINGS_EXCLUDED_KEYS = ['fontScale', 'rowPaddingScale', 'fontScaleUi'];

export const ALL_SETTINGS_STORAGE_KEYS = [
  SETTINGS_EXPORT_APP_KEY,
  'mga-employees',
  'mga-salary-plans',
  'mga-salary-plan-settings',
  'mga-tax-payment-plans',
  'mga-tax-payment-settings',
  'mga-expense-plan-overrides',
  'mga-outsourcing-plans',
  'mga-revenue-plans',
  'mga-revenue-plan-settings',
  'mga-sub-expand-config',
  'mga-row-visibility',
  'mga-row-display',
  'mga-expense-sort-order',
  'mga-section-colors',
  'mga-section-filter',
  'mga-ui-colors',
  'mga-csv-name-config',
  'mga-journal-definition',
  'mga-month-display',
];

function stripAppSettingsForExport(appSettings) {
  if (!appSettings || typeof appSettings !== 'object') return appSettings;
  const stripped = { ...appSettings };
  for (const key of APP_SETTINGS_EXCLUDED_KEYS) {
    delete stripped[key];
  }
  delete stripped.fiscalEndMonth;
  delete stripped.businessStartYear;
  return stripped;
}

function loadCurrentAppSettingsRaw() {
  try {
    const raw = localStorage.getItem(SETTINGS_EXPORT_APP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mergeAppSettingsForImport(imported) {
  const current = loadCurrentAppSettingsRaw();
  const merged = { ...imported };
  for (const key of APP_SETTINGS_EXCLUDED_KEYS) {
    if (current && current[key] !== undefined) {
      merged[key] = current[key];
    } else {
      delete merged[key];
    }
  }
  delete merged.fiscalEndMonth;
  delete merged.businessStartYear;
  return merged;
}

export function collectSettingsForExport() {
  const settings = {};
  for (const key of ALL_SETTINGS_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw == null) continue;
    try {
      settings[key] = prepareSettingsValueForExport(key, JSON.parse(raw));
    } catch {
      /* skip corrupted entry */
    }
  }
  return {
    format: SETTINGS_EXPORT_FORMAT,
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
  };
}

export function exportSettingsToJsonString() {
  return JSON.stringify(collectSettingsForExport(), null, 2);
}

export function formatSettingsExportFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `mga-settings-${y}${m}${d}-${h}${min}${s}.json`;
}

export function downloadSettingsExport() {
  const json = exportSettingsToJsonString();
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = formatSettingsExportFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}

const IMPORT_ERRORS = {
  json: "JSON として読み込めません。",
  format: "形式が正しくありません。",
  notApp: "このアプリ用の設定ファイルではありません。",
  noData: "設定データが含まれていません。",
  noKeys: "取り込める設定項目がありませんでした。",
  saveFail: "設定の保存に失敗しました（",
};

export function validateSettingsImportText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: IMPORT_ERRORS.json };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: IMPORT_ERRORS.format };
  }
  if (parsed.format !== SETTINGS_EXPORT_FORMAT) {
    return { ok: false, error: IMPORT_ERRORS.notApp };
  }
  if (!parsed.settings || typeof parsed.settings !== 'object') {
    return { ok: false, error: IMPORT_ERRORS.noData };
  }
  const keys = Object.keys(parsed.settings);
  const importableKeys = keys.filter((key) => ALL_SETTINGS_STORAGE_KEYS.includes(key));
  if (importableKeys.length === 0) {
    return { ok: false, error: IMPORT_ERRORS.noKeys };
  }
  return {
    ok: true,
    data: parsed,
    importableKeys,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
  };
}

export function applyValidatedSettingsImport(data) {
  const keys = Object.keys(data.settings);
  const importedKeys = [];
  for (const key of keys) {
    if (!ALL_SETTINGS_STORAGE_KEYS.includes(key)) continue;
    const value = data.settings[key];
    if (value === undefined) continue;
    try {
      localStorage.setItem(key, JSON.stringify(prepareSettingsValueForImport(key, value)));
      importedKeys.push(key);
    } catch {
      return { ok: false, error: IMPORT_ERRORS.saveFail + key + '）。' };
    }
  }
  if (importedKeys.length === 0) {
    return { ok: false, error: IMPORT_ERRORS.noKeys };
  }
  return { ok: true, importedKeys };
}
