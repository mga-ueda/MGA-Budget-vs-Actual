import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const configPath = resolve(repoRoot, 'src/config/expensePlanOverrideConfig.js');
const uiPath = resolve(repoRoot, 'src/ui/expensePlanOverrideSettings.js');

const configContent = `import { canonicalExpenseAccount, EXPENSE_SECTION_ACCOUNTS } from './expenseAccountConfig.js';

const EXPENSE_PLAN_OVERRIDE_STORAGE_KEY = 'mga-expense-plan-overrides';

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function emptyMonthly(fiscalMonths) {
  const monthly = {};
  for (const month of fiscalMonths) monthly[month] = null;
  return monthly;
}

export function normalizeExpenseOverrideMonthly(plan, fiscalMonths) {
  const monthly = emptyMonthly(fiscalMonths);
  if (plan && typeof plan === 'object') {
    for (const month of fiscalMonths) {
      monthly[month] = normalizeAmount(plan[month]);
    }
  }
  return monthly;
}

export function loadExpensePlanOverrides() {
  try {
    const raw = localStorage.getItem(EXPENSE_PLAN_OVERRIDE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveExpensePlanOverrides(overrides) {
  localStorage.setItem(EXPENSE_PLAN_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  return overrides;
}

/** ${jp(0x652f, 0x6255, 0x3044, 0x8a08, 0x753b, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x306e, 0x5bfe, 0x8c61, 0x671f, 0x9593, 0xFF08, 0x4eca, 0x671f, 0x30fb, 0x6765, 0x671f, 0xFF09)} */
export function buildExpensePlanOverridePeriodEntries(currentPeriod) {
  return [
    { period: currentPeriod, label: ${JSON.stringify(jp(0x4eca, 0x671f))} },
    { period: currentPeriod + 1, label: ${JSON.stringify(jp(0x6765, 0x671f))} },
  ];
}

export function getExpenseOverrideAccounts(overrides, fiscalPeriod) {
  const stored = overrides[String(fiscalPeriod)];
  if (!stored || typeof stored !== 'object') return [];
  return Object.keys(stored).sort((a, b) => a.localeCompare(b, 'ja'));
}

export function getExpenseOverrideMonthly(overrides, fiscalPeriod, account, fiscalMonths) {
  const stored = overrides[String(fiscalPeriod)]?.[account];
  return normalizeExpenseOverrideMonthly(stored, fiscalMonths);
}

export function setExpenseOverrideMonthly(overrides, fiscalPeriod, account, monthly, fiscalMonths) {
  const periodKey = String(fiscalPeriod);
  const next = { ...overrides };
  if (!next[periodKey]) next[periodKey] = {};
  next[periodKey] = {
    ...next[periodKey],
    [account]: normalizeExpenseOverrideMonthly(monthly, fiscalMonths),
  };
  return saveExpensePlanOverrides(next);
}

export function addExpenseOverrideAccount(overrides, fiscalPeriod, account, fiscalMonths) {
  const canonical = canonicalExpenseAccount(account);
  if (!canonical) return overrides;
  const existing = getExpenseOverrideAccounts(overrides, fiscalPeriod);
  if (existing.includes(canonical)) return overrides;
  return setExpenseOverrideMonthly(
    overrides,
    fiscalPeriod,
    canonical,
    emptyMonthly(fiscalMonths),
    fiscalMonths,
  );
}

export function removeExpenseOverrideAccount(overrides, fiscalPeriod, account) {
  const periodKey = String(fiscalPeriod);
  const stored = overrides[periodKey];
  if (!stored || !stored[account]) return overrides;
  const next = { ...overrides, [periodKey]: { ...stored } };
  delete next[periodKey][account];
  if (Object.keys(next[periodKey]).length === 0) delete next[periodKey];
  return saveExpensePlanOverrides(next);
}

/** ${jp(0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x5bfe, 0x8c61, 0x671f, 0x9593, 0x306e, 0x79d1, 0x76ee, 0x2192, 0x6708, 0x6b21, 0x30de, 0x30c3, 0x30d7)} */
export function buildExpenseOverrideMapForPeriod(overrides, fiscalPeriod, fiscalMonths) {
  const map = new Map();
  for (const account of getExpenseOverrideAccounts(overrides, fiscalPeriod)) {
    map.set(account, getExpenseOverrideMonthly(overrides, fiscalPeriod, account, fiscalMonths));
  }
  return map;
}

/** ${jp(0x30d7, 0x30eb, 0x30c0, 0x30a6, 0x30f3, 0x7528, 0x306e, 0x8af8, 0x7d4c, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x5019, 0x88dc)} */
export function collectExpenseOverrideAccountCandidates(planData, selectedAccounts = []) {
  const selected = new Set(selectedAccounts);
  const accounts = new Set(EXPENSE_SECTION_ACCOUNTS);
  const expenseSection = planData?.sections?.find((s) => s.id === 'expense');
  if (expenseSection) {
    for (const row of expenseSection.rows) {
      if (row.type === 'total' || row.type === 'plan') continue;
      accounts.add(canonicalExpenseAccount(row.label));
    }
  }
  return [...accounts]
    .filter((account) => !selected.has(account))
    .sort((a, b) => a.localeCompare(b, 'ja'));
}

/** ${jp(0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x3092, 0x9069, 0x7528, 0x3059, 0x308b, 0x884c, 0x3092, 0x7279, 0x5b9a)} */
export function resolveExpenseOverrideTargetRow(rows, account) {
  const canonical = canonicalExpenseAccount(account);
  const matching = rows.filter((row) => {
    if (row.type === 'total' || row.type === 'plan' || row.type === 'breakdown') return false;
    return canonicalExpenseAccount(row.label) === canonical;
  });
  const leafRows = matching.filter((row) => row.type === 'item' || row.type === 'sub');
  if (leafRows.length === 1) return leafRows[0];
  const groupRow = matching.find((row) => row.type === 'group');
  if (leafRows.length > 1 && groupRow) return groupRow;
  const items = matching.filter((row) => row.type === 'item');
  if (items.length === 1) return items[0];
  return null;
}
`;

