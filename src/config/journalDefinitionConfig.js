const JOURNAL_DEFINITION_STORAGE_KEY = 'mga-journal-definition';

/** @typedef {'account' | 'pattern' | 'singlePattern'} JournalDefinitionValueType */

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   hint: string,
 *   valueType: JournalDefinitionValueType,
 *   sectionColorId?: string,
 * }} JournalDefinitionSectionMeta
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   sections: JournalDefinitionSectionMeta[],
 * }} JournalDefinitionGroupMeta
 */

export const DEFAULT_JOURNAL_DEFINITION = {
revenueSectionAccounts: [
    '売上高',
  ],
nonOperatingRevenueAccounts: [
    '受取利息',
    '雑収入',
    '営業外収益',
  ],
nonOperatingRevenuePatterns: [
    '^貸倒引当金戻入',
  ],
personnelPatterns: [
    '^役員報酬',
    '^給料手当',
    '^法定福利費',
    '^賞与',
    '^退職',
    '旅費交通費\\|通勤手当',
  ],
outsourcingPatterns: [
    '^外注費',
  ],
otherPatterns: [
    '^租税公課',
    '^減価償却費',
    '^少額減価償却費',
    '^繰延資産償却',
    '^貸倒引当金繰入',
  ],
nonOperatingExpensePatterns: [
    '^支払利息',
    '^雑損失',
  ],
specialProfitPatterns: [
    '^前期損益修正益',
    '^固定資産売却益',
  ],
specialLossPatterns: [
    '^法人税、住民税',
    '^固定資産除却損',
  ],
taxPatterns: [
    '^法人税等$',
  ],
plSkipAccounts: [
    '普通預金',
    '売掛金',
    '貸倒引当金',
    '未払金',
    '未払費用',
    '前払金',
    '前払費用',
    '長期前払費用',
    '保険積立金',
    '資本金',
    '繰越利益剩余金',
    '長期未払金',
    '長期借入金',
    '短期借入金',
    '工具器具備品',
    '車両運搬具',
    'ソフトウェア',
    '貯蔵品',
    '小額資産',
    '仮払消費税',
    '未払消費税',
    '未払法人税等',
    '役員借入金',
    '預り金',
    '仮受消費税',
    '仮払金',
    '立替金',
    '未収還付法人税等',
  ],
bsSkipAccountPatterns: [
    '^未収還付',
  ],
paymentCounterparts: [
    '長期未払金',
    '保険積立金',
    '住民税',
    '役員借入金',
    '短期借入金',
    '未払法人税等',
    '未払消費税',
  ],
cashAccounts: [
    '現金',
    '普通預金',
    '当座預金',
    '定期預金',
    '通知預金',
    '別段預金',
  ],
expenseSectionAccounts: [
    '福利厚生費',
    '荷造運賃',
    '広告費',
    '交際費',
    '旅費交通費',
    '通信費',
    '水道光熱費',
    '修繕費',
    '車両費',
    '賃借料',
    '地代家賃',
    '保険料',
    '支払手数料',
    '会議費',
    '新聞図書費',
    '消耗品費',
    '諸会費',
    '研修費',
    '支払顧問料',
  ],
expenseAccountExceptions: [
    '荷造運賃',
    '地代家賃',
    '賃借料',
  ],
bsPlSkipAccounts: [
    '商品券',
    '敷金',
    '創立費',
    '未収入金',
    '未収還付消費税等',
  ],
bsCurrentAssetAlwaysVisible: [
    '商品券',
  ],
bsInvestmentOtherAlwaysVisible: [
    '敷金',
  ],
bsDeferredAssetAlwaysVisible: [
    '創立費',
  ],
  expenseAccountSuffixPattern: '(?:費|料)$',
};

const PATTERN_LIST_KEYS = new Set([
  'nonOperatingRevenuePatterns',
  'personnelPatterns',
  'outsourcingPatterns',
  'otherPatterns',
  'nonOperatingExpensePatterns',
  'specialProfitPatterns',
  'specialLossPatterns',
  'taxPatterns',
  'bsSkipAccountPatterns',
]);

