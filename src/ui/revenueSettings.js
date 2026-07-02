import {
  parseSalaryPlanAmountInput,
  parseSalaryPlanAmountInputWithFillForward,
  formatSalaryPlanYen,
  salaryPlanAmountDiffersFromPrevious,
  buildFiscalYearMonths,
  applyAmountFromMonthForwardSkippingPast,
} from '../config/salaryPlanConfig.js';
import {
  DEFAULT_REVENUE_PLAN_YEARS,
  getRevenuePlanYears,
  setRevenuePlanYears,
  buildRevenuePlanPeriodEntries,
  buildMiscIncomePlanPeriodEntries,
  getPeriodClientEntries,
  setClientEntry,
  removeClientEntry,
  createManualClient,
  mergeClientsFromSubaccounts,
  syncClientListFromReference,
  moveClientEntry,
  renameManualClientEntry,
  computeClientMonthlyRevenue,
  getEffectiveUnitPrice,
  parseManMonthInput,
  formatManMonths,
  MISC_INCOME_ACCOUNT,
  getMiscIncomeMonthly,
  setMiscIncomeMonthly,
} from '../config/revenuePlanConfig.js';
import {
  handlePlanAmountCellKeydown,
  resumePlanCellTabEdit,
  tagPlanEditableCell,
  tagPlanEditableRow,
} from '../config/planCellEdit.js';
import {
  collectRevenueSubaccountsFromPlanData,
  collectRevenueActualAmountsFromPlanData,
} from '../enrich/planRevenueRows.js';
import { buildMonthYearMap, formatFiscalPeriodLabel } from '../config/appSettings.js';
import { getSettingsLockedMonths } from '../config/monthDisplayConfig.js';

const REVENUE_ACCOUNT = '売上高';
const ROW_MAN_MONTHS = '人月';
const ROW_UNIT_PRICE = '人月単価';
const ROW_REVENUE = '売上';

function cloneMonthly(source, fiscalMonths) {
  const next = {};
  for (const month of fiscalMonths) next[month] = source?.[month] ?? null;
  return next;
}

function applyManMonthsFromMonthForward(source, startMonth, amount, pastMonths, fiscalMonths) {
  const next = cloneMonthly(source, fiscalMonths);
  const startIndex = fiscalMonths.indexOf(startMonth);
  if (startIndex < 0) return next;
  next[startMonth] = amount;
  for (let i = startIndex + 1; i < fiscalMonths.length; i += 1) {
    const month = fiscalMonths[i];
    if (pastMonths.has(month)) continue;
    next[month] = amount;
  }
  return next;
}

function sumMonthlyMap(map, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) total += map[month] ?? 0;
  return total;
}

function sumManMonths(map, fiscalMonths) {
  let total = 0;
  for (const month of fiscalMonths) total += map[month] ?? 0;
  return total;
}

function setMonthlyUnitPrice(client, month, price, fiscalMonths) {
  const monthlyUnitPrice = cloneMonthly(client.monthlyUnitPrice, fiscalMonths);
  monthlyUnitPrice[month] = price;
  return monthlyUnitPrice;
}

