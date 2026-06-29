import { visibilityRowKey } from './visibilityConfig.js';

const ROW_DISPLAY_STORAGE_KEY = 'mga-row-display';

const DEFAULT_ROW_DISPLAY = {
  largeDisplay: false,
  fillColor1: false,
  fillColor2: false,
};

/** 流動資産・固定資産: 中間合計行（大項目合計以外）をデフォルト注目 */
const BS_CURRENT_ASSETS_SECTION_ID = 'currentAssets';
const BS_FIXED_ASSETS_SECTION_ID = 'fixedAssets';

function defaultBsAssetRowDisplay(sectionId, row) {
  if (sectionId !== BS_CURRENT_ASSETS_SECTION_ID
    && sectionId !== BS_FIXED_ASSETS_SECTION_ID) {
    return null;
  }
  if (row?.type === 'total' && !row?.accentTotal) {
    return { largeDisplay: false, fillColor1: true, fillColor2: false };
  }
  return null;
}

/** 流動資産・現預金: 普通預金（補助科目なし）をデフォルト注意 */
const ORDINARY_DEPOSIT_ACCOUNT = '普通預金';
const ORDINARY_DEPOSIT_NO_SUB_LABEL = '補助科目なし';
const CASH_BALANCE_SECTION_ID = 'cashBalance';

function isOrdinaryDepositNoSubRow(sectionId, row) {
  if (sectionId !== BS_CURRENT_ASSETS_SECTION_ID
    && sectionId !== CASH_BALANCE_SECTION_ID) {
    return false;
  }
  if (row?.label !== ORDINARY_DEPOSIT_ACCOUNT) return false;
  if (row?.type !== 'item' && row?.type !== 'sub') return false;
  const sub = row?.subLabel ?? '';
  return sub === '' || sub === ORDINARY_DEPOSIT_NO_SUB_LABEL;
}

function defaultOrdinaryDepositNoSubDisplay(sectionId, row) {
  if (!isOrdinaryDepositNoSubRow(sectionId, row)) return null;
  return { largeDisplay: false, fillColor1: false, fillColor2: true };
}

/** 人件費: 旅費交通費以外の明細行をデフォルト注目・大きく表示 */
const PERSONNEL_SECTION_ID = 'personnel';
const PERSONNEL_TRAVEL_ACCOUNT = '旅費交通費';
const PERSONNEL_TRAVEL_ROW_PATTERN = /旅費交通費|通勤手当/;

/** 純資産: 繰越利益剰余金＝注目＋大きく表示、(うち…)＝注目のみ、資本金など＝通常 */
const EQUITY_SECTION_ID = 'equity';
const RETAINED_EARNINGS_ACCOUNT = '繰越利益剰余金';
const BS_INFORMATIONAL_SUB_PATTERN = /^[（(]うち/;

function isPersonnelTravelRow(row) {
  const label = row?.label ?? '';
  const sub = row?.subLabel ?? '';
  return label === PERSONNEL_TRAVEL_ACCOUNT
    || PERSONNEL_TRAVEL_ROW_PATTERN.test(label)
    || PERSONNEL_TRAVEL_ROW_PATTERN.test(sub);
}

function isBsInformationalSubRow(row) {
  const label = row?.label ?? '';
  const sub = row?.subLabel ?? '';
  return BS_INFORMATIONAL_SUB_PATTERN.test(label)
    || BS_INFORMATIONAL_SUB_PATTERN.test(sub);
}

function defaultEquityRowDisplay(sectionId, row) {
  if (sectionId !== EQUITY_SECTION_ID || row?.type === 'total') return null;
  if (isBsInformationalSubRow(row)) {
    return { largeDisplay: false, fillColor1: true, fillColor2: false };
  }
  if (row?.label === RETAINED_EARNINGS_ACCOUNT) {
    return { largeDisplay: true, fillColor1: true, fillColor2: false };
  }
  return null;
}

function defaultRowDisplayEntry(sectionId, row) {
  const bsAssetDefault = defaultBsAssetRowDisplay(sectionId, row);
  if (bsAssetDefault) return bsAssetDefault;
  const equityDefault = defaultEquityRowDisplay(sectionId, row);
  if (equityDefault) return equityDefault;
  const ordinaryDepositDefault = defaultOrdinaryDepositNoSubDisplay(sectionId, row);
  if (ordinaryDepositDefault) return ordinaryDepositDefault;
  if (sectionId === PERSONNEL_SECTION_ID) {
    if (row?.type === 'total' || row?.type === 'plan') {
      return { ...DEFAULT_ROW_DISPLAY };
    }
    if (isPersonnelTravelRow(row)) {
      return { ...DEFAULT_ROW_DISPLAY };
    }
    return { largeDisplay: true, fillColor1: true, fillColor2: false };
  }
  return { ...DEFAULT_ROW_DISPLAY };
}

export function isRowDisplayDefault(sectionId, row, entry) {
  const def = defaultRowDisplayEntry(sectionId, row);
  return (
    Boolean(entry.largeDisplay) === def.largeDisplay
    && Boolean(entry.fillColor1) === def.fillColor1
    && Boolean(entry.fillColor2) === def.fillColor2
  );
}

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
  const def = defaultRowDisplayEntry(sectionId, row);
  const entry = config[visibilityRowKey(sectionId, row)];
  if (!entry) return { ...def };
  return {
    largeDisplay: entry.largeDisplay !== undefined
      ? Boolean(entry.largeDisplay)
      : def.largeDisplay,
    fillColor1: entry.fillColor1 !== undefined
      ? Boolean(entry.fillColor1)
      : def.fillColor1,
    fillColor2: entry.fillColor2 !== undefined
      ? Boolean(entry.fillColor2)
      : def.fillColor2,
  };
}

export function setRowDisplayEntry(config, sectionId, row, patch) {
  const key = visibilityRowKey(sectionId, row);
  const current = getRowDisplayEntry(config, sectionId, row);
  const next = { ...current, ...patch };
  const newConfig = { ...config };
  if (isRowDisplayDefault(sectionId, row, next)) delete newConfig[key];
  else newConfig[key] = next;
  return newConfig;
}
