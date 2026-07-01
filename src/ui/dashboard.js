import { FISCAL_MONTHS, formatYen } from '../parse/parseJournal.js';
import { buildMonthYearMap, formatFiscalPeriodLabel } from '../config/appSettings.js';

const DASHBOARD_KESSAN = '決算整理';
const DASHBOARD_GOUKEI = '合計';
const DASHBOARD_HOJO_NASHI = '補助科目なし';
const DASHBOARD_GENKIN_TOTAL = '現金及び預金合計';
const DASHBOARD_TSUKI = '月';
const DASHBOARD_NEN = '年';
const DASHBOARD_YEN = '￥';
const DASHBOARD_INFLOW_MINUS_OUTFLOW = '収入−支出';
const DASHBOARD_CURRENT_PERIOD = '今期';
const DASHBOARD_PREV_PERIOD = '前期';
const DASHBOARD_PREV_PREV_PERIOD = '前々期';

const DASHBOARD_DISPLAY_MONTHS = FISCAL_MONTHS.filter((m) => m !== DASHBOARD_KESSAN);
const REVENUE_SECTION_IDS = ['revenue', 'nonOperating'];
const EXPENSE_SECTION_IDS = ['personnel', 'expense', 'outsourcing', 'other', 'tax', 'nonOperatingExpense'];
const DASHBOARD_CHART_MODES = [
  { id: 'balance', label: '収支推移' },
  { id: 'revenue', label: '収益推移' },
  { id: 'expense', label: '支出推移' },
];
const DASHBOARD_CHECK_STORAGE_KEY = 'mga-dashboard-checks';
const DASH_COLOR_INCOME = '#0000ff';
const DASH_COLOR_EXPENSE = '#ff0000';
const DASH_COLOR_BAR = '#ff8800';
const DASH_ITEM_COLORS = [
  '#4C78A8', '#F58518', '#54A24B', '#E45756', '#72B7B2', '#EECA3B', '#B279A2', '#FF6B45',
  '#4ECDC4', '#F0A202', '#9D7BD8', '#E8838A', '#3D9970', '#FFB347', '#6A8EAE', '#D4A574',
  '#59C9A5', '#C75146', '#7B9ACC', '#E8C547', '#88B04B', '#E08E79', '#5DA5DA', '#A0A0A0',
  '#95DE64', '#FF85C0', '#597EF7', '#FFA940', '#36CFC9', '#9254DE', '#FFC069', '#69B1FF',
];

let dashboardMountCtx = null;
let dashGradientSeq = 0;

function dashNextGradId(prefix) {
  dashGradientSeq += 1;
  return `dash-${prefix}-${dashGradientSeq}`;
}

function dashFindSection(sections, id) {
  return sections?.find((s) => s.id === id) ?? null;
}

function dashFindRow(section, rowId) {
  return section?.rows?.find((r) => r.id === rowId) ?? null;
}

function dashItemKey(sectionId, row) {
  return `${sectionId}:${row.id}`;
}

function dashDisplayName(row) {
  const sub = String(row.subLabel ?? '').trim();
  if (sub && sub !== DASHBOARD_HOJO_NASHI) return sub;
  return String(row.label ?? '').trim();
}

function dashCollectBreakdownItems(sections, sectionIds) {
  const items = [];
  for (const sectionId of sectionIds) {
    const section = dashFindSection(sections, sectionId);
    if (!section?.rows) continue;
    for (const row of section.rows) {
      if (row.type !== 'item' && row.type !== 'group') continue;
      const total = row.values?.[DASHBOARD_GOUKEI] ?? 0;
      if (total === 0) continue;
      items.push({
        key: dashItemKey(sectionId, row),
        sectionId,
        row,
        name: dashDisplayName(row),
        total,
        values: row.values ?? {},
      });
    }
  }
  items.sort((a, b) => b.total - a.total);
  return items;
}

function dashFormatMonthAxisLabel(month, monthYearMap) {
  const year = monthYearMap[month];
  if (year == null) return month;
  const re = new RegExp('^(\\d{1,2})' + DASHBOARD_TSUKI + '$');
  const m = month.match(re);
  if (!m) return month;
  return `${year}${DASHBOARD_NEN}${m[1]}${DASHBOARD_TSUKI}`;
}

function dashLoadCheckedKeys(period, allKeys) {
  try {
    const raw = localStorage.getItem(DASHBOARD_CHECK_STORAGE_KEY);
    if (!raw) return new Set(allKeys);
    const parsed = JSON.parse(raw);
    const saved = parsed?.[period];
    if (!Array.isArray(saved)) return new Set(allKeys);
    return new Set(saved.filter((k) => allKeys.includes(k)));
  } catch {
    return new Set(allKeys);
  }
}

