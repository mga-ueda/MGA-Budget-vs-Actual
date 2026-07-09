/**
 * 全期の仕訳 CSVから諸経費勘定科目をスキャンし、expenseAccountConfig.jsを更新する。
 * 実行: scan-expense.bat または node scripts/scan-expense-accounts.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseCsvLine, decodeCsvBuffer } from '../src/parse/parser.js';
import { categorizeAccount } from '../src/parse/parseJournal.js';
import {
  EXPENSE_SECTION_ACCOUNTS,
  canonicalExpenseAccount,
} from '../src/config/expenseAccountConfig.js';
import { isExpenseSectionDisplayAccount } from '../src/config/journalDefinitionConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const csvRoot = resolve(repoRoot, 'csv');
const configPath = resolve(repoRoot, 'src/config/expenseAccountConfig.js');
const outputPath = resolve(__dirname, 'expense-scan-output.json');

const JOURNAL_FILES = [
  '第１期/仕訳データ_2018-12-07_2019-11-30.csv',
  '第２期/仕訳データ_2019-12-01_2020-11-30.csv',
  '第３期/仕訳データ_2020-12-01_2021-11-30.csv',
  '第４期/仕訳データ_2021-12-01_2022-11-30.csv',
  '第５期/仕訳データ_2022-12-01_2023-11-30.csv',
  '第６期/仕訳データ_2023-12-01_2024-11-30.csv',
  '第７期/仕訳データ_2024-12-01_2025-11-30.csv',
  '第８期/仕訳データ_2025-12-01_2026-11-30.csv',
];

/** 諸経費セクションの常時表示対象を判定（仕訳定義設定を参照） */
function isScannableExpenseAccount(account) {
  if (!account) return false;
  if (categorizeAccount(account) !== 'expense') return false;
  return isExpenseSectionDisplayAccount(account);
}

function scanJournalFile(text) {
  const byCanonical = new Map();
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (cells[19]?.trim() === '開始仕訳') continue;

    for (const account of [cells[2]?.trim(), cells[10]?.trim()]) {
      if (!isScannableExpenseAccount(account)) continue;
      const key = canonicalExpenseAccount(account);
      const prev = byCanonical.get(key);
      if (!prev) {
        byCanonical.set(key, { name: account, count: 1 });
      } else {
        prev.count += 1;
        if (account !== prev.name) prev.name = account;
      }
    }
  }
  return byCanonical;
}

function mergeAccountLists(existing, scannedByCanonical) {
  const merged = [];
  const known = new Set();

  for (const name of existing) {
    const key = canonicalExpenseAccount(name);
    known.add(key);
    const fromJournal = scannedByCanonical.get(key);
    merged.push(fromJournal?.name ?? name);
  }

  const additions = [];
  return { merged, additions };
}

function escapeSingleQuoted(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function formatAccountsArray(accounts) {
  return accounts.map((account) => `  ${escapeSingleQuoted(account)},`).join('\n');
}

function updateExpenseAccountConfig(accounts) {
  const source = readFileSync(configPath, 'utf8');
  const arrayBlock = `export const EXPENSE_SECTION_ACCOUNTS = [\n${formatAccountsArray(accounts)}\n];`;
  const updated = source.replace(
    /export const EXPENSE_SECTION_ACCOUNTS = \[[\s\S]*?\];/,
    arrayBlock,
  );
  if (updated === source) {
    throw new Error('EXPENSE_SECTION_ACCOUNTSの更新に失敗しました');
  }
  writeFileSync(configPath, updated, { encoding: 'utf8' });
}

const scannedByCanonical = new Map();
for (const rel of JOURNAL_FILES) {
  const filePath = join(csvRoot, rel);
  if (!existsSync(filePath)) {
    console.warn(`スキップ（ファイルなし）: ${filePath}`);
    continue;
  }
  const text = decodeCsvBuffer(readFileSync(filePath));
  for (const [key, entry] of scanJournalFile(text)) {
    const prev = scannedByCanonical.get(key);
    if (!prev || entry.count > prev.count) {
      scannedByCanonical.set(key, { ...entry });
    }
  }
}

const { merged, additions } = mergeAccountLists(EXPENSE_SECTION_ACCOUNTS, scannedByCanonical);
const spellingChanges = merged.filter((name, index) => name !== EXPENSE_SECTION_ACCOUNTS[index]);
const unchanged = additions.length === 0
  && spellingChanges.length === 0
  && merged.length === EXPENSE_SECTION_ACCOUNTS.length;

writeFileSync(outputPath, `${JSON.stringify({
  scannedFiles: JOURNAL_FILES.length,
  previousCount: EXPENSE_SECTION_ACCOUNTS.length,
  nextCount: merged.length,
  additions,
  accounts: merged,
}, null, 2)}\n`, { encoding: 'utf8' });

if (unchanged) {
  console.log(`変更なし（${merged.length} 科目）。 ${outputPath} を出力しました。`);
} else {
  updateExpenseAccountConfig(merged);
  execSync('node scripts/check-encoding.mjs', { cwd: repoRoot, stdio: 'inherit' });
  execSync('node build.mjs', { cwd: repoRoot, stdio: 'inherit' });
  console.log(`更新しました: ${configPath}`);
  console.log(`追加 ${additions.length} 科目: ${additions.join('、') || 'なし'}`);
  console.log(`合計 ${merged.length} 科目。 ${outputPath} を出力しました。`);
}