/** 設定画面のセクション構成 */
export const JOURNAL_DEFINITION_GROUPS = [
  {
    id: 'pl',
    label: 'PLセクション分類',
    sections: [
      {
        key: 'revenueSectionAccounts',
        sectionColorId: 'revenue',
        label: '売上高',
        hint: 'この勘定科目は「売上高」セクションに集計されます',
        valueType: 'account',
      },
      {
        key: 'nonOperatingRevenueAccounts',
        sectionColorId: 'nonOperating',
        label: '営業外収益（勘定名）',
        hint: '営業外収益セクションに集計する勘定科目名',
        valueType: 'account',
      },
      {
        key: 'nonOperatingRevenuePatterns',
        sectionColorId: 'nonOperating',
        label: '営業外収益（パターン）',
        hint: '勘定科目名の正規表現。例： ^貸倒引当金戻入',
        valueType: 'pattern',
      },
      {
        key: 'personnelPatterns',
        sectionColorId: 'personnel',
        label: '人件費',
        hint: '人件費セクションに一致する正規表現。補助科目は「勘定科目名|補助科目名」で指定',
        valueType: 'pattern',
      },
      {
        key: 'outsourcingPatterns',
        sectionColorId: 'outsourcing',
        label: '外注費',
        hint: '外注費セクションに一致する正規表現',
        valueType: 'pattern',
      },
      {
        key: 'otherPatterns',
        sectionColorId: 'other',
        label: 'その他',
        hint: 'その他セクションに一致する正規表現',
        valueType: 'pattern',
      },
      {
        key: 'nonOperatingExpensePatterns',
        sectionColorId: 'nonOperatingExpense',
        label: '営業外費用',
        hint: '営業外費用セクションに一致する正規表現',
        valueType: 'pattern',
      },
      {
        key: 'specialProfitPatterns',
        sectionColorId: 'specialProfit',
        label: '特別利益',
        hint: '特別利益セクションに一致する正規表現',
        valueType: 'pattern',
      },
      {
        key: 'specialLossPatterns',
        sectionColorId: 'specialLoss',
        label: '特別損失',
        hint: '特別損失セクションに一致する正規表現',
        valueType: 'pattern',
      },
      {
        key: 'taxPatterns',
        sectionColorId: 'tax',
        label: '法人税',
        hint: '法人税セクションに一致する正規表現',
        valueType: 'pattern',
      },
      {
        key: 'plSkipAccounts',
        label: 'PL集計除外（勘定名）',
        hint: 'PLに含めない勘定科目名（資産・負債など）',
        valueType: 'account',
      },
      {
        key: 'bsSkipAccountPatterns',
        label: 'PL集計除外（パターン）',
        hint: '勘定科目名に対する正規表現。PLに含めない勘定を指定',
        valueType: 'pattern',
      },
    ],
  },
  {
    id: 'expense',
    label: '諸経費',
    sections: [
      {
        key: 'expenseAccountSuffixPattern',
        sectionColorId: 'expense',
        label: '諸経費の勘定名条件',
        hint: '常時表示一覧外の仕訳から諸経費に含める勘定名の条件（正規表現。例：末尾が「費」「料」で終わる勘定を含める）',
        valueType: 'singlePattern',
      },
      {
        key: 'expenseAccountExceptions',
        sectionColorId: 'expense',
        label: '諸経費の例外勘定',
        hint: '条件に一致しなくても諸経費に含める勘定名（荷造運賃・地代家賃・賃借料など）',
        valueType: 'account',
      },
      {
        key: 'expenseSectionAccounts',
        sectionColorId: 'expense',
        label: '常時表示勘定一覧',
        hint: '仕訳がなくても 0円で表示する諸経費の勘定科目名',
        valueType: 'account',
      },
    ],
  },
  {
    id: 'cashflow',
    label: 'キャッシュフロー',
    sections: [
      {
        key: 'cashAccounts',
        sectionColorId: 'cashBalance',
        label: '現金及び預金勘定',
        hint: '口座間移動の判定に使う現金・預金系勘定',
        valueType: 'account',
      },
      {
        key: 'paymentCounterparts',
        sectionColorId: 'otherPay',
        label: '支払計画対象勘定',
        hint: '普通預金との取引で支払い計画を追跡する勘定',
        valueType: 'account',
      },
    ],
  },
  {
    id: 'bs',
    label: '貸借対照表',
    sections: [
      {
        key: 'bsPlSkipAccounts',
        label: 'PL集計除外・BS表示',
        hint: 'PLに含めず貸借対照表に表示する勘定',
        valueType: 'account',
      },
      {
        key: 'bsCurrentAssetAlwaysVisible',
        sectionColorId: 'currentAssets',
        label: '流動資産の常時表示',
        hint: 'CSVに行がない場合も表示する勘定',
        valueType: 'account',
      },
      {
        key: 'bsInvestmentOtherAlwaysVisible',
        sectionColorId: 'fixedAssets',
        label: '投資その他の常時表示',
        hint: '固定資産内でCSVに行がない場合も表示',
        valueType: 'account',
      },
      {
        key: 'bsDeferredAssetAlwaysVisible',
        sectionColorId: 'deferredAssets',
        label: '繰延資産の常時表示',
        hint: '繰延資産でCSVに行がない場合も表示',
        valueType: 'account',
      },
    ],
  },
];

