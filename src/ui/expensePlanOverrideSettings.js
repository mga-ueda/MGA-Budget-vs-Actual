import {
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

/** 支払い計画タブ内に諸経計画オーバーライドセクションを表示 */
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
        scopeId: `expense-override-${fiscalPeriod}`,
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
      td.title = "ダブルクリックで編集（Shift+Enter で後継月へ同額反映）";
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

    const headerLabels = ["勘定科目", ...fiscalMonths, "合計", ''];
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      th.textContent = label;
      if (label === "勘定科目") th.className = 'salary-plan-col-name';
      else if (label === "合計") th.className = 'salary-plan-col-total';
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
      emptyTd.textContent = "オーバーライドする科目がありません。下のプルダウンから追加してください。";
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
      removeBtn.textContent = "削除";
      removeBtn.title = "この科目のオーバーライドを解除";
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
    select.setAttribute('aria-label', "オーバーライドする諸経勘定科目");

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = candidates.length > 0
      ? "科目を選択…"
      : "追加できる科目がありません";
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
    addBtn.textContent = "追加";
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
    wrap.querySelector(`.${SECTION_CLASS}`)?.remove();

    const section = document.createElement('div');
    section.className = `salary-plan-section ${SECTION_CLASS}`;

    const planHeader = document.createElement('div');
    planHeader.className = 'salary-plan-header salary-plan-header-spaced';
    planHeader.innerHTML = `
      <h3 class="salary-plan-title">諸経計画オーバーライド</h3>
      <p class="salary-plan-desc">
        自動補完（参照期の平均）を上書きする諸経勘定科目を指定します。オーバーライドした科目は平均補完の対象外となり、入力した月次の計画値が使われます（空欄は補完しません）。今期・来期のみ設定できます。今期の実績表示月は編集できません。予実表で計画表示に切り替えた月は編集できます。また入力した値は予実表にも反します。
      </p>
    `;
    section.appendChild(planHeader);

    for (const { period, label } of periodEntries) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = `${label}（${formatFiscalPeriodLabel(period)}）`;
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildOverrideTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `expense-override-${period}`);

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
