/**
 * journalDefinitionSettings.js generator — node scripts/gen-journal-definition-settings.mjs
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(repoRoot, 'src/ui/journalDefinitionSettings.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const content = `import {
  JOURNAL_DEFINITION_GROUPS,
  isJournalPatternValid,
  loadJournalDefinition,
  resetJournalDefinition,
  saveJournalDefinition,
  setActiveJournalDefinition,
} from '../config/journalDefinitionConfig.js';
import {
  applySectionFilterTitleStyle,
  bindPlanSettingsScalableLayout,
  measureElementIntrinsicWidth,
  planSettingsRemToPx,
} from './planSettingsTableUi.js';

/** ${jp(0x5bfe, 0x5fdc, 0x3059, 0x308b, 0x5927, 0x9805, 0x76ee, 0x304c, 0x3042, 0x308b, 0x9805, 0x76ee, 0x540d, 0x306f, 0x3001, 0x4e88, 0x5b9f, 0x8868, 0x3068, 0x540c, 0x3058, 0x5927, 0x9805, 0x76ee, 0x8272, 0x306e, 0x30c1, 0x30c3, 0x30d7, 0x3067, 0x8868, 0x793a, 0x3059, 0x308b)} */
function buildJournalDefinitionSectionHead(sectionMeta, getSectionFilterColors) {
  const head = document.createElement('div');
  head.className = 'tax-rate-section-head';

  const label = document.createElement('span');
  label.className = 'app-settings-label';
  label.textContent = sectionMeta.label;
  if (sectionMeta.sectionColorId && getSectionFilterColors) {
    label.classList.add('salary-plan-title');
    applySectionFilterTitleStyle(label, sectionMeta.sectionColorId, getSectionFilterColors);
  }

  const hint = document.createElement('span');
  hint.className = 'app-settings-hint tax-rate-section-hint';
  hint.textContent = sectionMeta.hint;

  head.append(label, hint);
  return head;
}

function bindJournalDefinitionListSection({
  sectionEl,
  listKey,
  valueType,
  getConfig,
  onChange,
}) {
  const tbody = sectionEl.querySelector('[data-journal-list-body]');
  const addBtn = sectionEl.querySelector('[data-journal-list-add]');

  const renderRows = () => {
    const config = getConfig();
    const values = config[listKey] ?? [];
    tbody.replaceChildren();

    values.forEach((value, index) => {
      const tr = document.createElement('tr');
      tr.dataset.index = String(index);

      const valueTd = document.createElement('td');
      valueTd.className = 'col-csvname-pattern';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'csvname-pattern-input journal-definition-value-input';
      input.value = value;
      input.spellcheck = false;
      valueTd.appendChild(input);

      const statusTd = document.createElement('td');
      statusTd.className = 'col-csvname-test';
      if (valueType === 'pattern') {
        const valid = isJournalPatternValid(value);
        statusTd.textContent = valid ? ${JSON.stringify(jp(0x6709, 0x52b9))} : ${JSON.stringify(jp(0x7121, 0x52b9))};
        statusTd.className += valid ? ' is-ok' : ' is-ng';
      } else {
        statusTd.textContent = value.trim() ? ${JSON.stringify(jp(0x2014))} : ${JSON.stringify(jp(0x672a, 0x5165, 0x529b))};
        statusTd.className += value.trim() ? '' : ' is-ng';
      }

      const actionTd = document.createElement('td');
      actionTd.className = 'col-tax-rate-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'expand-reset-btn journal-definition-delete-btn';
      deleteBtn.textContent = ${JSON.stringify(jp(0x524a, 0x9664))};
      actionTd.appendChild(deleteBtn);

      tr.append(valueTd, statusTd, actionTd);
      tbody.appendChild(tr);

      const persistValue = () => {
        const nextValues = [...(getConfig()[listKey] ?? [])];
        nextValues[index] = input.value;
        onChange({ ...getConfig(), [listKey]: nextValues });
        renderRows();
      };

      input.addEventListener('change', persistValue);
      input.addEventListener('blur', persistValue);

      deleteBtn.addEventListener('click', () => {
        const nextValues = [...(getConfig()[listKey] ?? [])];
        nextValues.splice(index, 1);
        onChange({ ...getConfig(), [listKey]: nextValues });
        renderRows();
      });
    });
  };

  addBtn.addEventListener('click', () => {
    const nextValues = [...(getConfig()[listKey] ?? []), ''];
    onChange({ ...getConfig(), [listKey]: nextValues });
    renderRows();
    const lastInput = tbody.querySelector('tr:last-child .journal-definition-value-input');
    lastInput?.focus();
  });

  renderRows();
}

