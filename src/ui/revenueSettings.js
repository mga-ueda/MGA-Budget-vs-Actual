import {
  parseSalaryPlanAmountInput,
  parseSalaryPlanAmountInputWithFillForward,
  formatSalaryPlanYen,
  salaryPlanAmountDiffersFromPrevious,
  buildFiscalYearMonths,
} from '../config/salaryPlanConfig.js';
import {
  DEFAULT_REVENUE_PLAN_YEARS,
  getRevenuePlanYears,
  setRevenuePlanYears,
  buildRevenuePlanPeriodEntries,
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
} from '../config/revenuePlanConfig.js';
import {
  collectRevenueSubaccountsFromPlanData,
  collectRevenueActualAmountsFromPlanData,
} from '../enrich/planRevenueRows.js';
import { buildPastFiscalMonthSet, buildMonthYearMap, formatFiscalPeriodLabel } from '../config/appSettings.js';

const REVENUE_ACCOUNT = '\u58f2\u4e0a\u9ad8';
const ROW_MAN_MONTHS = '\u4eba\u6708';
const ROW_UNIT_PRICE = '\u4eba\u6708\u5358\u4fa1';
const ROW_REVENUE = '\u58f2\u4e0a';
const COL_DEFAULT_PRICE = '\u65e2\u5b9a\u5358\u4fa1';

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

function isUnitPriceOverride(client, month) {
  return client.monthlyUnitPrice?.[month] != null;
}

