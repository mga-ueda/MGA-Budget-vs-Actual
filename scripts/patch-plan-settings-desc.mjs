/** patch plan settings description for fiscal calendar */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/ui/plan.js');
let content = readFileSync(path, 'utf8');

const oldDesc = '事業開始年は予実表ヘッダーの年表示（12月〜11月）の算出に使います。選択中の期（例: 第8期）と組み合わせて、各月の年ラベルを決定します。決算月は会計期の最終月（1〜12）です。';
const newDesc = '事業開始年・決算月は予実表ヘッダーの年表示と会計月の並びの算出に使います。選択中の期（例: 第8期）と組み合わせて、各月の年ラベルを決定します。決算月は会計期の最終月（1〜12）です。';

if (!content.includes(oldDesc)) {
  console.error('Description text not found');
  process.exit(1);
}
content = content.replace(oldDesc, newDesc);
writeFileSync(path, content, 'utf8');
console.log('Updated plan.js settings description');