function buildJournalDefinitionSinglePatternSection(sectionMeta, getConfig, onChange, getSectionFilterColors) {
  const section = document.createElement('div');
  section.className = 'app-settings-section journal-definition-section';
  section.dataset.journalSectionKey = sectionMeta.key;
  section.appendChild(buildJournalDefinitionSectionHead(sectionMeta, getSectionFilterColors));

  const row = document.createElement('div');
  row.className = 'legal-welfare-rate-inline';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'csvname-pattern-input journal-definition-value-input';
  input.spellcheck = false;
  input.value = getConfig()[sectionMeta.key] ?? '';
  const status = document.createElement('span');
  status.className = 'app-settings-hint tax-rate-section-hint';

  const refreshStatus = () => {
    const valid = isJournalPatternValid(input.value);
    status.textContent = valid ? ${JSON.stringify(jp(0x6709, 0x52b9))} : ${JSON.stringify(jp(0x7121, 0x52b9))};
    status.classList.toggle('is-ng', !valid);
  };

  const persist = () => {
    onChange({ ...getConfig(), [sectionMeta.key]: input.value });
    refreshStatus();
  };

  input.addEventListener('change', persist);
  input.addEventListener('blur', persist);
  refreshStatus();

  row.append(input, status);
  section.appendChild(row);
  return section;
}

