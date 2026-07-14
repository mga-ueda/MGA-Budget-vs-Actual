import { readCsvFile } from '../parse/parser.js';
import {
  classifyCsvFile,
  getCsvNameExamples,
  loadCsvNameConfig,
} from './csvNameConfig.js';
import {
  loadAppSettings,
  journalFileMatchesFiscalPeriodByDates,
  inferFiscalEndMonthFromJournalFileName,
  inferBusinessStartYearFromJournalItems,
  resolveDefaultBusinessStartYear,
  csvExportDateMatchesFiscalPeriod,
  csvDirname,
  isPlanOnlyPeriod,
  getFiscalPeriodForDate,
  DEFAULT_FISCAL_END_MONTH,
} from '../config/appSettings.js';

const DB_NAME = 'mga-budget-cache';
const DB_VERSION = 3;
const STORE_NAME = 'settings';
const FOLDER_KEY = 'csvFolder';
const FOLDER_NAME_KEY = 'csvFolderName';

function openDb() {
  return new Promise((resolve, reject) => {    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result ?? null);
  });
}

async function dbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

async function dbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export function isFolderPickerSupported() {
  return typeof window.showDirectoryPicker === 'function';
}

export function isFolderDropSupported() {
  return typeof DataTransferItem !== 'undefined'
    && typeof DataTransferItem.prototype.getAsFileSystemHandle === 'function';
}

/** @returns {Promise<FileSystemDirectoryHandle | null>} */
export async function folderHandleFromDataTransfer(dataTransfer) {
  if (!dataTransfer?.items?.length) return null;
  for (const item of dataTransfer.items) {
    if (item.kind !== 'file') continue;
    const handle = await item.getAsFileSystemHandle();
    if (handle?.kind === 'directory') return handle;
  }
  return null;
}

export function bindDirectoryDropZone(element, onDirectory, options = {}) {
  if (!element || !isFolderDropSupported() || typeof onDirectory !== 'function') {
    return () => {};
  }

  const onDragOver = (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
    element.classList.add('dragover');
  };

  const onDragLeave = (ev) => {
    if (!element.contains(ev.relatedTarget)) {
      element.classList.remove('dragover');
    }
  };

  const onDropEvent = async (ev) => {
    ev.preventDefault();
    element.classList.remove('dragover');
    try {
      const handle = await folderHandleFromDataTransfer(ev.dataTransfer);
      if (!handle) {
        options.onInvalid?.();
        return;
      }
      await onDirectory(handle);
    } catch (err) {
      options.onError?.(err);
    }
  };

  element.addEventListener('dragover', onDragOver);
  element.addEventListener('dragleave', onDragLeave);
  element.addEventListener('drop', onDropEvent);

  return () => {
    element.removeEventListener('dragover', onDragOver);
    element.removeEventListener('dragleave', onDragLeave);
    element.removeEventListener('drop', onDropEvent);
  };
}

export async function getSavedFolderHandle() {
  try {
    return await dbGet(FOLDER_KEY);
  } catch {
    return null;
  }
}

export async function saveFolderHandle(handle) {
  await dbPut(FOLDER_KEY, handle);
  await dbPut(FOLDER_NAME_KEY, handle.name);
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}

export async function getSavedFolderName() {
  const handle = await getSavedFolderHandle();
  if (handle?.name) return handle.name;
  try {
    return await dbGet(FOLDER_NAME_KEY);
  } catch {
    return null;
  }
}

async function queryReadPermission(handle) {
  return handle.queryPermission({ mode: 'read' });
}

export async function requestSavedFolderAccess(handle) {
  return (await handle.requestPermission({ mode: 'read' })) === 'granted';
}

