import { visibilityRowKey } from './visibilityConfig.js';

const ROW_DISPLAY_STORAGE_KEY = 'mga-row-display';

const DEFAULT_ROW_DISPLAY = {
  largeDisplay: false,
  fillColor1: false,
  fillColor2: false,
};

export function loadRowDisplayConfig() {
  try {
    const raw = localStorage.getItem(ROW_DISPLAY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRowDisplayConfig(config) {
  localStorage.setItem(ROW_DISPLAY_STORAGE_KEY, JSON.stringify(config));
}

export function getRowDisplayEntry(config, sectionId, row) {
  const key = visibilityRowKey(sectionId, row);
  const entry = config[key];
  if (!entry) return { ...DEFAULT_ROW_DISPLAY };
  return {
    largeDisplay: Boolean(entry.largeDisplay),
    fillColor1: Boolean(entry.fillColor1),
    fillColor2: Boolean(entry.fillColor2),
  };
}

export function setRowDisplayEntry(config, sectionId, row, patch) {
  const key = visibilityRowKey(sectionId, row);
  const current = getRowDisplayEntry(config, sectionId, row);
  const next = { ...current, ...patch };
  const isDefault = (
    !next.largeDisplay && !next.fillColor1 && !next.fillColor2
  );
  const newConfig = { ...config };
  if (isDefault) delete newConfig[key];
  else newConfig[key] = next;
  return newConfig;
}