function setUnitPriceOverride(client, month, price, fiscalMonths) {
  const monthlyUnitPrice = cloneMonthly(client.monthlyUnitPrice, fiscalMonths);
  if (price == null || price === client.defaultUnitPrice) {
    monthlyUnitPrice[month] = null;
  } else {
    monthlyUnitPrice[month] = price;
  }
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
  const currentPastMonths = buildPastFiscalMonthSet(
    appSettings.businessStartYear,
    currentPeriod,
    fiscalMonths,
  );

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
      \u58f2\u4e0a\u9ad8\u306e\u53d7\u6ce8\u8a08\u753b\u3092\u4eba\u6708\u3067\u5165\u529b\u3057\u307e\u3059\u3002\u53d7\u6ce8\u5148\u3054\u3068\u306b\u4eba\u6708\u5358\u4fa1\uFF08\u65e2\u5b9a\uFF09\u3092\u8a2d\u5b9a\u3067\u304d\u3001\u6708\u306e\u5358\u4fa1\u306f\u500b\u5225\u306b\u4e0a\u66f8\u304d\u3067\u304d\u307e\u3059\u3002\u58f2\u4e0a\u306f\u5b9f\u7e3e\u6708\u306f\u4ed5\u8a33CSV\u306e\u5b9f\u7e3e\u3001\u305d\u308c\u4ee5\u5916\u306f\u4eba\u6708\u00d7\u5358\u4fa1\u306e\u8a08\u753b\uFF08\u6D88\u8CBB\u7A0E\u8FBC\uFF09\u3067\u3059\u3002\u4eba\u6708\u306f Shift+Enter \u3067\u5165\u529b\u6708\u4ee5\u964d\u306b\u540c\u5024\u3092\u5f15\u304d\u7d99\u304e\u307e\u3059\uFF080 \u3082\u53ef\uFF09\u3002Enter \u306f\u305d\u306e\u6708\u306e\u307f\u53cd\u6620\u3057\u307e\u3059\u3002\u4eca\u671f\u306e\u5b9f\u7e3e\u6708\u306f\u4ed5\u8a33\u5b9f\u7e3e\u6708\u3068\u3057\u3066\u7de8\u96c6\u4e0d\u53ef\u3067\u3059\u3002\u8a2d\u5b9a\u306f\u30d6\u30e9\u30a6\u30b6\u306b\u4fdd\u5b58\u3055\u308c\u3001\u4e88\u5b9f\u8868\u306e\u300c\u58f2\u4e0a\u9ad8\u300d\u306b\u53cd\u6620\u3055\u308c\u307e\u3059\u3002
    </p>
    <div class="tax-payment-settings-controls">
      <div class="tax-payment-plan-years-row">
        <span class="app-settings-label">\u8a08\u753b\u5e74\u6570</span>
        <p class="tax-payment-plan-years-hint">\u4eca\u671f\u3092\u542b\u3080\u5e74\u6570\u3067\u3059\u3002\u30c7\u30d5\u30a9\u30eb\u30c8\u306f ${DEFAULT_REVENUE_PLAN_YEARS} \u5e74\u3067\u3059\u3002</p>
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
          aria-label="\u8a08\u753b\u5e74\u6570"
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
    if (fiscalPeriod === currentPeriod) return currentPastMonths;
    return new Set();
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
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        finish(true, e.shiftKey);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
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
  }) {
    const td = document.createElement('td');
    td.className = `salary-plan-amount-cell ${extraClass}`.trim();
    applyPlanAmountVarianceClass(td, monthIndex, value, prevValue);
    if (editable) {
      td.classList.add('salary-plan-cell-editable');
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
    showStatus(`${client.subLabel} \u3092\u524a\u9664\u3057\u307e\u3057\u305f\u3002`);
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
    upBtn.title = '\u4e0a\u306b\u79fb\u52d5';
    upBtn.disabled = clientIndex <= 0;
    upBtn.addEventListener('click', () => moveClient(client, fiscalPeriod, -1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'revenue-client-order-btn';
    downBtn.textContent = '\u2193';
    downBtn.title = '\u4e0b\u306b\u79fb\u52d5';
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
        deleteBtn.className = 'employee-delete-btn';
        deleteBtn.textContent = '\u524a\u9664';
        deleteBtn.addEventListener('click', () => {
          actionsWrap.replaceChildren();
          actionsWrap.classList.add('employee-actions-confirm');

          const prompt = document.createElement('span');
          prompt.className = 'employee-delete-prompt';
          prompt.textContent = '\u524a\u9664\u3057\u307e\u3059\u304b\uff1f';

          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'employee-delete-confirm-btn';
          confirmBtn.textContent = '\u524a\u9664\u3059\u308b';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'employee-delete-cancel-btn';
          cancelBtn.textContent = '\u30ad\u30e3\u30f3\u30bb\u30eb';

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
          showStatus('\u53d7\u6ce8\u5148\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002', true);
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
            showStatus('\u540c\u3058\u53d7\u6ce8\u5148\u540d\u304c\u65e2\u306b\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u3059\u3002', true);
          } else {
            showStatus('\u53d7\u6ce8\u5148\u540d\u306e\u5909\u66f4\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002', true);
          }
          renderPlanSection();
          return;
        }
        revenuePlans = result.plans;
        setRevenuePlans(revenuePlans);
        showStatus(`\u53d7\u6ce8\u5148\u540d\u3092\u300c${nextName}\u300d\u306b\u5909\u66f4\u3057\u307e\u3057\u305f\u3002`);
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
      nameLabel.title = '\u30c0\u30d6\u30eb\u30af\u30ea\u30c3\u30af\u3067\u540d\u524d\u3092\u7de8\u96c6';
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

      if (rowIndex === 0) {
        appendClientNameCell(tr, client, fiscalPeriod, rowKinds.length);
      }

      const kindTd = document.createElement('td');
      kindTd.className = 'salary-plan-col-sub revenue-plan-col-kind';
      kindTd.textContent = kind;
      tr.appendChild(kindTd);

      const defaultTd = document.createElement('td');
      defaultTd.className = 'salary-plan-amount-cell revenue-plan-col-default-price';
      if (key === 'unitPrice') {
        const editable = true;
        defaultTd.classList.add('salary-plan-cell-editable');
        defaultTd.title = '\u30c0\u30d6\u30eb\u30af\u30ea\u30c3\u30af\u3067\u7de8\u96c6';
        defaultTd.textContent = formatSalaryPlanYen(client.defaultUnitPrice);
        defaultTd.addEventListener('dblclick', () => {
          startNumericCellEdit(defaultTd, {
            rawValue: client.defaultUnitPrice,
            editable,
            formatValue: formatSalaryPlanYen,
            parseValue: parseSalaryPlanAmountInput,
            onSave: (parsed) => {
              persistClient({ ...client, defaultUnitPrice: parsed }, fiscalPeriod);
            },
          });
        });
      }
      tr.appendChild(defaultTd);

      for (let i = 0; i < fiscalMonths.length; i += 1) {
        const month = fiscalMonths[i];
        const editable = isMonthEditable(fiscalPeriod, month);
        const prevMonth = i > 0 ? fiscalMonths[i - 1] : null;

        if (key === 'manMonths') {
          const prevValue = prevMonth != null ? client.manMonths[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            monthIndex: i,
            value: client.manMonths[month],
            prevValue,
            editable,
            rawValue: client.manMonths[month],
            title: '\u30c0\u30d6\u30eb\u30af\u30ea\u30c3\u30af\u3067\u7de8\u96c6\uFF08Shift+Enter \u3067\u5f8c\u7d9a\u6708\u3078\u540c\u5024\u3092\u53cd\u6620\u30000 \u3082\u53ef\uFF09',
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
          const effective = getEffectiveUnitPrice(client, month);
          const prevEffective = prevMonth != null
            ? getEffectiveUnitPrice(client, prevMonth)
            : undefined;
          const hasOverride = isUnitPriceOverride(client, month);
          appendPlanAmountCell(tr, {
            monthIndex: i,
            value: effective,
            prevValue: prevEffective,
            editable,
            rawValue: hasOverride ? client.monthlyUnitPrice[month] : client.defaultUnitPrice,
            title: '\u30c0\u30d6\u30eb\u30af\u30ea\u30c3\u30af\u3067\u7de8\u96c6\uFF08\u6708\u5225\u5358\u4fa1\uFF09',
            formatValue: formatSalaryPlanYen,
            parseValue: parseSalaryPlanAmountInput,
            extraClass: hasOverride ? 'revenue-plan-unit-price-override' : '',
            onSave: (parsed) => {
              const nextUnitPrices = setUnitPriceOverride(client, month, parsed, fiscalMonths);
              persistClient({ ...client, monthlyUnitPrice: nextUnitPrices }, fiscalPeriod);
            },
          });
        } else if (key === 'revenue') {
          const prevDisplay = prevMonth != null ? displayRevenue[prevMonth] : undefined;
          appendPlanAmountCell(tr, {
            monthIndex: i,
            value: displayRevenue[month],
            prevValue: prevDisplay,
            editable: false,
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
      '\u53d7\u6ce8\u5148',
      '\u9805\u76ee',
      COL_DEFAULT_PRICE,
      ...fiscalMonths,
      '\u5408\u8a08',
      '',
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of headerLabels) {
      const th = document.createElement('th');
      th.textContent = label;
      if (label === '\u53d7\u6ce8\u5148') th.className = 'salary-plan-col-name revenue-plan-col-client';
      else if (label === '\u9805\u76ee') th.className = 'salary-plan-col-sub revenue-plan-col-kind';
      else if (label === COL_DEFAULT_PRICE) th.className = 'revenue-plan-col-default-price';
      else if (label === '\u5408\u8a08') th.className = 'salary-plan-col-total';
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
      emptyTd.textContent = '\u53d7\u6ce8\u5148\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002\u4eca\u671f\u306e\u4ed5\u8a33\u306b\u88dc\u52a9\u79d1\u76ee\u304c\u3042\u308b\u5834\u5408\u306f\u81ea\u52d5\u8ffd\u52a0\u3055\u308c\u307e\u3059\u3002\u624b\u52d5\u8ffd\u52a0\u3082\u53ef\u80fd\u3067\u3059\u3002';
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
    manMonthTotalLabel.colSpan = 3;
    manMonthTotalLabel.className = 'salary-plan-total-label';
    manMonthTotalLabel.textContent = '\u5408\u8a08\uFF08\u4eba\u6708\uFF09';
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
    totalLabel.colSpan = 3;
    totalLabel.className = 'salary-plan-total-label';
    totalLabel.textContent = '\u5408\u8a08\uFF08\u58f2\u4e0a\uFF09';
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
    label.textContent = '\u53d7\u6ce8\u5148\u540d';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'app-settings-input outsourcing-add-input';
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;

    const priceLabel = document.createElement('span');
    priceLabel.className = 'outsourcing-add-label';
    priceLabel.textContent = '\u65e2\u5b9a\u5358\u4fa1';

    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.inputMode = 'numeric';
    priceInput.className = 'app-settings-input outsourcing-add-input revenue-add-price-input';
    priceInput.autocomplete = 'off';
    priceInput.spellcheck = false;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'plan-csv-btn';
    submitBtn.textContent = '\u8ffd\u52a0';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'expand-reset-btn';
    cancelBtn.textContent = '\u30ad\u30e3\u30f3\u30bb\u30eb';

    cancelBtn.addEventListener('click', () => {
      nameInput.value = '';
      priceInput.value = '';
      nameInput.focus();
    });

    submitBtn.addEventListener('click', () => {
      const subLabel = nameInput.value.trim();
      if (!subLabel) {
        showStatus('\u53d7\u6ce8\u5148\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002', true);
        nameInput.focus();
        return;
      }
      const defaultUnitPrice = parseSalaryPlanAmountInput(priceInput.value);
      const client = createManualClient({
        accountLabel: REVENUE_ACCOUNT,
        subLabel,
        defaultUnitPrice,
      });
      if (!client) {
        showStatus('\u53d7\u6ce8\u5148\u306e\u8ffd\u52a0\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002', true);
        return;
      }
      const existing = getClientsForPeriod(fiscalPeriod).some(
        (v) => v.accountLabel === client.accountLabel && v.subLabel === client.subLabel,
      );
      if (existing) {
        showStatus('\u540c\u3058\u88dc\u52a9\u79d1\u76ee\u304c\u65e2\u306b\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u3059\u3002', true);
        nameInput.focus();
        return;
      }
      revenuePlans = setClientEntry(revenuePlans, fiscalPeriod, client, fiscalMonths);
      setRevenuePlans(revenuePlans);
      nameInput.value = '';
      priceInput.value = '';
      const periodEntry = planPeriodEntries().find((e) => e.period === fiscalPeriod);
      const periodLabel = periodEntry?.label ?? formatFiscalPeriodLabel(fiscalPeriod);
      showStatus(`${periodLabel}\u306b ${subLabel} \u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f\u3002`);
      renderPlanSection();
      refreshPlanTableIfNeeded();
    });

    row.append(label, nameInput, priceLabel, priceInput, submitBtn, cancelBtn);
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
        <h3 class="salary-plan-title">\u58f2\u4e0a\u9ad8\u53d7\u6ce8\u8a08\u753b\u8868</h3>
        <p class="salary-plan-desc">
          \u6c7a\u7b97\u6708 ${appSettings.fiscalEndMonth}\u6708 \u3092\u57fa\u6e96\u3068\u3057\u305f12\u304b\u6708\u5206\u3067\u3059\u3002\u5404\u53d7\u6ce8\u5148\u306f\u4eba\u6708\u30fb\u4eba\u6708\u5358\u4fa1\u30fb\u58f2\u4e0a\uFF08\u81ea\u52d5\u8a08\u7b97\uFF09\u306e3\u884c\u3067\u8868\u793a\u3057\u307e\u3059\u3002
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

      periodsContainer.appendChild(block);
    }
  }

  renderPlanSection();
  replaceRootPanel(wrap);
}
