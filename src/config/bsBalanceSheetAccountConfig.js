/**
 * PL集計除外で貸借対照表に表示する勘定。
 * CSVに行がない場合も常時表示する。
 * 実行時の一覧は仕訳定義設定（journalDefinitionConfig）を参照します。
 */
import {
  DEFAULT_JOURNAL_DEFINITION,
  getJournalDefinition,
} from './journalDefinitionConfig.js';

export const BS_PL_SKIP_ACCOUNTS = new Set(DEFAULT_JOURNAL_DEFINITION.bsPlSkipAccounts);

export const BS_CURRENT_ASSET_ALWAYS_VISIBLE = DEFAULT_JOURNAL_DEFINITION.bsCurrentAssetAlwaysVisible;

/** 固定資産、投資その他の資産 */
export const BS_INVESTMENT_OTHER_ALWAYS_VISIBLE = DEFAULT_JOURNAL_DEFINITION.bsInvestmentOtherAlwaysVisible;

/** 繰延資産 */
export const BS_DEFERRED_ASSET_ALWAYS_VISIBLE = DEFAULT_JOURNAL_DEFINITION.bsDeferredAssetAlwaysVisible;

export function getBsPlSkipAccounts() {
  return getJournalDefinition().bsPlSkipAccounts;
}

export function getBsCurrentAssetAlwaysVisible() {
  return getJournalDefinition().bsCurrentAssetAlwaysVisible;
}

export function getBsInvestmentOtherAlwaysVisible() {
  return getJournalDefinition().bsInvestmentOtherAlwaysVisible;
}

export function getBsDeferredAssetAlwaysVisible() {
  return getJournalDefinition().bsDeferredAssetAlwaysVisible;
}
