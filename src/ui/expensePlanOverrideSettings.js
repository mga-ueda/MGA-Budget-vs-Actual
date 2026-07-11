import {
  parseSalaryPlanAmountInput,
  formatSalaryPlanYen,
  buildFiscalYearMonths,
  applyAmountFromMonthForwardSkippingPast,
} from '../config/salaryPlanConfig.js';
import { DEFAULT_FISCAL_END_MONTH } from '../config/fiscalCalendar.js';
import {
  buildExpensePlanOverridePeriodEntries,
  getExpenseOverrideAccounts,
  getExpenseOverrideMonthly,
  setExpenseOverrideMonthly,
  addExpenseOverrideAccount,
  removeExpenseOverrideAccount,
  collectExpenseOverrideAccountCandidates,
} from '../config/expensePlanOverrideConfig.js';
import { getSettingsLockedMonths } from '../config/monthDisplayConfig.js';
import {
  resumePlanCellTabEdit,
  tagPlanEditableRow,
} from '../config/planCellEdit.js';
import { applySectionFilterTitleStyle } from './planSettingsTableUi.js';
import {
  TIP_EDIT_AMOUNT_SHIFT_FILL,
  TIP_EXPENSE_OVERRIDE_REMOVE,
  TIP_EXPENSE_OVERRIDE_ADD,
  TIP_EXPENSE_OVERRIDE_SELECT,
} from '../config/uiTooltipConfig.js';

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
  onToggleMonthDisplay,
  monthDisplayUi,
  startNumericCellEdit,
  getSectionFilterColors,
  refreshPlanSettingsColumnPlates,
}) {
  const fiscalEndMonth = rawPlanData?.fiscalEndMonth ?? DEFAULT_FISCAL_END_MONTH;
  const fiscalMonths = buildFiscalYearMonths(fiscalEndMonth);
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

  function appendAmountCell(tr, { account, month, monthIndex, fiscalPeriod, value, prevValue, editable }) {
    const plan = getExpenseOverrideMonthly(expensePlanOverrides, fiscalPeriod, account, fiscalMonths);
    const td = document.createElement('td');
    tr.appendChild(td);
    monthDisplayUi.setPlanAmountCellContent(td, {
      month,
      monthIndex,
      value,
      prevValue,
      editable,
      fiscalPeriod,
      title: TIP_EDIT_AMOUNT_SHIFT_FILL,
      formatValue: formatSalaryPlanYen,
      rawValue: plan[month],
      parseValue: parseSalaryPlanAmountInput,
      allowShiftFillForward: true,
      tabScopeId: `expense-override-${fiscalPeriod}`,
      onSave: (parsed, fillForward) => {
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
      },
      onEditClose: () => renderOverrideSection(),
    }, startNumericCellEdit);
  }

  function syncExpenseOverrideTableMonthDisplay(table, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) return;

    table.querySelectorAll('thead th.salary-plan-col-month').forEach((th, i) => {
      const month = fiscalMonths[i];
      if (month) monthDisplayUi.updateMonthHeaderTh(th, month, fiscalPeriod);
    });

    for (const account of getExpenseOverrideAccounts(expensePlanOverrides, fiscalPeriod)) {
      const tr = table.querySelector(`tbody tr[data-plan-row-key="${CSS.escape(account)}"]`);
      if (!tr) continue;
      const displayMonthly = getExpenseOverrideMonthly(
        expensePlanOverrides,
        fiscalPeriod,
        account,
        fiscalMonths,
      );
      const amountCells = tr.querySelectorAll('td.salary-plan-amount-cell');
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const td = amountCells[i];
        if (!td) continue;
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        const plan = getExpenseOverrideMonthly(expensePlanOverrides, fiscalPeriod, account, fiscalMonths);
        monthDisplayUi.setPlanAmountCellContent(td, {
          month,
          monthIndex: i,
          value: displayMonthly[month],
          prevValue,
          editable: isMonthEditable(fiscalPeriod, month),
          fiscalPeriod,
          title: TIP_EDIT_AMOUNT_SHIFT_FILL,
          formatValue: formatSalaryPlanYen,
          rawValue: plan[month],
          parseValue: parseSalaryPlanAmountInput,
          allowShiftFillForward: true,
          tabScopeId: `expense-override-${fiscalPeriod}`,
          onSave: (parsed, fillForward) => {
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
          },
          onEditClose: () => renderOverrideSection(),
        }, startNumericCellEdit);
      }
      const totalTd = tr.querySelector('td.salary-plan-col-total');
      if (totalTd) {
        totalTd.textContent = formatSalaryPlanYen(sumDisplayMonthlyTotal(displayMonthly, fiscalMonths));
      }
    }
  }

  function buildOverrideTable(fiscalPeriod) {
    const accounts = getExpenseOverrideAccounts(expensePlanOverrides, fiscalPeriod);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table expense-plan-override-table tax-payment-plan-table';
    table.dataset.fiscalPeriod = String(fiscalPeriod);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const accountTh = document.createElement('th');
    accountTh.className = 'salary-plan-col-name';
    accountTh.textContent = '勘定科目';
    headerRow.appendChild(accountTh);

    for (const month of fiscalMonths) {
      const th = document.createElement('th');
      monthDisplayUi.configureMonthHeaderTh(th, month, fiscalPeriod);
      headerRow.appendChild(th);
    }

    const totalTh = document.createElement('th');
    totalTh.className = 'salary-plan-col-total';
    totalTh.textContent = '合計';
    headerRow.appendChild(totalTh);

    const actionsTh = document.createElement('th');
    actionsTh.className = 'expense-plan-override-col-actions';
    headerRow.appendChild(actionsTh);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (accounts.length === 0) {
      const emptyTr = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = fiscalMonths.length + 3;
      emptyTd.className = 'expense-plan-override-empty';
      emptyTd.textContent = 'オーバーライドする科目がありません。下のプルダウンから追加してください。';
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
      tr.dataset.planRowKey = account;
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
          monthIndex: i,
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
      removeBtn.textContent = '削除';
      removeBtn.title = TIP_EXPENSE_OVERRIDE_REMOVE;
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
    select.setAttribute('aria-label', TIP_EXPENSE_OVERRIDE_SELECT);
    select.title = TIP_EXPENSE_OVERRIDE_SELECT;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = candidates.length > 0
      ? '科目を選択…'
      : '追加できる科目がありません';
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
    addBtn.textContent = '追加';
    addBtn.title = TIP_EXPENSE_OVERRIDE_ADD;
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
    planHeader.className = 'salary-plan-header';
    planHeader.innerHTML = `
      <h3 class="salary-plan-title" data-section-filter="expense">諸経計画オーバーライド</h3>
      <p class="salary-plan-desc">
        自動補完（参照期の平均）を上書きする諸経勘定科目を指定します。オーバーライドした科目は平均補完の対象外となり、入力した月次の計画値が使われます（空欄は補完しません）。今期・来期のみ設定できます。今期の実績表示月は編集できません。予実表で計画表示に切り替えた月は編集できます。また入力した値は予実表にも反します。
      </p>
    `;
    applySectionFilterTitleStyle(
      planHeader.querySelector('.salary-plan-title'),
      'expense',
      getSectionFilterColors,
    );
    section.appendChild(planHeader);

    for (const { period, label } of periodEntries) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = label;
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildOverrideTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `expense-override-${period}`);

      renderAddRow(period, block);
      section.appendChild(block);
    }

    const paymentSection = wrap.querySelector('.tax-payment-plan-section');
    if (paymentSection) {
      paymentSection.insertAdjacentElement('afterend', section);
    } else {
      wrap.appendChild(section);
    }
    refreshPlanSettingsColumnPlates?.();
  }

  renderOverrideSection();

  return {
    rerender: renderOverrideSection,
    syncMonthDisplay: (fiscalPeriod) => {
      wrap.querySelectorAll('table.expense-plan-override-table[data-fiscal-period]').forEach((table) => {
        const period = Number(table.dataset.fiscalPeriod);
        if (period !== fiscalPeriod) return;
        syncExpenseOverrideTableMonthDisplay(table, period);
      });
    },
  };
}
