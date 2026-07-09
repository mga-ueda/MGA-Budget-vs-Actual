/** その他設定から決算月 UI を削除し説明文を更新 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/ui/plan.js');
let content = readFileSync(path, 'utf8');

const descMatch = content.match(
  /<p class="expand-settings-desc">([\s\S]*?)<\/p>\s*\n\s*`;\s*\n\s*wrap\.appendChild\(header\);/,
);
if (!descMatch) {
  console.error('Description block not found');
  process.exit(1);
}

const newDesc = jp(0x4e8b, 0x696d, 0x958b, 0x59cb, 0x5e74, 0x306f, 0x4e88, 0x5b9f, 0x8868, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x306e, 0x5e74, 0x8868, 0x793a, 0x3068, 0x4f1a, 0x8a08, 0x6708, 0x306e, 0x4e26, 0x3073, 0x306e, 0x7b97, 0x51fa, 0x306b, 0x4f7f, 0x3044, 0x307e, 0x3059, 0x3002, 0x9078, 0x629e, 0x4e2d, 0x306e, 0x671f, 0xFF08, 0x4f8b, 0x003a, 0x7b2c, 0x0038, 0x671f, 0xFF09, 0x3068, 0x7d44, 0x307f, 0x5408, 0x308f, 0x305b, 0x3066, 0x3001, 0x5404, 0x6708, 0x306e, 0x5e74, 0x30e9, 0x30d9, 0x30eb, 0x3092, 0x6c7a, 0x5b9a, 0x3057, 0x307e, 0x3059, 0x3002, 0x6c7a, 0x7b97, 0x6708, 0x306f, 0x4ed5, 0x8a33, 0x0043, 0x0053, 0x0056, 0x306e, 0x30d5, 0x30a1, 0x30a4, 0x30eb, 0x540d, 0x304b, 0x3089, 0x671f, 0x3054, 0x3068, 0x306b, 0x81ea, 0x52d5, 0x5224, 0x5b9a, 0x3055, 0x308c, 0x307e, 0x3059, 0x3002, 0x6cd5, 0x4eba, 0x5224, 0x5b9a, 0x6587, 0x5b57, 0x306f, 0x5916, 0x6ce8, 0x8cbb, 0x306e, 0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x304c, 0x6cd5, 0x4eba, 0x304b, 0x500b, 0x4eba, 0x4e8b, 0x696d, 0x4e3b, 0x304b, 0x3092, 0x5224, 0x5225, 0x3059, 0x308b, 0x969b, 0x306b, 0x4f7f, 0x3044, 0x307e, 0x3059, 0x3002, 0x30d6, 0x30e9, 0x30f3, 0x30c9, 0x8868, 0x793a, 0x306f, 0x30d8, 0x30c3, 0x30c0, 0x30fc, 0x5de6, 0x4e0a, 0x306e, 0x30a2, 0x30a4, 0x30b3, 0x30f3, 0x30fb, 0x4f1a, 0x793e, 0x540d, 0x306b, 0x53cd, 0x6620, 0x3055, 0x308c, 0x307e, 0x3059, 0x3002);

content = content.replace(
  descMatch[0],
  `<p class="expand-settings-desc">${newDesc}</p>\n  \`;\n  wrap.appendChild(header);`,
);

content = content.replace(
  /\n        <label class="app-settings-field">\n          <span class="app-settings-label">決算月<\/span>\n          <select class="app-settings-input app-settings-input-fiscal-month" id="fiscal-end-month"><\/select>\n        <\/label>/,
  '',
);

content = content.replace(/\n  const fiscalEndMonthSelect = form\.querySelector\('#fiscal-end-month'\);/, '');

content = content.replace(
  /\n  for \(let m = 1; m <= 12; m \+= 1\) \{\n    const opt = document\.createElement\('option'\);\n    opt\.value = String\(m\);\n    opt\.textContent = `\$\{m\}月`;\n    fiscalEndMonthSelect\.appendChild\(opt\);\n  \}\n/,
  '\n',
);

content = content.replace(/\n  fiscalEndMonthSelect\.value = String\(getActiveFiscalEndMonth\(\)\);/g, '');

content = content.replace(
  /\n  fiscalEndMonthSelect\.addEventListener\('change', \(\) => \{\n    appSettings = \{\n      \.\.\.appSettings,\n      fiscalEndMonth: normalizeFiscalEndMonth\(fiscalEndMonthSelect\.value\),\n    \};\n    saveAppSettings\(appSettings\);\n    fiscalEndMonthSelect\.value = String\(getActiveFiscalEndMonth\(\)\);\n    syncPeriodControls\(\);\n    refreshPlanDataAfterFiscalCalendarChange\(\);\n  \}\);\n/,
  '\n',
);

writeFileSync(path, content, 'utf8');
console.log('Updated plan.js settings UI');
