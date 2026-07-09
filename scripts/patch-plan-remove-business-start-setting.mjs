/** その他設定から事業開始年 UI を削除し説明文を更新 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/ui/plan.js');
let content = readFileSync(path, 'utf8');

const newDesc = jp(
  0x30a2, 0x30d7, 0x30ea, 0x8a2d, 0x5b9a, 0x3067, 0x3059, 0x3002,
  0x4e8b, 0x696d, 0x958b, 0x59cb, 0x5e74, 0x30fb, 0x6c7a, 0x7b97, 0x6708, 0x306f,
  0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x306e, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x540d,
  0x304b, 0x3089, 0x671f, 0x3054, 0x3068, 0x306b, 0x81ea, 0x52d5, 0x5224, 0x5b9a, 0x3055,
  0x308c, 0x307e, 0x3059, 0xFF08, 0x6700, 0x53e4, 0x306e, 0x4ed5, 0x8a33, 0x0043, 0x0053,
  0x0056, 0x3092, 0x7b2c, 0x0031, 0x671f, 0x3068, 0x3057, 0x3066, 0x4e8b, 0x696d, 0x958b,
  0x59cb, 0x5e74, 0x3092, 0x6c7a, 0x5b9a, 0xFF09, 0x3002, 0x9078, 0x629e, 0x4e2d, 0x306e,
  0x671f, 0x3068, 0x7d44, 0x307f, 0x5408, 0x308f, 0x305b, 0x3066, 0x3001, 0x5404, 0x6708,
  0x306e, 0x5e74, 0x30e9, 0x30d9, 0x30eb, 0x3092, 0x6c7a, 0x5b9a, 0x3057, 0x307e, 0x3059,
  0x3002, 0x6cd5, 0x4eba, 0x5224, 0x5b9a, 0x6587, 0x5b57, 0x306f, 0x5916, 0x6ce8, 0x8cbb, 0x306e,
  0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x304c, 0x6cd5, 0x4eba, 0x304b, 0x500b, 0x4eba, 0x4e8b, 0x696d,
  0x4e3b, 0x304b, 0x3092, 0x5224, 0x5225, 0x3059, 0x308b, 0x969b, 0x306b, 0x4f7f, 0x3044, 0x307e,
  0x3059, 0x3002, 0x30d6, 0x30e9, 0x30f3, 0x30c9, 0x8868, 0x793a, 0x306f, 0x30d8, 0x30c3, 0x30c0,
  0x30fc, 0x5de6, 0x4e0a, 0x306e, 0x30a2, 0x30a4, 0x30b3, 0x30f3, 0x30fb, 0x4f1a, 0x793e, 0x540d,
  0x306b, 0x53cd, 0x6620, 0x3055, 0x308c, 0x307e, 0x3059, 0x3002,
);

content = content.replace(
  /<p class="expand-settings-desc">[\s\S]*?<\/p>/,
  `<p class="expand-settings-desc">${newDesc}</p>`,
);

content = content.replace(
  /\n        <label class="app-settings-field">\n          <span class="app-settings-label">事業開始年<\/span>\n          <input type="text" class="app-settings-input app-settings-input-year" id="business-start-year"\n            inputmode="numeric" autocomplete="off" spellcheck="false" \/>\n        <\/label>/,
  '',
);

content = content.replace(/\n  const yearInput = form\.querySelector\('#business-start-year'\);/, '');

content = content.replace(/\n  yearInput\.value = String\(getActiveBusinessStartYear\(\)\);/g, '');

content = content.replace(
  /\n  yearInput\.addEventListener\('input', \(\) => \{\n    const filtered = filterTaxRateIntegerInput\(yearInput\.value\);\n    if \(filtered !== yearInput\.value\) yearInput\.value = filtered;\n  \}\);\n/,
  '\n',
);

content = content.replace(
  /\n  yearInput\.addEventListener\('input', \(\) => \{\n    const year = parseInt\(yearInput\.value, 10\);\n    if \(!Number\.isInteger\(year\) \|\| year < 1900 \|\| year > 2100\) return;\n    appSettings = \{\n      \.\.\.appSettings,\n      businessStartYear: year,\n      fiscalPeriod: normalizeFiscalPeriod\(year, appSettings\.fiscalPeriod, undefined, getActiveFiscalEndMonth\(\)\),\n    \};\n    saveAppSettings\(appSettings\);\n    syncPeriodControls\(\);\n    if \(activeTab === 'plan' && data\) refreshPlanTable\(\);\n  \}\);\n/,
  '\n',
);

content = content.replace(
  /\nfunction filterTaxRateIntegerInput\(value\) \{\n  return String\(value \?\? ''\)\.replace\(\/\[\^\\d\]\/g, ''\);\n\}\n\nfunction renderOtherSettings/,
  '\nfunction renderOtherSettings',
);

content = content.replace(
  /\n\/\*\* 事業開始年変更時: キャッシュから CSV セットを再解決し、不可なら手元テキストで再構築 \*\/\nfunction refreshPlanDataAfterBusinessStartYearChange\(\{ measureColumnWidths = true \} = \{\}\) \{\n  try \{\n    const cached = planDataFromCache\(getExpandConfigWithFiscal\(\), getPeriodOptions\(\)\);\n    if \(cached\) \{\n      loadData\(cached, \{ measureColumnWidths \}\);\n      return;\n    \}\n  \} catch \{\n    \/\* キャッシュ解決失敗時は手元の仕訳テキストで再構築 \*\/\n  \}\n  if \(journalText\) rebuildPlanData\(\);\n  if \(activeTab === 'plan' && data\) refreshPlanTable\(\{ measureColumnWidths \}\);\n\}\n/,
  '\n',
);

writeFileSync(path, content, 'utf8');
console.log('Updated plan.js');