/** @returns {Promise<{ kind: 'none' } | { kind: 'ready', handle: FileSystemDirectoryHandle, folderName: string } | { kind: 'needs-permission', handle: FileSystemDirectoryHandle, folderName: string }>} */
export async function getSavedFolderState() {
  const handle = await getSavedFolderHandle();
  if (!handle) return { kind: 'none' };

  const folderName = handle.name || (await getSavedFolderName()) || 'CSV フォルダ';
  const permission = await queryReadPermission(handle);
  if (permission === 'granted') {
    return { kind: 'ready', handle, folderName };
  }
  return { kind: 'needs-permission', handle, folderName };
}

async function collectCsvFiles(dirHandle, buckets, pathPrefix = '', nameConfig = loadCsvNameConfig()) {
  for await (const entry of dirHandle.values()) {
    const relPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      await collectCsvFiles(entry, buckets, relPath, nameConfig);
      continue;
    }

    if (entry.kind !== 'file' || !entry.name.endsWith('.csv')) continue;
    const kind = classifyCsvFile(relPath, nameConfig);
    if (!kind) continue;

    const file = await entry.getFile();
    const text = await readCsvFile(file);
    buckets[kind].push({ name: relPath, text });
  }
}

function pickNewest(items) {
  if (!items.length) return null;
  return [...items].sort((a, b) => b.name.localeCompare(a.name, 'ja'))[0];
}

/** 仕訳と同じフォルダ → 出力日時が期の範囲内 → 全体の最新 の順で候補を絞る */
function pickCsvForPeriod(items, journal, businessStartYear, fiscalPeriod, fiscalEndMonth) {
  if (!items.length) return null;

  const sameDir = journal
    ? items.filter((item) => csvDirname(item.name) === csvDirname(journal.name))
    : [];

  const pool = sameDir.length ? sameDir : items;
  const periodMatches = fiscalEndMonth != null
    ? pool.filter((item) =>
      csvExportDateMatchesFiscalPeriod(item.name, businessStartYear, fiscalPeriod, fiscalEndMonth),
    )
    : [];

  return pickNewest(periodMatches.length ? periodMatches : pool);
}

function resolveBusinessStartYear(buckets, periodOptions = {}) {
  if (periodOptions.businessStartYear != null) {
    return periodOptions.businessStartYear;
  }
  return inferBusinessStartYearFromJournalItems(buckets.journal) ?? resolveDefaultBusinessStartYear();
}

function resolveCsvBuckets(buckets, periodOptions = {}) {
  const settings = loadAppSettings();
  const businessStartYear = resolveBusinessStartYear(buckets, periodOptions);
  const fiscalPeriod = periodOptions.fiscalPeriod ?? settings.fiscalPeriod;

  const journalMatches = buckets.journal.filter((item) =>
    journalFileMatchesFiscalPeriodByDates(item.name, businessStartYear, fiscalPeriod),
  );
  const journal = pickNewest(journalMatches);
  const fiscalEndMonth = journal
    ? inferFiscalEndMonthFromJournalFileName(journal.name)
    : null;

  return {
    journal,
    bs: pickCsvForPeriod(buckets.balanceSheet, journal, businessStartYear, fiscalPeriod, fiscalEndMonth),
    generalLedger: pickCsvForPeriod(buckets.generalLedger, journal, businessStartYear, fiscalPeriod, fiscalEndMonth),
    fiscalPeriod,
    fiscalEndMonth,
  };
}

/** バケット内の仕訳から決算月を推定（来期フォールバック判定用） */
function inferFiscalEndMonthFromBuckets(buckets) {
  const journals = [...(buckets.journal ?? [])].sort((a, b) => b.name.localeCompare(a.name, 'ja'));
  for (const item of journals) {
    const endMonth = inferFiscalEndMonthFromJournalFileName(item.name);
    if (endMonth != null) return endMonth;
  }
  return DEFAULT_FISCAL_END_MONTH;
}

/**
 * 指定期の仕訳が無いとき、事業開始年を推定して来期なら今期 CSV にフォールバックする。
 * （キャッシュ前に現在年フォールバックで誤って来期判定しないよう、推定できる場合のみ）
 */