function dashSaveCheckedKeys(period, checkedKeys) {
  try {
    const raw = localStorage.getItem(DASHBOARD_CHECK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[period] = [...checkedKeys];
    localStorage.setItem(DASHBOARD_CHECK_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

function dashSumCheckedMonthly(items, checkedKeys, month) {
  let total = 0;
  for (const item of items) {
    if (!checkedKeys.has(item.key)) continue;
    total += item.values[month] ?? 0;
  }
  return total;
}

function dashColorForItemIndex(index) {
  return DASH_ITEM_COLORS[index % DASH_ITEM_COLORS.length];
}

function dashBuildItemColorMap(items) {
  const map = new Map();
  items.forEach((item, index) => {
    map.set(item.key, dashColorForItemIndex(index));
  });
  return map;
}

function dashBuildStackedSeries(items, checkedKeys, colorMap) {
  return items
    .filter((item) => checkedKeys.has(item.key))
    .map((item) => ({
      key: item.key,
      label: item.name,
      color: colorMap.get(item.key) ?? DASH_COLOR_BAR,
      values: DASHBOARD_DISPLAY_MONTHS.map((month) => Math.abs(item.values[month] ?? 0)),
    }));
}

function dashEscapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dashEscapeSeriesKeyForSelector(seriesKey) {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(seriesKey)
    : String(seriesKey).replace(/["\\]/g, '\\$&');
}

function dashClearChartHighlightOutlines(wrap) {
  if (!wrap) return;
  wrap.querySelectorAll('.dashboard-chart-highlight-layer').forEach((layer) => {
    layer.replaceChildren();
  });
}

function dashSyncChartHighlightOutlines(wrap, seriesKey) {
  dashClearChartHighlightOutlines(wrap);
  if (!wrap || !seriesKey) return;
  const escaped = dashEscapeSeriesKeyForSelector(seriesKey);
  wrap.querySelectorAll(`.dashboard-chart-segment[data-series-key="${escaped}"]`).forEach((seg) => {
    const layer = seg.ownerSVGElement?.querySelector('.dashboard-chart-highlight-layer');
    if (!layer) return;
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outline.setAttribute('class', 'dashboard-chart-segment-outline');
    outline.setAttribute('x', seg.getAttribute('x') ?? '0');
    outline.setAttribute('y', seg.getAttribute('y') ?? '0');
    outline.setAttribute('width', seg.getAttribute('width') ?? '0');
    outline.setAttribute('height', seg.getAttribute('height') ?? '0');
    outline.setAttribute('rx', seg.getAttribute('rx') || '1');
    outline.setAttribute('fill', 'none');
    outline.setAttribute('pointer-events', 'none');
    layer.appendChild(outline);
  });
}

function dashSetSeriesHighlight(wrap, seriesKey, active, sidebarRoot = null, { scrollSidebar = false } = {}) {
  if (!wrap) return;
  if (active && seriesKey) {
    dashSyncChartHighlightOutlines(wrap, seriesKey);
  } else {
    dashClearChartHighlightOutlines(wrap);
  }
  if (!seriesKey) return;
  const escaped = dashEscapeSeriesKeyForSelector(seriesKey);
  wrap.querySelectorAll(`.dashboard-chart-legend-chip[data-series-key="${escaped}"]`).forEach((el) => {
    el.classList.toggle('is-highlighted', active);
  });
  if (sidebarRoot) {
    sidebarRoot.querySelectorAll(`.dashboard-sidebar-row[data-series-key="${escaped}"]`).forEach((el) => {
      el.classList.toggle('is-series-highlighted', active);
      if (active && scrollSidebar) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}

function dashBindChartSeriesHover(chartContainer, highlightWrap, sidebarRoot) {
  if (!highlightWrap || !sidebarRoot) return;
  const bind = (el) => {
    const key = el.getAttribute('data-series-key');
    if (!key) return;
    el.addEventListener('mouseenter', () => dashSetSeriesHighlight(highlightWrap, key, true, sidebarRoot, { scrollSidebar: true }));
    el.addEventListener('mouseleave', () => dashSetSeriesHighlight(highlightWrap, key, false, sidebarRoot));
  };
  chartContainer.querySelectorAll('.dashboard-chart-legend-chip[data-series-key]').forEach(bind);
}

function dashRenderStackedLegendHtml(series) {
  if (!series.length) return '';
  return series.map((s) =>
    `<span class="dashboard-chart-legend-chip" data-series-key="${dashEscapeHtml(s.key)}"><span class="dashboard-chart-legend-swatch" style="background:${s.color}"></span>${dashEscapeHtml(s.label)}</span>`,
  ).join('');
}

function dashBuildMonthlySeries(data, appSettings) {
  const sections = data?.sections ?? [];
  const monthYearMap = buildMonthYearMap(appSettings.businessStartYear, appSettings.fiscalPeriod);
  const cfIn = dashFindRow(dashFindSection(sections, 'cfIn'), 'cf-in')?.values ?? {};
  const cfOut = dashFindRow(dashFindSection(sections, 'cfOut'), 'cf-out')?.values ?? {};
  const profitSection = dashFindSection(sections, 'profit');
  const ordProfit = profitSection?.rows?.find((r) => r.id === 'ord-profit')?.values ?? {};
  const cashSection = dashFindSection(sections, 'cashBalance');
  const cashRow = cashSection?.rows?.find(
    (r) => r.type === 'total' || String(r.label ?? '').includes(DASHBOARD_GENKIN_TOTAL),
  );
  const cashValues = cashRow?.values ?? {};

  return DASHBOARD_DISPLAY_MONTHS.map((month) => ({
    month,
    label: dashFormatMonthAxisLabel(month, monthYearMap),
    inflow: Math.abs(cfIn[month] ?? 0),
    outflow: Math.abs(cfOut[month] ?? 0),
    profit: ordProfit[month] ?? 0,
    cash: cashValues[month] ?? 0,
  }));
}

function dashSplitMonthLabel(fullLabel) {
  const re = new RegExp('^(\\d{4})' + DASHBOARD_NEN + '(\\d{1,2})' + DASHBOARD_TSUKI + '$');
  const m = String(fullLabel ?? '').match(re);
  if (!m) return { year: '', month: fullLabel };
  return { year: `${m[1]}${DASHBOARD_NEN}`, month: `${m[2]}${DASHBOARD_TSUKI}` };
}

function dashNiceStepCandidates(roughStep) {
  const mag = 10 ** Math.floor(Math.log10(Math.abs(roughStep) || 1));
  const finer = mag / 10;
  const multiples = [1, 1.5, 2, 2.5, 5, 10];
  const candidates = new Set();
  for (const base of [finer, mag, mag * 10]) {
    for (const f of multiples) {
      candidates.add(f * base);
    }
  }
  return [...candidates].filter((s) => s > 0).sort((a, b) => a - b);
}

function dashPickStepForSpan(span, targetTicks = 6) {
  const safeSpan = Math.max(span, 1);
  const roughStep = safeSpan / Math.max(1, targetTicks - 1);
  const candidates = dashNiceStepCandidates(roughStep);
  let best = null;
  let bestScore = Infinity;
  for (const step of candidates) {
    const count = Math.floor(safeSpan / step) + 1;
    if (count < 3 || count > 10) continue;
    const score = Math.abs(count - targetTicks) + Math.max(0, count - 8) * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = step;
    }
  }
  if (best == null) {
    best = candidates.find((step) => {
      const count = Math.floor(safeSpan / step) + 1;
      return count >= 3 && count <= 10;
    }) ?? candidates[Math.max(0, Math.floor(candidates.length / 2))] ?? 1;
  }
  return best;
}

function dashComputeYAxisScale(dataMin, dataMax, { clampMinZero = false, includeZero = false, targetTicks = 6 } = {}) {
  let min = Number.isFinite(dataMin) ? dataMin : 0;
  let max = Number.isFinite(dataMax) ? dataMax : 1;
  if (clampMinZero) min = 0;
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) {
    if (max <= 0) {
      min = max - 1;
      max = 0;
    } else {
      min = clampMinZero ? 0 : min;
      max = max || 1;
    }
  }

  let scaleMin = clampMinZero ? 0 : min;
  let scaleMax = max;
  const dataSpan = Math.max(scaleMax - scaleMin, 1);
  const step = dashPickStepForSpan(dataSpan, targetTicks);

  const tickStart = clampMinZero ? 0 : Math.floor(scaleMin / step) * step;
  const tickEnd = Math.ceil(scaleMax / step) * step;
  scaleMin = clampMinZero ? 0 : tickStart;
  scaleMax = tickEnd;

  const ticks = [];
  for (let t = tickStart; t <= scaleMax + step * 1e-9; t += step) {
    if (t >= scaleMin - step * 1e-9) ticks.push(t);
  }
  if (ticks.length === 0) ticks.push(scaleMin);
  if (includeZero && scaleMin < 0 && scaleMax > 0 && !ticks.some((t) => Math.abs(t) < step * 1e-9)) {
    ticks.push(0);
    ticks.sort((a, b) => a - b);
  }

  const span = scaleMax - scaleMin || 1;
  return { min: scaleMin, max: scaleMax, ticks, span };
}

function dashMakeYScale(scale, pad, plotH) {
  return (v) => pad.top + plotH - ((v - scale.min) / scale.span) * plotH;
}

function dashRenderYAxisGrid(scale, yScale, pad, width, { negativeTicksRed = false } = {}) {
  let markup = '';
  for (const val of scale.ticks) {
    const y = yScale(val);
    markup += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="dashboard-chart-grid"/>`;
    const negClass = negativeTicksRed && val < 0 ? ' dashboard-chart-axis-y--negative' : '';
    markup += `<text x="${pad.left - 8}" y="${y + 4}" class="dashboard-chart-axis-y${negClass}" text-anchor="end">${dashFormatAxisYen(val)}</text>`;
  }
  return markup;
}

function dashChartLayout({ width, plotH, left = 112, right = 16, top = 28, hasLegend = false }) {
  const axisGap = 12;
  const monthRow = 11;
  const yearRow = 11;
  const rowGap = 6;
  const legendGap = 8;
  const legendRow = 14;
  const bottomPad = 8;
  const axisH = axisGap + monthRow + rowGap + yearRow;
  const legendH = hasLegend ? legendGap + legendRow : 0;
  const bottom = axisH + legendH + bottomPad;
  const height = top + plotH + bottom;
  const plotBottom = top + plotH;
  const monthY = plotBottom + axisGap;
  const yearY = monthY + monthRow + rowGap;
  const legendY = yearY + yearRow + legendGap;
  return {
    width,
    height,
    pad: { top, right, bottom, left },
    plotW: width - left - right,
    plotH,
    plotBottom,
    plotTop: top,
    monthY,
    yearY,
    legendY,
  };
}

function dashRenderPlotClip(layout, clipId) {
  const { pad, plotW, plotH } = layout;
  return `<clipPath id="${clipId}"><rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}"/></clipPath>`;
}

function dashRenderXAxisLabelsTwoRow(labels, xScale, layout) {
  const { monthY, yearY } = layout;
  let markup = '';
  let prevYear = null;
  for (let i = 0; i < labels.length; i += 1) {
    const x = xScale(i);
    const { year, month } = dashSplitMonthLabel(labels[i]);
    markup += `<text x="${x}" y="${monthY}" class="dashboard-chart-axis-x" text-anchor="middle" dominant-baseline="hanging">${month}</text>`;
    if (year && year !== prevYear) {
      markup += `<text x="${x}" y="${yearY}" class="dashboard-chart-axis-year" text-anchor="middle" dominant-baseline="hanging">${year}</text>`;
      prevYear = year;
    }
  }
  return markup;
}

function dashRenderCenteredLegend(legend, pad, plotW, legendY) {
  const itemWidth = 88;
  const totalW = legend.length * itemWidth;
  let x = pad.left + (plotW - totalW) / 2;
  return legend.map((item) => {
    const cx = x + 6;
    const tx = x + 18;
    const sw = 8;
    x += itemWidth;
    return `<rect x="${cx - sw / 2}" y="${legendY - sw / 2}" width="${sw}" height="${sw}" fill="${item.color}" rx="1"/><text x="${tx}" y="${legendY + 4}" class="dashboard-chart-legend" text-anchor="start">${item.label}</text>`;
  }).join('');
}

function dashRenderSvgGroupedBarChart(container, series, labels, { title, legend, headerClass, targetTicks = 6 }) {
  const width = 900;
  const layout = dashChartLayout({ width, plotH: 250, right: 16, hasLegend: true });
  const { pad, plotW, plotH, plotBottom, height } = layout;
  const clipId = dashNextGradId('clip');
  const allValues = series.flatMap((s) => s.values.map((v) => Math.abs(v ?? 0)));
  const dataMax = Math.max(0, ...allValues, 0);
  const paddedMax = dataMax > 0 ? dataMax * 1.08 : 1;
  const yAxis = dashComputeYAxisScale(0, paddedMax, { clampMinZero: true, targetTicks });
  const yScale = dashMakeYScale(yAxis, pad, plotH);
  const groupCount = labels.length;
  const barGroupW = plotW / Math.max(1, groupCount);
  const barGap = 4;
  const barW = Math.min(16, Math.max(6, (barGroupW - barGap) / series.length - 2));
  const totalBarWidth = series.length * barW + (series.length - 1) * barGap;

  const gridLines = dashRenderYAxisGrid(yAxis, yScale, pad, width);

  let bars = '';
  labels.forEach((label, gi) => {
    const groupLeft = pad.left + barGroupW * gi;
    const cx = groupLeft + barGroupW / 2;
    series.forEach((s, si) => {
      const val = Math.abs(s.values[gi] ?? 0);
      const x = cx - totalBarWidth / 2 + si * (barW + barGap);
      const y = yScale(val);
      bars += `<rect class="dashboard-chart-bar" data-month-index="${gi}" data-series-index="${si}" x="${x}" y="${y}" width="${barW}" height="${Math.max(0, plotBottom - y)}" fill="${s.color}" rx="2"/>`;
    });
  });

  const xScale = (i) => pad.left + barGroupW * i + barGroupW / 2;
  const xLabels = dashRenderXAxisLabelsTwoRow(labels, xScale, layout);
  const legendItems = dashRenderCenteredLegend(legend, pad, plotW, layout.legendY);

  container.innerHTML = `
    <div class="dashboard-chart-title ${headerClass ?? ''}">${title}</div>
    <div class="dashboard-bar-chart-wrap">
      <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs>${dashRenderPlotClip(layout, clipId)}</defs>
        ${gridLines}
        <g clip-path="url(#${clipId})">${bars}</g>
        ${dashRenderBarChartInteractionMarkup(pad, plotW, plotH)}
        ${xLabels}
        ${legendItems}
      </svg>
      ${dashRenderBarChartTooltipMarkup()}
    </div>`;
  dashBindGroupedBarChartHover(container, { series, labels, layout, xScale, yScale });
}

function dashFormatDisplayYenParts(value) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return null;
  }
  const n = Number(value);
  return {
    sign: n < 0 ? '-' : '',
    amount: Math.abs(n).toLocaleString('ja-JP'),
  };
}

function dashFormatDisplayYenText(value) {
  const parts = dashFormatDisplayYenParts(value);
  if (!parts) return '—';
  return `${parts.sign}${DASHBOARD_YEN}${parts.amount}`;
}

function dashFormatDisplayYenHtml(value) {
  const parts = dashFormatDisplayYenParts(value);
  if (!parts) return '—';
  const n = Number(value);
  const negClass = n < 0 ? ' amount-negative' : '';
  return `<span class="dashboard-yen-value${negClass}">${parts.sign}<span class="dashboard-yen-mark">${DASHBOARD_YEN}</span>${parts.amount}</span>`;
}

function dashFormatAxisYen(value) {
  return dashFormatDisplayYenText(Math.round(value));
}

function dashFormatSidebarYenHtml(value) {
  return dashFormatDisplayYenHtml(value);
}

function dashSmoothCurvePath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function dashNearestLineChartIndex(svgX, labels, xScale) {
  if (labels.length <= 1) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < labels.length; i += 1) {
    const dist = Math.abs(xScale(i) - svgX);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function dashSvgClientToView(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * vb.width,
    y: ((clientY - rect.top) / rect.height) * vb.height,
  };
}

function dashSvgViewToClient(svg, viewX, viewY) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return {
    x: rect.left + (viewX / vb.width) * rect.width,
    y: rect.top + (viewY / vb.height) * rect.height,
  };
}

function dashBindLineChartHover(container, {
  values,
  labels,
  layout,
  xScale,
  yScale,
  prevValues = null,
  prevPrevValues = null,
}) {
  const wrap = container.querySelector('.dashboard-line-chart-wrap');
  const svg = container.querySelector('.dashboard-chart-svg');
  const hoverRect = svg?.querySelector('.dashboard-line-chart-hover');
  const snapLine = svg?.querySelector('.dashboard-line-chart-snap-line');
  const snapDotCurrent = svg?.querySelector('.dashboard-line-chart-snap-dot--current');
  const snapDotPrev = svg?.querySelector('.dashboard-line-chart-snap-dot--prev');
  const snapDotPrevPrev = svg?.querySelector('.dashboard-line-chart-snap-dot--prev-prev');
  const tooltip = container.querySelector('.dashboard-line-chart-tooltip');
  const monthEl = tooltip?.querySelector('.dashboard-line-chart-tooltip-month');
  const rowsEl = tooltip?.querySelector('.dashboard-line-chart-tooltip-rows');
  if (!wrap || !svg || !hoverRect || !snapLine || !snapDotCurrent || !tooltip || !monthEl || !rowsEl) return;

  const { plotTop, plotBottom } = layout;
  const hasPrev = Boolean(prevValues?.length);
  const hasPrevPrev = Boolean(prevPrevValues?.length);
  const hasComparison = hasPrev || hasPrevPrev;

  const hide = () => {
    snapLine.setAttribute('opacity', '0');
    snapDotCurrent.setAttribute('opacity', '0');
    snapDotPrev?.setAttribute('opacity', '0');
    snapDotPrevPrev?.setAttribute('opacity', '0');
    tooltip.hidden = true;
  };

  const showAt = (idx) => {
    const x = xScale(idx);
    const val = values[idx] ?? 0;
    const y = yScale(val);
    snapLine.setAttribute('x1', String(x));
    snapLine.setAttribute('x2', String(x));
    snapLine.setAttribute('y1', String(plotTop));
    snapLine.setAttribute('y2', String(plotBottom));
    snapLine.setAttribute('opacity', '1');
    snapDotCurrent.setAttribute('cx', String(x));
    snapDotCurrent.setAttribute('cy', String(y));
    snapDotCurrent.setAttribute('opacity', '1');

    const rows = hasComparison
      ? [{ label: DASHBOARD_CURRENT_PERIOD, value: val }]
      : [{ label: '', value: val }];
    const anchorY = y;

    if (hasPrev && snapDotPrev) {
      const prevVal = prevValues[idx] ?? 0;
      const prevY = yScale(prevVal);
      snapDotPrev.setAttribute('cx', String(x));
      snapDotPrev.setAttribute('cy', String(prevY));
      snapDotPrev.setAttribute('opacity', '1');
      rows.push({ label: DASHBOARD_PREV_PERIOD, value: prevVal });
    } else {
      snapDotPrev?.setAttribute('opacity', '0');
    }

    if (hasPrevPrev && snapDotPrevPrev) {
      const prevPrevVal = prevPrevValues[idx] ?? 0;
      const prevPrevY = yScale(prevPrevVal);
      snapDotPrevPrev.setAttribute('cx', String(x));
      snapDotPrevPrev.setAttribute('cy', String(prevPrevY));
      snapDotPrevPrev.setAttribute('opacity', '1');
      rows.push({ label: DASHBOARD_PREV_PREV_PERIOD, value: prevPrevVal });
    } else {
      snapDotPrevPrev?.setAttribute('opacity', '0');
    }

    monthEl.textContent = labels[idx] ?? '';
    rowsEl.innerHTML = dashRenderChartTooltipRowsHtml(rows);
    tooltip.hidden = false;
    dashPositionChartTooltip(wrap, svg, tooltip, x, anchorY);
  };

  hoverRect.addEventListener('mousemove', (ev) => {
    const { x: svgX } = dashSvgClientToView(svg, ev.clientX, ev.clientY);
    showAt(dashNearestLineChartIndex(svgX, labels, xScale));
  });
  hoverRect.addEventListener('mouseleave', hide);
}

function dashPeekChartElementUnder(hoverRect, clientX, clientY, selector) {
  hoverRect.style.pointerEvents = 'none';
  const el = document.elementFromPoint(clientX, clientY);
  hoverRect.style.pointerEvents = 'all';
  return el?.closest(selector) ?? null;
}

function dashRenderChartTooltipRowsHtml(rows) {
  return rows.map((r) => {
    const swatch = r.color
      ? `<span class="dashboard-bar-chart-tooltip-swatch" style="background:${r.color}"></span>`
      : '';
    return `<div class="dashboard-bar-chart-tooltip-row">${swatch}<span class="dashboard-bar-chart-tooltip-label">${dashEscapeHtml(r.label)}</span><span class="dashboard-bar-chart-tooltip-value">${dashFormatDisplayYenHtml(r.value)}</span></div>`;
  }).join('');
}

function dashPositionChartTooltip(wrap, svg, tooltip, viewX, viewY) {
  const wrapRect = wrap.getBoundingClientRect();
  const { x: clientX, y: clientY } = dashSvgViewToClient(svg, viewX, viewY);
  tooltip.style.left = `${clientX - wrapRect.left}px`;
  tooltip.style.top = `${clientY - wrapRect.top}px`;
}

function dashShowChartBarTooltip({ wrap, svg, tooltip, monthEl, rowsEl, monthLabel, rows, anchorX, anchorY }) {
  monthEl.textContent = monthLabel;
  rowsEl.innerHTML = dashRenderChartTooltipRowsHtml(rows);
  tooltip.hidden = false;
  dashPositionChartTooltip(wrap, svg, tooltip, anchorX, anchorY);
}

function dashRenderBarChartInteractionMarkup(pad, plotW, plotH) {
  return `<g class="dashboard-bar-chart-interaction">
    <rect class="dashboard-bar-chart-hover" x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}"/>
  </g>`;
}

function dashRenderBarChartTooltipMarkup() {
  return `<div class="dashboard-bar-chart-tooltip" hidden>
    <span class="dashboard-bar-chart-tooltip-month"></span>
    <div class="dashboard-bar-chart-tooltip-rows"></div>
  </div>`;
}

function dashBindGroupedBarChartHover(container, { series, labels, layout, xScale, yScale }) {
  const wrap = container.querySelector('.dashboard-bar-chart-wrap');
  const svg = container.querySelector('.dashboard-chart-svg');
  const hoverRect = svg?.querySelector('.dashboard-bar-chart-hover');
  const tooltip = container.querySelector('.dashboard-bar-chart-tooltip');
  const monthEl = tooltip?.querySelector('.dashboard-bar-chart-tooltip-month');
  const rowsEl = tooltip?.querySelector('.dashboard-bar-chart-tooltip-rows');
  if (!wrap || !svg || !hoverRect || !tooltip || !monthEl || !rowsEl) return;

  const { plotBottom } = layout;

  const hide = () => {
    tooltip.hidden = true;
  };

  hoverRect.addEventListener('mousemove', (ev) => {
    const { x: svgX } = dashSvgClientToView(svg, ev.clientX, ev.clientY);
    const monthIdx = dashNearestLineChartIndex(svgX, labels, xScale);
    const anchorX = xScale(monthIdx);
    const bar = dashPeekChartElementUnder(hoverRect, ev.clientX, ev.clientY, '.dashboard-chart-bar');
    let rows;
    let anchorY = plotBottom;
    if (bar && bar.closest('svg') === svg) {
      const gi = Number(bar.getAttribute('data-month-index'));
      const si = Number(bar.getAttribute('data-series-index'));
      const s = series[si];
      if (s) {
        rows = [{ label: s.label, value: Math.abs(s.values[gi] ?? 0), color: s.color }];
        anchorY = Number(bar.getAttribute('y') ?? plotBottom);
      }
    }
    if (!rows) {
      const inflow = Math.abs(series[0]?.values[monthIdx] ?? 0);
      const outflow = Math.abs(series[1]?.values[monthIdx] ?? 0);
      rows = series.map((s) => ({
        label: s.label,
        value: Math.abs(s.values[monthIdx] ?? 0),
        color: s.color,
      }));
      rows.push({ label: DASHBOARD_INFLOW_MINUS_OUTFLOW, value: inflow - outflow });
      series.forEach((s) => {
        const val = Math.abs(s.values[monthIdx] ?? 0);
        if (val > 0) anchorY = Math.min(anchorY, yScale(val));
      });
    }
    dashShowChartBarTooltip({
      wrap,
      svg,
      tooltip,
      monthEl,
      rowsEl,
      monthLabel: labels[monthIdx] ?? '',
      rows,
      anchorX,
      anchorY,
    });
  });
  hoverRect.addEventListener('mouseleave', hide);
}

function dashBindStackedBarChartHover(container, {
  series,
  labels,
  layout,
  xScale,
  yScale,
  highlightWrap,
  highlightSidebarRoot,
}) {
  const wrap = container.querySelector('.dashboard-bar-chart-wrap');
  const svg = container.querySelector('.dashboard-chart-svg');
  const hoverRect = svg?.querySelector('.dashboard-bar-chart-hover');
  const tooltip = container.querySelector('.dashboard-bar-chart-tooltip');
  const monthEl = tooltip?.querySelector('.dashboard-bar-chart-tooltip-month');
  const rowsEl = tooltip?.querySelector('.dashboard-bar-chart-tooltip-rows');
  if (!wrap || !svg || !hoverRect || !tooltip || !monthEl || !rowsEl) return;

  const { plotBottom } = layout;
  let activeKey = null;

  const setHighlight = (key) => {
    if (key === activeKey) return;
    if (activeKey && highlightWrap) {
      dashSetSeriesHighlight(highlightWrap, activeKey, false, highlightSidebarRoot);
    }
    activeKey = key;
    if (key && highlightWrap) {
      dashSetSeriesHighlight(highlightWrap, key, true, highlightSidebarRoot, { scrollSidebar: true });
    }
  };

  const hide = () => {
    tooltip.hidden = true;
    setHighlight(null);
  };

  hoverRect.addEventListener('mousemove', (ev) => {
    const { x: svgX } = dashSvgClientToView(svg, ev.clientX, ev.clientY);
    const monthIdx = dashNearestLineChartIndex(svgX, labels, xScale);
    const anchorX = xScale(monthIdx);
    const seg = dashPeekChartElementUnder(hoverRect, ev.clientX, ev.clientY, '.dashboard-chart-segment');
    let rows;
    let anchorY = plotBottom;
    if (seg && seg.closest('svg') === svg) {
      const gi = Number(seg.getAttribute('data-month-index'));
      const key = seg.getAttribute('data-series-key');
      const s = series.find((item) => item.key === key);
      if (s) {
        setHighlight(key);
        rows = [{ label: s.label, value: Math.abs(s.values[gi] ?? 0), color: s.color }];
        anchorY = Number(seg.getAttribute('y') ?? plotBottom);
      }
    }
    if (!rows) {
      setHighlight(null);
      const total = series.reduce((sum, s) => sum + Math.abs(s.values[monthIdx] ?? 0), 0);
      rows = [{ label: DASHBOARD_GOUKEI, value: total }];
      anchorY = yScale(total);
    }
    dashShowChartBarTooltip({
      wrap,
      svg,
      tooltip,
      monthEl,
      rowsEl,
      monthLabel: labels[monthIdx] ?? '',
      rows,
      anchorX,
      anchorY,
    });
  });
  hoverRect.addEventListener('mouseleave', hide);
}

function dashRenderSvgStackedBarChart(container, series, labels, {
  title,
  headerClass,
  targetTicks = 6,
  highlightWrap = null,
  highlightSidebarRoot = null,
}) {
  const width = 900;
  const layout = dashChartLayout({ width, plotH: 250, right: 16, hasLegend: false });
  const { pad, plotW, plotH, plotBottom, plotTop, height } = layout;
  const clipId = dashNextGradId('clip');
  const monthTotals = labels.map((_, gi) =>
    series.reduce((sum, s) => sum + Math.abs(s.values[gi] ?? 0), 0));
  const dataMax = Math.max(0, ...monthTotals, 0);
  const paddedMax = dataMax > 0 ? dataMax * 1.08 : 1;
  const yAxis = dashComputeYAxisScale(0, paddedMax, { clampMinZero: true, targetTicks });
  const yScale = dashMakeYScale(yAxis, pad, plotH);
  const groupCount = labels.length;
  const barGroupW = plotW / Math.max(1, groupCount);
  const barW = Math.min(28, Math.max(8, barGroupW * 0.55));

  const gridLines = dashRenderYAxisGrid(yAxis, yScale, pad, width);

  let bars = '';
  labels.forEach((_, gi) => {
    const groupLeft = pad.left + barGroupW * gi;
    const cx = groupLeft + barGroupW / 2;
    const x = cx - barW / 2;
    let cumulative = 0;
    series.forEach((s) => {
      const val = Math.abs(s.values[gi] ?? 0);
      if (val === 0) return;
      const yTop = yScale(cumulative + val);
      const yBottom = yScale(cumulative);
      cumulative += val;
      bars += `<rect class="dashboard-chart-segment" data-series-key="${dashEscapeHtml(s.key)}" data-month-index="${gi}" x="${x}" y="${yTop}" width="${barW}" height="${Math.max(0, yBottom - yTop)}" fill="${s.color}" rx="1"/>`;
    });
  });

  const xScale = (i) => pad.left + barGroupW * i + barGroupW / 2;
  const xLabels = dashRenderXAxisLabelsTwoRow(labels, xScale, layout);
  const legendHtml = dashRenderStackedLegendHtml(series);

  container.innerHTML = `
    <div class="dashboard-chart-title ${headerClass ?? ''}">${title}</div>
    <div class="dashboard-bar-chart-wrap">
      <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs>${dashRenderPlotClip(layout, clipId)}</defs>
        ${gridLines}
        <g clip-path="url(#${clipId})">${bars}</g>
        <g class="dashboard-chart-highlight-layer"></g>
        ${dashRenderBarChartInteractionMarkup(pad, plotW, plotH)}
        ${xLabels}
      </svg>
      ${dashRenderBarChartTooltipMarkup()}
    </div>
    <div class="dashboard-chart-legend-grid">${legendHtml}</div>`;
  dashBindStackedBarChartHover(container, {
    series,
    labels,
    layout,
    xScale,
    yScale,
    highlightWrap,
    highlightSidebarRoot,
  });
  dashBindChartSeriesHover(container, highlightWrap, highlightSidebarRoot);
}

function dashRenderSvgGradientLineChart(container, values, labels, {
  title,
  headerClass,
  gradLow,
  gradHigh,
  includeZero = false,
  negativeTicksRed = false,
  prevValues = null,
  prevPrevValues = null,
}) {
  const width = 440;
  const layout = dashChartLayout({ width, plotH: 170, right: 12, hasLegend: false });
  const { pad, plotW, plotH, plotBottom, plotTop, height } = layout;
  const clipId = dashNextGradId('clip');
  const scaleValues = [
    ...values,
    ...(prevValues ?? []),
    ...(prevPrevValues ?? []),
  ];
  const dataMin = Math.min(...scaleValues);
  const dataMax = Math.max(...scaleValues);
  const range = dataMax - dataMin || 1;
  const padRatio = 0.06;
  const paddedMin = dataMin - range * padRatio;
  const paddedMax = dataMax + range * padRatio;
  const yAxis = dashComputeYAxisScale(paddedMin, paddedMax, { includeZero, targetTicks: 5 });
  const yScale = dashMakeYScale(yAxis, pad, plotH);
  const xScale = (i) => pad.left + (plotW * i) / Math.max(1, labels.length - 1);
  const gradId = dashNextGradId('line');

  let gridLines = dashRenderYAxisGrid(yAxis, yScale, pad, width, { negativeTicksRed });

  if (includeZero && yAxis.min < 0 && yAxis.max > 0) {
    const zeroY = yScale(0);
    gridLines += `<line x1="${pad.left}" y1="${zeroY}" x2="${width - pad.right}" y2="${zeroY}" class="dashboard-chart-zero"/>`;
  }

  const points = values.map((v, i) => ({ x: xScale(i), y: yScale(v) }));
  const path = dashSmoothCurvePath(points);
  let prevPrevPathMarkup = '';
  if (prevPrevValues?.length) {
    const prevPrevPoints = prevPrevValues.map((v, i) => ({ x: xScale(i), y: yScale(v ?? 0) }));
    const prevPrevPath = dashSmoothCurvePath(prevPrevPoints);
    prevPrevPathMarkup = `<g class="dashboard-line-chart-prev-prev"><path d="${prevPrevPath}" fill="none" stroke="url(#${gradId})" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  let prevPathMarkup = '';
  if (prevValues?.length) {
    const prevPoints = prevValues.map((v, i) => ({ x: xScale(i), y: yScale(v ?? 0) }));
    const prevPath = dashSmoothCurvePath(prevPoints);
    prevPathMarkup = `<g class="dashboard-line-chart-prev"><path d="${prevPath}" fill="none" stroke="url(#${gradId})" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  const xLabels = dashRenderXAxisLabelsTwoRow(labels, xScale, layout);

  container.innerHTML = `
    <div class="dashboard-chart-title ${headerClass ?? ''}">${title}</div>
    <div class="dashboard-line-chart-wrap">
      <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <defs>
          ${dashRenderPlotClip(layout, clipId)}
          <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse"
            x1="${pad.left}" y1="${plotBottom}" x2="${pad.left}" y2="${plotTop}">
            <stop offset="0%" stop-color="${gradLow}"/>
            <stop offset="100%" stop-color="${gradHigh}"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <g clip-path="url(#${clipId})">
          ${prevPrevPathMarkup}
          ${prevPathMarkup}
          <path class="dashboard-line-chart-current" d="${path}" fill="none" stroke="url(#${gradId})" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g class="dashboard-line-chart-interaction">
          <line class="dashboard-line-chart-snap-line" x1="0" y1="0" x2="0" y2="0" opacity="0"/>
          <circle class="dashboard-line-chart-snap-dot dashboard-line-chart-snap-dot--current" cx="0" cy="0" r="4" opacity="0"/>
          <circle class="dashboard-line-chart-snap-dot dashboard-line-chart-snap-dot--prev" cx="0" cy="0" r="4" opacity="0"/>
          <circle class="dashboard-line-chart-snap-dot dashboard-line-chart-snap-dot--prev-prev" cx="0" cy="0" r="4" opacity="0"/>
          <rect class="dashboard-line-chart-hover"
            x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}"/>
        </g>
        ${xLabels}
      </svg>
      <div class="dashboard-line-chart-tooltip" hidden>
        <span class="dashboard-line-chart-tooltip-month"></span>
        <div class="dashboard-line-chart-tooltip-rows"></div>
      </div>
    </div>`;
  dashBindLineChartHover(container, { values, labels, layout, xScale, yScale, prevValues, prevPrevValues });
}

function dashRenderSidebarList(container, items, checkedKeys, totalLabel, headerClass, onToggle, {
  highlightWrap = null,
  highlightSidebarRoot = null,
  onCheckAll = null,
  onUncheckAll = null,
} = {}) {
  const total = items.reduce((sum, item) => sum + item.total, 0);

  const header = document.createElement('div');
  header.className = `dashboard-sidebar-header ${headerClass}`;
  header.innerHTML = `
    <span class="dashboard-sidebar-total-label">${totalLabel}</span>
    <span class="dashboard-sidebar-total-value">${dashFormatSidebarYenHtml(total)}</span>
    <span class="dashboard-sidebar-bulk-actions">
      <button type="button" class="dashboard-sidebar-bulk-btn dashboard-sidebar-bulk-btn--check-all" data-action="check-all">すべてチェック</button>
      <button type="button" class="dashboard-sidebar-bulk-btn dashboard-sidebar-bulk-btn--uncheck-all" data-action="uncheck-all">すべて外す</button>
    </span>`;
  header.querySelector('[data-action="check-all"]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    onCheckAll?.();
  });
  header.querySelector('[data-action="uncheck-all"]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    onUncheckAll?.();
  });

  const list = document.createElement('div');
  list.className = 'dashboard-sidebar-list';

  const maxPct = total > 0
    ? Math.max(...items.map((item) => (item.total / total) * 100), 0)
    : 0;

  for (const item of items) {
    const pct = total > 0 ? (item.total / total) * 100 : 0;
    const barWidth = maxPct > 0 ? (pct / maxPct) * 100 : 0;
    const row = document.createElement('label');
    row.className = 'dashboard-sidebar-row';
    row.dataset.seriesKey = item.key;
    row.innerHTML = `
      <input type="checkbox" class="dashboard-sidebar-check" data-key="${item.key}" ${checkedKeys.has(item.key) ? 'checked' : ''} />
      <span class="dashboard-sidebar-name" title="${dashEscapeHtml(item.name)}">${dashEscapeHtml(item.name)}</span>
      <span class="dashboard-sidebar-amount">${dashFormatSidebarYenHtml(item.total)}</span>
      <span class="dashboard-sidebar-pct-wrap">
        <span class="dashboard-sidebar-bar" style="width:${barWidth.toFixed(2)}%"></span>
        <span class="dashboard-sidebar-pct">${pct.toFixed(2)}%</span>
      </span>`;
    row.querySelector('input').addEventListener('change', (ev) => {
      onToggle(item.key, ev.target.checked);
    });
    if (highlightWrap && highlightSidebarRoot) {
      row.addEventListener('mouseenter', () => dashSetSeriesHighlight(highlightWrap, item.key, true, highlightSidebarRoot));
      row.addEventListener('mouseleave', () => dashSetSeriesHighlight(highlightWrap, item.key, false, highlightSidebarRoot));
    }
    list.appendChild(row);
  }

  container.replaceChildren(header, list);
}

function dashRenderDashboardContent(wrap, ctx) {
  dashGradientSeq = 0;
  const { data, prevData, prevPrevData, appSettings, state } = ctx;
  const sections = data?.sections ?? [];
  const revenueItems = dashCollectBreakdownItems(sections, REVENUE_SECTION_IDS);
  const expenseItems = dashCollectBreakdownItems(sections, EXPENSE_SECTION_IDS);
  const allKeys = [...revenueItems, ...expenseItems].map((i) => i.key);
  if (!state.initialized) {
    state.checkedKeys = dashLoadCheckedKeys(appSettings.fiscalPeriod, allKeys);
    state.seenKeys = new Set(allKeys);
    state.initialized = true;
  } else {
    let keysAdded = false;
    for (const key of allKeys) {
      if (!state.seenKeys.has(key)) {
        state.seenKeys.add(key);
        state.checkedKeys.add(key);
        keysAdded = true;
      }
    }
    if (keysAdded) dashSaveCheckedKeys(appSettings.fiscalPeriod, state.checkedKeys);
  }

  const monthly = dashBuildMonthlySeries(data, appSettings);
  const monthLabels = monthly.map((m) => m.label);
  const prevMonthly = prevData && appSettings.fiscalPeriod > 1
    ? dashBuildMonthlySeries(prevData, {
      ...appSettings,
      fiscalPeriod: appSettings.fiscalPeriod - 1,
    })
    : null;
  const prevPrevMonthly = prevPrevData && appSettings.fiscalPeriod > 2
    ? dashBuildMonthlySeries(prevPrevData, {
      ...appSettings,
      fiscalPeriod: appSettings.fiscalPeriod - 2,
    })
    : null;

  const toolbar = wrap.querySelector('.dashboard-toolbar');
  if (toolbar) {
    toolbar.querySelector('.dashboard-title').textContent =
      `${formatFiscalPeriodLabel(appSettings.fiscalPeriod)} ダッシュードボード`;
    toolbar.querySelectorAll('.dashboard-mode-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.mode === state.chartMode);
    });
  }

  const revenueEl = wrap.querySelector('.dashboard-sidebar-revenue');
  const expenseEl = wrap.querySelector('.dashboard-sidebar-expense');
  const mainChartEl = wrap.querySelector('.dashboard-chart-main');
  const profitChartEl = wrap.querySelector('.dashboard-chart-profit');
  const cashChartEl = wrap.querySelector('.dashboard-chart-cash');

  const persistCheckedKeys = () => {
    dashSaveCheckedKeys(appSettings.fiscalPeriod, state.checkedKeys);
  };

  const onToggle = (key, checked) => {
    if (checked) state.checkedKeys.add(key);
    else state.checkedKeys.delete(key);
    persistCheckedKeys();
    dashRenderDashboardContent(wrap, ctx);
  };

  const makeBulkHandlers = (itemKeys) => ({
    onCheckAll: () => {
      for (const key of itemKeys) state.checkedKeys.add(key);
      persistCheckedKeys();
      dashRenderDashboardContent(wrap, ctx);
    },
    onUncheckAll: () => {
      for (const key of itemKeys) state.checkedKeys.delete(key);
      persistCheckedKeys();
      dashRenderDashboardContent(wrap, ctx);
    },
  });

  const revenueBulk = makeBulkHandlers(revenueItems.map((i) => i.key));
  const expenseBulk = makeBulkHandlers(expenseItems.map((i) => i.key));

  const revenueColorMap = dashBuildItemColorMap(revenueItems);
  const expenseColorMap = dashBuildItemColorMap(expenseItems);

  dashRenderSidebarList(revenueEl, revenueItems, state.checkedKeys, '収益合計', 'dashboard-sidebar-header--revenue', onToggle, {
    highlightWrap: state.chartMode === 'revenue' ? wrap : null,
    highlightSidebarRoot: state.chartMode === 'revenue' ? revenueEl : null,
    ...revenueBulk,
  });
  dashRenderSidebarList(expenseEl, expenseItems, state.checkedKeys, '支出合計', 'dashboard-sidebar-header--expense', onToggle, {
    highlightWrap: state.chartMode === 'expense' ? wrap : null,
    highlightSidebarRoot: state.chartMode === 'expense' ? expenseEl : null,
    ...expenseBulk,
  });

  if (state.chartMode === 'balance') {
    dashRenderSvgGroupedBarChart(
      mainChartEl,
      [
        { values: monthly.map((m) => m.inflow), color: DASH_COLOR_INCOME, label: '収入' },
        { values: monthly.map((m) => m.outflow), color: DASH_COLOR_EXPENSE, label: '支出' },
      ],
      monthLabels,
      {
        title: '収支推移',
        legend: [
          { label: '収入', color: DASH_COLOR_INCOME },
          { label: '支出', color: DASH_COLOR_EXPENSE },
        ],
      },
    );
  } else if (state.chartMode === 'revenue') {
    const series = dashBuildStackedSeries(revenueItems, state.checkedKeys, revenueColorMap);
    dashRenderSvgStackedBarChart(mainChartEl, series, monthLabels, {
      title: '収益推移',
      headerClass: 'dashboard-chart-title--revenue',
      highlightWrap: wrap,
      highlightSidebarRoot: revenueEl,
    });
  } else {
    const series = dashBuildStackedSeries(expenseItems, state.checkedKeys, expenseColorMap);
    dashRenderSvgStackedBarChart(mainChartEl, series, monthLabels, {
      title: '支出推移',
      headerClass: 'dashboard-chart-title--expense',
      highlightWrap: wrap,
      highlightSidebarRoot: expenseEl,
    });
  }

  dashRenderSvgGradientLineChart(
    profitChartEl,
    monthly.map((m) => m.profit),
    monthLabels,
    {
      title: '利益率推移',
      headerClass: 'dashboard-chart-title--profit',
      gradLow: '#c45c5c',
      gradHigh: '#4a9fd4',
      includeZero: true,
      negativeTicksRed: true,
      prevValues: prevMonthly?.map((m) => m.profit) ?? null,
      prevPrevValues: prevPrevMonthly?.map((m) => m.profit) ?? null,
    },
  );

  dashRenderSvgGradientLineChart(
    cashChartEl,
    monthly.map((m) => m.cash),
    monthLabels,
    {
      title: '預金残高推移',
      headerClass: 'dashboard-chart-title--cash',
      gradLow: '#c45c5c',
      gradHigh: '#22c55e',
      includeZero: false,
      prevValues: prevMonthly?.map((m) => m.cash) ?? null,
      prevPrevValues: prevPrevMonthly?.map((m) => m.cash) ?? null,
    },
  );
}

export function mountDashboardPanel({
  replaceRootPanel,
  setPlanKpi,
  data,
  prevData = null,
  prevPrevData = null,
  appSettings,
  calcPlanKpiMetrics,
  buildPlanKpiOptions,
}) {
  if (!data) return;

  setPlanKpi(calcPlanKpiMetrics(data, buildPlanKpiOptions()));

  if (dashboardMountCtx?.appSettings?.fiscalPeriod !== appSettings.fiscalPeriod) {
    dashboardMountCtx = null;
  }

  const state = dashboardMountCtx?.state ?? {
    chartMode: 'balance',
    checkedKeys: new Set(),
    seenKeys: new Set(),
    initialized: false,
  };
  dashboardMountCtx = { state, appSettings, data, prevData, prevPrevData };

  const wrap = document.createElement('div');
  wrap.className = 'dashboard-wrap';

  const toolbar = document.createElement('div');
  toolbar.className = 'dashboard-toolbar';
  toolbar.innerHTML = `
    <div class="dashboard-toolbar-left">
      <h2 class="dashboard-title"></h2>
      <div class="dashboard-mode-tabs" role="tablist">
        ${DASHBOARD_CHART_MODES.map(
    (mode) => `<button type="button" class="dashboard-mode-btn" data-mode="${mode.id}" role="tab">${mode.label}</button>`,
  ).join('')}
      </div>
    </div>`;

  const grid = document.createElement('div');
  grid.className = 'dashboard-grid';
  grid.innerHTML = `
    <aside class="dashboard-sidebar dashboard-sidebar-revenue"></aside>
    <section class="dashboard-main">
      <div class="dashboard-chart-main"></div>
      <div class="dashboard-charts-bottom">
        <div class="dashboard-chart-profit"></div>
        <div class="dashboard-chart-cash"></div>
      </div>
    </section>
    <aside class="dashboard-sidebar dashboard-sidebar-expense"></aside>`;

  wrap.append(toolbar, grid);
  replaceRootPanel(wrap);

  toolbar.querySelectorAll('.dashboard-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.chartMode = btn.dataset.mode;
      dashRenderDashboardContent(wrap, { data, prevData, prevPrevData, appSettings, state });
    });
  });

  dashRenderDashboardContent(wrap, { data, prevData, prevPrevData, appSettings, state });
}

export function resetDashboardState() {
  dashboardMountCtx = null;
}
