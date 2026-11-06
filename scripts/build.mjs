// Node's native TypeScript eraser keeps this build usable without npm/network.
// Vite remains the development server and the normal build's first validation.
import { stripTypeScriptTypes } from 'node:module';
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const visited = new Set(), chunks = [];
async function visit(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const source = await readFile(file, 'utf8');
  let code = stripTypeScriptTypes(source, { mode: 'strip' });
  const imports = [...code.matchAll(/^import\s+.*?from\s+['"](.+?)['"];?\s*$/gm)];
  for (const match of imports) {
    if (!match[1].startsWith('./')) throw new Error('Offline bundle only accepts local modules.');
    await visit(path.resolve(path.dirname(file), match[1]));
  }
  code = code.replace(/^import\s+.*?from\s+['"](.+?)['"];?\s*$/gm, '').replace(/^export\s+/gm, '');
  chunks.push(`// ${path.relative(root, file)}\n${code}`);
}
await visit(path.join(root, 'src/main.ts'));
const js = `'use strict';\n(() => {\n${chunks.join('\n')}\n})();`;
// Parse the complete bundle now, so duplicate declarations cannot ship silently.
new Function(js);
let css = await readFile(path.join(root, 'src/style.css'), 'utf8');
for (const weight of ['regular', 'bold']) {
  const fontPath = `fonts/plant-cover-serif-tc-${weight}.woff`;
  const bytes = await readFile(path.join(root, 'src', fontPath));
  css = css.replace(`url('./${fontPath}')`, `url('data:font/woff;base64,${bytes.toString('base64')}')`);
}
const fontLicense = await readFile(path.join(root, 'src/fonts/OFL.txt'), 'utf8');
const html = (await readFile(path.join(root, 'index.html'), 'utf8'))
  .replace('<link rel="stylesheet" href="./src/style.css" />', () => `<style>/* Embedded font license:\n${fontLicense.replace(/\*\//g, '* /')}\n*/\n${css}</style>`)
  .replace('<script type="module" src="./src/main.ts"></script>', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });
await writeFile(path.join(dist, 'index.html'), html);
await writeFile(path.join(dist, '.nojekyll'), '');
await copyFile(path.join(root, 'LICENSE'), path.join(dist, 'LICENSE.txt'));
await writeFile(path.join(dist, 'FONT-LICENSE.txt'), fontLicense);
await writeFile(path.join(dist, '離線使用說明.txt'), '植被尺｜植物覆蓋度判讀訓練\n\n雙擊 index.html 即可使用。無需網路、安裝或登入。\n測驗紀錄保存在目前瀏覽器；離線檔案的儲存支援依瀏覽器而異。\n\n葉片與枝幹的正射投影計入覆蓋度，重疊只算一次，空隙和背景陰影不計入。\n本工具不取代現場調查驗證。\n\n原始碼：https://github.com/Angelo-Liao/plant-cover-trainer\n授權：MIT，詳見 LICENSE.txt。\n');
execFileSync('python3', [path.join(root, 'scripts/package.py'), dist], { stdio: 'inherit' });
console.log(`Built standalone HTML (${Math.round(Buffer.byteLength(html) / 1024)} KiB) and offline ZIP.`);
