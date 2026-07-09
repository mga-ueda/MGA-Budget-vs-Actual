/** appendCsvNameSettingsPanel 等、欠落した関数を plan.js に復元 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const planPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/ui/plan.js');
let content = readFileSync(planPath, 'utf8');

if (content.includes('function appendCsvNameSettingsPanel(')) {
  console.log('Already present');
  process.exit(0);
}

const head = execSync('git show HEAD:src/ui/plan.js', { encoding: 'utf8' });
const blockMatch = head.match(
  /function appendCsvNameSettingsPanel[\s\S]*?\n\}\n\nfunction filterBrandLogoDecimalInput[\s\S]*?\nfunction filterTaxRateIntegerInput[\s\S]*?\n\}/,
);
if (!blockMatch) {
  console.error('Source block not found in git HEAD');
  process.exit(1);
}

const insertBefore = 'function renderOtherSettings()';
if (!content.includes(insertBefore)) {
  console.error('renderOtherSettings anchor not found');
  process.exit(1);
}

content = content.replace(insertBefore, `${blockMatch[0]}\n\n${insertBefore}`);
writeFileSync(planPath, content, 'utf8');
console.log('Restored missing functions in plan.js');
