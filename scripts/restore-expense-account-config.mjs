/**
 * expenseAccountConfig.jsを再生成（fix-all-encoding.mjsを実行）。
 */
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
execSync('node scripts/fix-all-encoding.mjs', { cwd: repoRoot, stdio: 'inherit' });