function buildJournalDefinitionSection(sectionMeta, getConfig, onChange, getSectionFilterColors) {
  const section = document.createElement('div');
  section.className = 'app-settings-section journal-definition-section';
  section.dataset.journalSectionKey = sectionMeta.key;
  section.appendChild(buildJournalDefinitionSectionHead(sectionMeta, getSectionFilterColors));

  const table = document.createElement('table');
  table.className = 'expand-settings-table journal-definition-table';
  table.innerHTML = \`
    <thead>
      <tr>
        <th>\${sectionMeta.valueType === 'pattern'
    ? ${JSON.stringify(jp(0x6b63, 0x898f, 0x8868, 0x73fe, 0x30d1, 0x30bf, 0x30fc, 0x30f3))}
    : ${JSON.stringify(jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d))}}</th>
        <th class="col-csvname-test"></th>
        <th class="col-tax-rate-actions"></th>
      </tr>
    </thead>
    <tbody data-journal-list-body></tbody>
  \`;
  section.appendChild(table);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'expand-reset-btn tax-rate-add-btn';
  addBtn.dataset.journalListAdd = 'true';
  addBtn.textContent = ${JSON.stringify(jp(0x884c, 0x3092, 0x8ffd, 0x52a0))};
  section.appendChild(addBtn);

  bindJournalDefinitionListSection({
    sectionEl: section,
    listKey: sectionMeta.key,
    valueType: sectionMeta.valueType,
    getConfig,
    onChange,
  });

  return section;
}

export function mountJournalDefinitionSettingsPanel({
  replaceRootPanel,
  refreshPlanData,
  getSectionFilterColors,
}) {
  let journalDefinition = loadJournalDefinition();
  setActiveJournalDefinition(journalDefinition);

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap journal-definition-settings-wrap plan-settings-scalable';

  const header = document.createElement('div');
  header.className = 'expand-settings-header';
  header.innerHTML = \`
    <p class="expand-settings-desc journal-definition-settings-desc">
      ${jp(0x4ed5, 0x8a33, 0x43, 0x53, 0x56, 0x306e, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x3092, 0x50, 0x4c, 0x30fb, 0x8af8, 0x7d4c, 0x8cbb, 0x30fb, 0x8cb8, 0x501f, 0x5bfe, 0x7167, 0x8868, 0x306b, 0x632f, 0x308a, 0x5206, 0x3051, 0x308b, 0x5b9a, 0x7fa9, 0x3092, 0x7de8, 0x96c6, 0x3057, 0x307e, 0x3059, 0x3002, 0x30d1, 0x30bf, 0x30fc, 0x30f3, 0x306f, 0x6b63, 0x898f, 0x8868, 0x73fe, 0x3067, 0x3001, 0x300c, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d, 0x7c, 0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x540d, 0x300d, 0x306e, 0x30ad, 0x30fc, 0x306b, 0x5bfe, 0x3057, 0x3066, 0x8a55, 0x4fa1, 0x3055, 0x308c, 0x307e, 0x3059, 0xff08, 0x5148, 0x982d, 0x4e00, 0x81f4, 0x306f, 0x20, 0x5e, 0x20, 0x3092, 0x6307, 0x5b9a, 0xff09, 0x3002, 0x5909, 0x66f4, 0x306f, 0x4fdd, 0x5b58, 0x3055, 0x308c, 0x3001, 0x4e88, 0x5b9f, 0x8868, 0x306e, 0x96c6, 0x8a08, 0x306b, 0x5373, 0x6642, 0x53cd, 0x6620, 0x3055, 0x308c, 0x307e, 0x3059, 0x3002)}
    </p>
    <div class="expand-settings-header-actions">
      <button type="button" class="expand-reset-btn" id="journal-definition-reset-btn">${jp(0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8, 0x306b, 0x623b, 0x3059)}</button>
    </div>
  \`;
  wrap.appendChild(header);

  const stack = document.createElement('div');
  stack.className = 'tax-rate-settings-stack journal-definition-settings-stack';

  const getConfig = () => journalDefinition;

  const persistConfig = (nextConfig) => {
    journalDefinition = saveJournalDefinition(nextConfig);
    setActiveJournalDefinition(journalDefinition);
    refreshPlanData?.();
  };

  for (const group of JOURNAL_DEFINITION_GROUPS) {
    const groupEl = document.createElement('section');
    groupEl.className = 'app-settings-section journal-definition-group';

    const groupTitle = document.createElement('h2');
    groupTitle.className = 'ui-color-panel-title';
    groupTitle.textContent = group.label;
    groupEl.appendChild(groupTitle);

    for (const sectionMeta of group.sections) {
      if (sectionMeta.valueType === 'singlePattern') {
        groupEl.appendChild(buildJournalDefinitionSinglePatternSection(sectionMeta, getConfig, persistConfig, getSectionFilterColors));
      } else {
        groupEl.appendChild(buildJournalDefinitionSection(sectionMeta, getConfig, persistConfig, getSectionFilterColors));
      }
    }

    stack.appendChild(groupEl);
  }

  wrap.appendChild(stack);

  wrap.querySelector('#journal-definition-reset-btn').addEventListener('click', () => {
    journalDefinition = resetJournalDefinition();
    setActiveJournalDefinition(journalDefinition);
    mountJournalDefinitionSettingsPanel({ replaceRootPanel, refreshPlanData, getSectionFilterColors });
    refreshPlanData?.();
  });

  replaceRootPanel(wrap);
  // ${jp(0x7a0e, 0x7387, 0x5b9a, 0x7fa9, 0x30da, 0x30fc, 0x30b8, 0x3068, 0x540c, 0x3058, 0x65b9, 0x91dd, 0x3067, 0x30d5, 0x30a3, 0x30c3, 0x30c8, 0xff08, 0x8868, 0x306e, 0x81ea, 0x7136, 0x5e45, 0x306e, 0x6700, 0x5927, 0x20, 0xff0b, 0x20, 0x5de6, 0x53f3, 0x4f59, 0x767d, 0x20, 0x32, 0x72, 0x65, 0x6d, 0x3001, 0x4e0b, 0x9650, 0x20, 0x32, 0x38, 0x72, 0x65, 0x6d, 0xff09)}
  bindPlanSettingsScalableLayout(wrap, {
    measureNaturalWidth: () => {
      const tableW = Math.max(
        0,
        ...[...wrap.querySelectorAll('.journal-definition-table')].map(
          (table) => measureElementIntrinsicWidth(table),
        ),
      );
      return Math.max(tableW, planSettingsRemToPx(28)) + planSettingsRemToPx(2);
    },
  });
}
`;

writeFileSync(outPath, content, { encoding: 'utf8' });
console.log('Wrote src/ui/journalDefinitionSettings.js');
