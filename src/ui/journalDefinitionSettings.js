import {
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
import { TIP_JOURNAL_ROW_DELETE, TIP_JOURNAL_ROW_ADD } from '../config/uiTooltipConfig.js';

/** 対応する大項目がある項目名は、予実表と同じ大項目色のチップで表示する */
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
        statusTd.textContent = valid ? "有効" : "無効";
        statusTd.className += valid ? ' is-ok' : ' is-ng';
      } else {
        statusTd.textContent = value.trim() ? "—" : "未入力";
        statusTd.className += value.trim() ? '' : ' is-ng';
      }

      const actionTd = document.createElement('td');
      actionTd.className = 'col-tax-rate-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'expand-reset-btn journal-definition-delete-btn';
      deleteBtn.textContent = "削除";
      deleteBtn.title = TIP_JOURNAL_ROW_DELETE;
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
    status.textContent = valid ? "有効" : "無効";
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
  table.innerHTML = `
    <thead>
      <tr>
        <th>${sectionMeta.valueType === 'pattern'
    ? "正規表現パターン"
    : "勘定科目名"}</th>
        <th class="col-csvname-test"></th>
        <th class="col-tax-rate-actions"></th>
      </tr>
    </thead>
    <tbody data-journal-list-body></tbody>
  `;
  section.appendChild(table);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'expand-reset-btn tax-rate-add-btn';
  addBtn.dataset.journalListAdd = 'true';
  addBtn.textContent = "行を追加";
  addBtn.title = TIP_JOURNAL_ROW_ADD;
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
  header.innerHTML = `
    <p class="expand-settings-desc journal-definition-settings-desc">
      仕訳CSVの勘定科目をPL・諸経費・貸借対照表に振り分ける定義を編集します。パターンは正規表現で、「勘定科目名|補助科目名」のキーに対して評価されます（先頭一致は ^ を指定）。変更は保存され、予実表の集計に即時反映されます。
    </p>
    <div class="expand-settings-header-actions">
      <button type="button" class="expand-reset-btn" id="journal-definition-reset-btn">デフォルトに戻す</button>
    </div>
  `;
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
  // 税率定義ページと同じ方針でフィット（表の自然幅の最大 ＋ 左右余白 2rem、下限 28rem）
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
