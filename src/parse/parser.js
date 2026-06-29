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

export function formatYen(value) {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('ja-JP');
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