let cachedDefinition = null;
let cachedCompiledPatterns = null;
let cachedDefinitionSource = null;

function cloneDefaultDefinition() {
  const result = {};
  for (const [key, value] of Object.entries(DEFAULT_JOURNAL_DEFINITION)) {
    result[key] = typeof value === 'string' ? value : [...value];
  }
  return result;
}

function normalizePatternString(raw, fallback) {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  return raw.trim();
}

function normalizeStringList(raw, fallback) {
  if (!Array.isArray(raw)) return [...fallback];
  const result = [];
  const seen = new Set();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result.length ? result : [...fallback];
}

/** 保存値を正規化し、空のみはデフォルトに戻す */
export function normalizeJournalDefinition(raw) {
  const normalized = {};
  for (const key of Object.keys(DEFAULT_JOURNAL_DEFINITION)) {
    const fallback = DEFAULT_JOURNAL_DEFINITION[key];
    if (key === 'expenseAccountSuffixPattern') {
      normalized[key] = normalizePatternString(raw?.[key], fallback);
      continue;
    }
    normalized[key] = normalizeStringList(raw?.[key], fallback);
  }
  return normalized;
}

export function loadJournalDefinition() {
  try {
    const stored = localStorage.getItem(JOURNAL_DEFINITION_STORAGE_KEY);
    if (!stored) return cloneDefaultDefinition();
    return normalizeJournalDefinition(JSON.parse(stored));
  } catch {
    return cloneDefaultDefinition();
  }
}

export function saveJournalDefinition(config) {
  const normalized = normalizeJournalDefinition(config);
  localStorage.setItem(JOURNAL_DEFINITION_STORAGE_KEY, JSON.stringify(normalized));
  cachedDefinition = normalized;
  cachedCompiledPatterns = null;
  cachedDefinitionSource = normalized;
  return normalized;
}

export function resetJournalDefinition() {
  localStorage.removeItem(JOURNAL_DEFINITION_STORAGE_KEY);
  cachedDefinition = cloneDefaultDefinition();
  cachedCompiledPatterns = null;
  cachedDefinitionSource = cachedDefinition;
  return cachedDefinition;
}

/** 有効な仕訳定義を返す（キャッシュ付き） */
export function getJournalDefinition() {
  if (!cachedDefinition) {
    cachedDefinition = loadJournalDefinition();
    cachedDefinitionSource = cachedDefinition;
  }
  return cachedDefinition;
}

/** 外部から仕訳定義を更新したときに呼ぶ */
export function setActiveJournalDefinition(config) {
  cachedDefinition = normalizeJournalDefinition(config);
  cachedCompiledPatterns = null;
  cachedDefinitionSource = cachedDefinition;
  return cachedDefinition;
}

