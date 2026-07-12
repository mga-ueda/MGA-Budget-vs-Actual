/**
 * その他設定に「全てのデータをクリア」UI・確認ダイアログを追加する
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const planPath = resolve(repoRoot, 'src/ui/plan.js');
const cssPath = resolve(repoRoot, 'src/plan.css');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const plan = readFileSync(planPath, 'utf8');
let next = plan;

const dangerSection = `
    <div class="app-settings-section other-settings-danger">
      <h2 class="ui-color-panel-title">${jp(0x30c7, 0x30fc, 0x30bf, 0x7ba1, 0x7406)}</h2>
      <p class="app-settings-hint">${jp(0x8a2d, 0x5b9a, 0x30fb, 0x8a08, 0x753b, 0x30fb, 0x4fdd, 0x5b58, 0x30d5, 0x30a9, 0x30eb, 0x30c0, 0x3092, 0x542b, 0x3080, 0x5168, 0x3066, 0x306e, 0x4fdd, 0x5b58, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x524a, 0x9664, 0x3057, 0x3001, 0x521d, 0x671f, 0x72b6, 0x614b, 0x306b, 0x623b, 0x3057, 0x307e, 0x3059, 0x3002)}${jp(0x3053, 0x306e, 0x64cd, 0x4f5c, 0x306f, 0x53d6, 0x308a, 0x6d88, 0x305b, 0x307e, 0x305b, 0x3093, 0x3002)}</p>
      <div class="other-settings-brand-row other-settings-brand-row-actions">
        <button type="button" class="settings-delete-btn" id="app-settings-clear-all-btn">${jp(0x5168, 0x3066, 0x306e, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x30af, 0x30ea, 0x30a2)}</button>
      </div>
    </div>
`;

if (!next.includes('id="app-settings-clear-all-btn"')) {
  const marker = `        </label>
      </div>
    </div>
  \`;
  wrap.appendChild(form);

  appendCsvNameSettingsPanel(wrap);`;
  if (!next.includes(marker)) {
    console.error('plan.js: danger section insert marker not found');
    process.exit(1);
  }
  next = next.replace(
    marker,
    `        </label>
      </div>
    </div>${dangerSection}  \`;
  wrap.appendChild(form);

  appendCsvNameSettingsPanel(wrap);`,
  );
  console.log('Inserted danger section');
}

const confirmFn = `
/** 破壊的操作の確認。キャンセルを既定フォーカスにする */
function confirmDangerousAction({
  title,
  message,
  confirmLabel = '${jp(0x5b9f, 0x884c, 0x3059, 0x308b)}',
  cancelLabel = '${jp(0x30ad, 0x30e3, 0x30f3, 0x30bb, 0x30eb)}',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = \`
      <div class="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">
        <h2 class="app-confirm-title" id="app-confirm-title"></h2>
        <p class="app-confirm-message"></p>
        <div class="app-confirm-actions">
          <button type="button" class="settings-delete-btn" data-action="confirm"></button>
          <button type="button" class="expand-reset-btn" data-action="cancel"></button>
        </div>
      </div>
    \`;
    overlay.querySelector('.app-confirm-title').textContent = title;
    overlay.querySelector('.app-confirm-message').textContent = message;
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    confirmBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;

    const finish = (value) => {
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      resolve(value);
    };
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        finish(false);
      }
    };

    confirmBtn.addEventListener('click', () => finish(true));
    cancelBtn.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) finish(false);
    });
    overlay.querySelector('.app-confirm-dialog').addEventListener('click', (ev) => {
      ev.stopPropagation();
    });

    document.addEventListener('keydown', onKeyDown, true);
    const mountTarget = document.querySelector('.plan-app') ?? document.body;
    mountTarget.appendChild(overlay);
    cancelBtn.focus();
  });
}

`;

if (!next.includes('function confirmDangerousAction(')) {
  const resetHandler = `  wrap.querySelector('#app-settings-reset-btn').addEventListener('click', () => {`;
  if (!next.includes(resetHandler)) {
    console.error('plan.js: reset handler marker not found');
    process.exit(1);
  }
  next = next.replace(resetHandler, `${confirmFn}${resetHandler}`);
  console.log('Inserted confirmDangerousAction');
}

const clearHandler = `
  wrap.querySelector('#app-settings-clear-all-btn').addEventListener('click', async () => {
    const confirmed = await confirmDangerousAction({
      title: '${jp(0x5168, 0x3066, 0x306e, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x30af, 0x30ea, 0x30a2)}',
      message: '${jp(0x8a2d, 0x5b9a, 0x30fb, 0x8a08, 0x753b, 0x30fb, 0x4fdd, 0x5b58, 0x30d5, 0x30a9, 0x30eb, 0x30c0, 0x3092, 0x542b, 0x3080, 0x5168, 0x3066, 0x306e, 0x4fdd, 0x5b58, 0x30c7, 0x30fc, 0x30bf, 0x3092, 0x524a, 0x9664, 0x3057, 0x3001, 0x521d, 0x671f, 0x72b6, 0x614b, 0x306b, 0x623b, 0x3057, 0x307e, 0x3059, 0x3002)}\\n\\n${jp(0x3053, 0x306e, 0x64cd, 0x4f5c, 0x306f, 0x53d6, 0x308a, 0x6d88, 0x305b, 0x307e, 0x305b, 0x3093, 0x3002)}',
      confirmLabel: '${jp(0x30af, 0x30ea, 0x30a2, 0x3059, 0x308b)}',
      cancelLabel: '${jp(0x30ad, 0x30e3, 0x30f3, 0x30bb, 0x30eb)}',
    });
    if (!confirmed) return;
    clearAllStoredAppData();
    await clearSavedFolderData();
    window.location.reload();
  });

`;

if (!next.includes("querySelector('#app-settings-clear-all-btn')")) {
  const replaceMarker = `    if (activeTab === 'plan' && data) refreshPlanTable();
  });

  replaceRootPanel(wrap);`;
  if (!next.includes(replaceMarker)) {
    console.error('plan.js: after-reset marker not found');
    process.exit(1);
  }
  next = next.replace(
    replaceMarker,
    `    if (activeTab === 'plan' && data) refreshPlanTable();
  });
${clearHandler}  replaceRootPanel(wrap);`,
  );
  console.log('Inserted clear-all handler');
}

if (next.includes('other-settings-danger') && !next.includes("querySelector('.other-settings-danger')")) {
  const measureOld = `    const sectionW = Math.max(
      brandRowW,
      measureElementIntrinsicWidth(wrap.querySelector('.other-settings-general-row')),
      measureElementIntrinsicWidth(wrap.querySelector('.csv-name-settings-table')),
    );`;
  const measureNew = `    const sectionW = Math.max(
      brandRowW,
      measureElementIntrinsicWidth(wrap.querySelector('.other-settings-general-row')),
      measureElementIntrinsicWidth(wrap.querySelector('.other-settings-danger')),
      measureElementIntrinsicWidth(wrap.querySelector('.csv-name-settings-table')),
    );`;
  if (next.includes(measureOld)) {
    next = next.replace(measureOld, measureNew);
    console.log('Updated layout measure');
  }
}

if (next !== plan) {
  writeFileSync(planPath, next, 'utf8');
  console.log('Wrote plan.js');
} else {
  console.log('plan.js unchanged');
}

let css = readFileSync(cssPath, 'utf8');
const cssBlock = `
.other-settings-danger {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--plan-border);
}

.other-settings-danger .app-settings-hint {
  margin: 0 0 0.65rem;
  max-width: 36rem;
}

.app-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--plan-journal-overlay);
}

.app-confirm-dialog {
  width: min(26rem, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  background: var(--plan-context-menu-bg);
  color: var(--plan-journal-text);
  border: 1px solid var(--plan-border);
  border-radius: 8px;
  box-shadow: 0 16px 48px var(--plan-context-menu-shadow);
}

.app-confirm-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
}

.app-confirm-message {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--plan-text-dim);
  white-space: pre-wrap;
}

.app-confirm-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.25rem;
}

.app-confirm-actions .settings-delete-btn,
.app-confirm-actions .expand-reset-btn {
  min-width: 5.5rem;
}
`;

if (!css.includes('.app-confirm-overlay')) {
  const anchor = '.other-settings-corp-field {\n  flex: 0 0 auto;\n  min-width: 0;\n  max-width: none;\n}\n';
  if (!css.includes(anchor)) {
    console.error('plan.css: anchor not found');
    process.exit(1);
  }
  css = css.replace(anchor, `${anchor}${cssBlock}`);
  writeFileSync(cssPath, css, 'utf8');
  console.log('Wrote plan.css');
} else {
  console.log('plan.css already has confirm styles');
}
