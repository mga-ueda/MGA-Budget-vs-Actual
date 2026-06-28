export function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else current += char;
  }
  cells.push(current);
  return cells;
}

export function parseNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function detectSection(label) {
  if (label.includes('資産')) return 'assets';
  if (label.includes('負債')) return 'liabilities';
  if (
    label.includes('純資産') ||
    label.includes('株主資本') ||
    label.includes('資本金') ||
    label.includes('利益剰余金') ||
    label.includes('評価・換算') ||
    label.includes('新株予約権')
  ) {
    return 'equity';
  }
  return 'unknown';
}

function inferLevel(label, type) {
  if (type === 'total') {
    if (label.endsWith('合計') && !label.includes('の部')) {
      const base = label.replace('合計', '');
      if (base.length <= 6) return 2;
      return 1;
    }
    return 0;
  }
  if (type === 'subaccount') return 4;
  if (type === 'account') return 3;
  if (label.endsWith('の部') || label === '諸口') return 0;
  return 1;
}

export function parseBalanceSheetCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { months: [], rows: [] };

  const headerCells = parseCsvLine(lines[0]);
  const months = headerCells.slice(3).filter(Boolean);

  let currentSection = 'unknown';
  let sectionDepth = 0;
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const col0 = cells[0]?.trim() ?? '';
    const col1 = cells[1]?.trim() ?? '';
    const col2 = cells[2]?.trim() ?? '';
    const valueCells = cells.slice(3);

    const values = {};
    let hasValues = false;
    months.forEach((month, idx) => {
      const num = parseNumber(valueCells[idx] ?? '');
      if (num !== null) {
        values[month] = num;
        hasValues = true;
      }
    });

    const label = col2 || col1 || col0;
    if (!label && !hasValues) continue;

    const sectionFromLabel = detectSection(label);
    if (sectionFromLabel !== 'unknown') currentSection = sectionFromLabel;
    else if (col0.includes('資産の部')) currentSection = 'assets';
    else if (col0.includes('負債の部')) currentSection = 'liabilities';
    else if (col0.includes('純資産の部')) currentSection = 'equity';

    const isTotal = label.endsWith('合計') || label.includes('合計');
    let type;
    if (isTotal && hasValues) type = 'total';
    else if (hasValues) {
      if (col2) type = 'subaccount';
      else if (col1) type = 'account';
      else type = 'total';
    } else {
      type = 'section';
      sectionDepth++;
    }

    const level =
      type === 'section' ? Math.min(sectionDepth, 2) : inferLevel(label, type);

    rows.push({
      id: `row-${i}`,
      label,
      type,
      level,
      section: currentSection,
      values,
    });
  }

  return { months, rows };
}

export function formatYen(value) {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('ja-JP');
}

export function splitBalanceSheetRows(rows) {
  const assets = [];
  const liabilitiesAndEquity = [];
  for (const row of rows) {
    if (row.section === 'assets') assets.push(row);
    else if (row.section === 'liabilities' || row.section === 'equity') {
      liabilitiesAndEquity.push(row);
    }
  }
  return { assets, liabilitiesAndEquity };
}

/** UTF-8 / Shift-JIS を自動判定して CSV テキストを取得 */
export function decodeCsvBuffer(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const markers = ['勘定科目', '補助科目', '取引日', '借方勘定科目', '従業員識別子', '従業員番号'];
  if (markers.some((m) => utf8.includes(m))) {
    return utf8;
  }
  return new TextDecoder('shift-jis').decode(buffer);
}

export async function readCsvFile(file) {
  const buffer = await file.arrayBuffer();
  return decodeCsvBuffer(buffer);
}
