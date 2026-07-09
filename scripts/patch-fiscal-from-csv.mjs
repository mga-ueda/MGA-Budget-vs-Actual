/** 決算月を仕訳 CSV ファイル名から推定する処理を追加し、設定から削除する */
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

  const insertAnchor = 'export function journalFileMatchesFiscalPeriod(';
  const insertBlock = `/** ${jp(0x4ed5, 0x8a33, 0x30c7, 0x30fc, 0x30bf, 0x0043, 0x0053, 0x0056, 0x306e, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x540d, 0x304b, 0x3089, 0x671f, 0x9593, 0x306e, 0x958b, 0x59cb, 0x30fb, 0x7d42, 0x4e86, 0x65e5, 0x3092, 0x89e3, 0x6790, 0x3059, 0x308b)} */
export function parseJournalCsvFileName(fileName) {
  const base = fileName.replace(/\\\\/g, '/').split('/').pop() ?? fileName;
  const m = base.match(/^${jp(0x4ed5, 0x8a33, 0x30c7, 0x30fc, 0x30bf)}_(\\d{4})-(\\d{2})-\\d{2}_(\\d{4})-(\\d{2})-\\d{2}\\.csv$/);
  if (!m) return null;
  return {
    startYear: parseInt(m[1], 10),
    startMonth: parseInt(m[2], 10),
    endYear: parseInt(m[3], 10),
    endMonth: parseInt(m[4], 10),
  };
}

/** ${jp(0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x306e, 0x7d42, 0x4e86, 0x65e5, 0x304b, 0x3089, 0x6c7a, 0x7b97, 0x6708, 0x3092, 0x63a8, 0x5b9a)} */
export function inferFiscalEndMonthFromJournalFileName(fileName) {
  const parsed = parseJournalCsvFileName(fileName);
  if (!parsed) return null;
  return normalizeFiscalEndMonth(parsed.endMonth);
}

/** ${jp(0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x306e, 0x671f, 0x9593, 0x304c, 0x9078, 0x629e, 0x671f, 0x3068, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x304b, 0xFF08, 0x6c7a, 0x7b97, 0x6708, 0x306f, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x540d, 0x304b, 0x3089, 0x5224, 0x5b9a, 0xFF09)} */
export function journalFileMatchesFiscalPeriodByDates(fileName, businessStartYear, fiscalPeriod) {
  const fiscalEndMonth = inferFiscalEndMonthFromJournalFileName(fileName);
  if (fiscalEndMonth == null) return false;
  return journalFileMatchesFiscalPeriod(fileName, businessStartYear, fiscalPeriod, fiscalEndMonth);
}

`;

  if (!content.includes('export function parseJournalCsvFileName(')) {
    content = content.replace(insertAnchor, insertBlock + insertAnchor);
  }

  content = content.replace(
    /  businessStartYear: DEFAULT_BUSINESS_START_YEAR,\n  fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,\n  fiscalPeriod: null,/,
    '  businessStartYear: DEFAULT_BUSINESS_START_YEAR,\n  fiscalPeriod: null,',
  );

  content = content.replace(
    /        businessStartYear,\n        fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,\n        fiscalPeriod: getDefaultFiscalPeriod\(businessStartYear\),/g,
    '        businessStartYear,\n        fiscalPeriod: getDefaultFiscalPeriod(businessStartYear),',
  );

  content = content.replace(
    /      businessStartYear,\n      fiscalEndMonth: normalizeFiscalEndMonth\(parsed\?\.fiscalEndMonth\),\n      fiscalPeriod: normalizeFiscalPeriod\(businessStartYear, parsed\?\.fiscalPeriod\),/,
    '      businessStartYear,\n      fiscalPeriod: normalizeFiscalPeriod(businessStartYear, parsed?.fiscalPeriod),',
  );

  content = content.replace(
    /    businessStartYear,\n    fiscalEndMonth: DEFAULT_FISCAL_END_MONTH,\n    fiscalPeriod: normalizeFiscalPeriod\(businessStartYear, current\.fiscalPeriod\),/,
    '    businessStartYear,\n    fiscalPeriod: normalizeFiscalPeriod(businessStartYear, current.fiscalPeriod),',
  );

  writeFileSync(path, content, 'utf8');
  console.log('Patched appSettings.js');
}

function patchFiscalCalendar() {
  const path = resolve(repoRoot, 'src/config/fiscalCalendar.js');
  let content = readFileSync(path, 'utf8');
  content = content.replace(
    /\/\*\* .* \*\/\nexport function getAppFiscalMonths\(appSettings\) \{\n  return buildFiscalMonths\(appSettings\?\.fiscalEndMonth \?\? DEFAULT_FISCAL_END_MONTH\);\n\}/,
    `/** ${jp(0x30a2, 0x30d7, 0x30ea, 0x8a2d, 0x5b9a, 0x304b, 0x3089, 0x4f1a, 0x8a08, 0x6708, 0x5217, 0x3092, 0x53d6, 0x5f97, 0xFF08, 0x6c7a, 0x7b97, 0x6708, 0x306f, 0x0043, 0x0053, 0x0056, 0x304b, 0x3089, 0x5224, 0x5b9a, 0x3059, 0x308b, 0x305f, 0x3081, 0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8, 0xFF09)} */
export function getAppFiscalMonths() {
  return FISCAL_MONTHS;
}`,
  );
  writeFileSync(path, content, 'utf8');
  console.log('Patched fiscalCalendar.js');
}

function patchWriteFiscalCalendarScript() {
  const path = resolve(repoRoot, 'scripts/write-fiscal-calendar.mjs');
  let content = readFileSync(path, 'utf8');
  content = content.replace(
    /\/\*\* .* \*\/\nexport function getAppFiscalMonths\(appSettings\) \{\n  return buildFiscalMonths\(appSettings\?\.fiscalEndMonth \?\? DEFAULT_FISCAL_END_MONTH\);\n\}/,
    `/** ${jp(0x30a2, 0x30d7, 0x30ea, 0x8a2d, 0x5b9a, 0x304b, 0x3089, 0x4f1a, 0x8a08, 0x6708, 0x5217, 0x3092, 0x53d6, 0x5f97, 0xFF08, 0x6c7a, 0x7b97, 0x6708, 0x306f, 0x0043, 0x0053, 0x0056, 0x304b, 0x3089, 0x5224, 0x5b9a, 0x3059, 0x308b, 0x305f, 0x3081, 0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8, 0xFF09)} */
export function getAppFiscalMonths() {
  return FISCAL_MONTHS;
}`,
  );
  writeFileSync(path, content, 'utf8');
  console.log('Patched write-fiscal-calendar.mjs');
}

patchAppSettings();
patchFiscalCalendar();
patchWriteFiscalCalendarScript();
