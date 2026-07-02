/**
 * PL集計除外で貸借対照表に表示する勘定。
 * CSVに行がない場合も常時表示する。
 */
export const BS_PL_SKIP_ACCOUNTS = new Set(['商品券', '敷金', '創立費', '未収入金', '未収還付消費税等']);

export const BS_CURRENT_ASSET_ALWAYS_VISIBLE = ['商品券'];

/** 固定資産、投資その他の資産 */
export const BS_INVESTMENT_OTHER_ALWAYS_VISIBLE = ['敷金'];

/** 繰延資産 */
export const BS_DEFERRED_ASSET_ALWAYS_VISIBLE = ['創立費'];