export function mountRevenueSettingsPanel({
  replaceRootPanel,
  setPlanKpi,
  appSettings,
  rawPlanData,
  getRevenuePlans,
  setRevenuePlans,
  getRevenuePlanSettings,
  setRevenuePlanSettings,
  refreshPlanTableIfNeeded,
  getMonthDisplayConfig,
}) {
  setPlanKpi(null);

  const fiscalMonths = buildFiscalYearMonths(appSettings.fiscalEndMonth);
  const currentPeriod = appSettings.fiscalPeriod;

  let revenuePlans = getRevenuePlans();
  let revenuePlanSettings = getRevenuePlanSettings();

  const planPeriodEntries = () => buildRevenuePlanPeriodEntries(
    currentPeriod,
    getRevenuePlanYears(revenuePlanSettings),
  );

  if (rawPlanData) {
    const subaccounts = collectRevenueSubaccountsFromPlanData(rawPlanData);
    revenuePlans = mergeClientsFromSubaccounts(
      revenuePlans,
      currentPeriod,
      subaccounts,
      fiscalMonths,
    );
    setRevenuePlans(revenuePlans);
  }
  for (const { period } of planPeriodEntries()) {
    if (period === currentPeriod) continue;
    revenuePlans = syncClientListFromReference(
      revenuePlans,
      period,
      currentPeriod,
      fiscalMonths,
    );
  }
  setRevenuePlans(revenuePlans);

  const actualAmountsByClient = rawPlanData
    ? collectRevenueActualAmountsFromPlanData(rawPlanData, fiscalMonths)
    : new Map();

  const journalClientKeys = new Set();
  if (rawPlanData) {
    for (const { accountLabel, subLabel } of collectRevenueSubaccountsFromPlanData(rawPlanData)) {
      const account = String(accountLabel ?? '').trim();
      const sub = String(subLabel ?? '').trim();
      if (!account || !sub) continue;
      journalClientKeys.add(`${account}\x00${sub}`);
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'expand-settings-wrap revenue-settings-wrap';

  const header = document.createElement('div');
  header.className = 'expand-settings-header tax-payment-settings-header';
  header.innerHTML = `
    <p class="expand-settings-desc">
      売上高の受注計画を人月で入力します。受注先ごとに月ごとの人月単価を入力します。売上は実績月は仕訳CSVの実績、それ以外は人月\u00d7単価の計画（消費税込）です。人月は Shift+Enter で入力月以降に同値を引き継ぎます（0 も可）。Enter はその月のみ反映します。今期の実績月は仕訳実績月として編集不可です。設定はブラウザに保存され、予実表の「売上高」に反映されます。
    </p>
    <div class="tax-payment-settings-controls">
      <div class="tax-payment-plan-years-row">
        <span class="app-settings-label">計画年数</span>
        <p class="tax-payment-plan-years-hint">今期を含む年数です。デフォルトは ${DEFAULT_REVENUE_PLAN_YEARS} 年です。</p>
        <input
          type="number"
          class="app-settings-input tax-payment-plan-years-input"
          id="revenue-plan-years-input"
          min="1"
          max="30"
          step="1"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          aria-label="計画年数"
        />
      </div>
    </div>
  `;
  wrap.appendChild(header);

  const planYearsInput = header.querySelector('#revenue-plan-years-input');
  planYearsInput.value = String(getRevenuePlanYears(revenuePlanSettings));
  planYearsInput.addEventListener('change', () => {
    revenuePlanSettings = setRevenuePlanYears(revenuePlanSettings, planYearsInput.value);
    setRevenuePlanSettings(revenuePlanSettings);
    planYearsInput.value = String(getRevenuePlanYears(revenuePlanSettings));
    renderPlanSection();
  });
  planYearsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      planYearsInput.blur();
    }
  });

  const statusEl = document.createElement('p');
  statusEl.className = 'employee-status-msg';
  statusEl.hidden = true;
  wrap.appendChild(statusEl);

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
    statusEl.classList.toggle('employee-status-error', isError);
  }

  function persistClient(entry, fiscalPeriod) {
    revenuePlans = setClientEntry(revenuePlans, fiscalPeriod, entry, fiscalMonths);
    setRevenuePlans(revenuePlans);
    refreshPlanTableIfNeeded();
  }

  function getClientsForPeriod(fiscalPeriod) {
    return getPeriodClientEntries(revenuePlans, fiscalPeriod, fiscalMonths);
  }

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

  function getClientActualMonthly(client) {
    return actualAmountsByClient.get(`${client.accountLabel}\x00${client.subLabel}`) ?? {};
  }

  function getRevenueTaxOptions(fiscalPeriod) {
    if (!appSettings.consumptionTaxRates) return null;
    return {
      consumptionTaxRates: appSettings.consumptionTaxRates,
      monthYearMap: buildMonthYearMap(appSettings.businessStartYear, fiscalPeriod),
      fiscalEndMonth: appSettings.fiscalEndMonth,
    };
  }

  function buildPlannedRevenueMonthly(client, fiscalPeriod) {
    return computeClientMonthlyRevenue(client, fiscalMonths, getRevenueTaxOptions(fiscalPeriod));
  }

  function buildCsvRevenueMonthly(client, fiscalPeriod) {
    if (fiscalPeriod !== currentPeriod) {
      const empty = {};
      for (const month of fiscalMonths) empty[month] = null;
      return empty;
    }
    const actualMonthly = getClientActualMonthly(client);
    const display = {};
    for (const month of fiscalMonths) {
      display[month] = actualMonthly[month] ?? null;
    }
    return display;
  }

  function buildDisplayRevenueMonthly(client, fiscalPeriod) {
    const planned = buildPlannedRevenueMonthly(client, fiscalPeriod);
    const actual = buildCsvRevenueMonthly(client, fiscalPeriod);
    const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
    const display = {};
    for (const month of fiscalMonths) {
      if (pastMonths.has(month) && actual[month] != null && actual[month] !== 0) {
        display[month] = actual[month];
      } else {
        display[month] = planned[month] ?? null;
      }
    }
    return display;
  }

  function startNumericCellEdit(td, {
    rawValue,
    editable,
    formatValue,
    parseValue,
    onSave,
    allowShiftFillForward = false,
    tabScopeId,
  }) {
    if (!editable) return;
    if (td.querySelector('input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'salary-plan-amount-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = rawValue != null && rawValue !== 0 ? String(rawValue) : '';

    let editClosed = false;

    const finish = (save, fillForward = false) => {
      if (editClosed) return;
      editClosed = true;
      if (save) {
        const parsed = allowShiftFillForward && fillForward
          ? parseSalaryPlanAmountInputWithFillForward(input.value, true, rawValue)
          : parseValue(input.value);
        onSave(parsed, allowShiftFillForward && fillForward);
      }
      renderPlanSection();
    };

    input.addEventListener('keydown', (e) => {
      handlePlanAmountCellKeydown(e, {
        finish,
        td,
        scopeId: tabScopeId,
        allowShiftFillForward,
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

  function applyPlanAmountVarianceClass(td, monthIndex, value, prevValue) {
    if (monthIndex === 0) {
      td.classList.add('salary-plan-amount-start-month');
    } else if (prevValue !== undefined && salaryPlanAmountDiffersFromPrevious(prevValue, value)) {
      td.classList.add('salary-plan-amount-changed');
    }
  }

  function appendPlanAmountCell(tr, {
    month,
    monthIndex,
    value,
    prevValue,
    editable,
    title,
    formatValue,
    rawValue,
    parseValue,
    onSave,
    extraClass = '',
    allowShiftFillForward = false,
    tabScopeId,
  }) {
    const td = document.createElement('td');
    td.className = `salary-plan-amount-cell ${extraClass}`.trim();
    applyPlanAmountVarianceClass(td, monthIndex, value, prevValue);
    if (editable) {
      td.classList.add('salary-plan-cell-editable');
      tagPlanEditableCell(td, { month });
      td.title = title;
      td.textContent = formatValue(value);
      td.addEventListener('dblclick', () => {
        startNumericCellEdit(td, {
          rawValue,
          editable,
          formatValue,
          parseValue,
          onSave,
          allowShiftFillForward,
          tabScopeId,
        });
      });
    } else {
      td.classList.add('salary-plan-cell-disabled');
      td.textContent = formatValue(value);
    }
    tr.appendChild(td);
  }

  function canDeleteClient(client) {
    if (client.manual) return true;
    const key = `${client.accountLabel}\x00${client.subLabel}`;
    return !journalClientKeys.has(key);
  }

  function deleteClient(client, fiscalPeriod) {
    revenuePlans = removeClientEntry(revenuePlans, fiscalPeriod, client.id, fiscalMonths);
    setRevenuePlans(revenuePlans);
    showStatus(`${client.subLabel} を削除しました。`);
    renderPlanSection();
    refreshPlanTableIfNeeded();
  }

  function moveClient(client, fiscalPeriod, direction) {
    revenuePlans = moveClientEntry(
      revenuePlans,
      fiscalPeriod,
      client.id,
      direction,
      fiscalMonths,
    );
    setRevenuePlans(revenuePlans);
    renderPlanSection();
  }

  function buildClientOrderWrap(client, fiscalPeriod, clientIndex, clientCount) {
    const orderWrap = document.createElement('div');
    orderWrap.className = 'revenue-client-order-wrap';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'revenue-client-order-btn';
    upBtn.textContent = '\u2191';
    upBtn.title = '上に移動';
    upBtn.disabled = clientIndex <= 0;
    upBtn.addEventListener('click', () => moveClient(client, fiscalPeriod, -1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'revenue-client-order-btn';
    downBtn.textContent = '\u2193';
    downBtn.title = '下に移動';
    downBtn.disabled = clientIndex >= clientCount - 1;
    downBtn.addEventListener('click', () => moveClient(client, fiscalPeriod, 1));

    orderWrap.append(upBtn, downBtn);
    return orderWrap;
  }

  function appendClientActionsCell(tr, client, fiscalPeriod, clientIndex, clientCount, rowSpan = 1) {
    const td = document.createElement('td');
    td.className = 'col-out-actions';
    if (rowSpan > 1) td.rowSpan = rowSpan;

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'employee-actions-wrap revenue-client-actions-wrap';

    function buildDefaultActions() {
      actionsWrap.replaceChildren();
      actionsWrap.classList.remove('employee-actions-confirm');

      if (canDeleteClient(client)) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'settings-delete-btn';
        deleteBtn.textContent = '削除';
        deleteBtn.addEventListener('click', () => {
          actionsWrap.replaceChildren();
          actionsWrap.classList.add('employee-actions-confirm');

          const prompt = document.createElement('span');
          prompt.className = 'employee-delete-prompt';
          prompt.textContent = '削除しますか？';

          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'settings-delete-btn';
          confirmBtn.textContent = '削除する';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'settings-delete-cancel-btn';
          cancelBtn.textContent = 'キャンセル';

          confirmBtn.addEventListener('click', () => deleteClient(client, fiscalPeriod));
          cancelBtn.addEventListener('click', buildDefaultActions);

          actionsWrap.append(prompt, confirmBtn, cancelBtn);
        });
        actionsWrap.appendChild(deleteBtn);
      }

      actionsWrap.appendChild(buildClientOrderWrap(client, fiscalPeriod, clientIndex, clientCount));
    }

    buildDefaultActions();
    td.appendChild(actionsWrap);
    tr.appendChild(td);
  }

  function startClientNameEdit(nameLabel, client, fiscalPeriod) {
    if (!client.manual) return;
    if (nameLabel.querySelector('input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'app-settings-input revenue-client-name-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = client.subLabel;

    let editClosed = false;

    const finish = (save) => {
      if (editClosed) return;
      editClosed = true;
      if (save) {
        const nextName = input.value.trim();
        if (!nextName) {
          showStatus('受注先名を入力してください。', true);
          renderPlanSection();
          return;
        }
        if (nextName === client.subLabel) {
          renderPlanSection();
          return;
        }
        const result = renameManualClientEntry(
          revenuePlans,
          fiscalPeriod,
          client.id,
          nextName,
          fiscalMonths,
        );
        if (!result.ok) {
          if (result.reason === 'duplicate') {
            showStatus('同じ受注先名が既に登録されています。', true);
          } else {
            showStatus('受注先名の変更に失敗しました。', true);
          }
          renderPlanSection();
          return;
        }
        revenuePlans = result.plans;
        setRevenuePlans(revenuePlans);
        showStatus(`受注先名を「${nextName}」に変更しました。`);
        refreshPlanTableIfNeeded();
      }
      renderPlanSection();
    };

    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        finish(true);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!editClosed) finish(true);
      }, 0);
    });

    nameLabel.replaceChildren(input);
    input.focus();
    input.select();
  }

  function appendClientNameCell(tr, client, fiscalPeriod, rowSpan) {
    const nameTd = document.createElement('td');
    nameTd.className = 'salary-plan-col-name revenue-plan-col-client';
    nameTd.rowSpan = rowSpan;

    const nameLabel = document.createElement('span');
    nameLabel.className = 'revenue-client-name-label';
    nameLabel.textContent = client.subLabel;
    if (client.manual) {
      nameLabel.classList.add('revenue-client-name-editable', 'salary-plan-cell-editable');
      nameLabel.title = 'ダブルクリックで名前を編集';
      nameLabel.addEventListener('dblclick', () => {
        startClientNameEdit(nameLabel, client, fiscalPeriod);
      });
    }

    nameTd.appendChild(nameLabel);
    tr.appendChild(nameTd);
  }

  function appendClientRows(tbody, client, fiscalPeriod, clientIndex, clientCount) {
    const displayRevenue = buildDisplayRevenueMonthly(client, fiscalPeriod);
    const rowKinds = [
      { kind: ROW_UNIT_PRICE, key: 'unitPrice' },
      { kind: ROW_MAN_MONTHS, key: 'manMonths' },
      { kind: ROW_REVENUE, key: 'revenue' },
    ];

    for (let rowIndex = 0; rowIndex < rowKinds.length; rowIndex += 1) {
      const { kind, key } = rowKinds[rowIndex];
      const tr = document.createElement('tr');
      tr.className = `salary-plan-row-monthly revenue-plan-row revenue-plan-row--${key}`;
      tagPlanEditableRow(tr, `${client.id}:${key}`);

      if (rowIndex === 0) {
        appendClientNameCell(tr, client, fiscalPeriod, rowKinds.length);
      }

      const kindTd = document.createElement('td');
      kindTd.className = 'salary-plan-col-sub revenue-plan-col-kind';
      kindTd.textContent = kind;
      tr.appendChild(kindTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;

        if (key === 'manMonths') {
          const prevValue = prevMonth != null ? client.manMonths[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            month,
            monthIndex: i,
            value: client.manMonths[month],
            prevValue,
            editable,
            rawValue: client.manMonths[month],
            tabScopeId: `revenue-settings-${fiscalPeriod}`,
            title: 'ダブルクリックで編集（Shift+Enter で後続月へ同値を反映　0 も可）',
            formatValue: formatManMonths,
            parseValue: parseManMonthInput,
            allowShiftFillForward: true,
            onSave: (parsed, fillForward) => {
              const pastMonths = getPastMonthsForPeriod(fiscalPeriod);
              const nextManMonths = fillForward
                ? applyManMonthsFromMonthForward(
                  client.manMonths,
                  month,
                  parsed,
                  pastMonths,
                  fiscalMonths,
                )
                : { ...cloneMonthly(client.manMonths, fiscalMonths), [month]: parsed };
              persistClient({ ...client, manMonths: nextManMonths }, fiscalPeriod);
            },
          });
        } else if (key === 'unitPrice') {
          const unitPrice = getEffectiveUnitPrice(client, month);
          const prevUnitPrice = prevMonth != null
            ? getEffectiveUnitPrice(client, prevMonth)
            : undefined;
          appendPlanAmountCell(tr, {
            month,
            monthIndex: i,
            value: unitPrice,
            prevValue: prevUnitPrice,
            editable,
            rawValue: client.monthlyUnitPrice[month],
            tabScopeId: `revenue-settings-${fiscalPeriod}`,
            title: 'ダブルクリックで編集（人月単価）',
            formatValue: formatSalaryPlanYen,
            parseValue: parseSalaryPlanAmountInput,
            onSave: (parsed) => {
              const nextUnitPrices = setMonthlyUnitPrice(client, month, parsed, fiscalMonths);
              persistClient({ ...client, monthlyUnitPrice: nextUnitPrices }, fiscalPeriod);
            },
          });
        } else if (key === 'revenue') {
          const prevDisplay = prevMonth != null ? displayRevenue[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            month,
            monthIndex: i,
            value: displayRevenue[month],
            prevValue: prevDisplay,
            editable: false,
            tabScopeId: `revenue-settings-${fiscalPeriod}`,
            formatValue: formatSalaryPlanYen,
            extraClass: 'revenue-plan-revenue-cell',
          });
        }
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      if (key === 'manMonths') {
        totalTd.textContent = formatManMonths(sumManMonths(client.manMonths, fiscalMonths));
      } else if (key === 'unitPrice') {
        totalTd.textContent = '';
      } else if (key === 'revenue') {
        totalTd.textContent = formatSalaryPlanYen(sumMonthlyMap(displayRevenue, fiscalMonths));
      }
      tr.appendChild(totalTd);

      if (rowIndex === 0) {
        appendClientActionsCell(tr, client, fiscalPeriod, clientIndex, clientCount, rowKinds.length);
      }

      tbody.appendChild(tr);
    }
  }

  function buildRevenuePlanTable(fiscalPeriod) {
    const clients = getClientsForPeriod(fiscalPeriod);
    const table = document.createElement('table');
    table.className = 'expand-settings-table salary-plan-table revenue-plan-table';

    const headerLabels = [
      '受注先',
      '項目',
      ...fiscalMonths,
      '合計',
      '',
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      th.textContent = label;
      if (label === '受注先') th.className = 'salary-plan-col-name revenue-plan-col-client';
      else if (label === '項目') th.className = 'salary-plan-col-sub revenue-plan-col-kind';
      else if (label === '合計') th.className = 'salary-plan-col-total';
      else if (label === '') th.className = 'col-out-actions';
      else th.className = 'salary-plan-col-month';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (clients.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = headerLabels.length;
      emptyTd.className = 'expand-settings-empty';
      emptyTd.textContent = '受注先が登録されていません。今期の仕訳に補助科目がある場合は自動追加されます。手動追加も可能です。';
      emptyRow.appendChild(emptyTd);
      tbody.appendChild(emptyRow);
      table.appendChild(tbody);
      return table;
    }

    for (let i = 0; i < clients.length; i += 1) {
      appendClientRows(tbody, clients[i], fiscalPeriod, i, clients.length);
    }

    const manMonthMonthlyTotals = {};
    const displayMonthlyTotals = {};
    for (const month of fiscalMonths) {
      manMonthMonthlyTotals[month] = 0;
      displayMonthlyTotals[month] = 0;
    }
    for (const client of clients) {
      const displayRevenue = buildDisplayRevenueMonthly(client, fiscalPeriod);
      for (const month of fiscalMonths) {
        manMonthMonthlyTotals[month] += client.manMonths[month] ?? 0;
        displayMonthlyTotals[month] = (displayMonthlyTotals[month] ?? 0) + (displayRevenue[month] ?? 0);
      }
    }

    const trManMonthTotal = document.createElement('tr');
    trManMonthTotal.className = 'salary-plan-total-row salary-plan-row-monthly revenue-plan-total-row revenue-plan-total-row--manMonths';
    const manMonthTotalLabel = document.createElement('td');
    manMonthTotalLabel.colSpan = 2;
    manMonthTotalLabel.className = 'salary-plan-total-label';
    manMonthTotalLabel.textContent = '合計（人月）';
    trManMonthTotal.appendChild(manMonthTotalLabel);

    let manMonthGrand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const td = document.createElement('td');
      td.className = 'salary-plan-amount-cell';
      const val = manMonthMonthlyTotals[month] ?? 0;
      const prevVal = i > 0 ? (manMonthMonthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
      manMonthGrand += val;
      applyPlanAmountVarianceClass(td, i, val, prevVal);
      td.textContent = formatManMonths(val);
      trManMonthTotal.appendChild(td);
    }

    const manMonthGrandTd = document.createElement('td');
    manMonthGrandTd.className = 'salary-plan-col-total';
    manMonthGrandTd.textContent = formatManMonths(manMonthGrand);
    trManMonthTotal.appendChild(manMonthGrandTd);

    const manMonthActionsTd = document.createElement('td');
    manMonthActionsTd.className = 'col-out-actions';
    trManMonthTotal.appendChild(manMonthActionsTd);
    tbody.appendChild(trManMonthTotal);

    const trTotal = document.createElement('tr');
    trTotal.className = 'salary-plan-total-row salary-plan-row-monthly revenue-plan-total-row revenue-plan-total-row--revenue';
    const totalLabel = document.createElement('td');
    totalLabel.colSpan = 2;
    totalLabel.className = 'salary-plan-total-label';
    totalLabel.textContent = '合計（売上）';
    trTotal.appendChild(totalLabel);

    let grand = 0;
    for (let i = 0; i < fiscalMonths.length; i += 1) {
      const month = fiscalMonths[i];
      const td = document.createElement('td');
      td.className = 'salary-plan-amount-cell';
      const val = displayMonthlyTotals[month] ?? 0;
      const prevVal = i > 0 ? (displayMonthlyTotals[fiscalMonths[i - 1]] ?? 0) : undefined;
      grand += val;
      applyPlanAmountVarianceClass(td, i, val, prevVal);
      td.textContent = formatSalaryPlanYen(val);
      trTotal.appendChild(td);
    }

    const grandTd = document.createElement('td');
    grandTd.className = 'salary-plan-col-total';
    grandTd.textContent = formatSalaryPlanYen(grand);
    trTotal.appendChild(grandTd);

    const actionsTd = document.createElement('td');
    actionsTd.className = 'col-out-actions';
    trTotal.appendChild(actionsTd);

    tbody.appendChild(trTotal);
    table.appendChild(tbody);
    return table;
  }

  function buildPeriodAddForm(fiscalPeriod) {
    const form = document.createElement('div');
    form.className = 'employee-add-form outsourcing-add-form outsourcing-period-add-form revenue-period-add-form';

    const row = document.createElement('div');
    row.className = 'outsourcing-add-form-row';

    const label = document.createElement('span');
    label.className = 'outsourcing-add-label';
    label.textContent = '受注先名';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'app-settings-input outsourcing-add-input';
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'plan-csv-btn';
    submitBtn.textContent = '追加';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'expand-reset-btn';
    cancelBtn.textContent = 'キャンセル';

    cancelBtn.addEventListener('click', () => {
      nameInput.value = '';
      nameInput.focus();
    });

    submitBtn.addEventListener('click', () => {
      const subLabel = nameInput.value.trim();
      if (!subLabel) {
        showStatus('受注先名を入力してください。', true);
        nameInput.focus();
        return;
      }
      const client = createManualClient({
        accountLabel: REVENUE_ACCOUNT,
        subLabel,
      });
      if (!client) {
        showStatus('受注先の追加に失敗しました。', true);
        return;
      }
      const existing = getClientsForPeriod(fiscalPeriod).some(
        (v) => v.accountLabel === client.accountLabel && v.subLabel === client.subLabel,
      );
      if (existing) {
        showStatus('同じ補助科目が既に登録されています。', true);
        nameInput.focus();
        return;
      }
      revenuePlans = setClientEntry(revenuePlans, fiscalPeriod, client, fiscalMonths);
      setRevenuePlans(revenuePlans);
      nameInput.value = '';
      const periodEntry = planPeriodEntries().find((e) => e.period === fiscalPeriod);
      const periodLabel = periodEntry?.label ?? formatFiscalPeriodLabel(fiscalPeriod);
      showStatus(`${periodLabel}に ${subLabel} を追加しました。`);
      renderPlanSection();
      refreshPlanTableIfNeeded();
    });

    row.append(label, nameInput, submitBtn, cancelBtn);
    form.appendChild(row);
    return form;
  }

  function renderPlanSection() {
    let section = wrap.querySelector('.salary-plan-section');
    let periodsContainer = wrap.querySelector('.revenue-plan-periods');

    if (!section) {
      section = document.createElement('div');
      section.className = 'salary-plan-section';

      const planHeader = document.createElement('div');
      planHeader.className = 'salary-plan-header';
      planHeader.innerHTML = `
        <h3 class="salary-plan-title">売上高受注計画表</h3>
        <p class="salary-plan-desc">
          決算月 ${appSettings.fiscalEndMonth}月 を基準とした12か月分です。各受注先は人月・人月単価・売上（自動計算）の3行で表示します。
        </p>
      `;
      section.appendChild(planHeader);

      periodsContainer = document.createElement('div');
      periodsContainer.className = 'revenue-plan-periods outsourcing-plan-periods';
      section.appendChild(periodsContainer);

      wrap.appendChild(section);
    }

    periodsContainer.replaceChildren();

    for (const { period, label } of planPeriodEntries()) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = `${label}${String.fromCodePoint(0xFF08)}${formatFiscalPeriodLabel(period)}${String.fromCodePoint(0xFF09)}`;
      block.appendChild(blockTitle);

      block.appendChild(buildPeriodAddForm(period));

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildRevenuePlanTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `revenue-settings-${period}`);

      periodsContainer.appendChild(block);
    }
  }

  function renderMiscIncomePlanSection() {
    const miscPeriodEntries = buildMiscIncomePlanPeriodEntries(currentPeriod);

    function persistMiscIncomeMonthly(monthly, fiscalPeriod) {
      revenuePlans = setMiscIncomeMonthly(revenuePlans, fiscalPeriod, monthly, fiscalMonths);
      setRevenuePlans(revenuePlans);
      refreshPlanTableIfNeeded();
    }

    function appendMiscIncomeAmountCell(tr, {
      month,
      monthIndex,
      value,
      prevValue,
      editable,
      fiscalPeriod,
      displayMonthly,
    }) {
      const td = document.createElement('td');
      td.className = 'salary-plan-amount-cell';
      applyPlanAmountVarianceClass(td, monthIndex, value, prevValue);
      if (editable) {
        td.classList.add('salary-plan-cell-editable');
        tagPlanEditableCell(td, { month });
        td.title = 'ダブルクリックで編集（Shift+Enter で後続月へ同額を反映）';
        td.textContent = formatSalaryPlanYen(value);
        td.addEventListener('dblclick', () => {
          if (td.querySelector('input')) return;

          const rawValue = displayMonthly[month];
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
                  displayMonthly,
                  fiscalMonths,
                  month,
                  parsed,
                  pastMonths,
                )
                : { ...displayMonthly, [month]: parsed };
              persistMiscIncomeMonthly(next, fiscalPeriod);
            }
            renderMiscIncomePlanSection();
          };

          input.addEventListener('keydown', (e) => {
            handlePlanAmountCellKeydown(e, {
              finish,
              td,
              scopeId: `misc-income-${fiscalPeriod}`,
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
        });
      } else {
        td.classList.add('salary-plan-cell-disabled');
        td.textContent = formatSalaryPlanYen(value);
      }
      tr.appendChild(td);
    }

    function buildMiscIncomeTable(fiscalPeriod) {
      const displayMonthly = getMiscIncomeMonthly(revenuePlans, fiscalPeriod, fiscalMonths);
      const table = document.createElement('table');
      table.className = 'expand-settings-table salary-plan-table misc-income-plan-table';

      const headerLabels = [
        '項目',
        ...fiscalMonths,
        '合計',
      ];

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const label of headerLabels) {
        const th = document.createElement('th');
        th.textContent = label;
        if (label === '項目') th.className = 'salary-plan-col-name';
        else if (label === '合計') th.className = 'salary-plan-col-total';
        else th.className = 'salary-plan-col-month';
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const tr = document.createElement('tr');
      tr.className = 'salary-plan-row-monthly';
      tagPlanEditableRow(tr, `misc-income-${fiscalPeriod}`);

      const accountTd = document.createElement('td');
      accountTd.className = 'salary-plan-col-name';
      accountTd.textContent = MISC_INCOME_ACCOUNT;
      tr.appendChild(accountTd);

      let rowTotal = 0;
      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;
        const prevValue = prevMonth != null ? displayMonthly[prevMonth] : undefined;
        const value = displayMonthly[month];
        rowTotal += value ?? 0;

        appendMiscIncomeAmountCell(tr, {
          month,
          monthIndex: i,
          value,
          prevValue,
          editable,
          fiscalPeriod,
          displayMonthly,
        });
      }

      const totalTd = document.createElement('td');
      totalTd.className = 'salary-plan-col-total';
      totalTd.textContent = formatSalaryPlanYen(rowTotal);
      tr.appendChild(totalTd);

      tbody.appendChild(tr);
      table.appendChild(tbody);
      return table;
    }

    wrap.querySelector('.misc-income-plan-section')?.remove();

    const section = document.createElement('div');
    section.className = 'salary-plan-section misc-income-plan-section';

    const planHeader = document.createElement('div');
    planHeader.className = 'salary-plan-header salary-plan-header-spaced';
    planHeader.innerHTML = `
      <h3 class="salary-plan-title">雑収入計画</h3>
      <p class="salary-plan-desc">
        営業外収益の「雑収入」の月次計画を入力します。今期・来期のみ設定できます。今期の実績表示月は編集できません。設定は予実表の「営業外収益」に反映されます。
      </p>
    `;
    section.appendChild(planHeader);

    const periodsContainer = document.createElement('div');
    periodsContainer.className = 'misc-income-plan-periods outsourcing-plan-periods';

    for (const { period, label } of miscPeriodEntries) {
      const block = document.createElement('div');
      block.className = 'salary-plan-period-block';

      const blockTitle = document.createElement('h4');
      blockTitle.className = 'salary-plan-period-title';
      blockTitle.textContent = `${label}${String.fromCodePoint(0xFF08)}${formatFiscalPeriodLabel(period)}${String.fromCodePoint(0xFF09)}`;
      block.appendChild(blockTitle);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'salary-plan-table-wrap';
      tableWrap.appendChild(buildMiscIncomeTable(period));
      block.appendChild(tableWrap);

      resumePlanCellTabEdit(block, `misc-income-${period}`);
      periodsContainer.appendChild(block);
    }

    section.appendChild(periodsContainer);
    wrap.appendChild(section);
  }

  renderPlanSection();
  renderMiscIncomePlanSection();
  replaceRootPanel(wrap);
}
