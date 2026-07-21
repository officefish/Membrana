#!/usr/bin/env node
/**
 * Подпись канона дня (вердикт M2-B angelina-hostess): ручная чеканка владельца
 * подписывается ШТАТНО, без node-хирургии.
 *
 *   yarn canon:sign --author human [--file docs/MAIN_DAY_ISSUE.md]
 *
 * Пишет/обновляет заголовок провенанса Ангелины (`provenanceHeader` — единая точка
 * формата, та же, что у генераторов) с автором human|llm. Страж проверяет структуру
 * и целостность, НЕ авторство: author=human легитимен (чеканка — второй путь канона).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { provenanceHeader } from './lib/angelina-adapter.mjs';
import { CANON_AUTHORS } from './lib/day-plan-assemble.mjs';

const argv = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : def;
};

const author = arg('author');
const file = arg('file', 'docs/MAIN_DAY_ISSUE.md');

if (!author || !CANON_AUTHORS.includes(author)) {
  console.error(`canon:sign: --author обязателен и ∈ {${CANON_AUTHORS.join(', ')}}`);
  process.exit(2);
}

const abs = resolve(process.cwd(), file);
if (!existsSync(abs)) {
  console.error(`canon:sign: файл не найден: ${file}`);
  process.exit(2);
}

let text = readFileSync(abs, 'utf8');
// map персоны для провенанса Ангелины: human → human (владелец), llm → vesnin (генератор
// пишет от Тимлида). Формат — единая точка правды provenanceHeader.
const provAuthor = author === 'human' ? 'human' : 'vesnin';
const header = provenanceHeader({ author: provAuthor, readAt: {} });

if (/<!--\s*angelina\s*\{/u.test(text)) {
  text = text.replace(/<!--\s*angelina\s*\{[\s\S]*?\}\s*-->/u, header);
  console.error(`canon:sign: подпись ОБНОВЛЕНА (author=${provAuthor}) в ${file}`);
} else {
  // Вставка после начального блока html-комментариев шапки (или в самое начало).
  const m = text.match(/^(?:<!--[\s\S]*?-->\r?\n)+/u);
  const at = m ? m[0].length : 0;
  text = text.slice(0, at) + header + '\n' + text.slice(at);
  console.error(`canon:sign: подпись ДОБАВЛЕНА (author=${provAuthor}) в ${file}`);
}

writeFileSync(abs, text, 'utf8');
