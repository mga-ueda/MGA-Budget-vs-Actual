import { buildFullPlan } from '../parse/parseJournal.js';
import {
  loadCsvFromSavedFolder,
  loadCsvFromSavedFolderWithAccess,
  pickCsvFolder,
  getSavedFolderState,
  resolveFolderDataFromCache,
} from './csvFolder.js';

export {
  classifyCsvFile,
  isFolderPickerSupported,
  getSavedFolderName,
  getSavedFolderState,
  hasFolderCsvCache,
  resolveFolderDataFromCache,
} from './csvFolder.js';

export {
  CSV_KINDS,
  DEFAULT_CSV_NAME_CONFIG,
  loadCsvNameConfig,
  saveCsvNameConfig,
  resetCsvNameConfig,
  validateCsvNameConfig,
  testCsvNameExample,
  getCsvNameExamples,
  formatCsvNameHintLines,
  compileCsvPattern,
} from './csvNameConfig.js';

export function planDataFromFolder(folderData, expandConfig) {
  const {
    folderName,
    journalName,
    journalText,
    bsName,
    bsText,
    generalLedgerName = null,
    generalLedgerText = null,
  } = folderData;

  return {
    journalName,
    bsName,
    journalText,
    bsText,
    generalLedgerName,
    generalLedgerText,
    folderName,
    data: buildFullPlan(journalText, bsText, expandConfig),
  };
}

function toPlanData(folderData, expandConfig) {
  return planDataFromFolder(folderData, expandConfig);
}

/** キャッシュから計画データを生成（期切替用・フォルダアクセス不要） */
export function planDataFromCache(expandConfig, periodOptions) {
  const folderData = resolveFolderDataFromCache(periodOptions);
  if (!folderData) return null;
  return toPlanData(folderData, expandConfig);
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
    return toPlanData(folderData, expandConfig);
  } catch (err) {
    if (err?.code === 'NEEDS_PERMISSION') throw err;
    throw err;
  }
}
