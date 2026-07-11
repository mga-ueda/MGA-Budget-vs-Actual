import {
  normalizeTaxSimulation,
  TAX_REGION_PRESETS,
  TAX_REGION_PRESET_TOOLTIP,
  resolveDefaultTaxPaymentMonthIndices,
  resolveItemizedTaxParams,
} from '../config/taxSimulationConfig.js';
import { computeNextPeriodTaxForecast } from '../enrich/nextPeriodTaxForecast.js';

function formatYenInputValue(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (!Number.isFinite(num)) return '';
  return `\u00a5${num.toLocaleString('ja-JP')}`;
}

function parseYenInputValue(raw) {
  return String(raw ?? '').replace(/[^\d]/g, '');
}

function filterIntegerInput(value) {
  return String(value ?? '').replace(/[^\d]/g, '');
}

function bindYenInput(input, { onChange } = {}) {
  if (!input) return;
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.classList.add('tax-forecast-input--currency');

  input.addEventListener('focus', () => {
    input.value = parseYenInputValue(input.value);
  });

  input.addEventListener('input', () => {
    const filtered = filterIntegerInput(input.value);
    if (filtered !== input.value) input.value = filtered;
  });

  input.addEventListener('blur', () => {
    input.value = formatYenInputValue(input.value);
    onChange?.();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function setYenInputValue(input, value) {
  if (!input) return;
  input.value = formatYenInputValue(value);
}

function readYenInputValue(input) {
  if (!input) return '';
  if (input.dataset.masked === '1' && input.dataset.storedValue != null) {
    return String(input.dataset.storedValue);
  }
  return parseYenInputValue(input?.value);
}

const TAX_FORECAST_MASK_DISPLAY = '—';
const TAX_FORECAST_MASK_SELECT_VALUE = '__tax_forecast_masked__';

function ensureSelectMaskOption(select) {
  let opt = select.querySelector('option[data-mask-placeholder]');
  if (!opt) {
    opt = document.createElement('option');
    opt.value = TAX_FORECAST_MASK_SELECT_VALUE;
    opt.textContent = TAX_FORECAST_MASK_DISPLAY;
    opt.dataset.maskPlaceholder = '1';
    select.insertBefore(opt, select.firstChild);
  }
  return opt;
}

function maskControl(el) {
  if (!el || el.dataset.masked === '1') return;
  if (el.tagName === 'SELECT') {
    el.dataset.storedValue = el.value;
    ensureSelectMaskOption(el);
    el.value = TAX_FORECAST_MASK_SELECT_VALUE;
  } else if (el.classList.contains('tax-forecast-input--currency')) {
    el.dataset.storedValue = parseYenInputValue(el.value);
    el.value = TAX_FORECAST_MASK_DISPLAY;
  } else {
    el.dataset.storedValue = el.value;
    el.value = TAX_FORECAST_MASK_DISPLAY;
  }
  el.dataset.masked = '1';
  el.disabled = true;
}

function unmaskControl(el) {
  if (!el) return;
  if (el.tagName === 'SELECT') {
    el.querySelector('option[data-mask-placeholder]')?.remove();
    if (el.dataset.masked === '1') {
      if (el.dataset.storedValue != null) {
        el.value = el.dataset.storedValue;
      }
      delete el.dataset.storedValue;
      delete el.dataset.masked;
    }
    el.disabled = false;
    return;
  }
  if (el.dataset.masked === '1') {
    const raw = el.dataset.storedValue ?? '';
    if (el.classList.contains('tax-forecast-input--currency')) {
      el.value = raw === '' ? '' : formatYenInputValue(raw);
    } else {
      el.value = raw;
    }
    delete el.dataset.storedValue;
    delete el.dataset.masked;
  }
  el.disabled = false;
}

function readControlValue(el) {
  if (!el) return '';
  if (el.dataset.masked === '1' && el.dataset.storedValue != null) {
    return el.dataset.storedValue;
  }
  if (el.type === 'checkbox') return el.checked;
  return el.value;
}

function yen(value, formatYen) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `¥${formatYen(value)}`;
}

function renderScheduleTable(schedule, formatYen) {
  if (!schedule?.length) {
    return `<p class="app-settings-hint tax-forecast-empty">支払予定はありません</p>`;
  }
  const rows = schedule.map((row) => `
    <tr>
      <td>${row.label ?? ''}</td>
      <td>${row.monthLabel ?? ''}</td>
      <td class="tax-forecast-amount tax-forecast-cell--amount">${yen(row.amount, formatYen)}</td>
    </tr>
  `).join('');
  return `
    <table class="expand-settings-table tax-forecast-schedule-table">
      <thead>
        <tr>
          <th>区分</th>
          <th>支払月</th>
          <th>金額</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBasisList(items) {
  if (!items?.length) return '';
  const rows = items.filter(Boolean).map((item) => `
    <li><span class="tax-forecast-basis-label">${item.label}</span><span class="tax-forecast-basis-value">${item.value}</span></li>
  `).join('');
  return `<ul class="tax-forecast-basis-list">${rows}</ul>`;
}

function renderItemizedBreakdownTable(itemized, formatYen) {
  if (!itemized?.breakdown?.length) return '';
  const rows = [
    {
      label: '課税所得（1,000円未満切捨）',
      amount: itemized.taxableIncome,
      emphasis: false,
    },
    ...itemized.breakdown.map((row) => ({
      label: row.label,
      amount: row.amount,
      emphasis: false,
    })),
    {
      label: '法人税等合計',
      amount: itemized.total,
      emphasis: true,
    },
  ].map((row) => `
    <tr${row.emphasis ? ' class="tax-forecast-breakdown-total"' : ''}>
      <td>${row.label}</td>
      <td class="tax-forecast-amount tax-forecast-cell--amount">${yen(row.amount, formatYen)}</td>
    </tr>
  `).join('');
  return `
    <table class="expand-settings-table tax-forecast-breakdown-table">
      <thead>
        <tr>
          <th>税目</th>
          <th>金額</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/** 来期納税見込みパネルの HTML を生成する */
export function buildTaxForecastPanelHtml(forecast, formatYen, { compact = false } = {}) {
  if (!forecast) {
    return `<p class="app-settings-hint tax-forecast-empty">見込みを計算できません</p>`;
  }
  const warnings = (forecast.warnings ?? []).map((w) => `<p class="tax-forecast-warning">${w}</p>`).join('');
  const isItemized = forecast.corporateTax?.method === 'itemized';
  const methodLabel = isItemized ? '検算（税目別）' : '簡易（実効税率）';
  const profitBasis = [
    { label: '参照期', value: forecast.currentPeriodLabel },
    { label: '年間見込税引前利益', value: yen(forecast.profitEstimate?.amount, formatYen) },
    { label: '計算方法', value: forecast.profitEstimate?.basis ?? '' },
    { label: '補足説明', value: forecast.profitEstimate?.detail ?? '' },
    { label: '繰越欠損控除', value: yen(forecast.corporateTax?.lossDeduction, formatYen) },
    { label: '課税対象利益', value: yen(forecast.taxableProfit, formatYen) },
    { label: '法人税計算', value: methodLabel },
    { label: '地域・税率', value: `${forecast.regionLabel} / ${forecast.corporateTax?.rateLabel ?? ''}` },
    { label: '確定納付（期末未払）', value: yen(forecast.corporateTax?.settlementAmount ?? forecast.corporateTax?.annualAmount, formatYen) },
    { label: '年税額（予定・中間の計算基礎）', value: yen(forecast.corporateTax?.annualAmount, formatYen) },
    { label: '資金基準の出所', value: forecast.corporateTax?.cashSourceLabel ?? '' },
    { label: '検算税額（参考）', value: yen(forecast.corporateTax?.calculatedAmount, formatYen) },
  ];
  const itemizedBreakdownHtml = isItemized
    ? renderItemizedBreakdownTable(forecast.corporateTax?.itemized, formatYen)
    : '';
  const consumptionBasis = [
    { label: '確定納付（期末未払）', value: yen(forecast.consumptionTax?.settlementAmount ?? forecast.consumptionTax?.annualAmount, formatYen) },
    { label: '年税額（予定・中間の計算基礎）', value: yen(forecast.consumptionTax?.annualAmount, formatYen) },
    { label: '資金基準の出所', value: forecast.consumptionTax?.cashSourceLabel ?? '' },
    { label: '売上仕入からの概算（参考）', value: yen(forecast.consumptionTax?.estimatedAmount, formatYen) },
    { label: '課税計算方法', value: forecast.consumptionTax?.estimate?.basis ?? '' },
    { label: '補足説明', value: forecast.consumptionTax?.estimate?.detail ?? '' },
  ];
  const summaryHtml = `
    <div class="tax-forecast-summary-grid${compact ? ' tax-forecast-summary-grid--compact' : ''}">
      <div class="tax-forecast-summary-card" data-section-id="tax">
        <span class="tax-forecast-summary-label">${compact ? '法人税等' : '来期支払合計（法人税等）'}</span>
        <span class="tax-forecast-summary-value">${yen(forecast.corporateTax?.totalPaymentInNextPeriod, formatYen)}</span>
      </div>
      <div class="tax-forecast-summary-card" data-section-id="otherPay">
        <span class="tax-forecast-summary-label">${compact ? '消費税' : '来期支払合計（消費税）'}</span>
        <span class="tax-forecast-summary-value">${yen(forecast.consumptionTax?.totalPaymentInNextPeriod, formatYen)}</span>
      </div>
      <div class="tax-forecast-summary-card tax-forecast-summary-card--total" data-section-id="cfOut">
        <span class="tax-forecast-summary-label">${compact ? '総計' : '来期支払合計（総計）'}</span>
        <span class="tax-forecast-summary-value">${yen(forecast.grandTotalPaymentInNextPeriod, formatYen)}</span>
      </div>
    </div>
    <p class="app-settings-hint tax-forecast-target-period">${forecast.currentPeriodLabel}の見込をもとに、${forecast.nextPeriodLabel}に支払うキャッシュ見込です。</p>
  `;
  if (compact) {
    return `
      ${warnings}
      ${summaryHtml}
      <div class="tax-forecast-detail-grid tax-forecast-detail-grid--compact${itemizedBreakdownHtml ? ' tax-forecast-detail-grid--three' : ''}">
        <div class="tax-forecast-detail-block">
          <h4 class="tax-forecast-detail-title">来期の法人税支払スケジュール</h4>
          ${renderScheduleTable(forecast.corporateTax?.schedule, formatYen)}
          <h4 class="tax-forecast-detail-title">法人税の計算根拠</h4>
          ${renderBasisList(profitBasis)}
        </div>
        <div class="tax-forecast-detail-block">
          <h4 class="tax-forecast-detail-title">来期の消費税支払スケジュール</h4>
          ${renderScheduleTable(forecast.consumptionTax?.schedule, formatYen)}
          <h4 class="tax-forecast-detail-title">消費税の計算根拠</h4>
          ${renderBasisList(consumptionBasis)}
        </div>
        ${itemizedBreakdownHtml ? `
        <div class="tax-forecast-detail-block">
          <h4 class="tax-forecast-detail-title">法人税等の内訳（検算）</h4>
          ${itemizedBreakdownHtml}
        </div>
        ` : ''}
      </div>
      <p class="app-settings-hint tax-forecast-note">※　来期の資金繰り用の見込です。税務申告の代替にはなりません。</p>
    `;
  }
  return `
    ${warnings}
    ${summaryHtml}
    <div class="tax-forecast-detail-grid">
      <div class="tax-forecast-detail-block">
        <h4 class="tax-forecast-detail-title">来期の法人税支払スケジュール</h4>
        ${renderScheduleTable(forecast.corporateTax?.schedule, formatYen)}
        <h4 class="tax-forecast-detail-title">法人税の計算根拠</h4>
        ${renderBasisList(profitBasis)}
        ${itemizedBreakdownHtml ? `<h4 class="tax-forecast-detail-title">法人税等の内訳（検算）</h4>${itemizedBreakdownHtml}` : ''}
      </div>
      <div class="tax-forecast-detail-block">
        <h4 class="tax-forecast-detail-title">来期の消費税支払スケジュール</h4>
        ${renderScheduleTable(forecast.consumptionTax?.schedule, formatYen)}
        <h4 class="tax-forecast-detail-title">消費税の計算根拠</h4>
        ${renderBasisList(consumptionBasis)}
      </div>
    </div>
    <p class="app-settings-hint tax-forecast-note">※　来期の資金繰り用の見込です。税務申告の代替にはなりません。</p>
  `;
}

export function computeTaxForecastForDisplay({
  getForecastContext,
  appSettings,
  getAppSettings,
}) {
  const settings = getAppSettings?.() ?? appSettings;
  const ctx = getForecastContext?.();
  if (!ctx) return null;
  const fiscalEndMonth = ctx.fiscalEndMonth ?? 12;
  return computeNextPeriodTaxForecast({
    ...ctx,
    taxSimulation: normalizeTaxSimulation(settings?.taxSimulation, fiscalEndMonth),
    consumptionTaxRates: settings?.consumptionTaxRates,
  });
}

function buildMonthSelectOptions(fiscalMonths, selectedIndex) {
  return fiscalMonths.map((label, index) => {
    const selected = index === selectedIndex ? ' selected' : '';
    return `<option value="${index}"${selected}>${label}</option>`;
  }).join('');
}

/** 来期納税見込みのシミュレーション設定フォームをマウントする */
export function mountTaxForecastSettingsForm(container, {
  appSettings,
  getAppSettings,
  onSaveSettings,
  fiscalEndMonth,
  onSettingsChange,
  compact = false,
}) {
  if (!container) return;

  const resolveAppSettings = () => getAppSettings?.() ?? appSettings;

  const fiscalMonths = resolveDefaultTaxPaymentMonthIndices(fiscalEndMonth).fiscalMonths;
  const simulation = normalizeTaxSimulation(resolveAppSettings()?.taxSimulation, fiscalEndMonth);

  const section = document.createElement('div');
  section.className = compact
    ? 'app-settings-section tax-forecast-settings-section tax-forecast-settings-section--compact'
    : 'app-settings-section tax-forecast-settings-section';
  section.innerHTML = `
    <div class="tax-forecast-settings-groups">
      <section class="tax-forecast-settings-group">
        <h4 class="tax-forecast-settings-group-title">利益見込</h4>
        <div class="tax-forecast-settings-grid">
          <div class="tax-forecast-field">
            <span class="app-settings-label">利益見込方法</span>
            <select class="app-settings-input tax-forecast-select" data-field="profitEstimateMethod">
              <option value="fullYear">通期合計を使用</option>
              <option value="annualize">実績から年間換算</option>
            </select>
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label">繰越欠損控除（円）</span>
            <input type="text" class="app-settings-input tax-forecast-input" data-field="lossCarryforwardDeduction" inputmode="numeric" />
          </div>
        </div>
      </section>

      <section class="tax-forecast-settings-group">
        <h4 class="tax-forecast-settings-group-title">法人税</h4>
        <div class="tax-forecast-settings-grid">
          <div class="tax-forecast-field">
            <span class="app-settings-label">法人税計算</span>
            <select class="app-settings-input tax-forecast-select" data-field="corporateTaxMethod">
              <option value="itemized">検算（税目別）</option>
              <option value="effectiveRate">簡易（実効税率）</option>
            </select>
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label tax-forecast-label-with-tip" title="${TAX_REGION_PRESET_TOOLTIP}">地域プリセット</span>
            <select class="app-settings-input tax-forecast-select" data-field="regionPreset"></select>
          </div>
          <div class="tax-forecast-field" data-role="effective-rate-field">
            <span class="app-settings-label">実効法人税率（%）</span>
            <input type="number" class="app-settings-input tax-forecast-input tax-forecast-input--percent" data-field="effectiveCorporateTaxRatePercent" min="0" max="100" step="0.01" />
          </div>
          <div class="tax-forecast-field tax-forecast-field--itemized" data-role="itemized-field">
            <span class="app-settings-label">道府県民税・均等割（円）</span>
            <input type="text" class="app-settings-input tax-forecast-input" data-field="itemizedPrefecturalPerCapita" inputmode="numeric" placeholder="プリセット既定" />
          </div>
          <div class="tax-forecast-field tax-forecast-field--itemized" data-role="itemized-field">
            <span class="app-settings-label">市町村民税・均等割（円）</span>
            <input type="text" class="app-settings-input tax-forecast-input" data-field="itemizedMunicipalPerCapita" inputmode="numeric" placeholder="プリセット既定" />
          </div>
        </div>
        <p class="tax-forecast-settings-subgroup-title">来期の支払月</p>
        <div class="tax-forecast-settings-grid tax-forecast-settings-grid--schedule">
          <div class="tax-forecast-field tax-forecast-field--checkbox tax-forecast-field--row-full">
            <label class="tax-forecast-checkbox-hit">
              <input type="checkbox" data-field="provisionalTaxEnabled" />
              <span class="app-settings-label">来期の予定納税を含める</span>
            </label>
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label">確定月</span>
            <select class="app-settings-input tax-forecast-select" data-field="corporateTaxSettlementMonthIndex"></select>
          </div>
          <div class="tax-forecast-field tax-forecast-field--schedule-break" data-role="provisional-tax-month-field">
            <span class="app-settings-label">予定納税月1</span>
            <select class="app-settings-input tax-forecast-select" data-field="provisionalTaxMonthIndices.0"></select>
          </div>
          <div class="tax-forecast-field" data-role="provisional-tax-month-field">
            <span class="app-settings-label">予定納税月2</span>
            <select class="app-settings-input tax-forecast-select" data-field="provisionalTaxMonthIndices.1"></select>
          </div>
        </div>
      </section>

      <section class="tax-forecast-settings-group">
        <h4 class="tax-forecast-settings-group-title">消費税</h4>
        <div class="tax-forecast-settings-grid">
          <div class="tax-forecast-field">
            <span class="app-settings-label">消費税計算</span>
            <select class="app-settings-input tax-forecast-select" data-field="consumptionTaxMethod">
              <option value="general">本則課税</option>
              <option value="simplified">簡易課税</option>
            </select>
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label">みなし仕入率（%）</span>
            <input type="number" class="app-settings-input tax-forecast-input" data-field="simplifiedDeemedPurchaseRatePercent" min="0" max="100" step="1" data-role="simplified-field" />
          </div>
        </div>
        <p class="tax-forecast-settings-subgroup-title">来期の支払月</p>
        <div class="tax-forecast-settings-grid tax-forecast-settings-grid--schedule">
          <div class="tax-forecast-field tax-forecast-field--checkbox tax-forecast-field--row-full">
            <label class="tax-forecast-checkbox-hit">
              <input type="checkbox" data-field="consumptionTaxInterimEnabled" />
              <span class="app-settings-label">来期の消費税中間納税を含める</span>
            </label>
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label">確定月</span>
            <select class="app-settings-input tax-forecast-select" data-field="consumptionTaxSettlementMonthIndex"></select>
          </div>
          <div class="tax-forecast-field" data-role="consumption-interim-month-field">
            <span class="app-settings-label">中間月（1回時）</span>
            <select class="app-settings-input tax-forecast-select" data-field="consumptionTaxInterimMonthIndex"></select>
          </div>
          <p class="app-settings-hint tax-forecast-interim-hint">中間の回数は前年税額から自動（0 / 1 / 3 / 11回）です。3回・11回の月は会計月から自動配置します。</p>
        </div>
      </section>
    </div>
  `;
  container.appendChild(section);

  const regionSelect = section.querySelector('[data-field="regionPreset"]');
  regionSelect.innerHTML = Object.entries(TAX_REGION_PRESETS).map(([key, preset]) => {
    const selected = key === simulation.regionPreset ? ' selected' : '';
    return `<option value="${key}"${selected}>${preset.label}</option>`;
  }).join('');

  const monthFields = [
    'corporateTaxSettlementMonthIndex',
    'provisionalTaxMonthIndices.0',
    'provisionalTaxMonthIndices.1',
    'consumptionTaxSettlementMonthIndex',
    'consumptionTaxInterimMonthIndex',
  ];
  const monthIndexMap = {
    'provisionalTaxMonthIndices.0': simulation.provisionalTaxMonthIndices[0] ?? 6,
    'provisionalTaxMonthIndices.1': simulation.provisionalTaxMonthIndices[1]
      ?? simulation.provisionalTaxMonthIndices[0]
      ?? 6,
    corporateTaxSettlementMonthIndex: simulation.corporateTaxSettlementMonthIndex,
    consumptionTaxSettlementMonthIndex: simulation.consumptionTaxSettlementMonthIndex,
    consumptionTaxInterimMonthIndex: simulation.consumptionTaxInterimMonthIndex,
  };
  for (const field of monthFields) {
    const el = section.querySelector(`[data-field="${field}"]`);
    if (!el) continue;
    el.innerHTML = buildMonthSelectOptions(fiscalMonths, monthIndexMap[field] ?? 0);
  }

  const setFieldValue = (field, value) => {
    const el = section.querySelector(`[data-field="${field}"]`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else el.value = String(value ?? '');
  };

  setFieldValue('corporateTaxMethod', simulation.corporateTaxMethod);
  setFieldValue('effectiveCorporateTaxRatePercent', simulation.effectiveCorporateTaxRatePercent);
  setYenInputValue(
    section.querySelector('[data-field="itemizedPrefecturalPerCapita"]'),
    simulation.itemizedPrefecturalPerCapita ?? '',
  );
  setYenInputValue(
    section.querySelector('[data-field="itemizedMunicipalPerCapita"]'),
    simulation.itemizedMunicipalPerCapita ?? '',
  );
  setFieldValue('profitEstimateMethod', simulation.profitEstimateMethod);
  setYenInputValue(
    section.querySelector('[data-field="lossCarryforwardDeduction"]'),
    simulation.lossCarryforwardDeduction,
  );
  setFieldValue('provisionalTaxEnabled', simulation.provisionalTaxEnabled);
  setFieldValue('consumptionTaxMethod', simulation.consumptionTaxMethod);
  setFieldValue('simplifiedDeemedPurchaseRatePercent', simulation.simplifiedDeemedPurchaseRatePercent);
  setFieldValue('consumptionTaxInterimEnabled', simulation.consumptionTaxInterimEnabled);

  const rateInput = section.querySelector('[data-field="effectiveCorporateTaxRatePercent"]');
  const methodSelect = section.querySelector('[data-field="corporateTaxMethod"]');
  const effectiveRateField = section.querySelector('[data-role="effective-rate-field"]');
  const itemizedFields = section.querySelectorAll('[data-role="itemized-field"]');
  const yenFields = [
    'lossCarryforwardDeduction',
    'itemizedPrefecturalPerCapita',
    'itemizedMunicipalPerCapita',
  ].map((field) => section.querySelector(`[data-field="${field}"]`));

  yenFields.forEach((input) => bindYenInput(input));

  const consumptionMethodSelect = section.querySelector('[data-field="consumptionTaxMethod"]');
  const provisionalTaxEnabledCheckbox = section.querySelector('[data-field="provisionalTaxEnabled"]');
  const consumptionInterimEnabledCheckbox = section.querySelector('[data-field="consumptionTaxInterimEnabled"]');
  const simplifiedField = section.querySelector('[data-role="simplified-field"]');
  const provisionalTaxMonthFields = section.querySelectorAll('[data-role="provisional-tax-month-field"]');
  const consumptionInterimMonthField = section.querySelector('[data-role="consumption-interim-month-field"]');

  const setFieldGroupInactive = (rootEl, inactive) => {
    if (!rootEl) return;
    rootEl.classList.toggle('tax-forecast-field--disabled', inactive);
    rootEl.querySelectorAll('input, select').forEach((el) => {
      if (inactive) maskControl(el);
      else unmaskControl(el);
    });
  };

  const syncFieldStates = () => {
    const isItemized = methodSelect?.value === 'itemized';
    const isCustom = regionSelect.value === 'custom';
    const isSimplifiedConsumption = consumptionMethodSelect?.value === 'simplified';
    const provisionalTaxEnabled = provisionalTaxEnabledCheckbox?.checked ?? false;
    const consumptionInterimEnabled = consumptionInterimEnabledCheckbox?.checked ?? false;

    setFieldGroupInactive(effectiveRateField, isItemized);
    if (!isItemized && !isCustom && document.activeElement !== rateInput) {
      const presetRate = TAX_REGION_PRESETS[regionSelect.value]?.effectiveCorporateTaxRatePercent;
      if (presetRate != null) rateInput.value = String(presetRate);
    }

    itemizedFields.forEach((el) => setFieldGroupInactive(el, !isItemized));

    if (simplifiedField) {
      const simplifiedLabel = simplifiedField.closest('.tax-forecast-field');
      simplifiedLabel?.classList.toggle('tax-forecast-field--disabled', !isSimplifiedConsumption);
      if (!isSimplifiedConsumption) maskControl(simplifiedField);
      else unmaskControl(simplifiedField);
    }

    const liveSim = normalizeTaxSimulation(
      resolveAppSettings()?.taxSimulation ?? simulation,
      fiscalEndMonth,
    );
    const itemizedParams = resolveItemizedTaxParams(liveSim);
    const isSmallCorp = itemizedParams.isSmallCorporation !== false;
    const mode = liveSim.provisionalTaxInstallments;
    const maxInst = liveSim.provisionalTaxMaxInstallments ?? 2;
    let secondMonthVisible = false;
    if (provisionalTaxEnabled && maxInst >= 2) {
      if (mode === 2) secondMonthVisible = true;
      else if (mode === 'auto' || mode == null) secondMonthVisible = !isSmallCorp;
    }
    provisionalTaxMonthFields.forEach((el, idx) => {
      const inactive = !provisionalTaxEnabled || (idx >= 1 && !secondMonthVisible);
      setFieldGroupInactive(el, inactive);
    });
    setFieldGroupInactive(consumptionInterimMonthField, !consumptionInterimEnabled);
  };

  const syncRateInputState = () => {
    syncFieldStates();
  };
  syncRateInputState();

  const readSimulationFromForm = () => {
    const raw = { ...simulation, ...resolveAppSettings()?.taxSimulation };
    raw.regionPreset = regionSelect.value;
    raw.corporateTaxMethod = methodSelect.value;
    raw.effectiveCorporateTaxRatePercent = readControlValue(rateInput);
    const prefPerCapitaEl = section.querySelector('[data-field="itemizedPrefecturalPerCapita"]');
    const muniPerCapitaEl = section.querySelector('[data-field="itemizedMunicipalPerCapita"]');
    const prefPerCapita = readYenInputValue(prefPerCapitaEl);
    const muniPerCapita = readYenInputValue(muniPerCapitaEl);
    raw.itemizedPrefecturalPerCapita = prefPerCapita === '' ? null : prefPerCapita;
    raw.itemizedMunicipalPerCapita = muniPerCapita === '' ? null : muniPerCapita;
    raw.profitEstimateMethod = section.querySelector('[data-field="profitEstimateMethod"]').value;
    raw.lossCarryforwardDeduction = readYenInputValue(
      section.querySelector('[data-field="lossCarryforwardDeduction"]'),
    );
    raw.provisionalTaxEnabled = section.querySelector('[data-field="provisionalTaxEnabled"]').checked;
    {
      const live = resolveAppSettings()?.taxSimulation ?? simulation;
      raw.provisionalTaxInstallments = live.provisionalTaxInstallments === 1 || live.provisionalTaxInstallments === 2
        ? live.provisionalTaxInstallments
        : 'auto';
      raw.provisionalTaxMaxInstallments = live.provisionalTaxMaxInstallments ?? 2;
    }
    raw.corporateTaxSettlementMonthIndex = Number(section.querySelector('[data-field="corporateTaxSettlementMonthIndex"]').value);
    raw.provisionalTaxMonthIndices = [
      Number(readControlValue(section.querySelector('[data-field="provisionalTaxMonthIndices.0"]'))),
      Number(readControlValue(section.querySelector('[data-field="provisionalTaxMonthIndices.1"]'))),
    ];
    raw.consumptionTaxMethod = section.querySelector('[data-field="consumptionTaxMethod"]').value;
    raw.simplifiedDeemedPurchaseRatePercent = readControlValue(simplifiedField);
    raw.consumptionTaxInterimEnabled = section.querySelector('[data-field="consumptionTaxInterimEnabled"]').checked;
    raw.consumptionTaxSettlementMonthIndex = Number(section.querySelector('[data-field="consumptionTaxSettlementMonthIndex"]').value);
    raw.consumptionTaxInterimMonthIndex = Number(readControlValue(
      section.querySelector('[data-field="consumptionTaxInterimMonthIndex"]'),
    ));
    return normalizeTaxSimulation(raw, fiscalEndMonth);
  };

  const saveSimulation = () => {
    const nextSimulation = readSimulationFromForm();
    onSaveSettings?.({ taxSimulation: nextSimulation });
    onSettingsChange?.();
  };

  section.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('change', () => {
      syncRateInputState();
      saveSimulation();
    });
  });
}

/** 来期納税見込みサマリーカードに大項目色を適用する */
export function applyTaxForecastSectionColors(container, getSectionFilterColors) {
  if (!container || !getSectionFilterColors) return;
  container.querySelectorAll('.tax-forecast-summary-card[data-section-id]').forEach((el) => {
    const sectionId = el.dataset.sectionId;
    if (!sectionId) return;
    const { background, color } = getSectionFilterColors(sectionId);
    el.style.background = background;
    el.style.borderColor = background;
    el.style.color = color;
  });
}

/** @deprecated applyTaxForecastSectionColors を使用 */
export const applyTaxForecastSummaryCardColors = applyTaxForecastSectionColors;

/** 設定と見込み結果を同一ウィンドウ内にマウントする */
export function mountTaxForecastWindowContent(container, {
  appSettings,
  getAppSettings,
  onSaveSettings,
  fiscalEndMonth,
  getForecastContext,
  formatYen,
  onReset,
  getSourcePeriodOptions,
  getSourcePeriod,
  onSourcePeriodChange,
  onLayoutChange,
  getSectionFilterColors = null,
}) {
  if (!container) return { refreshForecast: () => {}, syncSourcePeriodSelect: () => {} };

  const resolveAppSettings = () => getAppSettings?.() ?? appSettings;

  const wrap = document.createElement('div');
  wrap.className = 'tax-forecast-window-content';
  wrap.innerHTML = `
    <div class="tax-forecast-window-toolbar">
      <div class="tax-forecast-window-source-period">
        <span class="app-settings-label">計算元の期</span>
        <select class="app-settings-input tax-forecast-source-period-select"></select>
      </div>
      <div class="tax-forecast-window-toolbar-actions">
        <button type="button" class="expand-reset-btn tax-forecast-window-reset-btn">デフォルトに戻す</button>
      </div>
    </div>
    <div class="tax-forecast-window-settings">
      <div class="tax-forecast-window-settings-head">試算ルール</div>
      <div class="tax-forecast-window-settings-host"></div>
    </div>
    <div class="tax-forecast-window-result">
      <div class="tax-forecast-window-result-head">見込み結果</div>
      <div class="tax-forecast-window-result-body" data-role="forecast-result"></div>
    </div>
  `;
  container.appendChild(wrap);

  const settingsHost = wrap.querySelector('.tax-forecast-window-settings-host');
  const resultEl = wrap.querySelector('[data-role="forecast-result"]');
  const sourcePeriodSelect = wrap.querySelector('.tax-forecast-source-period-select');

  const syncSourcePeriodSelect = () => {
    if (!sourcePeriodSelect) return;
    const options = getSourcePeriodOptions?.() ?? [];
    const selected = getSourcePeriod?.() ?? options[0]?.period;
    sourcePeriodSelect.innerHTML = options.map(({ period, label }) => {
      const isSelected = period === selected ? ' selected' : '';
      return `<option value="${period}"${isSelected}>${label}</option>`;
    }).join('');
    if (selected != null) sourcePeriodSelect.value = String(selected);
  };

  const applySectionColors = () => {
    applyTaxForecastSectionColors(wrap, getSectionFilterColors);
  };

  const refreshForecast = () => {
    const forecast = computeTaxForecastForDisplay({
      getForecastContext,
      getAppSettings: resolveAppSettings,
    });
    resultEl.innerHTML = buildTaxForecastPanelHtml(forecast, formatYen, { compact: true });
    applySectionColors();
    onLayoutChange?.();
  };

  syncSourcePeriodSelect();
  sourcePeriodSelect?.addEventListener('change', () => {
    const period = Number(sourcePeriodSelect.value);
    if (!Number.isFinite(period)) return;
    onSourcePeriodChange?.(period);
    refreshForecast();
  });

  mountTaxForecastSettingsForm(settingsHost, {
    appSettings: resolveAppSettings(),
    getAppSettings: resolveAppSettings,
    fiscalEndMonth,
    compact: true,
    onSaveSettings,
    onSettingsChange: refreshForecast,
  });
  applySectionColors();

  wrap.querySelector('.tax-forecast-window-reset-btn')?.addEventListener('click', () => {
    onReset?.();
  });

  refreshForecast();
  return {
    refreshForecast,
    syncSourcePeriodSelect,
  };
}
