/**
 * journalDefinitionConfig.js generator — node scripts/gen-journal-definition-config.mjs
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(repoRoot, 'src/config/journalDefinitionConfig.js');

function jp(...codes) {
  return String.fromCodePoint(...codes);
}

function sq(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function lines(values) {
  return values.map((v) => `    ${sq(v)},`).join('\n');
}

const EXPENSE_ACCOUNTS = [
  jp(0x798f, 0x5229, 0x539a, 0x751f, 0x8cbb),
  jp(0x8377, 0x9020, 0x904b, 0x8cc3),
  jp(0x5e83, 0x544a, 0x8cbb),
  jp(0x4ea4, 0x969b, 0x8cbb),
  jp(0x65c5, 0x8cbb, 0x4ea4, 0x901a, 0x8cbb),
  jp(0x901a, 0x4fe1, 0x8cbb),
  jp(0x6c34, 0x9053, 0x5149, 0x71b1, 0x8cbb),
  jp(0x4fee, 0x7e55, 0x8cbb),
  jp(0x8eca, 0x4e21, 0x8cbb),
  jp(0x8cc3, 0x501f, 0x6599),
  jp(0x5730, 0x4ee3, 0x5bb6, 0x8cc3),
  jp(0x4fdd, 0x967a, 0x6599),
  jp(0x652f, 0x6255, 0x624b, 0x6570, 0x6599),
  jp(0x4f1a, 0x8b70, 0x8cbb),
  jp(0x65b0, 0x805e, 0x56f3, 0x66f8, 0x8cbb),
  jp(0x6d88, 0x8017, 0x54c1, 0x8cbb),
  jp(0x8af8, 0x4f1a, 0x8cbb),
  jp(0x7814, 0x4fee, 0x8cbb),
  jp(0x652f, 0x6255, 0x9867, 0x554f, 0x6599),
];

const DEFAULTS = {
  revenueSectionAccounts: [jp(0x58f2, 0x4e0a, 0x9ad8)],
  nonOperatingRevenueAccounts: [
    jp(0x53d7, 0x53d6, 0x5229, 0x606f),
    jp(0x96d1, 0x53ce, 0x5165),
    jp(0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca),
  ],
  nonOperatingRevenuePatterns: [`^${jp(0x8cb8, 0x5012, 0x5f15, 0x5f53, 0x91d1, 0x623b, 0x5165)}`],
  personnelPatterns: [
    `^${jp(0x5f79, 0x54e1, 0x5831, 0x916c)}`,
    `^${jp(0x7d66, 0x6599, 0x624b, 0x5f53)}`,
    `^${jp(0x6cd5, 0x5b9a, 0x798f, 0x5229, 0x8cbb)}`,
    `^${jp(0x8cde, 0x4e0e)}`,
    `^${jp(0x9000, 0x8077)}`,
    `${jp(0x65c5, 0x8cbb, 0x4ea4, 0x901a, 0x8cbb)}\\|${jp(0x901a, 0x52e4, 0x624b, 0x5f53)}`,
  ],
  outsourcingPatterns: [`^${jp(0x5916, 0x6ce8, 0x8cbb)}`],
  otherPatterns: [
    `^${jp(0x79df, 0x7a0e, 0x516c, 0x8ab2)}`,
    `^${jp(0x6e1b, 0x4fa1, 0x511f, 0x5374, 0x8cbb)}`,
    `^${jp(0x5c11, 0x984d, 0x6e1b, 0x4fa1, 0x511f, 0x5374, 0x8cbb)}`,
    `^${jp(0x7e70, 0x5ef6, 0x8cc7, 0x7523, 0x511f, 0x5374)}`,
    `^${jp(0x8cb8, 0x5012, 0x5f15, 0x5f53, 0x91d1, 0x7e70, 0x5165)}`,
  ],
  nonOperatingExpensePatterns: [
    `^${jp(0x652f, 0x6255, 0x5229, 0x606f)}`,
    `^${jp(0x96d1, 0x640d, 0x5931)}`,
  ],
  specialProfitPatterns: [
    `^${jp(0x524d, 0x671f, 0x640d, 0x76ca, 0x4fee, 0x6b63, 0x76ca)}`,
    `^${jp(0x56fa, 0x5b9a, 0x8cc7, 0x7523, 0x58f2, 0x5374, 0x76ca)}`,
  ],
  specialLossPatterns: [
    `^${jp(0x6cd5, 0x4eba, 0x7a0e, 0x3001, 0x4f4f, 0x6c11, 0x7a0e)}`,
    `^${jp(0x56fa, 0x5b9a, 0x8cc7, 0x7523, 0x9664, 0x5374, 0x640d)}`,
  ],
  taxPatterns: [`^${jp(0x6cd5, 0x4eba, 0x7a0e, 0x7b49)}$`],
  plSkipAccounts: [
    jp(0x666e, 0x901a, 0x9810, 0x91d1),
    jp(0x58f2, 0x639b, 0x91d1),
    jp(0x8cb8, 0x5012, 0x5f15, 0x5f53, 0x91d1),
    jp(0x672a, 0x6255, 0x91d1),
    jp(0x672a, 0x6255, 0x8cbb, 0x7528),
    jp(0x524d, 0x6255, 0x91d1),
    jp(0x524d, 0x6255, 0x8cbb, 0x7528),
    jp(0x9577, 0x671f, 0x524d, 0x6255, 0x8cbb, 0x7528),
    jp(0x4fdd, 0x967a, 0x7a4d, 0x7acb, 0x91d1),
    jp(0x8cc7, 0x672c, 0x91d1),
    jp(0x7e70, 0x8d8a, 0x5229, 0x76ca, 0x5269, 0x4f59, 0x91d1),
    jp(0x9577, 0x671f, 0x672a, 0x6255, 0x91d1),
    jp(0x9577, 0x671f, 0x501f, 0x5165, 0x91d1),
    jp(0x77ed, 0x671f, 0x501f, 0x5165, 0x91d1),
    jp(0x5de5, 0x5177, 0x5668, 0x5177, 0x5099, 0x54c1),
    jp(0x8eca, 0x4e21, 0x904b, 0x642c, 0x5177),
    jp(0x30bd, 0x30d5, 0x30c8, 0x30a6, 0x30a7, 0x30a2),
    jp(0x8caf, 0x8535, 0x54c1),
    jp(0x5c0f, 0x984d, 0x8cc7, 0x7523),
    jp(0x4eee, 0x6255, 0x6d88, 0x8cbb, 0x7a0e),
    jp(0x672a, 0x6255, 0x6d88, 0x8cbb, 0x7a0e),
    jp(0x672a, 0x6255, 0x6cd5, 0x4eba, 0x7a0e, 0x7b49),
    jp(0x5f79, 0x54e1, 0x501f, 0x5165, 0x91d1),
    jp(0x9810, 0x308a, 0x91d1),
    jp(0x4eee, 0x53d7, 0x6d88, 0x8cbb, 0x7a0e),
    jp(0x4eee, 0x6255, 0x91d1),
    jp(0x7acb, 0x66ff, 0x91d1),
    jp(0x672a, 0x53ce, 0x9084, 0x4ed8, 0x6cd5, 0x4eba, 0x7a0e, 0x7b49),
  ],
  bsSkipAccountPatterns: [`^${jp(0x672a, 0x53ce, 0x9084, 0x4ed8)}`],
  paymentCounterparts: [
    jp(0x9577, 0x671f, 0x672a, 0x6255, 0x91d1),
    jp(0x4fdd, 0x967a, 0x7a4d, 0x7acb, 0x91d1),
    jp(0x4f4f, 0x6c11, 0x7a0e),
    jp(0x5f79, 0x54e1, 0x501f, 0x5165, 0x91d1),
    jp(0x77ed, 0x671f, 0x501f, 0x5165, 0x91d1),
    jp(0x672a, 0x6255, 0x6cd5, 0x4eba, 0x7a0e, 0x7b49),
    jp(0x672a, 0x6255, 0x6d88, 0x8cbb, 0x7a0e),
  ],
  cashAccounts: [
    jp(0x73fe, 0x91d1),
    jp(0x666e, 0x901a, 0x9810, 0x91d1),
    jp(0x5f53, 0x5ea7, 0x9810, 0x91d1),
    jp(0x5b9a, 0x671f, 0x9810, 0x91d1),
    jp(0x901a, 0x77e5, 0x9810, 0x91d1),
    jp(0x5225, 0x6bb5, 0x9810, 0x91d1),
  ],
  expenseSectionAccounts: EXPENSE_ACCOUNTS,
  expenseAccountSuffixPattern: `(?:${jp(0x8cbb)}|${jp(0x6599)})$`,
  expenseAccountExceptions: [
    jp(0x8377, 0x9020, 0x904b, 0x8cc3),
    jp(0x5730, 0x4ee3, 0x5bb6, 0x8cc3),
    jp(0x8cc3, 0x501f, 0x6599),
  ],
  bsPlSkipAccounts: [
    jp(0x5546, 0x54c1, 0x5238),
    jp(0x6577, 0x91d1),
    jp(0x5275, 0x7acb, 0x8cbb),
    jp(0x672a, 0x53ce, 0x5165, 0x91d1),
    jp(0x672a, 0x53ce, 0x9084, 0x4ed8, 0x6d88, 0x8cbb, 0x7a0e, 0x7b49),
  ],
  bsCurrentAssetAlwaysVisible: [jp(0x5546, 0x54c1, 0x5238)],
  bsInvestmentOtherAlwaysVisible: [jp(0x6577, 0x91d1)],
  bsDeferredAssetAlwaysVisible: [jp(0x5275, 0x7acb, 0x8cbb)],
};

const LIST_KEYS = [
  'revenueSectionAccounts',
  'nonOperatingRevenueAccounts',
  'nonOperatingRevenuePatterns',
  'personnelPatterns',
  'outsourcingPatterns',
  'otherPatterns',
  'nonOperatingExpensePatterns',
  'specialProfitPatterns',
  'specialLossPatterns',
  'taxPatterns',
  'plSkipAccounts',
  'bsSkipAccountPatterns',
  'paymentCounterparts',
  'cashAccounts',
  'expenseSectionAccounts',
  'expenseAccountExceptions',
  'bsPlSkipAccounts',
  'bsCurrentAssetAlwaysVisible',
  'bsInvestmentOtherAlwaysVisible',
  'bsDeferredAssetAlwaysVisible',
];

const PATTERN_KEYS = new Set([
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

function defaultBlock(key) {
  return `${key}: [\n${lines(DEFAULTS[key])}\n  ]`;
}

const content = `const JOURNAL_DEFINITION_STORAGE_KEY = 'mga-journal-definition';

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
${LIST_KEYS.map(defaultBlock).join(',\n')},
  expenseAccountSuffixPattern: ${sq(DEFAULTS.expenseAccountSuffixPattern)},
};

const PATTERN_LIST_KEYS = new Set([
${[...PATTERN_KEYS].map((k) => `  ${sq(k)},`).join('\n')}
]);

/** ${jp(0x8a2d, 0x5b9a, 0x753b, 0x9762, 0x306e, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x69cb, 0x6210)} */
export const JOURNAL_DEFINITION_GROUPS = [
  {
    id: 'pl',
    label: ${sq(jp(0x50, 0x4c, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x5206, 0x985e))},
    sections: [
      {
        key: 'revenueSectionAccounts',
        sectionColorId: 'revenue',
        label: ${sq(jp(0x58f2, 0x4e0a, 0x9ad8))},
        hint: ${sq(jp(0x3053, 0x306e, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x306f, 0x300c, 0x58f2, 0x4e0a, 0x9ad8, 0x300d, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x96c6, 0x8a08, 0x3055, 0x308c, 0x307e, 0x3059))},
        valueType: 'account',
      },
      {
        key: 'nonOperatingRevenueAccounts',
        sectionColorId: 'nonOperating',
        label: ${sq(jp(0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca, 0xff08, 0x52d8, 0x5b9a, 0x540d, 0xff09))},
        hint: ${sq(jp(0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x96c6, 0x8a08, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d))},
        valueType: 'account',
      },
      {
        key: 'nonOperatingRevenuePatterns',
        sectionColorId: 'nonOperating',
        label: ${sq(jp(0x55b6, 0x696d, 0x5916, 0x53ce, 0x76ca, 0xff08, 0x30d1, 0x30bf, 0x30fc, 0x30f3, 0xff09))},
        hint: ${sq(jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d, 0x306e, 0x6b63, 0x898f, 0x8868, 0x73fe, 0x3002, 0x4f8b, 0xff1a, 0x20, 0x5e, 0x8cb8, 0x5012, 0x5f15, 0x5f53, 0x91d1, 0x623b, 0x5165))},
        valueType: 'pattern',
      },
      {
        key: 'personnelPatterns',
        sectionColorId: 'personnel',
        label: ${sq(jp(0x4eba, 0x4ef6, 0x8cbb))},
        hint: ${sq(jp(0x4eba, 0x4ef6, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe, 0x3002, 0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x306f, 0x300c, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d, 0x7c, 0x88dc, 0x52a9, 0x79d1, 0x76ee, 0x540d, 0x300d, 0x3067, 0x6307, 0x5b9a))},
        valueType: 'pattern',
      },
      {
        key: 'outsourcingPatterns',
        sectionColorId: 'outsourcing',
        label: ${sq(jp(0x5916, 0x6ce8, 0x8cbb))},
        hint: ${sq(jp(0x5916, 0x6ce8, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe))},
        valueType: 'pattern',
      },
      {
        key: 'otherPatterns',
        sectionColorId: 'other',
        label: ${sq(jp(0x305d, 0x306e, 0x4ed6))},
        hint: ${sq(jp(0x305d, 0x306e, 0x4ed6, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe))},
        valueType: 'pattern',
      },
      {
        key: 'nonOperatingExpensePatterns',
        sectionColorId: 'nonOperatingExpense',
        label: ${sq(jp(0x55b6, 0x696d, 0x5916, 0x8cbb, 0x7528))},
        hint: ${sq(jp(0x55b6, 0x696d, 0x5916, 0x8cbb, 0x7528, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe))},
        valueType: 'pattern',
      },
      {
        key: 'specialProfitPatterns',
        sectionColorId: 'specialProfit',
        label: ${sq(jp(0x7279, 0x5225, 0x5229, 0x76ca))},
        hint: ${sq(jp(0x7279, 0x5225, 0x5229, 0x76ca, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe))},
        valueType: 'pattern',
      },
      {
        key: 'specialLossPatterns',
        sectionColorId: 'specialLoss',
        label: ${sq(jp(0x7279, 0x5225, 0x640d, 0x5931))},
        hint: ${sq(jp(0x7279, 0x5225, 0x640d, 0x5931, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe))},
        valueType: 'pattern',
      },
      {
        key: 'taxPatterns',
        sectionColorId: 'tax',
        label: ${sq(jp(0x6cd5, 0x4eba, 0x7a0e))},
        hint: ${sq(jp(0x6cd5, 0x4eba, 0x7a0e, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x4e00, 0x81f4, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe))},
        valueType: 'pattern',
      },
      {
        key: 'plSkipAccounts',
        label: ${sq(jp(0x50, 0x4c, 0x96c6, 0x8a08, 0x9664, 0x5916, 0xff08, 0x52d8, 0x5b9a, 0x540d, 0xff09))},
        hint: ${sq(jp(0x50, 0x4c, 0x306b, 0x542b, 0x3081, 0x306a, 0x3044, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d, 0xff08, 0x8cc7, 0x7523, 0x30fb, 0x8ca0, 0x50b5, 0x306a, 0x3069, 0xff09))},
        valueType: 'account',
      },
      {
        key: 'bsSkipAccountPatterns',
        label: ${sq(jp(0x50, 0x4c, 0x96c6, 0x8a08, 0x9664, 0x5916, 0xff08, 0x30d1, 0x30bf, 0x30fc, 0x30f3, 0xff09))},
        hint: ${sq(jp(0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d, 0x306b, 0x5bfe, 0x3059, 0x308b, 0x6b63, 0x898f, 0x8868, 0x73fe, 0x3002, 0x50, 0x4c, 0x306b, 0x542b, 0x3081, 0x306a, 0x3044, 0x52d8, 0x5b9a, 0x3092, 0x6307, 0x5b9a))},
        valueType: 'pattern',
      },
    ],
  },
  {
    id: 'expense',
    label: ${sq(jp(0x8af8, 0x7d4c, 0x8cbb))},
    sections: [
      {
        key: 'expenseAccountSuffixPattern',
        sectionColorId: 'expense',
        label: ${sq(jp(0x8af8, 0x7d4c, 0x8cbb, 0x306e, 0x52d8, 0x5b9a, 0x540d, 0x6761, 0x4ef6))},
        hint: ${sq(jp(0x5e38, 0x6642, 0x8868, 0x793a, 0x4e00, 0x89a7, 0x5916, 0x306e, 0x4ed5, 0x8a33, 0x304b, 0x3089, 0x8af8, 0x7d4c, 0x8cbb, 0x306b, 0x542b, 0x3081, 0x308b, 0x52d8, 0x5b9a, 0x540d, 0x306e, 0x6761, 0x4ef6, 0xff08, 0x6b63, 0x898f, 0x8868, 0x73fe, 0x3002, 0x4f8b, 0xff1a, 0x672b, 0x5c3e, 0x304c, 0x300c, 0x8cbb, 0x300d, 0x300c, 0x6599, 0x300d, 0x3067, 0x7d42, 0x308f, 0x308b, 0x52d8, 0x5b9a, 0x3092, 0x542b, 0x3081, 0x308b, 0xff09))},
        valueType: 'singlePattern',
      },
      {
        key: 'expenseAccountExceptions',
        sectionColorId: 'expense',
        label: ${sq(jp(0x8af8, 0x7d4c, 0x8cbb, 0x306e, 0x4f8b, 0x5916, 0x52d8, 0x5b9a))},
        hint: ${sq(jp(0x6761, 0x4ef6, 0x306b, 0x4e00, 0x81f4, 0x3057, 0x306a, 0x304f, 0x3066, 0x3082, 0x8af8, 0x7d4c, 0x8cbb, 0x306b, 0x542b, 0x3081, 0x308b, 0x52d8, 0x5b9a, 0x540d, 0xff08, 0x8377, 0x9020, 0x904b, 0x8cc3, 0x30fb, 0x5730, 0x4ee3, 0x5bb6, 0x8cc3, 0x30fb, 0x8cc3, 0x501f, 0x6599, 0x306a, 0x3069, 0xff09))},
        valueType: 'account',
      },
      {
        key: 'expenseSectionAccounts',
        sectionColorId: 'expense',
        label: ${sq(jp(0x5e38, 0x6642, 0x8868, 0x793a, 0x52d8, 0x5b9a, 0x4e00, 0x89a7))},
        hint: ${sq(jp(0x4ed5, 0x8a33, 0x304c, 0x306a, 0x304f, 0x3066, 0x3082, 0x20, 0x30, 0x5186, 0x3067, 0x8868, 0x793a, 0x3059, 0x308b, 0x8af8, 0x7d4c, 0x8cbb, 0x306e, 0x52d8, 0x5b9a, 0x79d1, 0x76ee, 0x540d))},
        valueType: 'account',
      },
    ],
  },
  {
    id: 'cashflow',
    label: ${sq(jp(0x30ad, 0x30e3, 0x30c3, 0x30b7, 0x30e5, 0x30d5, 0x30ed, 0x30fc))},
    sections: [
      {
        key: 'cashAccounts',
        sectionColorId: 'cashBalance',
        label: ${sq(jp(0x73fe, 0x91d1, 0x53ca, 0x3073, 0x9810, 0x91d1, 0x52d8, 0x5b9a))},
        hint: ${sq(jp(0x53e3, 0x5ea7, 0x9593, 0x79fb, 0x52d5, 0x306e, 0x5224, 0x5b9a, 0x306b, 0x4f7f, 0x3046, 0x73fe, 0x91d1, 0x30fb, 0x9810, 0x91d1, 0x7cfb, 0x52d8, 0x5b9a))},
        valueType: 'account',
      },
      {
        key: 'paymentCounterparts',
        sectionColorId: 'otherPay',
        label: ${sq(jp(0x652f, 0x6255, 0x8a08, 0x753b, 0x5bfe, 0x8c61, 0x52d8, 0x5b9a))},
        hint: ${sq(jp(0x666e, 0x901a, 0x9810, 0x91d1, 0x3068, 0x306e, 0x53d6, 0x5f15, 0x3067, 0x652f, 0x6255, 0x3044, 0x8a08, 0x753b, 0x3092, 0x8ffd, 0x8de1, 0x3059, 0x308b, 0x52d8, 0x5b9a))},
        valueType: 'account',
      },
    ],
  },
  {
    id: 'bs',
    label: ${sq(jp(0x8cb8, 0x501f, 0x5bfe, 0x7167, 0x8868))},
    sections: [
      {
        key: 'bsPlSkipAccounts',
        label: ${sq(jp(0x50, 0x4c, 0x96c6, 0x8a08, 0x9664, 0x5916, 0x30fb, 0x42, 0x53, 0x8868, 0x793a))},
        hint: ${sq(jp(0x50, 0x4c, 0x306b, 0x542b, 0x3081, 0x305a, 0x8cb8, 0x501f, 0x5bfe, 0x7167, 0x8868, 0x306b, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a))},
        valueType: 'account',
      },
      {
        key: 'bsCurrentAssetAlwaysVisible',
        sectionColorId: 'currentAssets',
        label: ${sq(jp(0x6d41, 0x52d5, 0x8cc7, 0x7523, 0x306e, 0x5e38, 0x6642, 0x8868, 0x793a))},
        hint: ${sq(jp(0x43, 0x53, 0x56, 0x306b, 0x884c, 0x304c, 0x306a, 0x3044, 0x5834, 0x5408, 0x3082, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a))},
        valueType: 'account',
      },
      {
        key: 'bsInvestmentOtherAlwaysVisible',
        sectionColorId: 'fixedAssets',
        label: ${sq(jp(0x6295, 0x8cc7, 0x305d, 0x306e, 0x4ed6, 0x306e, 0x5e38, 0x6642, 0x8868, 0x793a))},
        hint: ${sq(jp(0x56fa, 0x5b9a, 0x8cc7, 0x7523, 0x5185, 0x3067, 0x43, 0x53, 0x56, 0x306b, 0x884c, 0x304c, 0x306a, 0x3044, 0x5834, 0x5408, 0x3082, 0x8868, 0x793a))},
        valueType: 'account',
      },
      {
        key: 'bsDeferredAssetAlwaysVisible',
        sectionColorId: 'deferredAssets',
        label: ${sq(jp(0x7e70, 0x5ef6, 0x8cc7, 0x7523, 0x306e, 0x5e38, 0x6642, 0x8868, 0x793a))},
        hint: ${sq(jp(0x7e70, 0x5ef6, 0x8cc7, 0x7523, 0x3067, 0x43, 0x53, 0x56, 0x306b, 0x884c, 0x304c, 0x306a, 0x3044, 0x5834, 0x5408, 0x3082, 0x8868, 0x793a))},
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

/** ${jp(0x4fdd, 0x5b58, 0x5024, 0x3092, 0x6b63, 0x898f, 0x5316, 0x3057, 0x3001, 0x7a7a, 0x306e, 0x307f, 0x306f, 0x30c7, 0x30d5, 0x30a9, 0x30eb, 0x30c8, 0x306b, 0x623b, 0x3059)} */
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

/** ${jp(0x6709, 0x52b9, 0x306a, 0x4ed5, 0x8a33, 0x5b9a, 0x7fa9, 0x3092, 0x8fd4, 0x3059, 0xff08, 0x30ad, 0x30e3, 0x30c3, 0x30b7, 0x30e5, 0x4ed8, 0x304d, 0xff09)} */
export function getJournalDefinition() {
  if (!cachedDefinition) {
    cachedDefinition = loadJournalDefinition();
    cachedDefinitionSource = cachedDefinition;
  }
  return cachedDefinition;
}

/** ${jp(0x5916, 0x90e8, 0x304b, 0x3089, 0x4ed5, 0x8a33, 0x5b9a, 0x7fa9, 0x3092, 0x66f4, 0x65b0, 0x3057, 0x305f, 0x3068, 0x304d, 0x306b, 0x547c, 0x3076)} */
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

/** ${jp(0x6b63, 0x898f, 0x8868, 0x73fe, 0x3092, 0x30b3, 0x30f3, 0x30d1, 0x30a4, 0x30eb, 0x3057, 0x305f, 0x72b6, 0x614b, 0x3067, 0x8fd4, 0x3059)} */
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

/** ${jp(0x8af8, 0x7d4c, 0x8cbb, 0x30bb, 0x30af, 0x30b7, 0x30e7, 0x30f3, 0x306b, 0x8868, 0x793a, 0x3059, 0x308b, 0x52d8, 0x5b9a, 0x540d, 0x304b, 0x5224, 0x5b9a)} */
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
`;

writeFileSync(outPath, content, { encoding: 'utf8' });
console.log('Wrote src/config/journalDefinitionConfig.js');
