/**
 * taxForecastSettingsUi.js generator
 * node scripts/gen-tax-forecast-settings-ui.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(repoRoot, 'src/ui/taxForecastSettingsUi.js');

// Keep modern window UI (mountTaxForecastSettingsForm) intact
if (existsSync(outPath)) {
  const existing = readFileSync(outPath, 'utf8');
  if (existing.includes('mountTaxForecastSettingsForm')) {
    console.log('Skip gen-tax-forecast-settings-ui: modern taxForecastSettingsUi.js already present');
    process.exit(0);
  }
}

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function sq(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const source = `import {
  normalizeTaxSimulation,
  TAX_REGION_PRESETS,
  resolveDefaultTaxPaymentMonthIndices,
} from '../config/taxSimulationConfig.js';
import { computeNextPeriodTaxForecast } from '../enrich/nextPeriodTaxForecast.js';

function yen(value, formatYen) {
  if (value == null || !Number.isFinite(value)) return ${sq(jp(0x2014))};
  return \`¥\${formatYen(value)}\`;
}

function renderScheduleTable(schedule, formatYen) {
  if (!schedule?.length) {
    return \`<p class="app-settings-hint tax-forecast-empty">${jp(0x652f, 0x6255, 0x4e88, 0x5b9a, 0x306f, 0x3042, 0x308a, 0x307e, 0x305b, 0x3093)}</p>\`;
  }
  const rows = schedule.map((row) => \`
    <tr>
      <td>\${row.label ?? ''}</td>
      <td>\${row.monthLabel ?? ''}</td>
      <td class="tax-forecast-amount">\${yen(row.amount, formatYen)}</td>
    </tr>
  \`).join('');
  return \`
    <table class="expand-settings-table tax-forecast-schedule-table">
      <thead>
        <tr>
          <th>${jp(0x533a, 0x5206)}</th>
          <th>${jp(0x652f, 0x6255, 0x6708)}</th>
          <th>${jp(0x91d1, 0x984d)}</th>
        </tr>
      </thead>
      <tbody>\${rows}</tbody>
    </table>
  \`;
}

function renderBasisList(items) {
  if (!items?.length) return '';
  const rows = items.filter(Boolean).map((item) => \`
    <li><span class="tax-forecast-basis-label">\${item.label}</span><span class="tax-forecast-basis-value">\${item.value}</span></li>
  \`).join('');
  return \`<ul class="tax-forecast-basis-list">\${rows}</ul>\`;
}

function renderForecastPanel(forecast, formatYen) {
  if (!forecast) {
    return \`<p class="app-settings-hint tax-forecast-empty">${jp(0x898b, 0x8fbc, 0x307f, 0x3092, 0x8a08, 0x7b97, 0x3067, 0x304d, 0x307e, 0x305b, 0x3093)}</p>\`;
  }
  const warnings = (forecast.warnings ?? []).map((w) => \`<p class="tax-forecast-warning">\${w}</p>\`).join('');
  const profitBasis = [
    { label: ${sq(jp(0x53c2, 0x7167, 0x671f))}, value: forecast.currentPeriodLabel },
    { label: ${sq(jp(0x5e74, 0x9593, 0x898b, 0x8fbc, 0x7a0e, 0x5f15, 0x524d, 0x5229, 0x76ca))}, value: yen(forecast.profitEstimate?.amount, formatYen) },
    { label: ${sq(jp(0x8a08, 0x7b97, 0x65b9, 0x6cd5))}, value: forecast.profitEstimate?.basis ?? '' },
    { label: ${sq(jp(0x88dc, 0x8db3, 0x8aac, 0x660e))}, value: forecast.profitEstimate?.detail ?? '' },
    { label: ${sq(jp(0x7e70, 0x8d8a, 0x6b20, 0x640d, 0x63a7, 0x9664))}, value: yen(forecast.corporateTax?.lossDeduction, formatYen) },
    { label: ${sq(jp(0x8ab2, 0x7a0e, 0x5bfe, 0x8c61, 0x5229, 0x76ca))}, value: yen(forecast.taxableProfit, formatYen) },
    { label: ${sq(jp(0x5730, 0x57df, 0x30fb, 0x5b9f, 0x52b9, 0x7a0e, 0x7387))}, value: \`\${forecast.regionLabel} / \${forecast.corporateTax?.rateLabel ?? ''}\` },
    { label: ${sq(jp(0x5f53, 0x671f, 0x898b, 0x8fbc, 0x6cd5, 0x4eba, 0x7a0e, 0x7b49))}, value: yen(forecast.corporateTax?.annualAmount, formatYen) },
  ];
  const consumptionBasis = [
    { label: ${sq(jp(0x8ab2, 0x7a0e, 0x8a08, 0x7b97, 0x65b9, 0x6cd5))}, value: forecast.consumptionTax?.estimate?.basis ?? '' },
    { label: ${sq(jp(0x88dc, 0x8db3, 0x8aac, 0x660e))}, value: forecast.consumptionTax?.estimate?.detail ?? '' },
    { label: ${sq(jp(0x5f53, 0x671f, 0x898b, 0x8fbc, 0x7d0d, 0x7a0e, 0x984d))}, value: yen(forecast.consumptionTax?.annualAmount, formatYen) },
  ];
  return \`
    \${warnings}
    <div class="tax-forecast-summary-grid">
      <div class="tax-forecast-summary-card">
        <span class="tax-forecast-summary-label">${jp(0x6765, 0x671f, 0x652f, 0x6255, 0x5408, 0x8a08, 0xFF08, 0x6cd5, 0x4eba, 0x7a0e, 0x7b49, 0xFF09)}</span>
        <span class="tax-forecast-summary-value">\${yen(forecast.corporateTax?.totalPaymentInNextPeriod, formatYen)}</span>
      </div>
      <div class="tax-forecast-summary-card">
        <span class="tax-forecast-summary-label">${jp(0x6765, 0x671f, 0x652f, 0x6255, 0x5408, 0x8a08, 0xFF08, 0x6d88, 0x8cbb, 0x7a0e, 0xFF09)}</span>
        <span class="tax-forecast-summary-value">\${yen(forecast.consumptionTax?.totalPaymentInNextPeriod, formatYen)}</span>
      </div>
      <div class="tax-forecast-summary-card tax-forecast-summary-card--total">
        <span class="tax-forecast-summary-label">${jp(0x6765, 0x671f, 0x652f, 0x6255, 0x5408, 0x8a08, 0xff08, 0x7dcf, 0x8a08, 0xff09)}</span>
        <span class="tax-forecast-summary-value">\${yen(forecast.grandTotalPaymentInNextPeriod, formatYen)}</span>
      </div>
    </div>
    <p class="app-settings-hint tax-forecast-target-period">\${forecast.currentPeriodLabel}${jp(0x306e, 0x898b, 0x8fbc, 0x3092, 0x3082, 0x3068, 0x306b, 0x3001)}\${forecast.nextPeriodLabel}${jp(0x306b, 0x652f, 0x6255, 0x4e88, 0x5b9a, 0x3057, 0x305f, 0x91d1, 0x984d, 0x3067, 0x3059, 0x3002)}</p>
    <div class="tax-forecast-detail-grid">
      <div class="tax-forecast-detail-block">
        <h4 class="tax-forecast-detail-title">${jp(0x6cd5, 0x4eba, 0x7a0e, 0x306e, 0x8a08, 0x7b97, 0x6839, 0x62e0)}</h4>
        \${renderBasisList(profitBasis)}
        <h4 class="tax-forecast-detail-title">${jp(0x6765, 0x671f, 0x306e, 0x6cd5, 0x4eba, 0x7a0e, 0x652f, 0x6255, 0x30b9, 0x30b1, 0x30b8, 0x30e5, 0x30fc, 0x30eb)}</h4>
        \${renderScheduleTable(forecast.corporateTax?.schedule, formatYen)}
      </div>
      <div class="tax-forecast-detail-block">
        <h4 class="tax-forecast-detail-title">${jp(0x6d88, 0x8cbb, 0x7a0e, 0x306e, 0x8a08, 0x7b97, 0x6839, 0x62e0)}</h4>
        \${renderBasisList(consumptionBasis)}
        <h4 class="tax-forecast-detail-title">${jp(0x6765, 0x671f, 0x306e, 0x6d88, 0x8cbb, 0x7a0e, 0x652f, 0x6255, 0x30b9, 0x30b1, 0x30b8, 0x30e5, 0x30fc, 0x30eb)}</h4>
        \${renderScheduleTable(forecast.consumptionTax?.schedule, formatYen)}
      </div>
    </div>
    <p class="app-settings-hint tax-forecast-note">${jp(0x203b, 0x3000, 0x8a08, 0x7b97, 0x7528, 0x306e, 0x6982, 0x7b97, 0x3067, 0x3059, 0x3002, 0x7a0e, 0x52d9, 0x7533, 0x544a, 0x306e, 0x4ee3, 0x66ff, 0x306b, 0x306f, 0x306a, 0x308a, 0x307e, 0x305b, 0x3093, 0x3002)}</p>
  \`;
}

function buildMonthSelectOptions(fiscalMonths, selectedIndex) {
  return fiscalMonths.map((label, index) => {
    const selected = index === selectedIndex ? ' selected' : '';
    return \`<option value="\${index}"\${selected}>\${label}</option>\`;
  }).join('');
}

/** ${jp(0x6765, 0x671f, 0x7d0d, 0x7a0e, 0x898b, 0x8fbc, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x3092, 0x6307, 0x5b9a, 0x30b3, 0x30f3, 0x30c6, 0x30ca, 0x306b, 0x30de, 0x30a6, 0x30f3, 0x30c8, 0x3059, 0x308b)} */
export function mountNextPeriodTaxForecastSection(container, {
  appSettings,
  onSaveSettings,
  getForecastContext,
  formatYen,
}) {
  if (!container) return { refresh: () => {} };

  const fiscalEndMonth = getForecastContext()?.fiscalEndMonth ?? 12;
  const fiscalMonths = resolveDefaultTaxPaymentMonthIndices(fiscalEndMonth).fiscalMonths;
  const simulation = normalizeTaxSimulation(appSettings?.taxSimulation, fiscalEndMonth);

  const section = document.createElement('div');
  section.className = 'app-settings-section tax-rate-section tax-rate-section--forecast';
  section.innerHTML = \`
    <div class="tax-rate-section-head">
      <span class="app-settings-label">${jp(0x6765, 0x671f, 0x7d0d, 0x7a0e, 0x898b, 0x8fbc, 0x307f)}</span>
      <span class="app-settings-hint tax-rate-section-hint">${jp(0x5f53, 0x671f, 0x306e, 0x4e88, 0x5b9f, 0x30fb, 0x8a08, 0x7b97, 0x304b, 0x3089, 0x6765, 0x671f, 0x306b, 0x652f, 0x6255, 0x4e88, 0x5b9a, 0x3059, 0x308b, 0x6cd5, 0x4eba, 0x7a0e, 0x3068, 0x6d88, 0x8cbb, 0x7a0e, 0xFF08, 0x4e88, 0x5b9a, 0x7d0d, 0x7a0e, 0x542b, 0x3080, 0xFF09, 0x3092, 0x8868, 0x793a, 0x3057, 0x307e, 0x3059, 0x3002)}</span>
    </div>
    <div class="tax-forecast-settings-grid">
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x5730, 0x57df, 0x30d7, 0x30ea, 0x30bb, 0x30c3, 0x30c8)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="regionPreset"></select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x5b9f, 0x52b9, 0x6cd5, 0x4eba, 0x7a0e, 0x7387, 0xFF08, 0x25, 0xFF09)}</span>
        <input type="number" class="app-settings-input tax-forecast-input" data-field="effectiveCorporateTaxRatePercent" min="0" max="100" step="0.01" />
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x5229, 0x76ca, 0x898b, 0x8fbc, 0x65b9, 0x6cd5)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="profitEstimateMethod">
          <option value="annualize">${jp(0x5b9f, 0x7e3e, 0x304b, 0x3089, 0x5e74, 0x9593, 0x63db, 0x7b97)}</option>
          <option value="fullYear">${jp(0x901a, 0x671f, 0x5408, 0x8a08, 0x3092, 0x4f7f, 0x7528)}</option>
        </select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x7e70, 0x8d8a, 0x6b20, 0x640d, 0x63a7, 0x9664, 0xFF08, 0x5186, 0xFF09)}</span>
        <input type="number" class="app-settings-input tax-forecast-input" data-field="lossCarryforwardDeduction" min="0" step="1000" />
      </label>
      <label class="tax-forecast-field tax-forecast-field--checkbox">
        <input type="checkbox" data-field="provisionalTaxEnabled" />
        <span class="app-settings-label">${jp(0x6765, 0x671f, 0x306e, 0x4e88, 0x5b9a, 0x7d0d, 0x7a0e, 0x3092, 0x542b, 0x3081, 0x308b)}</span>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x4e88, 0x5b9a, 0x7d0d, 0x7a0e, 0x56de, 0x6570)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="provisionalTaxInstallments">
          <option value="1">${jp(0x31, 0x56de)}</option>
          <option value="2">${jp(0x32, 0x56de)}</option>
        </select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x6cd5, 0x4eba, 0x7a0e, 0x3000, 0x78ba, 0x5b9a, 0x6708, 0xFF08, 0x6765, 0x671f, 0xFF09)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="corporateTaxSettlementMonthIndex"></select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x4e88, 0x5b9a, 0x7d0d, 0x7a0e, 0x6708, 0x31, 0xFF08, 0x6765, 0x671f, 0xFF09)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="provisionalTaxMonthIndices.0"></select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x4e88, 0x5b9a, 0x7d0d, 0x7a0e, 0x6708, 0x32, 0xFF08, 0x6765, 0x671f, 0xFF09)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="provisionalTaxMonthIndices.1"></select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x6d88, 0x8cbb, 0x7a0e, 0x8a08, 0x7b97)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="consumptionTaxMethod">
          <option value="general">${jp(0x672c, 0x5247, 0x8ab2, 0x7a0e)}</option>
          <option value="simplified">${jp(0x7c21, 0x6613, 0x8ab2, 0x7a0e)}</option>
        </select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x307f, 0x306a, 0x3057, 0x4ed5, 0x5165, 0x7387, 0xFF08, 0x25, 0xFF09)}</span>
        <input type="number" class="app-settings-input tax-forecast-input" data-field="simplifiedDeemedPurchaseRatePercent" min="0" max="100" step="1" />
      </label>
      <label class="tax-forecast-field tax-forecast-field--checkbox">
        <input type="checkbox" data-field="consumptionTaxInterimEnabled" />
        <span class="app-settings-label">${jp(0x6765, 0x671f, 0x306e, 0x6d88, 0x8cbb, 0x7a0e, 0x4e2d, 0x9593, 0x7d0d, 0x7a0e, 0x3092, 0x542b, 0x3081, 0x308b)}</span>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x6d88, 0x8cbb, 0x7a0e, 0x3000, 0x78ba, 0x5b9a, 0x6708, 0xFF08, 0x6765, 0x671f, 0xFF09)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="consumptionTaxSettlementMonthIndex"></select>
      </label>
      <label class="tax-forecast-field">
        <span class="app-settings-label">${jp(0x6d88, 0x8cbb, 0x7a0e, 0x3000, 0x4e2d, 0x9593, 0x6708, 0xFF08, 0x6765, 0x671f, 0xFF09)}</span>
        <select class="app-settings-input tax-forecast-select" data-field="consumptionTaxInterimMonthIndex"></select>
      </label>
    </div>
    <div class="tax-forecast-result" data-role="forecast-result"></div>
  \`;
  container.appendChild(section);

  const regionSelect = section.querySelector('[data-field="regionPreset"]');
  regionSelect.innerHTML = Object.entries(TAX_REGION_PRESETS).map(([key, preset]) => {
    const selected = key === simulation.regionPreset ? ' selected' : '';
    return \`<option value="\${key}"\${selected}>\${preset.label}</option>\`;
  }).join('');

  const monthFields = [
    'corporateTaxSettlementMonthIndex',
    'provisionalTaxMonthIndices.0',
    'provisionalTaxMonthIndices.1',
    'consumptionTaxSettlementMonthIndex',
    'consumptionTaxInterimMonthIndex',
  ];
  const monthIndexMap = {
    'provisionalTaxMonthIndices.0': simulation.provisionalTaxMonthIndices[0],
    'provisionalTaxMonthIndices.1': simulation.provisionalTaxMonthIndices[1],
    corporateTaxSettlementMonthIndex: simulation.corporateTaxSettlementMonthIndex,
    consumptionTaxSettlementMonthIndex: simulation.consumptionTaxSettlementMonthIndex,
    consumptionTaxInterimMonthIndex: simulation.consumptionTaxInterimMonthIndex,
  };
  for (const field of monthFields) {
    const el = section.querySelector(\`[data-field="\${field}"]\`);
    if (!el) continue;
    el.innerHTML = buildMonthSelectOptions(fiscalMonths, monthIndexMap[field] ?? 0);
  }

  const setFieldValue = (field, value) => {
    const el = section.querySelector(\`[data-field="\${field}"]\`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else el.value = String(value ?? '');
  };

  setFieldValue('effectiveCorporateTaxRatePercent', simulation.effectiveCorporateTaxRatePercent);
  setFieldValue('profitEstimateMethod', simulation.profitEstimateMethod);
  setFieldValue('lossCarryforwardDeduction', simulation.lossCarryforwardDeduction);
  setFieldValue('provisionalTaxEnabled', simulation.provisionalTaxEnabled);
  setFieldValue('provisionalTaxInstallments', simulation.provisionalTaxInstallments);
  setFieldValue('consumptionTaxMethod', simulation.consumptionTaxMethod);
  setFieldValue('simplifiedDeemedPurchaseRatePercent', simulation.simplifiedDeemedPurchaseRatePercent);
  setFieldValue('consumptionTaxInterimEnabled', simulation.consumptionTaxInterimEnabled);

  const rateInput = section.querySelector('[data-field="effectiveCorporateTaxRatePercent"]');
  const syncRateInputState = () => {
    const isCustom = regionSelect.value === 'custom';
    rateInput.disabled = !isCustom;
    if (!isCustom) {
      const presetRate = TAX_REGION_PRESETS[regionSelect.value]?.effectiveCorporateTaxRatePercent;
      if (presetRate != null) rateInput.value = String(presetRate);
    }
  };
  syncRateInputState();

  const resultEl = section.querySelector('[data-role="forecast-result"]');

  const readSimulationFromForm = () => {
    const raw = { ...simulation, ...appSettings?.taxSimulation };
    raw.regionPreset = regionSelect.value;
    raw.effectiveCorporateTaxRatePercent = rateInput.value;
    raw.profitEstimateMethod = section.querySelector('[data-field="profitEstimateMethod"]').value;
    raw.lossCarryforwardDeduction = section.querySelector('[data-field="lossCarryforwardDeduction"]').value;
    raw.provisionalTaxEnabled = section.querySelector('[data-field="provisionalTaxEnabled"]').checked;
    raw.provisionalTaxInstallments = Number(section.querySelector('[data-field="provisionalTaxInstallments"]').value);
    raw.corporateTaxSettlementMonthIndex = Number(section.querySelector('[data-field="corporateTaxSettlementMonthIndex"]').value);
    raw.provisionalTaxMonthIndices = [
      Number(section.querySelector('[data-field="provisionalTaxMonthIndices.0"]').value),
      Number(section.querySelector('[data-field="provisionalTaxMonthIndices.1"]').value),
    ];
    raw.consumptionTaxMethod = section.querySelector('[data-field="consumptionTaxMethod"]').value;
    raw.simplifiedDeemedPurchaseRatePercent = section.querySelector('[data-field="simplifiedDeemedPurchaseRatePercent"]').value;
    raw.consumptionTaxInterimEnabled = section.querySelector('[data-field="consumptionTaxInterimEnabled"]').checked;
    raw.consumptionTaxSettlementMonthIndex = Number(section.querySelector('[data-field="consumptionTaxSettlementMonthIndex"]').value);
    raw.consumptionTaxInterimMonthIndex = Number(section.querySelector('[data-field="consumptionTaxInterimMonthIndex"]').value);
    return normalizeTaxSimulation(raw, fiscalEndMonth);
  };

  const refreshForecast = () => {
    const ctx = getForecastContext?.();
    const nextSimulation = readSimulationFromForm();
    if (!ctx) {
      resultEl.innerHTML = renderForecastPanel(null, formatYen);
      return;
    }
    const forecast = computeNextPeriodTaxForecast({
      ...ctx,
      taxSimulation: nextSimulation,
      consumptionTaxRates: appSettings?.consumptionTaxRates,
    });
    resultEl.innerHTML = renderForecastPanel(forecast, formatYen);
  };

  const saveSimulation = () => {
    const nextSimulation = readSimulationFromForm();
    onSaveSettings?.({ taxSimulation: nextSimulation });
    refreshForecast();
  };

  section.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('change', () => {
      syncRateInputState();
      saveSimulation();
    });
  });

  refreshForecast();
  return { refresh: refreshForecast };
}
`;

writeFileSync(resolve(repoRoot, 'src/ui/taxForecastSettingsUi.js'), source, 'utf8');
console.log('Generated src/ui/taxForecastSettingsUi.js');