const uiContent = `import {
  parseSalaryPlanAmountInput,
  parseSalaryPlanAmountInputWithFillForward,
  formatSalaryPlanYen,
  salaryPlanAmountDiffersFromPrevious,
  buildFiscalYearMonths,
  applyAmountFromMonthForwardSkippingPast,
} from '../config/salaryPlanConfig.js';
import {
  buildExpensePlanOverridePeriodEntries,
  getExpenseOverrideAccounts,
  getExpenseOverrideMonthly,
  setExpenseOverrideMonthly,
  addExpenseOverrideAccount,
  removeExpenseOverrideAccount,
  collectExpenseOverrideAccountCandidates,
} from '../config/expensePlanOverrideConfig.js';
import { formatFiscalPeriodLabel } from '../config/appSettings.js';
import { getSettingsLockedMonths } from '../config/monthDisplayConfig.js';
import {
  handlePlanAmountCellKeydown,
  resumePlanCellTabEdit,
  tagPlanEditableCell,
  tagPlanEditableRow,
} from '../config/planCellEdit.js';

const SECTION_CLASS = 'expense-plan-override-section';

function sumDisplayMonthlyTotal(display, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) total += display[month] ?? 0;
  return total;
}

/** ${jp(0x652f, 0x6255, 0x3044, 0x8a08, 0x753b, 0x30bf, 0x30d6, 0x5185, 0x306b, 0x8af8, 0x7d4c, 0x8a08, 0x753b, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x3092, 0x8868, 0x793a)} */
export function mountExpensePlanOverrideSection({
  wrap,
  appSettings,
  rawPlanData,
  getExpensePlanOverrides,
  setExpensePlanOverrides,
  refreshPlanTableIfNeeded,
  getMonthDisplayConfig,
}) {
  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const currentPeriod = appSettings.fiscalPeriod;
  const periodEntries = buildExpensePlanOverridePeriodEntries(currentPeriod);

  let expensePlanOverrides = getExpensePlanOverrides();

  function getPastMonthsForPeriod(fiscalPeriod) {
    return getSettingsLockedMonths({
      config: getMonthDisplayConfig(),
      businessStartYear: appSettings.businessStartYear,
      fiscalPeriod,
      fiscalMonths,
      currentFiscalPeriod: currentPeriod,
    });
  }

  function isMonthEditable(fiscalPeriod, month) {
    return !getPastMonthsForPeriod(fiscalPeriod).has(month);
  }

  function persistMonthly(account, monthly, fiscalPeriod) {
    expensePlanOverrides = setExpenseOverrideMonthly(
      expensePlanOverrides,
      fiscalPeriod,
      account,
      monthly,
      fiscalMonths,
    );
    setExpensePlanOverrides(expensePlanOverrides);
    refreshPlanTableIfNeeded();
  }

  function startCellEdit(td, account, month, fiscalPeriod) {
    if (!isMonthEditable(fiscalPeriod, month)) return;
    if (td.querySelector('input')) return;

    const plan = getExpenseOverrideMonthly(expensePlanOverrides, fiscalPeriod, account, fiscalMonths);
    const rawValue = plan[month];

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.className = 'salary-plan-amount-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

    let editClosed = false;

    const finish = (save, fillForward = false) => {
      if (editClosed) return;
      editClosed = true;
      if (save) {
        const parsed = parseSalaryPlanAmountInputWithFillForward(
          input.value,
          fillForward,
          rawValue,
        );
        const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
        const next = fillForward
          ? applyAmountFromMonthForwardSkippingPast(
            plan,
            fiscalMonths,
            month,
            parsed,
            pastMonths,
          )
          : { ...plan, [month]: parsed };
        persistMonthly(account, next, fiscalPeriod);
      }
      renderOverrideSection();
    };

    input.addEventListener('keydown', (e) => {
      handlePlanAmountCellKeydown(e, {
        finish,
        td,
        scopeId: \`expense-override-\${fiscalPeriod}\`,
      });
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!editClosed) finish(true, false);
      }, 0);
    });

    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
  }

  function appendAmountCell(tr, { account, month, fiscalPeriod, value, prevValue, editable }) {
    const td = document.createElement('td');
    td.className = 'salary-plan-amount-cell';
    if (month === fiscalMonths[0]) {
      td.classList.add('salary-plan-amount-start-month');
    } else if (prevValue !== undefined && salaryPlanAmountDiffersFromPrevious(prevValue, value)) {
      td.classList.add('salary-plan-amount-changed');
    }
    if (editable) {
      td.classList.add('salary-plan-cell-editable');
      tagPlanEditableCell(td, { month });
      td.title = ${JSON.stringify(jp(0x30c0, 0x30d6, 0x30eb, 0x30af, 0x30ea, 0x30c3, 0x30af, 0x3067, 0x7de8, 0x96c6, 0xFF08, 0x53, 0x68, 0x69, 0x66, 0x74, 0x2b, 0x45, 0x6e, 0x74, 0x65, 0x72, 0x20, 0x3067, 0x5f8c, 0x7d99, 0x6708, 0x3078, 0x540c, 0x984d, 0x53cd, 0x6620, 0xFF09))};
      td.textContent = formatSalaryPlanYen(value);
      td.addEventListener('dblclick', () => {
        startCellEdit(td, account, month, fiscalPeriod);
      });
    } else {
      td.classList.add('salary-plan-cell-disabled');
      td.textContent = formatSalaryPlanYen(value);
    }
    tr.appendChild(td);
  }

  function buildOverrideTable(fiscalPeriod) {
    const accounts = getExpenseOverrideAccounts(expensePlanOverrides, fiscalPeriod);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table expense-plan-override-table';

    const headerLabels = [${JSON.stringify(jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee))}, ...fiscalMonths, ${JSON.stringify(jp(0x5408, 0x8a08))}, ''];
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      th.textContent = label;
      if (label === ${JSON.stringify(jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee))}) th.className = 'salary-plan-col-name';
      else if (label === ${JSON.stringify(jp(0x5408, 0x8a08))}) th.className = 'salary-plan-col-total';
      else if (label === '') th.className = 'expense-plan-override-col-actions';
      else th.className = 'salary-plan-col-month';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (accounts.length === 0) {
      const emptyTr = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = headerLabels.length;
      emptyTd.className = 'expense-plan-override-empty';
      emptyTd.textContent = ${JSON.stringify(jp(0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x3059, 0x308b, 0x79d1, 0x76ee, 0x304c, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093, 0x3002, 0x4e0b, 0x306e, 0x30d7, 0x30eb, 0x30c0, 0x30a6, 0x30f3, 0x304b, 0x3089, 0x8ffd, 0x52a0, 0x3057, 0x3066, 0x304f, 0x3060, 0x3055, 0x3044, 0x3002))};
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
    }

    for (const account of accounts) {
      const displayMonthly = getExpenseOverrideMonthly(
        expensePlanOverrides,
        fiscalPeriod,
        account,
        fiscalMonths,
      );
      const tr = document.createElement('tr');
      tr.className = 'salary-plan-row-monthly';
      tagPlanEditableRow(tr, account);

      const accountTd = document.createElement('td');
      accountTd.className = 'salary-plan-col-name';
      accountTd.textContent = account;
      tr.appendChild(accountTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        appendAmountCell(tr, {
          account,
          month,
          fiscalPeriod,
          value: displayMonthly[month],
          prevValue,
          editable,
        });
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly, fiscalMonths));
      tr.appendChild(totalTd);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'expense-plan-override-col-actions';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'settings-delete-btn';
      removeBtn.textContent = ${JSON.stringify(jp(0x524a, 0x9664))};
      removeBtn.title = ${JSON.stringify(jp(0x3053, 0x306e, 0x79d1, 0x76ee, 0x306e, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x3092, 0x89e3, 0x9664))};
      removeBtn.addEventListener('click', () => {
        expensePlanOverrides = removeExpenseOverrideAccount(
          expensePlanOverrides,
          fiscalPeriod,
          account,
        );
        setExpensePlanOverrides(expensePlanOverrides);
        refreshPlanTableIfNeeded();
        renderOverrideSection();
      });
      actionsTd.appendChild(removeBtn);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
  }

  function renderAddRow(fiscalPeriod, block) {
    const accounts = getExpenseOverrideAccounts(expensePlanOverrides, fiscalPeriod);
    const candidates = collectExpenseOverrideAccountCandidates(rawPlanData, accounts);
    const addRow = document.createElement('div');
    addRow.className = 'expense-plan-override-add-row';

    const select = document.createElement('select');
    select.className = 'app-settings-input expense-plan-override-select';
    select.setAttribute('aria-label', ${JSON.stringify(jp(0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x3059, 0x308b, 0x8af8, 0x7d4c, 0x52d8, 0x5b9a, 0x79d1, 0x76ee))});

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = candidates.length > 0
      ? ${JSON.stringify(jp(0x79d1, 0x76ee, 0x3092, 0x9078, 0x629e, 0x2026))}
      : ${JSON.stringify(jp(0x8ffd, 0x52a0, 0x3067, 0x304d, 0x308b, 0x79d1, 0x76ee, 0x304c, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093))};
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    for (const account of candidates) {
      const opt = document.createElement('option');
      opt.value = account;
      opt.textContent = account;
      select.appendChild(opt);
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'expense-plan-override-add-btn';
    addBtn.textContent = ${JSON.stringify(jp(0x8ffd, 0x52a0))};
    addBtn.disabled = candidates.length === 0;
    addBtn.addEventListener('click', () => {
      const account = select.value;
      if (!account) return;
      expensePlanOverrides = addExpenseOverrideAccount(
        expensePlanOverrides,
        fiscalPeriod,
        account,
        fiscalMonths,
      );
      setExpensePlanOverrides(expensePlanOverrides);
      refreshPlanTableIfNeeded();
      renderOverrideSection();
    });

    addRow.appendChild(select);
    addRow.appendChild(addBtn);
    block.appendChild(addRow);
  }

  function renderOverrideSection() {
    wrap.querySelector(\`.\${SECTION_CLASS}\`)?.remove();

    const section = document.createElement('div');
    section.className = \`salary-plan-section \${SECTION_CLASS}\`;

    const planHeader = document.createElement('div');
    planHeader.className = 'salary-plan-header salary-plan-header-spaced';
    planHeader.innerHTML = \`
      <h3 class="salary-plan-title">${jp(0x8af8, 0x7d4c, 0x8a08, 0x753b, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9)}</h3>
      <p class="salary-plan-desc">
        ${jp(0x81ea, 0x52d5, 0x88dc, 0x5b8c, 0xFF08, 0x53c2, 0x7167, 0x671f, 0x306e, 0x5e73, 0x5747, 0xFF09, 0x3092, 0x4e0a, 0x66f8, 0x304d, 0x3059, 0x308b, 0x8af8, 0x7d4c, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x3092, 0x6307, 0x5b9a, 0x3057, 0x307e, 0x3059, 0x3002, 0x30aa, 0x30fc, 0x30d0, 0x30fc, 0x30e9, 0x30a4, 0x30c9, 0x3057, 0x305f, 0x79d1, 0x76ee, 0x306f, 0x5e73, 0x5747, 0x88dc, 0x5b8c, 0x306e, 0x5bfe, 0x8c61, 0x5916, 0x3068, 0x306a, 0x308a, 0x3001, 0x5165, 0x529b, 0x3057, 0x305f, 0x6708, 0x6b21, 0x306e, 0x8a08, 0x753b, 0x5024, 0x304c, 0x4f7f, 0x308f, 0x308c, 0x307e, 0x3059, 0xFF08, 0x7a7a, 0x6b04, 0x306f, 0x88dc, 0x5b8c, 0x3057, 0x307e, 0x305b, 0x3093, 0xFF09, 0x3002, 0x4eca, 0x671f, 0x30fb, 0x6765, 0x671f, 0x306e, 0x307f, 0x8a2d, 0x5b9a, 0x3067, 0x304d, 0x307e, 0x3059, 0x3002, 0x4eca, 0x671f, 0x306e, 0x5b9f, 0x7e3e, 0x8868, 0x793a, 0x6708, 0x306f, 0x7de8, 0x96c6, 0x3067, 0x304d, 0x307e, 0x305b, 0x3093, 0x3002, 0x4e88, 0x5b9f, 0x8868, 0x3067, 0x8a08, 0x753b, 0x8868, 0x793a, 0x306b, 0x5207, 0x308a, 0x66ff, 0x3048, 0x305f, 0x6708, 0x306f, 0x7de8, 0x96c6, 0x3067, 0x304d, 0x307e, 0x3059, 0x3002, 0x307e, 0x305f, 0x5165, 0x529b, 0x3057, 0x305f, 0x5024, 0x306f, 0x4e88, 0x5b9f, 0x8868, 0x306b, 0x3082, 0x53cd, 0x3057, 0x307e, 0x3059, 0x3002)}
      </p>
    \`;
    section.appendChild(planHeader);

    for (const { period, label } of periodEntries) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = \`\${label}\uff08\${formatFiscalPeriodLabel(period)}\uff09\`;
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildOverrideTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, \`expense-override-\${period}\`);

      renderAddRow(period, block);
      section.appendChild(block);
    }

    wrap.appendChild(section);
  }

  renderOverrideSection();

  return {
    rerender: renderOverrideSection,
  };
}
`;

writeFileSync(configPath, configContent, { encoding: 'utf8' });
writeFileSync(uiPath, uiContent, { encoding: 'utf8' });
console.log('Wrote expense plan override files');
