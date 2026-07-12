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

function isCashReferencedSource(source) {
  return source === 'bs' || source === 'plan';
}

/** 金額表示。computed のとき手前に小さい ∑ を付ける（アプリ計算であることを示す） */
function yen(value, formatYen, { computed = false } = {}) {
  if (value == null || !Number.isFinite(value)) return '—';
  const amount = `¥${formatYen(value)}`;
  if (!computed) return amount;
  return `<span class="tax-forecast-computed-prefix" title="アプリが計算した金額">∑</span> ${amount}`;
}

function isScheduleAmountComputed(row, cashSource) {
  if (!row) return false;
  if (row.kind === 'provisional' || row.kind === 'interim') return true;
  // 確定納付: CSV/未払参照でなければアプリ計算
  return !isCashReferencedSource(cashSource);
}

function isPaymentTotalComputed(schedule, cashSource) {
  if (cashSource === 'exempt') return true;
  const rows = schedule ?? [];
  if (rows.length === 0) return false;
  return rows.some((row) => isScheduleAmountComputed(row, cashSource));
}

function renderScheduleTable(schedule, formatYen, { cashSource = null } = {}) {
  if (!schedule?.length) {
    return `<p class="app-settings-hint tax-forecast-empty">支払予定はありません</p>`;
  }
  const rows = schedule.map((row) => `
    <tr>
      <td>${row.label ?? ''}</td>
      <td>${row.monthLabel ?? ''}</td>
      <td class="tax-forecast-amount tax-forecast-cell--amount">${yen(row.amount, formatYen, {
        computed: isScheduleAmountComputed(row, cashSource),
      })}</td>
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
      <td class="tax-forecast-amount tax-forecast-cell--amount">${yen(row.amount, formatYen, { computed: true })}</td>
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
  const warningItems = (forecast.warnings ?? []).map((w) => {
    const text = w === '免税事業者のため消費税の支払見込は0です'
      ? `免税事業者のため消費税の支払見込は${yen(0, formatYen, { computed: true })}です`
      : w;
    return `<p class="tax-forecast-warning">${text}</p>`;
  });
  const warningsHtml = warningItems.length
    ? `<div class="tax-forecast-warnings">${warningItems.join('')}</div>`
    : '';
  const isItemized = forecast.corporateTax?.method === 'itemized';
  const methodLabel = isItemized ? '検算（税目別）' : '簡易（実効税率）';
  const corpCashReferenced = isCashReferencedSource(forecast.corporateTax?.cashSource);
  const consCashReferenced = isCashReferencedSource(forecast.consumptionTax?.cashSource);
  const corpTotalComputed = isPaymentTotalComputed(
    forecast.corporateTax?.schedule,
    forecast.corporateTax?.cashSource,
  );
  const consTotalComputed = isPaymentTotalComputed(
    forecast.consumptionTax?.schedule,
    forecast.consumptionTax?.cashSource,
  );
  const profitBasis = [
    { label: '参照期', value: forecast.currentPeriodLabel },
    { label: '年間見込税引前利益', value: yen(forecast.profitEstimate?.amount, formatYen, { computed: true }) },
    { label: '計算方法', value: forecast.profitEstimate?.basis ?? '' },
    { label: '補足説明', value: forecast.profitEstimate?.detail ?? '' },
    { label: '繰越欠損控除', value: yen(forecast.corporateTax?.lossDeduction, formatYen) },
    {
      label: '事業税・確定納付減算',
      value: yen(forecast.corporateTax?.enterpriseTaxSettlementDeduction, formatYen),
    },
    {
      label: '事業税・予定納税減算',
      value: yen(forecast.corporateTax?.enterpriseTaxProvisionalDeduction, formatYen),
    },
    {
      label: '所得税額の還付（加算）',
      value: yen(forecast.corporateTax?.incomeTaxRefundAddition, formatYen),
    },
    { label: '課税対象利益', value: yen(forecast.taxableProfit, formatYen, { computed: true }) },
    { label: '法人税計算', value: methodLabel },
    { label: '法人区分・税率', value: `${forecast.regionLabel} / ${forecast.corporateTax?.rateLabel ?? ''}` },
    {
      label: '確定納付（期末未払）',
      value: yen(
        forecast.corporateTax?.settlementAmount ?? forecast.corporateTax?.annualAmount,
        formatYen,
        { computed: !corpCashReferenced },
      ),
    },
    {
      label: '年税額（予定・中間の計算基礎）',
      value: yen(forecast.corporateTax?.annualAmount, formatYen, { computed: !corpCashReferenced }),
    },
    { label: '資金基準の出所', value: forecast.corporateTax?.cashSourceLabel ?? '' },
    { label: '検算税額（参考）', value: yen(forecast.corporateTax?.calculatedAmount, formatYen, { computed: true }) },
  ];
  const itemizedBreakdownHtml = isItemized
    ? renderItemizedBreakdownTable(forecast.corporateTax?.itemized, formatYen)
    : '';
  const isConsumptionExempt = Boolean(
    forecast.simulation?.consumptionTaxExempt
    || forecast.consumptionTax?.cashSource === 'exempt',
  );
  const consumptionBasis = [
    {
      label: '確定納付（期末未払）',
      value: yen(
        forecast.consumptionTax?.settlementAmount ?? forecast.consumptionTax?.annualAmount,
        formatYen,
        { computed: !consCashReferenced },
      ),
    },
    {
      label: '年税額（予定・中間の計算基礎）',
      value: yen(forecast.consumptionTax?.annualAmount, formatYen, { computed: !consCashReferenced }),
    },
    { label: '資金基準の出所', value: forecast.consumptionTax?.cashSourceLabel ?? '' },
    {
      label: '売上仕入からの概算（参考）',
      value: yen(forecast.consumptionTax?.estimatedAmount, formatYen, { computed: true }),
    },
    { label: '課税計算方法', value: forecast.consumptionTax?.estimate?.basis ?? '' },
    {
      label: "経理方式",
      value: forecast.consumptionTax?.estimate?.accountingTaxBasisLabel ?? '',
    },
    {
      label: '補足説明',
      value: isConsumptionExempt
        ? `免税事業者のため消費税の支払見込は${yen(0, formatYen, { computed: true })}です`
        : (forecast.consumptionTax?.estimate?.detail ?? ''),
    },
  ];
  const summaryHtml = `
    <div class="tax-forecast-summary-grid${compact ? ' tax-forecast-summary-grid--compact' : ''}">
      <div class="tax-forecast-summary-card" data-section-id="tax">
        <span class="tax-forecast-summary-label">${compact ? '法人税等' : '来期支払合計（法人税等）'}</span>
        <span class="tax-forecast-summary-value">${yen(forecast.corporateTax?.totalPaymentInNextPeriod, formatYen, { computed: corpTotalComputed })}</span>
      </div>
      <div class="tax-forecast-summary-card" data-section-id="otherPay">
        <span class="tax-forecast-summary-label">${compact ? '消費税' : '来期支払合計（消費税）'}</span>
        <span class="tax-forecast-summary-value">${yen(forecast.consumptionTax?.totalPaymentInNextPeriod, formatYen, { computed: consTotalComputed })}</span>
      </div>
      <div class="tax-forecast-summary-card tax-forecast-summary-card--total" data-section-id="cfOut">
        <span class="tax-forecast-summary-label">${compact ? '総計' : '来期支払合計（総計）'}</span>
        <span class="tax-forecast-summary-value">${yen(forecast.grandTotalPaymentInNextPeriod, formatYen, {
          computed: corpTotalComputed || consTotalComputed,
        })}</span>
      </div>
    </div>
  `;
  // 警告・用語注釈（コンパクト時は詳細グリッド右2列の下へ）
  const targetPeriodHtml = `<p class="app-settings-hint tax-forecast-target-period">${forecast.currentPeriodLabel}の見込をもとに、${forecast.nextPeriodLabel}に支払うキャッシュ見込です。</p>`;
  const helpNotesHtml = `
    <div class="tax-forecast-help-notes">
      <p class="app-settings-hint tax-forecast-help-note">※　「当期分　確定納付」は、期末時点の未払（まだ払っていない残額）です。その期内にすでに払った予定納税・中間納税は含まれません。</p>
      <p class="app-settings-hint tax-forecast-help-note">※　「来期　予定納税／中間納税」は、前年の年税額を基礎にした前払の見込です。残額である確定納付より大きくなることがあります。</p>
      <p class="app-settings-hint tax-forecast-help-note">※　この画面の予定・中間は、資金基準の年税額（多くの場合は期末未払。あれば仮払の清算分も加算）から見積ります。予定を費用科目へ直接計上している場合などは、実績より小さく見えることがあります。</p>
      <p class="app-settings-hint tax-forecast-help-note">※　金額の手前の ∑ はアプリが計算した値、∑ なしは貸借の未払など CSV 由来の参照値です。</p>
    </div>
  `;
  const footerNotesInnerHtml = `
    ${warningsHtml}
    ${helpNotesHtml}
  `;
  const footerNotesHtml = `
    ${footerNotesInnerHtml}
    ${compact ? '' : targetPeriodHtml}
  `;
  if (compact) {
    const consumptionBlockHtml = `
        <div class="tax-forecast-detail-block">
          <h4 class="tax-forecast-detail-title">来期の消費税支払スケジュール</h4>
          ${renderScheduleTable(forecast.consumptionTax?.schedule, formatYen, {
            cashSource: forecast.consumptionTax?.cashSource,
          })}
          <h4 class="tax-forecast-detail-title">消費税の計算根拠</h4>
          ${renderBasisList(consumptionBasis)}
        </div>`;
    const itemizedBlockHtml = itemizedBreakdownHtml ? `
        <div class="tax-forecast-detail-block">
          <h4 class="tax-forecast-detail-title">法人税等の内訳（検算）</h4>
          ${itemizedBreakdownHtml}
        </div>` : '';
    // 右列に消費税・内訳＋注釈をまとめ、注釈を直下に詰める
    return `
      ${summaryHtml}
      <div class="tax-forecast-detail-grid tax-forecast-detail-grid--compact${itemizedBreakdownHtml ? ' tax-forecast-detail-grid--with-notes-right' : ''}">
        <div class="tax-forecast-detail-block">
          <h4 class="tax-forecast-detail-title">来期の法人税支払スケジュール</h4>
          ${renderScheduleTable(forecast.corporateTax?.schedule, formatYen, {
            cashSource: forecast.corporateTax?.cashSource,
          })}
          <h4 class="tax-forecast-detail-title">法人税の計算根拠</h4>
          ${renderBasisList(profitBasis)}
        </div>
        <div class="tax-forecast-detail-right">
          <div class="tax-forecast-detail-right-top${itemizedBreakdownHtml ? ' tax-forecast-detail-right-top--two' : ''}">
            ${consumptionBlockHtml}
            ${itemizedBlockHtml}
          </div>
          <div class="tax-forecast-detail-notes">
            ${footerNotesInnerHtml}
          </div>
        </div>
      </div>
    `;
  }
  return `
    ${summaryHtml}
    <div class="tax-forecast-detail-grid">
      <div class="tax-forecast-detail-block">
        <h4 class="tax-forecast-detail-title">来期の法人税支払スケジュール</h4>
        ${renderScheduleTable(forecast.corporateTax?.schedule, formatYen, {
          cashSource: forecast.corporateTax?.cashSource,
        })}
        <h4 class="tax-forecast-detail-title">法人税の計算根拠</h4>
        ${renderBasisList(profitBasis)}
        ${itemizedBreakdownHtml ? `<h4 class="tax-forecast-detail-title">法人税等の内訳（検算）</h4>${itemizedBreakdownHtml}` : ''}
      </div>
      <div class="tax-forecast-detail-block">
        <h4 class="tax-forecast-detail-title">来期の消費税支払スケジュール</h4>
        ${renderScheduleTable(forecast.consumptionTax?.schedule, formatYen, {
          cashSource: forecast.consumptionTax?.cashSource,
        })}
        <h4 class="tax-forecast-detail-title">消費税の計算根拠</h4>
        ${renderBasisList(consumptionBasis)}
      </div>
    </div>
    ${footerNotesHtml}
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
    accountingTaxBasis: settings?.accountingTaxBasis,
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
          <div class="tax-forecast-field">
            <span class="app-settings-label tax-forecast-label-with-tip" title="前期の確定申告で納付した事業税（当期の損金算入）。課税所得計算で税引前利益から減算します。">事業税・確定納付減算（円）</span>
            <input type="text" class="app-settings-input tax-forecast-input" data-field="enterpriseTaxSettlementDeduction" inputmode="numeric" />
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label tax-forecast-label-with-tip" title="当期に支払った事業税の予定納税。課税所得計算で税引前利益から減算します。">事業税・予定納税減算（円）</span>
            <input type="text" class="app-settings-input tax-forecast-input" data-field="enterpriseTaxProvisionalDeduction" inputmode="numeric" />
          </div>
          <div class="tax-forecast-field">
            <span class="app-settings-label tax-forecast-label-with-tip" title="源泉所得税などの還付のうち、課税所得の加算調整が必要な金額。会計上すでに利益に含まれている場合は0のままで構いません。">所得税額の還付・加算（円）</span>
            <input type="text" class="app-settings-input tax-forecast-input" data-field="incomeTaxRefundAddition" inputmode="numeric" />
          </div>
        </div>
      </section>

      <section class="tax-forecast-settings-group">
        <h4 class="tax-forecast-settings-group-title">法人税</h4>
        <div class="tax-forecast-settings-grid tax-forecast-settings-grid--corporate">
          <div class="tax-forecast-field-pair">
            <div class="tax-forecast-field">
              <span class="app-settings-label tax-forecast-label-with-tip" title="${TAX_REGION_PRESET_TOOLTIP}">法人区分</span>
              <select class="app-settings-input tax-forecast-select" data-field="regionPreset"></select>
            </div>
          </div>
          <div class="tax-forecast-field-pair">
            <div class="tax-forecast-field">
              <span class="app-settings-label">法人税計算</span>
              <select class="app-settings-input tax-forecast-select" data-field="corporateTaxMethod">
                <option value="itemized">検算（税目別）</option>
                <option value="effectiveRate">簡易（実効税率）</option>
              </select>
            </div>
            <div class="tax-forecast-field" data-role="effective-rate-field">
              <span class="app-settings-label">実効法人税率（%）</span>
              <input type="number" class="app-settings-input tax-forecast-input tax-forecast-input--percent" data-field="effectiveCorporateTaxRatePercent" min="0" max="100" step="0.01" />
            </div>
          </div>
          <div class="tax-forecast-field-pair">
            <div class="tax-forecast-field tax-forecast-field--itemized" data-role="itemized-field">
              <span class="app-settings-label">道府県民税・均等割（円）</span>
              <input type="text" class="app-settings-input tax-forecast-input" data-field="itemizedPrefecturalPerCapita" inputmode="numeric" placeholder="プリセット既定" />
            </div>
            <div class="tax-forecast-field tax-forecast-field--itemized" data-role="itemized-field">
              <span class="app-settings-label">市町村民税・均等割（円）</span>
              <input type="text" class="app-settings-input tax-forecast-input" data-field="itemizedMunicipalPerCapita" inputmode="numeric" placeholder="プリセット既定" />
            </div>
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
        <div class="tax-forecast-settings-grid" data-role="consumption-method-grid">
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
          <div class="tax-forecast-field tax-forecast-field--checkbox tax-forecast-field--row-full tax-forecast-field--checkbox-row">
            <label class="tax-forecast-checkbox-hit" data-role="consumption-interim-enabled-field">
              <input type="checkbox" data-field="consumptionTaxInterimEnabled" />
              <span class="app-settings-label">来期の消費税中間納税を含める</span>
            </label>
            <label class="tax-forecast-checkbox-hit">
              <input type="checkbox" data-field="consumptionTaxExempt" />
              <span class="app-settings-label">免税事業者</span>
            </label>
          </div>
          <div class="tax-forecast-field" data-role="consumption-settlement-month-field">
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
  setYenInputValue(
    section.querySelector('[data-field="enterpriseTaxSettlementDeduction"]'),
    simulation.enterpriseTaxSettlementDeduction,
  );
  setYenInputValue(
    section.querySelector('[data-field="enterpriseTaxProvisionalDeduction"]'),
    simulation.enterpriseTaxProvisionalDeduction,
  );
  setYenInputValue(
    section.querySelector('[data-field="incomeTaxRefundAddition"]'),
    simulation.incomeTaxRefundAddition,
  );
  setFieldValue('provisionalTaxEnabled', simulation.provisionalTaxEnabled);
  setFieldValue('consumptionTaxMethod', simulation.consumptionTaxMethod);
  setFieldValue('simplifiedDeemedPurchaseRatePercent', simulation.simplifiedDeemedPurchaseRatePercent);
  setFieldValue('consumptionTaxExempt', simulation.consumptionTaxExempt);
  setFieldValue('consumptionTaxInterimEnabled', simulation.consumptionTaxInterimEnabled);

  const rateInput = section.querySelector('[data-field="effectiveCorporateTaxRatePercent"]');
  const methodSelect = section.querySelector('[data-field="corporateTaxMethod"]');
  const effectiveRateField = section.querySelector('[data-role="effective-rate-field"]');
  const itemizedFields = section.querySelectorAll('[data-role="itemized-field"]');
  const yenFields = [
    'lossCarryforwardDeduction',
    'enterpriseTaxSettlementDeduction',
    'enterpriseTaxProvisionalDeduction',
    'incomeTaxRefundAddition',
    'itemizedPrefecturalPerCapita',
    'itemizedMunicipalPerCapita',
  ].map((field) => section.querySelector(`[data-field="${field}"]`));

  yenFields.forEach((input) => bindYenInput(input));

  const consumptionMethodSelect = section.querySelector('[data-field="consumptionTaxMethod"]');
  const provisionalTaxEnabledCheckbox = section.querySelector('[data-field="provisionalTaxEnabled"]');
  const consumptionInterimEnabledCheckbox = section.querySelector('[data-field="consumptionTaxInterimEnabled"]');
  const consumptionExemptCheckbox = section.querySelector('[data-field="consumptionTaxExempt"]');
  const simplifiedField = section.querySelector('[data-role="simplified-field"]');
  const provisionalTaxMonthFields = section.querySelectorAll('[data-role="provisional-tax-month-field"]');
  const consumptionMethodGrid = section.querySelector('[data-role="consumption-method-grid"]');
  const consumptionInterimEnabledField = section.querySelector('[data-role="consumption-interim-enabled-field"]');
  const consumptionSettlementMonthField = section.querySelector('[data-role="consumption-settlement-month-field"]');
  const consumptionInterimMonthField = section.querySelector('[data-role="consumption-interim-month-field"]');

  const setFieldGroupInactive = (rootEl, inactive) => {
    if (!rootEl) return;
    rootEl.classList.toggle('tax-forecast-field--disabled', inactive);
    rootEl.querySelectorAll('input, select').forEach((el) => {
      if (inactive) maskControl(el);
      else unmaskControl(el);
    });
  };

  let lastComputedEffectiveRatePercent = null;

  const syncFieldStates = () => {
    const isItemized = methodSelect?.value === 'itemized';
    const isSimplifiedConsumption = consumptionMethodSelect?.value === 'simplified';
    const provisionalTaxEnabled = provisionalTaxEnabledCheckbox?.checked ?? false;
    const consumptionExempt = consumptionExemptCheckbox?.checked ?? false;
    const consumptionInterimEnabled = consumptionInterimEnabledCheckbox?.checked ?? false;
    // 簡易のときだけ実効税率を編集可。検算時は事後実効税率を表示専用
    const rateEditable = !isItemized;

    setFieldGroupInactive(effectiveRateField, !rateEditable);
    if (!rateEditable && rateInput && document.activeElement !== rateInput) {
      if (lastComputedEffectiveRatePercent != null) {
        rateInput.value = String(lastComputedEffectiveRatePercent);
      }
    }

    itemizedFields.forEach((el) => setFieldGroupInactive(el, !isItemized));

    setFieldGroupInactive(consumptionMethodGrid, consumptionExempt);
    if (simplifiedField) {
      const simplifiedLabel = simplifiedField.closest('.tax-forecast-field');
      const simplifiedInactive = consumptionExempt || !isSimplifiedConsumption;
      simplifiedLabel?.classList.toggle('tax-forecast-field--disabled', simplifiedInactive);
      if (simplifiedInactive) maskControl(simplifiedField);
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
    if (consumptionInterimEnabledField) {
      consumptionInterimEnabledField.classList.toggle('tax-forecast-field--disabled', consumptionExempt);
      if (consumptionInterimEnabledCheckbox) {
        consumptionInterimEnabledCheckbox.disabled = consumptionExempt;
      }
    }
    setFieldGroupInactive(consumptionSettlementMonthField, consumptionExempt);
    setFieldGroupInactive(
      consumptionInterimMonthField,
      consumptionExempt || !consumptionInterimEnabled,
    );
  };

  const syncComputedEffectiveRate = (forecast) => {
    const rate = forecast?.corporateTax?.ratePercent;
    lastComputedEffectiveRatePercent = Number.isFinite(rate) ? rate : null;
    syncFieldStates();
  };

  const syncRateInputState = () => {
    syncFieldStates();
  };
  syncRateInputState();

  const readSimulationFromForm = () => {
    const raw = { ...simulation, ...resolveAppSettings()?.taxSimulation };
    raw.regionPreset = regionSelect.value;
    raw.corporateTaxMethod = methodSelect.value;
    // 検算時は入力欄の事後実効税率を保存しない（簡易時のみ手入力を保存）
    if (methodSelect.value !== 'itemized') {
      raw.effectiveCorporateTaxRatePercent = readControlValue(rateInput);
    }
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
    raw.enterpriseTaxSettlementDeduction = readYenInputValue(
      section.querySelector('[data-field="enterpriseTaxSettlementDeduction"]'),
    );
    raw.enterpriseTaxProvisionalDeduction = readYenInputValue(
      section.querySelector('[data-field="enterpriseTaxProvisionalDeduction"]'),
    );
    raw.incomeTaxRefundAddition = readYenInputValue(
      section.querySelector('[data-field="incomeTaxRefundAddition"]'),
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
    raw.consumptionTaxMethod = readControlValue(section.querySelector('[data-field="consumptionTaxMethod"]'));
    raw.simplifiedDeemedPurchaseRatePercent = readControlValue(simplifiedField);
    raw.consumptionTaxExempt = section.querySelector('[data-field="consumptionTaxExempt"]').checked;
    raw.consumptionTaxInterimEnabled = section.querySelector('[data-field="consumptionTaxInterimEnabled"]').checked;
    raw.consumptionTaxSettlementMonthIndex = Number(readControlValue(
      section.querySelector('[data-field="consumptionTaxSettlementMonthIndex"]'),
    ));
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
      // 法人区分切替時は、簡易なら参考税率を欄に流し込む（その後手編集可）
      if (el === regionSelect && methodSelect?.value !== 'itemized' && rateInput) {
        const presetRate = TAX_REGION_PRESETS[regionSelect.value]?.effectiveCorporateTaxRatePercent;
        if (presetRate != null) rateInput.value = String(presetRate);
      }
      syncRateInputState();
      saveSimulation();
    });
  });

  return { syncComputedEffectiveRate };
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
        <div class="tax-forecast-source-period-nav">
          <button type="button" class="tax-forecast-source-period-btn" data-role="source-period-prev" aria-label="前期" title="前期">&lt;</button>
          <div class="tax-forecast-source-period-menu">
            <button
              type="button"
              class="tax-forecast-source-period-trigger"
              data-role="source-period-trigger"
              aria-haspopup="listbox"
              aria-expanded="false"
              aria-controls="tax-forecast-source-period-panel"
              aria-label="計算元の期"
              title="計算元の期"
            ></button>
            <div
              class="tax-forecast-source-period-panel plan-period-select-panel plan-main-menu-panel"
              id="tax-forecast-source-period-panel"
              data-role="source-period-panel"
              role="listbox"
              aria-label="計算元の期"
              hidden
            ></div>
          </div>
          <button type="button" class="tax-forecast-source-period-btn" data-role="source-period-next" aria-label="翌期" title="翌期">&gt;</button>
        </div>
        <p class="app-settings-hint tax-forecast-target-period" data-role="target-period-hint" hidden></p>
      </div>
      <div class="tax-forecast-window-toolbar-actions">
        <button type="button" class="expand-reset-btn tax-forecast-window-reset-btn">デフォルトに戻す</button>
      </div>
    </div>
    <div class="tax-forecast-window-settings">
      <button type="button" class="tax-forecast-window-settings-head" aria-expanded="true" aria-controls="tax-forecast-settings-host">
        <span class="tax-forecast-window-settings-chevron" aria-hidden="true"></span>
        <span class="tax-forecast-window-settings-head-label">試算ルール</span>
      </button>
      <div class="tax-forecast-window-settings-host" id="tax-forecast-settings-host"></div>
    </div>
    <div class="tax-forecast-window-result">
      <div class="tax-forecast-window-result-head">見込み結果</div>
      <div class="tax-forecast-window-result-body" data-role="forecast-result"></div>
    </div>
  `;
  container.appendChild(wrap);

  const settingsSection = wrap.querySelector('.tax-forecast-window-settings');
  const settingsHead = wrap.querySelector('.tax-forecast-window-settings-head');
  const settingsHost = wrap.querySelector('.tax-forecast-window-settings-host');
  const resultEl = wrap.querySelector('[data-role="forecast-result"]');
  const sourcePeriodTrigger = wrap.querySelector('[data-role="source-period-trigger"]');
  const sourcePeriodPanel = wrap.querySelector('[data-role="source-period-panel"]');
  const sourcePeriodPrevBtn = wrap.querySelector('[data-role="source-period-prev"]');
  const sourcePeriodNextBtn = wrap.querySelector('[data-role="source-period-next"]');
  const targetPeriodHint = wrap.querySelector('[data-role="target-period-hint"]');
  let sourcePeriodValue = null;

  const TAX_FORECAST_SETTINGS_COLLAPSED_KEY = 'mga-tax-forecast-settings-collapsed';

  const readSettingsCollapsed = () => {
    try {
      return localStorage.getItem(TAX_FORECAST_SETTINGS_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  };

  const writeSettingsCollapsed = (collapsed) => {
    try {
      localStorage.setItem(TAX_FORECAST_SETTINGS_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const applySettingsCollapsed = (collapsed) => {
    settingsSection?.classList.toggle('is-collapsed', collapsed);
    if (settingsHead) {
      settingsHead.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    if (settingsHost) {
      settingsHost.hidden = collapsed;
    }
  };

  applySettingsCollapsed(readSettingsCollapsed());
  settingsHead?.addEventListener('click', () => {
    const nextCollapsed = !settingsSection?.classList.contains('is-collapsed');
    applySettingsCollapsed(nextCollapsed);
    writeSettingsCollapsed(nextCollapsed);
    onLayoutChange?.();
  });
  const getSourcePeriodItems = () => (
    sourcePeriodPanel
      ? [...sourcePeriodPanel.querySelectorAll('.tax-forecast-source-period-item')]
      : []
  );

  const closeSourcePeriodPanel = ({ returnFocus = false } = {}) => {
    if (!sourcePeriodPanel || !sourcePeriodTrigger) return;
    sourcePeriodPanel.hidden = true;
    sourcePeriodTrigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) sourcePeriodTrigger.focus();
  };

  const openSourcePeriodPanel = () => {
    if (!sourcePeriodPanel || !sourcePeriodTrigger) return;
    sourcePeriodPanel.hidden = false;
    sourcePeriodTrigger.setAttribute('aria-expanded', 'true');
    const current = sourcePeriodPanel.querySelector('[aria-selected="true"]');
    (current ?? getSourcePeriodItems()[0])?.focus();
  };

  const syncSourcePeriodNav = () => {
    const options = getSourcePeriodOptions?.() ?? [];
    const selected = Number(sourcePeriodValue);
    const idx = options.findIndex((o) => o.period === selected);
    if (sourcePeriodPrevBtn) sourcePeriodPrevBtn.disabled = idx <= 0;
    if (sourcePeriodNextBtn) sourcePeriodNextBtn.disabled = idx < 0 || idx >= options.length - 1;
  };

  const applySourcePeriod = (period, { notify = true } = {}) => {
    const options = getSourcePeriodOptions?.() ?? [];
    const matched = options.find((o) => o.period === period) ?? options[0];
    if (!matched) return;
    sourcePeriodValue = matched.period;
    if (sourcePeriodTrigger) sourcePeriodTrigger.textContent = matched.label;
    for (const btn of getSourcePeriodItems()) {
      const isSelected = Number(btn.dataset.period) === matched.period;
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      const check = btn.querySelector('.plan-main-menu-item-check');
      if (check) check.textContent = isSelected ? '✓' : '';
    }
    syncSourcePeriodNav();
    if (notify) {
      onSourcePeriodChange?.(matched.period);
      refreshForecast();
    }
  };

  const syncSourcePeriodSelect = () => {
    if (!sourcePeriodTrigger || !sourcePeriodPanel) return;
    const options = getSourcePeriodOptions?.() ?? [];
    const selected = getSourcePeriod?.() ?? options[0]?.period ?? null;
    sourcePeriodPanel.replaceChildren();
    for (const { period, label } of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'plan-main-menu-item plan-period-select-item tax-forecast-source-period-item';
      btn.role = 'option';
      btn.dataset.period = String(period);
      btn.setAttribute('aria-selected', period === selected ? 'true' : 'false');
      const checkSpan = document.createElement('span');
      checkSpan.className = 'plan-main-menu-item-check';
      checkSpan.setAttribute('aria-hidden', 'true');
      checkSpan.textContent = period === selected ? '✓' : '';
      btn.appendChild(checkSpan);
      const labelSpan = document.createElement('span');
      labelSpan.className = 'plan-main-menu-item-label';
      labelSpan.textContent = label;
      btn.appendChild(labelSpan);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSourcePeriodPanel({ returnFocus: true });
        applySourcePeriod(period);
      });
      sourcePeriodPanel.appendChild(btn);
    }
    applySourcePeriod(selected, { notify: false });
  };

  const stepSourcePeriod = (delta) => {
    const options = getSourcePeriodOptions?.() ?? [];
    const selected = Number(sourcePeriodValue);
    const idx = options.findIndex((o) => o.period === selected);
    const next = options[idx + delta];
    if (!next) return;
    closeSourcePeriodPanel();
    applySourcePeriod(next.period);
  };

  const applySectionColors = () => {
    applyTaxForecastSectionColors(wrap, getSectionFilterColors);
  };

  const syncTargetPeriodHint = (forecast) => {
    if (!targetPeriodHint) return;
    if (!forecast?.currentPeriodLabel || !forecast?.nextPeriodLabel) {
      targetPeriodHint.textContent = '';
      targetPeriodHint.hidden = true;
      return;
    }
    targetPeriodHint.textContent = `${forecast.currentPeriodLabel}の見込をもとに、${forecast.nextPeriodLabel}に支払うキャッシュ見込です。`;
    targetPeriodHint.hidden = false;
  };

  let settingsApi = null;

  const refreshForecast = () => {
    const forecast = computeTaxForecastForDisplay({
      getForecastContext,
      getAppSettings: resolveAppSettings,
    });
    resultEl.innerHTML = buildTaxForecastPanelHtml(forecast, formatYen, { compact: true });
    settingsApi?.syncComputedEffectiveRate?.(forecast);
    syncTargetPeriodHint(forecast);
    applySectionColors();
    onLayoutChange?.();
  };

  syncSourcePeriodSelect();
  sourcePeriodTrigger?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (sourcePeriodPanel?.hidden) openSourcePeriodPanel();
    else closeSourcePeriodPanel();
  });
  sourcePeriodPrevBtn?.addEventListener('click', () => stepSourcePeriod(-1));
  sourcePeriodNextBtn?.addEventListener('click', () => stepSourcePeriod(1));
  document.addEventListener('mousedown', (e) => {
    if (!sourcePeriodPanel || sourcePeriodPanel.hidden) return;
    const nav = wrap.querySelector('.tax-forecast-source-period-nav');
    if (nav?.contains(e.target)) return;
    closeSourcePeriodPanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!sourcePeriodPanel || sourcePeriodPanel.hidden) return;
    e.preventDefault();
    closeSourcePeriodPanel({ returnFocus: true });
  });

  settingsApi = mountTaxForecastSettingsForm(settingsHost, {
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
