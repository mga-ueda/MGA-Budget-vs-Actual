import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const planPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/ui/plan.js');
let s = readFileSync(planPath, 'utf8');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const dangerIdx = s.indexOf('class="app-settings-section other-settings-danger"');
if (dangerIdx < 0) {
  if (s.includes("dangerSection.innerHTML")) {
    console.log('Already moved');
    process.exit(0);
  }
  console.error('danger section not found');
  process.exit(1);
}

const appendForm = s.indexOf('wrap.appendChild(form);', dangerIdx);
const lineStart = s.lastIndexOf('\n', dangerIdx);
const templateClose = s.lastIndexOf('`;', appendForm);

const before = s.slice(0, lineStart);
const after = s.slice(templateClose);
s = `${before}\n  ${after}`;

if (s.includes('class="app-settings-section other-settings-danger"')) {
  console.error('HTML danger section still present after remove');
  process.exit(1);
}

const marker = 'appendCsvNameSettingsPanel(wrap);';
const markerIdx = s.indexOf(marker);
if (markerIdx < 0) {
  console.error('append marker missing');
  process.exit(1);
}
const markerEnd = s.indexOf('\n', markerIdx) + 1;

const dangerInner = `<div class="app-settings-section other-settings-danger">
      <h2 class="ui-color-panel-title">${jp(0x30c7, 0x30fc, 0x30bf, 0x7ba1, 0x7406)}</h2>
      <p class="app-settings-hint">${jp(0x8a2d, 0x5b9a, 0x30fb, 0x8a08, 0x753b, 0x30fb, 0x4fdd, 0x5b58, 0x30d5, 0x30a9, 0x30eb, 0x30c0, 0x3092, 0x542b, 0x3080, 0x5168, 0x3066, 0x306e, 0x4fdd, 0x5b58, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x524a, 0x9664, 0x3057, 0x3001, 0x521d, 0x671f, 0x72b6, 0x614b, 0x306b, 0x623b, 0x3057, 0x307e, 0x3059, 0x3002)}${jp(0x3053, 0x306e, 0x64cd, 0x4f5c, 0x306f, 0x53d6, 0x308a, 0x6d88, 0x305b, 0x307e, 0x305b, 0x3093, 0x3002)}</p>
      <div class="other-settings-brand-row other-settings-brand-row-actions">
        <button type="button" class="settings-delete-btn" id="app-settings-clear-all-btn">${jp(0x5168, 0x3066, 0x306e, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x30af, 0x30ea, 0x30a2)}</button>
      </div>
    </div>`;

const appendCode = `
  const dangerSection = document.createElement('div');
  dangerSection.innerHTML = \`
    ${dangerInner}
  \`.trim();
  wrap.appendChild(dangerSection.firstElementChild);
`;

s = s.slice(0, markerEnd) + appendCode + s.slice(markerEnd);
writeFileSync(planPath, s, 'utf8');
console.log('Moved data management section to end');
