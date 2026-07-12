/**
 * PL集計除外で貸借対照表に表示する勘定。
 * CSVに行がない場合も常時表示する。
 * 実行時の一覧は仕訳定義設定（journalDefinitionConfig）を参照します。
 */
import { getJournalDefinition } from './journalDefinitionConfig.js';

export function getBsCurrentAssetAlwaysVisible() {
  return getJournalDefinition().bsCurrentAssetAlwaysVisible;
}

export function getBsInvestmentOtherAlwaysVisible() {
  return getJournalDefinition().bsInvestmentOtherAlwaysVisible;
}

export function getBsDeferredAssetAlwaysVisible() {
  return getJournalDefinition().bsDeferredAssetAlwaysVisible;
}
