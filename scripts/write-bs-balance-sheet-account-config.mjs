/** write-bs-balance-sheet-account-config.mjs (fromCodePoint generator) */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/config/bsBalanceSheetAccountConfig.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const content = `/**
 * ${jp(0x50, 0x4c, 0x96c6, 0x8a08, 0x9664, 0x5916, 0x3067, 0x8cb8, 0x501f, 0x5bfe, 0x7167, 0x8868, 0x306b, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x3002)}
 * ${jp(0x43, 0x53, 0x56, 0x306b, 0x884c, 0x304c, 0x306a, 0x3044, 0x5834, 0x5408, 0x3082, 0x5e38, 0x6642, 0x8868, 0x793a, 0x3059, 0x308b, 0x3002)}
 * ${jp(0x5b9f, 0x884c, 0x6642, 0x306e, 0x4e00, 0x89a7, 0x306f, 0x4ed5, 0x8a33, 0x5b9a, 0x7fa9, 0x8a2d, 0x5b9a, 0xFF08, 0x6a, 0x6f, 0x75, 0x72, 0x6e, 0x61, 0x6c, 0x44, 0x65, 0x66, 0x69, 0x6e, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0xFF09, 0x3092, 0x53c2, 0x7167, 0x3057, 0x307e, 0x3059, 0x3002)}
 */
import {
  DEFAULT_JOURNAL_DEFINITION,
  getJournalDefinition,
} from './journalDefinitionConfig.js';

export const BS_CURRENT_ASSET_ALWAYS_VISIBLE = DEFAULT_JOURNAL_DEFINITION.bsCurrentAssetAlwaysVisible;

/** ${jp(0x56fa, 0x5b9a, 0x8cc7, 0x7523, 0x3001, 0x6295, 0x8cc7, 0x305d, 0x306e, 0x4ed6, 0x306e, 0x8cc7, 0x7523)} */
export const BS_INVESTMENT_OTHER_ALWAYS_VISIBLE = DEFAULT_JOURNAL_DEFINITION.bsInvestmentOtherAlwaysVisible;

/** ${jp(0x7e70, 0x5ef6, 0x8cc7, 0x7523)} */
export const BS_DEFERRED_ASSET_ALWAYS_VISIBLE = DEFAULT_JOURNAL_DEFINITION.bsDeferredAssetAlwaysVisible;

export function getBsCurrentAssetAlwaysVisible() {
  return getJournalDefinition().bsCurrentAssetAlwaysVisible;
}

export function getBsInvestmentOtherAlwaysVisible() {
  return getJournalDefinition().bsInvestmentOtherAlwaysVisible;
}

export function getBsDeferredAssetAlwaysVisible() {
  return getJournalDefinition().bsDeferredAssetAlwaysVisible;
}
`;

writeFileSync(target, content, { encoding: 'utf8' });
console.log('Wrote', target);