function resolveCsvBucketsWithPlanOnlyFallback(buckets, periodOptions = {}) {
  const resolved = resolveCsvBuckets(buckets, periodOptions);
  if (resolved.journal) return resolved;

  const inferredStartYear = inferBusinessStartYearFromJournalItems(buckets.journal);
  if (inferredStartYear == null) return resolved;

  const settings = loadAppSettings();
  const requestedPeriod = periodOptions.fiscalPeriod ?? settings.fiscalPeriod;
  const fiscalEndMonth = inferFiscalEndMonthFromBuckets(buckets);
  if (!isPlanOnlyPeriod(inferredStartYear, requestedPeriod, undefined, fiscalEndMonth)) {
    return resolved;
  }

  const currentPeriod = getFiscalPeriodForDate(inferredStartYear, undefined, fiscalEndMonth);
  return resolveCsvBuckets(buckets, {
    ...periodOptions,
    businessStartYear: inferredStartYear,
    fiscalPeriod: currentPeriod,
  });
}

/** @type {{ folderName: string, buckets: { journal: object[], balanceSheet: object[], generalLedger: object[] } } | null} */
let folderCsvCache = null;

export function hasFolderCsvCache() {
  return folderCsvCache != null;
}

export function clearFolderCsvCache() {
  folderCsvCache = null;
}

/** 保存フォルダハンドルと CSV キャッシュを破棄する */
export async function clearSavedFolderData() {
  clearFolderCsvCache();
  try {
    await dbDelete(FOLDER_KEY);
    await dbDelete(FOLDER_NAME_KEY);
  } catch {
    /* ignore */
  }
}

function folderDataFromResolved(resolved, folderName) {
  const { journal, bs, generalLedger, fiscalPeriod, fiscalEndMonth } = resolved;
  const examples = getCsvNameExamples();
  if (!journal || !bs || !generalLedger) {
    const missing = [];
    if (!journal) {
      missing.push(`第${fiscalPeriod}期の仕訳データ CSV（例: ${examples.journal}）`);
    }
    if (!bs) missing.push(`第${fiscalPeriod}期の貸借対照表 CSV（例: ${examples.balanceSheet}）`);
    if (!generalLedger) missing.push(`第${fiscalPeriod}期の総勘定元帳 CSV（例: ${examples.generalLedger}）`);
    throw new Error(`${missing.join(' と ')} がフォルダ内に見つかりません。`);
  }

  return {
    folderName,
    journalName: journal.name,
    journalText: journal.text,
    bsName: bs.name,
    bsText: bs.text,
    generalLedgerName: generalLedger.name,
    generalLedgerText: generalLedger.text,
    fiscalPeriod,
    fiscalEndMonth,
  };
}

/** キャッシュ済み CSV から期に応じたデータを解決（ファイルシステムアクセス不要） */
export function resolveFolderDataFromCache(periodOptions = {}) {
  if (!folderCsvCache) return null;
  const resolved = resolveCsvBucketsWithPlanOnlyFallback(folderCsvCache.buckets, periodOptions);
  return folderDataFromResolved(resolved, folderCsvCache.folderName);
}

async function loadCsvCacheFromHandle(handle) {
  const buckets = {
    journal: [],
    balanceSheet: [],
    generalLedger: [],
  };
  const nameConfig = loadCsvNameConfig();
  await collectCsvFiles(handle, buckets, '', nameConfig);
  folderCsvCache = { folderName: handle.name, buckets };
  return folderCsvCache;
}

