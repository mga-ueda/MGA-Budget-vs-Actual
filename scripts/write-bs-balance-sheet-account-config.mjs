import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, '../src/config/bsBalanceSheetAccountConfig.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

const giftCert = jp(0x5546, 0x54c1, 0x5238);
const deposit = jp(0x6577, 0x91d1);
const orgCost = jp(0x5275, 0x7acb, 0x8cbb);
const accruedIncome = jp(0x672a, 0x53ce, 0x5165, 0x91d1);
const refundableConsumptionTax = jp(
  0x672a, 0x53ce, 0x9084, 0x4ed8, 0x6d88, 0x8cbb, 0x7a0e, 0x7b49,
);

const comment1 = jp(
  0x50, 0x4c, 0x96c6, 0x8a08, 0x9664, 0x5916, 0x3067, 0x8cb8, 0x501f, 0x5bfe, 0x7167, 0x8868, 0x306b, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x3002,
);
const comment2 = jp(
  0x43, 0x53, 0x56, 0x306b, 0x884c, 0x304c, 0x306a, 0x3044, 0x5834, 0x5408, 0x3082, 0x5e38, 0x6642, 0x8868, 0x793a, 0x3059, 0x308b, 0x3002,
);

const comment3 = jp(
  0x56fa, 0x5b9a, 0x8cc7, 0x7523, 0x3001, 0x6295, 0x8cc7, 0x305d, 0x306e, 0x4ed6, 0x306e, 0x8cc7, 0x7523,
);
const comment4 = jp(0x7e70, 0x5ef6, 0x8cc7, 0x7523);

const content = `/**
 * ${comment1}
 * ${comment2}
 */
export const BS_PL_SKIP_ACCOUNTS = new Set(['${giftCert}', '${deposit}', '${orgCost}', '${accruedIncome}', '${refundableConsumptionTax}']);

export const BS_CURRENT_ASSET_ALWAYS_VISIBLE = ['${giftCert}'];

/** ${comment3} */
export const BS_INVESTMENT_OTHER_ALWAYS_VISIBLE = ['${deposit}'];

/** ${comment4} */
export const BS_DEFERRED_ASSET_ALWAYS_VISIBLE = ['${orgCost}'];
`;

writeFileSync(target, content, 'utf8');
console.log('Wrote', target);
