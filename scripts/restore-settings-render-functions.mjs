/** 22fa46c で誤削除された設定画面 render 関数を 14dd366 から復元する */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const planPath = resolve(repoRoot, 'src/ui/plan.js');

const oldPlan = execSync('git show 14dd366:src/ui/plan.js', { encoding: 'utf8' });

function sliceBetween(startMarker, endMarker) {
  const start = oldPlan.indexOf(startMarker);
  if (start < 0) throw new Error(`start marker not found: ${startMarker}`);
  const end = endMarker ? oldPlan.indexOf(endMarker, start + startMarker.length) : oldPlan.length;
  if (end < 0) throw new Error(`end marker not found: ${endMarker}`);
  return oldPlan.slice(start, end).trimEnd() + '\n';
}

function applyFiscalApiUpdates(source) {
  return source
    .replaceAll('buildFiscalYearMonths(appSettings.fiscalEndMonth)', 'buildFiscalYearMonths(getActiveFiscalEndMonth())')
    .replaceAll('appSettings.businessStartYear', 'getActiveBusinessStartYear()')
    .replace(
      /createPlanMonthDisplayUi\(\{\n(\s+)appSettings,/g,
      'createPlanMonthDisplayUi({\n$1appSettings: getAppSettingsWithFiscalContext(),',
    )
    .replace(
      /bindEmployeeSettingsLayout\(wrap, \{\n([\s\S]*?\n\s+)appSettings,\n(\s+)\}\);/g,
      'bindEmployeeSettingsLayout(wrap, {\n$1appSettings: getAppSettingsWithFiscalContext(),\n$2});',
    )
    .replace(
      /syncAllPlanSettingsTableColumnPlates\(([^,]+), fiscalMonths, currentPeriod, appSettings\)/g,
      'syncAllPlanSettingsTableColumnPlates($1, fiscalMonths, currentPeriod, getAppSettingsWithFiscalContext())',
    )
    .replace(
      /refreshPlanSettingsColumnPlates\(([^,]+), fiscalMonths, currentPeriod, appSettings\)/g,
      'refreshPlanSettingsColumnPlates($1, fiscalMonths, currentPeriod, getAppSettingsWithFiscalContext())',
    )
    .replace(
      /layoutPlanSettingsScalableWrap\(\{\n([\s\S]*?\n\s+)appSettings,\n(\s+)\}\);/g,
      'layoutPlanSettingsScalableWrap({\n$1appSettings: getAppSettingsWithFiscalContext(),\n$2});',
    )
    .replace(
      /bindPlanSettingsScalableLayout\(\{\n([\s\S]*?\n\s+)appSettings,\n(\s+)\}\);/g,
      'bindPlanSettingsScalableLayout({\n$1appSettings: getAppSettingsWithFiscalContext(),\n$2});',
    )
    .replace(
      /mountRevenueSettingsPanel\(\{\n([\s\S]*?\n\s+)appSettings,/g,
      'mountRevenueSettingsPanel({\n$1appSettings: getAppSettingsWithFiscalContext(),',
    );
}

const restored = [
  sliceBetween('function renderVisibilitySettings', 'function renderUiColorPanel'),
  sliceBetween('function renderUiColorPanel', 'function buildColorSettingsColumns'),
  sliceBetween('function buildColorSettingsColumns', 'function buildColorSettingsContent'),
  sliceBetween('function buildColorSettingsContent', 'function appendCsvNameSettingsPanel'),
  sliceBetween('function filterTaxRateIntegerInput', 'function renderTaxRateSettings'),
  sliceBetween('function renderTaxRateSettings', 'function renderTaxPaymentSettings'),
  sliceBetween('function renderTaxPaymentSettings', 'function renderEmployeeSettings'),
  sliceBetween('function renderEmployeeSettings', 'function renderJournalDefinitionSettings'),
].map(applyFiscalApiUpdates).join('\n\n');

let current = readFileSync(planPath, 'utf8');

const wrongStart = current.indexOf('function renderVisibilitySettings()');
const wrongEnd = current.indexOf('function renderJournalDefinitionSettings()');
if (wrongStart < 0 || wrongEnd < 0 || wrongEnd <= wrongStart) {
  console.error('Could not locate replacement region in plan.js');
  process.exit(1);
}

const next = current.slice(0, wrongStart) + restored + '\n' + current.slice(wrongEnd);

if (next.includes('function renderVisibilitySettings()') && next.indexOf('function renderVisibilitySettings()') !== wrongStart) {
  // ok - should appear once in restored block
}
const required = [
  'function renderVisibilitySettings',
  'function buildColorSettingsContent',
  'function renderTaxRateSettings',
  'function renderTaxPaymentSettings',
  'function renderEmployeeSettings',
];
for (const name of required) {
  if (!next.includes(name)) {
    console.error('Missing after restore:', name);
    process.exit(1);
  }
}

writeFileSync(planPath, next, 'utf8');
console.log('Restored settings render functions in src/ui/plan.js');
