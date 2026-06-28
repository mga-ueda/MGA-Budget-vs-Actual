import { readCsvFile } from '../parse/parser.js';
import {
  classifyCsvFile,
  getCsvNameExamples,
  loadCsvNameConfig,
} from './csvNameConfig.js';
import {
  loadAppSettings,
  journalFileMatchesFiscalPeriod,
  csvExportDateMatchesFiscalPeriod,
  csvDirname,
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
      if (db.objectStoreNames.contains('csv')) db.deleteObjectStore('csv');
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

export function isFolderPickerSupported() {
  return typeof window.showDirectoryPicker === 'function';
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
function pickCsvForPeriod(items, journal, businessStartYear, fiscalPeriod) {
  if (!items.length) return null;

  const sameDir = journal
    ? items.filter((item) => csvDirname(item.name) === csvDirname(journal.name))
    : [];

  const pool = sameDir.length ? sameDir : items;
  const periodMatches = pool.filter((item) =>
    csvExportDateMatchesFiscalPeriod(item.name, businessStartYear, fiscalPeriod),
  );

  return pickNewest(periodMatches.length ? periodMatches : pool);
}

function resolveCsvBuckets(buckets, periodOptions = {}) {
  const settings = loadAppSettings();
  const businessStartYear = periodOptions.businessStartYear ?? settings.businessStartYear;
  const fiscalPeriod = periodOptions.fiscalPeriod ?? settings.fiscalPeriod;

  const journalMatches = buckets.journal.filter((item) =>
    journalFileMatchesFiscalPeriod(item.name, businessStartYear, fiscalPeriod),
  );
  const journal = pickNewest(journalMatches);

  return {
    journal,
    bs: pickCsvForPeriod(buckets.balanceSheet, journal, businessStartYear, fiscalPeriod),
    generalLedger: pickCsvForPeriod(buckets.generalLedger, journal, businessStartYear, fiscalPeriod),
    fiscalPeriod,
  };
}

/** @type {{ folderName: string, buckets: { journal: object[], balanceSheet: object[], generalLedger: object[] } } | null} */
let folderCsvCache = null;

export function hasFolderCsvCache() {
  return folderCsvCache != null;
}

export function clearFolderCsvCache() {
  folderCsvCache = null;
}

function folderDataFromResolved(resolved, folderName) {
  const { journal, bs, generalLedger, fiscalPeriod } = resolved;
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
  };
}

/** キャッシュ済み CSV から期に応じたデータを解決（ファイルシステムアクセス不要） */
export function resolveFolderDataFromCache(periodOptions = {}) {
  if (!folderCsvCache) return null;
  const resolved = resolveCsvBuckets(folderCsvCache.buckets, periodOptions);
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
    const resolved = resolveCsvBuckets(folderCsvCache.buckets, periodOptions);
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
  const resolved = resolveCsvBuckets(folderCsvCache.buckets, periodOptions);
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
