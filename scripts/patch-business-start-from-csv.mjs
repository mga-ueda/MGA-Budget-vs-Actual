/** 最古の仕訳 CSV から事業開始年を推定し、設定から削除する */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function patchAppSettings() {
  const path = resolve(repoRoot, 'src/config/appSettings.js');
  let content = readFileSync(path, 'utf8');

  const insertAnchor = '/** 仕訳CSVの期間が選択期と一致するか（決算月はファイル名から判定） */';
  const insertBlock = `/** ${jp(0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x7fa4, 0x306e, 0x3046, 0x3061, 0x958b, 0x59cb, 0x65e5, 0x304c, 0x6700, 0x53e4, 0x306e, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x540d, 0x3092, 0x8fd4, 0x3059)} */
export function pickOldestJournalCsvFileName(journalItems) {
  if (!journalItems?.length) return null;
  const sorted = [...journalItems].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : a.name;
    const nameB = typeof b === 'string' ? b : b.name;
    const pa = parseJournalCsvFileName(nameA);
    const pb = parseJournalCsvFileName(nameB);
    if (!pa && !pb) return nameA.localeCompare(nameB, 'ja');
    if (!pa) return 1;
    if (!pb) return -1;
    if (pa.startYear !== pb.startYear) return pa.startYear - pb.startYear;
    if (pa.startMonth !== pb.startMonth) return pa.startMonth - pb.startMonth;
    return nameA.localeCompare(nameB, 'ja');
  });
  const first = sorted[0];
  return typeof first === 'string' ? first : first.name;
}

/** ${jp(0x6700, 0x53e4, 0x306e, 0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x3092, 0x7b2c, 0x0031, 0x671f, 0x3068, 0x3057, 0x3066, 0x4e8b, 0x696d, 0x958b, 0x59cb, 0x5e74, 0x3092, 0x63a8, 0x5b9a)} */
export function inferBusinessStartYearFromJournalFileName(fileName) {
  const parsed = parseJournalCsvFileName(fileName);
  if (!parsed) return null;
  const fiscalEndMonth = inferFiscalEndMonthFromJournalFileName(fileName);
  if (fiscalEndMonth == null) return null;
  const fromEndYear = parsed.endYear - 1;
  if (journalFileMatchesFiscalPeriod(fileName, fromEndYear, 1, fiscalEndMonth)) {
    return fromEndYear;
  }
  if (journalFileMatchesFiscalPeriod(fileName, parsed.startYear, 1, fiscalEndMonth)) {
    return parsed.startYear;
  }
  return fromEndYear;
}

/** ${jp(0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x306e, 0x914d, 0x5217, 0x304b, 0x3089, 0x4e8b, 0x696d, 0x958b, 0x59cb, 0x5e74, 0x3092, 0x63a8, 0x5b9a)} */
export function inferBusinessStartYearFromJournalItems(journalItems) {
  const fileName = pickOldestJournalCsvFileName(journalItems);
  if (!fileName) return null;
  return inferBusinessStartYearFromJournalFileName(fileName);
}

`;

  if (!content.includes('export function pickOldestJournalCsvFileName(')) {
    content = content.replace(insertAnchor, insertBlock + insertAnchor);
  }

  content = content.replace(
    /export const DEFAULT_APP_SETTINGS = \{\n  businessStartYear: DEFAULT_BUSINESS_START_YEAR,\n  fiscalPeriod: null,/,
    'export const DEFAULT_APP_SETTINGS = {\n  fiscalPeriod: null,',
  );

  content = content.replace(
    /    if \(!raw\) \{\n      const businessStartYear = DEFAULT_BUSINESS_START_YEAR;\n      return \{\n        businessStartYear,\n        fiscalPeriod: getDefaultFiscalPeriod\(businessStartYear\),/,
    `    if (!raw) {
      return {
        fiscalPeriod: getDefaultFiscalPeriod(DEFAULT_BUSINESS_START_YEAR),`,
  );

  content = content.replace(
    /    const parsed = JSON\.parse\(raw\);\n    const year = Number\(parsed\?\.businessStartYear\);\n    const businessStartYear = Number\.isInteger\(year\) \? year : DEFAULT_BUSINESS_START_YEAR;\n    return \{\n      businessStartYear,\n      fiscalPeriod: normalizeFiscalPeriod\(businessStartYear, parsed\?\.fiscalPeriod\),/,
    `    const parsed = JSON.parse(raw);
    return {
      fiscalPeriod: normalizeFiscalPeriod(DEFAULT_BUSINESS_START_YEAR, parsed?.fiscalPeriod),`,
  );

  content = content.replace(
    /  \} catch \{\n    const businessStartYear = DEFAULT_BUSINESS_START_YEAR;\n    return \{\n      businessStartYear,\n      fiscalPeriod: getDefaultFiscalPeriod\(businessStartYear\),/,
    `  } catch {
    return {
      fiscalPeriod: getDefaultFiscalPeriod(DEFAULT_BUSINESS_START_YEAR),`,
  );

  content = content.replace(
    /export function resetOtherAppSettings\(current\) \{\n  const businessStartYear = DEFAULT_BUSINESS_START_YEAR;\n  return \{\n    \.\.\.current,\n    businessStartYear,\n    fiscalPeriod: normalizeFiscalPeriod\(businessStartYear, current\.fiscalPeriod\),/,
    `export function resetOtherAppSettings(current) {
  return {
    ...current,
    fiscalPeriod: normalizeFiscalPeriod(DEFAULT_BUSINESS_START_YEAR, current.fiscalPeriod),`,
  );

  writeFileSync(path, content, 'utf8');
  console.log('Patched appSettings.js');
}

patchAppSettings();
