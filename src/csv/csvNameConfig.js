const STORAGE_KEY = 'mga-csv-name-config';

export const CSV_KINDS = [
  { id: 'journal', label: '\u4ed5\u8a33\u30c7\u30fc\u30bf', required: true },
  { id: 'balanceSheet', label: '\u8cb8\u501f\u5bfe\u7167\u8868', required: true },
  { id: 'generalLedger', label: '\u7dcf\u52d8\u5b9a\u5143\u5e33', required: true },
];

export const DEFAULT_CSV_NAME_CONFIG = {
  journal: {
    pattern: '^\u4ed5\u8a33\u30c7\u30fc\u30bf_\\d{4}-\\d{2}-\\d{2}_\\d{4}-\\d{2}-\\d{2}\\.csv$',
    example: '\u4ed5\u8a33\u30c7\u30fc\u30bf_2018-12-07_2019-11-30.csv',
  },
  balanceSheet: {
    pattern: '^\u8cb8\u501f\u5bfe\u7167\u8868_\u6708\u6b21\u63a8\u79fb_\\d{8}_\\d{4}\\.csv$',
    example: '\u8cb8\u501f\u5bfe\u7167\u8868_\u6708\u6b21\u63a8\u79fb_20260627_0759.csv',
  },
  generalLedger: {
    pattern: '^\u7dcf\u52d8\u5b9a\u5143\u5e33_\\d{8}_\\d{4}\\.csv$',
    example: '\u7dcf\u52d8\u5b9a\u5143\u5e33_20260627_0759.csv',
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
      errors.push(`${kind.label}: \u6b63\u898f\u8868\u73fe\u304c\u4e0d\u6b63\u3067\u3059`);
      continue;
    }
    if (entry.example && !re.test(entry.example)) {
      errors.push(`${kind.label}: \u4f8b\u306e\u30d5\u30a1\u30a4\u30eb\u540d\u304c\u30d1\u30bf\u30fc\u30f3\u3068\u4e00\u81f4\u3057\u307e\u305b\u3093`);
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
  if (!entry) return { ok: false, error: '\u672a\u5b9a\u7fa9' };
  const re = compileCsvPattern(entry.pattern);
  if (!re) return { ok: false, error: '\u6b63\u898f\u8868\u73fe\u304c\u4e0d\u6b63' };
  if (!entry.example) return { ok: false, error: '\u4f8b\u304c\u3042\u308a\u307e\u305b\u3093' };
  return { ok: re.test(entry.example), error: re.test(entry.example) ? null : '\u4e0d\u4e00\u81f4' };
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
