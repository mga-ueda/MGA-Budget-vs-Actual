import { buildFullPlan } from '../parse/parseJournal.js';
import { DEFAULT_FISCAL_END_MONTH } from '../config/fiscalCalendar.js';
import {
  loadCsvFromSavedFolder,
  loadCsvFromSavedFolderWithAccess,
  pickCsvFolder,
  loadCsvFromDroppedFolderHandle,
  getSavedFolderState,
  resolveFolderDataFromCache,
  resolveFiscalEndMonthFromCache,
  resolveLatestFiscalEndMonthFromCache,
  resolveBusinessStartYearFromCache,
} from './csvFolder.js';

/* classifyCsvFile の定義元は csvNameConfig（csvFolder 経由だと ES モジュールとして解決できない） */
export { classifyCsvFile } from './csvNameConfig.js';

export {
  isFolderPickerSupported,
  isFolderDropSupported,
  bindDirectoryDropZone,
  getSavedFolderName,
  getSavedFolderState,
  hasFolderCsvCache,
  hasPeriodCsvInCache,
  clearSavedFolderData,
  resolveFolderDataFromCache,
  resolveFiscalEndMonthFromCache,
  resolveLatestFiscalEndMonthFromCache,
  resolveBusinessStartYearFromCache,
} from './csvFolder.js';

export {
  CSV_KINDS,
  DEFAULT_CSV_NAME_CONFIG,
  loadCsvNameConfig,
  saveCsvNameConfig,
  resetCsvNameConfig,
  testCsvNameExample,
  getCsvNameExamples,
  formatCsvNameHintLines,
  compileCsvPattern,
} from './csvNameConfig.js';

export function planDataFromFolder(folderData, expandConfig, periodOptions = {}) {
  const {
    folderName,
    journalName,
    journalText,
    bsName,
    bsText,
    generalLedgerName = null,
    generalLedgerText = null,
    fiscalEndMonth: folderFiscalEndMonth,
  } = folderData;

  const fiscalEndMonth = folderFiscalEndMonth ?? DEFAULT_FISCAL_END_MONTH;

  return {
    journalName,
    bsName,
    journalText,
    bsText,
    generalLedgerName,
    generalLedgerText,
    folderName,
    data: buildFullPlan(journalText, bsText, { ...expandConfig, fiscalEndMonth }),
  };
}

function toPlanData(folderData, expandConfig, periodOptions = {}) {
  return planDataFromFolder(folderData, expandConfig, periodOptions);
}

/** キャッシュから計画データを生成（期切替用・フォルダアクセス不要） */
export function planDataFromCache(expandConfig, periodOptions) {
  try {
    const folderData = resolveFolderDataFromCache(periodOptions);
    if (!folderData) return null;
    return toPlanData(folderData, expandConfig, periodOptions);
  } catch {
    // ダッシュボードの複数期参照など、未用意の期は null 扱いにする
    return null;
  }
}

/** @returns {Promise<{ status: 'loaded', data: ReturnType<typeof planDataFromFolder> } | { status: 'needs-permission', folderName: string, handle: FileSystemDirectoryHandle } | { status: 'none' }>} */
export async function resolvePlanStartup(expandConfig, periodOptions) {
  const state = await getSavedFolderState();
  if (state.kind === 'none') return { status: 'none' };
  if (state.kind === 'needs-permission') {
    return { status: 'needs-permission', folderName: state.folderName, handle: state.handle };
  }

  try {
    const folderData = await loadCsvFromSavedFolder(periodOptions);
    if (!folderData) return { status: 'none' };
    return { status: 'loaded', data: toPlanData(folderData, expandConfig) };
  } catch (err) {
    if (err?.code === 'NEEDS_PERMISSION' && err.handle) {
      return {
        status: 'needs-permission',
        folderName: err.folderName ?? state.folderName,
        handle: err.handle,
      };
    }
    throw err;
  }
}

export async function loadPlanDataFromPickedFolder(expandConfig, periodOptions) {
  const folderData = await pickCsvFolder(periodOptions);
  return toPlanData(folderData, expandConfig);
}

export async function loadPlanDataFromDroppedFolder(expandConfig, periodOptions, handle) {
  const folderData = await loadCsvFromDroppedFolderHandle(handle, periodOptions);
  return toPlanData(folderData, expandConfig);
}

export async function loadPlanDataWithFolderAccess(handle, expandConfig, periodOptions) {
  const folderData = await loadCsvFromSavedFolderWithAccess(handle, periodOptions);
  return toPlanData(folderData, expandConfig);
}

export async function reloadPlanDataFromSavedFolder(expandConfig, periodOptions, options = {}) {
  try {
    const folderData = await loadCsvFromSavedFolder(periodOptions, options);
    if (!folderData) {
      throw new Error('CSV フォルダが未設定です。フォルダを選択してください。');
    }
    return toPlanData(folderData, expandConfig, periodOptions);
  } catch (err) {
    if (err?.code === 'NEEDS_PERMISSION') throw err;
    throw err;
  }
}