export function compileJournalPattern(source) {
  if (!source?.trim()) return null;
  try {
    return new RegExp(source);
  } catch {
    return null;
  }
}

function compilePatternList(list) {
  return list
    .map((source) => compileJournalPattern(source))
    .filter(Boolean);
}

/** 正規表現をコンパイルした状態で返す */
export function getCompiledJournalPatterns(definition = getJournalDefinition()) {
  if (cachedCompiledPatterns && cachedDefinitionSource === definition) {
    return cachedCompiledPatterns;
  }
  cachedCompiledPatterns = {
    nonOperatingRevenue: compilePatternList(definition.nonOperatingRevenuePatterns),
    personnel: compilePatternList(definition.personnelPatterns),
    outsourcing: compilePatternList(definition.outsourcingPatterns),
    other: compilePatternList(definition.otherPatterns),
    nonOperatingExpense: compilePatternList(definition.nonOperatingExpensePatterns),
    specialProfit: compilePatternList(definition.specialProfitPatterns),
    specialLoss: compilePatternList(definition.specialLossPatterns),
    tax: compilePatternList(definition.taxPatterns),
    bsSkipAccount: compilePatternList(definition.bsSkipAccountPatterns),
  };
  cachedDefinitionSource = definition;
  return cachedCompiledPatterns;
}

export function isJournalPatternValid(source) {
  if (!source?.trim()) return false;
  try {
    // eslint-disable-next-line no-new
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

export function getPaymentCounterpartsSet(definition = getJournalDefinition()) {
  return new Set(definition.paymentCounterparts);
}

export function getCashAccountsSet(definition = getJournalDefinition()) {
  return new Set(definition.cashAccounts);
}

export function getPlSkipAccountsSet(definition = getJournalDefinition()) {
  const skip = new Set(definition.plSkipAccounts);
  for (const account of definition.bsPlSkipAccounts) skip.add(account);
  return skip;
}

/** 諸経費セクションに表示する勘定名か判定 */
export function isExpenseSectionDisplayAccount(account, definition = getJournalDefinition()) {
  const name = account?.trim();
  if (!name) return false;
  const canonical = name;
  if (definition.expenseSectionAccounts.includes(canonical)) return true;
  if (definition.expenseAccountExceptions.includes(canonical)) return true;
  const suffixPattern = compileJournalPattern(definition.expenseAccountSuffixPattern);
  if (suffixPattern?.test(name)) return true;
  return false;
}

export function isRevenueAccountKey(key, definition = getJournalDefinition(), patterns = getCompiledJournalPatterns(definition)) {
  const [account] = key.split('|');
  if (definition.revenueSectionAccounts.includes(account)) return true;
  if (definition.nonOperatingRevenueAccounts.includes(account)) return true;
  return patterns.nonOperatingRevenue.some((pattern) => pattern.test(key));
}

export function categorizeAccountKey(key, definition = getJournalDefinition(), patterns = getCompiledJournalPatterns(definition)) {
  const [account] = key.split('|');
  if (isRevenueAccountKey(key, definition, patterns)) {
    return definition.revenueSectionAccounts.includes(account) ? 'revenue' : 'nonOperating';
  }
  if (patterns.personnel.some((pattern) => pattern.test(key))) return 'personnel';
  if (patterns.outsourcing.some((pattern) => pattern.test(key))) return 'outsourcing';
  if (patterns.other.some((pattern) => pattern.test(key))) return 'other';
  if (patterns.nonOperatingExpense.some((pattern) => pattern.test(key))) return 'nonOperatingExpense';
  if (patterns.specialProfit.some((pattern) => pattern.test(key))) return 'specialProfit';
  if (patterns.specialLoss.some((pattern) => pattern.test(key))) return 'specialLoss';
  if (patterns.tax.some((pattern) => pattern.test(key))) return 'tax';
  if (getPlSkipAccountsSet(definition).has(account)) return null;
  if (patterns.bsSkipAccount.some((pattern) => pattern.test(account))) return null;
  return 'expense';
}
