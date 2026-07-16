#!/usr/bin/env node
/**
 * graphify-vendor-d3 — вендоринг D3 в статические деревья Graphify (#529 / GRP4).
 *
 * `graphify tree` пишет `<script src="https://d3js.org/d3.v7.min.js">` — внешний
 * CDN (падает на strict CSP, тащит внешнюю зависимость, требует интернет у зрителя).
 * Скрипт инлайнит локальный d3.min.js во ВСЕ *.html каталога с этим тегом → блок
 * становится self-contained (консилиум graphify-research-tree: вендоринг vis-network/D3).
 *
 * Санитайз юзернейма НЕ нужен: per-family extract даёт относительные пути
 * (basename узлов), абсолютного C:\Users\… в D3-деревьях нет (ночной блокер был про
 * vis-network graph.html, не про `graphify tree`).
 *
 * Usage: node scripts/graphify-vendor-d3.mjs <site-dir> <d3.min.js>
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [siteDir, d3Path] = process.argv.slice(2);
if (!siteDir || !d3Path || !existsSync(siteDir) || !existsSync(d3Path)) {
  console.error('Usage: node scripts/graphify-vendor-d3.mjs <site-dir> <d3.min.js>');
  process.exit(1);
}

const d3 = readFileSync(d3Path, 'utf8');
if (d3.includes('</script')) {
  // literal </script> внутри инлайна закрыл бы тег досрочно — экранируем на всякий.
  console.warn('[vendor] d3 содержит </script — экранирую');
}
const inline = `<script>${d3.replaceAll('</script', '<\\/script')}</script>`;
const CDN_TAG = /<script\s+src="https?:\/\/[^"]*d3[^"]*"><\/script>/g;

let patched = 0;
let skipped = 0;
for (const name of readdirSync(siteDir)) {
  if (!name.endsWith('.html')) continue;
  const abs = join(siteDir, name);
  const html = readFileSync(abs, 'utf8');
  CDN_TAG.lastIndex = 0;
  if (!CDN_TAG.test(html)) {
    skipped += 1;
    continue;
  }
  // Замена ФУНКЦИЕЙ, не строкой: в минифицированном D3 есть `$`-последовательности
  // ($&, $$, …), которые в строке-замене интерпретировались бы и, в частности,
  // `$&` вернул бы CDN-тег обратно. Функция подставляет inline буквально.
  writeFileSync(abs, html.replace(CDN_TAG, () => inline), 'utf8');
  patched += 1;
  console.log(`  вендорнут: ${name}`);
}
console.log(`[vendor] D3 инлайнен в ${patched} файл(ов), пропущено ${skipped} (без CDN-тега).`);
