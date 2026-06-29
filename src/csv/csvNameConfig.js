const STORAGE_KEY = 'mga-csv-name-config';

export const CSV_KINDS = [
  { id: 'journal', label: '仕訳データ', required: true },
  { id: 'balanceSheet', label: '貸借対照表', required: true },
  { id: 'generalLedger', label: '総勘定元帳', required: true },
];

export const DEFAULT_CSV_NAME_CONFIG = {
  journal: {
    pattern: '^仕訳データ_\\d{4}-\\d{2}-\\d{2}_\\d{4}-\\d{2}-\\d{2}\\.csv$',
    example: '仕訳データ_2018-12-07_2019-11-30.csv',
  },
  balanceSheet: {
    pattern: '^貸借対照表_月次推移_\\d{8}_\\d{4}\\.csv$',
    example: '貸借対照表_月次推移_20260627_0759.csv',
  },
  generalLedger: {
    pattern: '^総勘定元帳_\\d{8}_\\d{4}\\.csv$',
    example: '総勘定元帳_20260627_0759.csv',
  },
};

function csvBaseName(name) {
  return name.replace(/\\/g, '/').split('/').pop() ?? name;
}

function normalizeEntry(entry, fallback) {
  return {
    pattern: typeof entry?.pattern === 'string' ? entry.pattern : fallback.pattern,
    example: typeof entry?.example === 'string' ? entry.example : fallback.example,
  };
}

export function loadCsvNameConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CSV_NAME_CONFIG);
    const parsed = JSON.parse(raw);
    const config = {};
    for (const kind of CSV_KINDS) {
      config[kind.id] = normalizeEntry(parsed?.[kind.id], DEFAULT_CSV_NAME_CONFIG[kind.id]);
    }
    return config;
  } catch {
    return structuredClone(DEFAULT_CSV_NAME_CONFIG);
  }
}

export function saveCsvNameConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetCsvNameConfig() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_CSV_NAME_CONFIG);
}

export function compileCsvPattern(pattern) {
  if (!pattern?.trim()) return null;
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

export function validateCsvNameConfig(config = loadCsvNameConfig()) {
  const errors = [];
  for (const kind of CSV_KINDS) {
    const entry = config[kind.id];
    const re = compileCsvPattern(entry?.pattern);
    if (!re) {
      errors.push(`${kind.label}: 正規表現が不正です`);
      continue;
    }
    if (entry.example && !re.test(entry.example)) {
      errors.push(`${kind.label}: 例のファイル名がパターンと一致しません`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function getCompiledCsvNamePatterns(config = loadCsvNameConfig()) {
  const patterns = {};
  for (const kind of CSV_KINDS) {
    patterns[kind.id] = compileCsvPattern(config[kind.id]?.pattern);
  }
  return patterns;
}

export function classifyCsvFile(name, config = loadCsvNameConfig()) {
  const base = csvBaseName(name);
  const patterns = getCompiledCsvNamePatterns(config);
  for (const kind of CSV_KINDS) {
    if (patterns[kind.id]?.test(base)) return kind.id;
  }
  return null;
}

export function testCsvNameExample(kindId, config = loadCsvNameConfig()) {
  const entry = config[kindId];
  if (!entry) return { ok: false, error: '未定義' };
  const re = compileCsvPattern(entry.pattern);
  if (!re) return { ok: false, error: '正規表現が不正' };
  if (!entry.example) return { ok: false, error: '例がありません' };
  return { ok: re.test(entry.example), error: re.test(entry.example) ? null : '不一致' };
}

export function getCsvNameExamples(config = loadCsvNameConfig()) {
  const examples = {};
  for (const kind of CSV_KINDS) {
    examples[kind.id] = config[kind.id]?.example ?? DEFAULT_CSV_NAME_CONFIG[kind.id].example;
  }
  return examples;
}

export function formatCsvNameHintLines(config = loadCsvNameConfig()) {
  const examples = getCsvNameExamples(config);
  return [
    examples.journal,
    examples.balanceSheet,
    examples.generalLedger,
  ];
}