export async function readCsvFromFolderHandle(handle, periodOptions = {}, options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const folderName = handle.name;

  if (!forceRefresh && folderCsvCache?.folderName === folderName) {
    const resolved = resolveCsvBucketsWithPlanOnlyFallback(folderCsvCache.buckets, periodOptions);
    return folderDataFromResolved(resolved, folderName);
  }

  const permission = await queryReadPermission(handle);
  if (permission !== 'granted') {
    const err = new Error('CSV フォルダへのアクセス許可が必要です。');
    err.code = 'NEEDS_PERMISSION';
    err.handle = handle;
    err.folderName = folderName;
    throw err;
  }

  await loadCsvCacheFromHandle(handle);
  const resolved = resolveCsvBucketsWithPlanOnlyFallback(folderCsvCache.buckets, periodOptions);
  return folderDataFromResolved(resolved, folderName);
}

export async function pickCsvFolder(periodOptions) {
  if (!isFolderPickerSupported()) {
    throw new Error('このブラウザではフォルダ選択に対応していません。Chrome または Edge をご利用ください。');
  }
  clearFolderCsvCache();
  const handle = await window.showDirectoryPicker({ mode: 'read' });
  await saveFolderHandle(handle);
  return readCsvFromFolderHandle(handle, periodOptions, { forceRefresh: true });
}

export async function loadCsvFromDroppedFolderHandle(handle, periodOptions) {
  if (!isFolderDropSupported()) {
    throw new Error('このブラウザではフォルダのドラッグ＆ドロップに対応していません。Chrome または Edge をご利用ください。');
  }
  if (!handle || handle.kind !== 'directory') {
    throw new Error('フォルダをドロップしてください。');
  }
  clearFolderCsvCache();
  await saveFolderHandle(handle);
  return readCsvFromFolderHandle(handle, periodOptions, { forceRefresh: true });
}

export async function loadCsvFromSavedFolder(periodOptions, options = {}) {
  const state = await getSavedFolderState();
  if (state.kind === 'none') return null;
  if (state.kind === 'needs-permission') {
    const err = new Error('CSV フォルダへのアクセス許可が必要です。');
    err.code = 'NEEDS_PERMISSION';
    err.handle = state.handle;
    err.folderName = state.folderName;
    throw err;
  }
  return readCsvFromFolderHandle(state.handle, periodOptions, options);
}

export async function loadCsvFromSavedFolderWithAccess(handle, periodOptions, options = {}) {
  const allowed = await requestSavedFolderAccess(handle);
  if (!allowed) {
    throw new Error('CSV フォルダへのアクセスが拒否されました。');
  }
  return readCsvFromFolderHandle(handle, periodOptions, options);
}

/** キャッシュ済み仕訳 CSV から指定の期の決算月を推定する */
/** 指定期本来の CSV がキャッシュにあるか（来期の今期フォールバックはしない） */
export function hasPeriodCsvInCache(periodOptions = {}) {
  if (!folderCsvCache) return false;
  const resolved = resolveCsvBuckets(folderCsvCache.buckets, periodOptions);
  return Boolean(resolved.journal && resolved.bs && resolved.generalLedger);
}

export function resolveFiscalEndMonthFromCache(periodOptions = {}) {
  if (!folderCsvCache) return null;
  const resolved = resolveCsvBuckets(folderCsvCache.buckets, periodOptions);
  return resolved.fiscalEndMonth ?? null;
}

/** キャッシュ内の最新仕訳 CSV から決算月を推定する（来期など CSV 未登録期のフォールバック用） */
export function resolveLatestFiscalEndMonthFromCache() {
  if (!folderCsvCache?.buckets?.journal?.length) return null;
  const journals = [...folderCsvCache.buckets.journal].sort((a, b) => b.name.localeCompare(a.name, 'ja'));
  for (const item of journals) {
    const endMonth = inferFiscalEndMonthFromJournalFileName(item.name);
    if (endMonth != null) return endMonth;
  }
  return null;
}

/** キャッシュ内の最古仕訳 CSV から事業開始年を推定する */
export function resolveBusinessStartYearFromCache() {
  if (!folderCsvCache?.buckets?.journal?.length) return null;
  return inferBusinessStartYearFromJournalItems(folderCsvCache.buckets.journal);
}
