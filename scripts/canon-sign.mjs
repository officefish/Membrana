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
// map персоны для провенанса Ангелины: human → human (владелец), llm → tarasov (генератор
// пишет от Тимлида). Формат — единая точка правды provenanceHeader.
// РОЛЬ ИСПРАВЛЕНА 31.07: стоял `vesnin` при комментарии «пишет от Тимлида», но тимлид с
// 27.07 — tarasov, а vesnin переведён в архитекторы. Генераторы уже подписываются верно
// (шапка DAILY_STANDUP от 31.07 несёт author=tarasov) — отставала эта копия карты ролей.
// Тот же класс, что Ф3 разбора #1533: у каждого потребителя свой список.
const provAuthor = author === 'human' ? 'human' : 'tarasov';

const existing = text.match(/<!--\s*angelina\s*(\{[\s\S]*?\})\s*-->/u);
if (existing) {
  // У3 разбора #1539: `readAt` затирался жёстко зашитым пустым объектом, и подпись
  // владельца МАШИННО ПОНИЖАЛА провенанс — после ручной чеканки 31.07 Ангелина показала
  // документ как «не проверено». Отметки прочтения принадлежат тем, кто читал источники;
  // смена автора меняет ПОДПИСАНТА, а не факт прочтения.
  let readAt = {};
  try {
    const parsed = JSON.parse(existing[1]);
    readAt = parsed && typeof parsed.readAt === 'object' && parsed.readAt !== null ? parsed.readAt : {};
  } catch (e) {
    // Битая шапка — ОТКАЗ, не тихий пустой readAt: молчаливый фолбэк стёр бы провенанс
    // ровно так же, как чинимый дефект, и назвал бы это подписью.
    console.error(`canon:sign: шапка провенанса не разбирается — подпись НЕ поставлена: ${e instanceof Error ? e.message : String(e)}`);
    console.error(`  шапка: ${existing[0].slice(0, 200)}`);
    console.error('  починить руками и повторить: перенос согласия на битый провенанс запрещён');
    process.exit(2);
  }
  const kept = Object.keys(readAt).length;
  text = text.replace(/<!--\s*angelina\s*\{[\s\S]*?\}\s*-->/u, provenanceHeader({ author: provAuthor, readAt }));
  console.error(`canon:sign: подпись ОБНОВЛЕНА (author=${provAuthor}) в ${file} · отметок прочтения сохранено: ${kept}`);
} else {
  // Шапки нет — `readAt` брать неоткуда, пустой законен: генераторы заполнят при чтении
  // источников. Это не потеря, а первое появление подписи.
  const header = provenanceHeader({ author: provAuthor, readAt: {} });
  // Вставка после начального блока html-комментариев шапки (или в самое начало).
  const m = text.match(/^(?:<!--[\s\S]*?-->\r?\n)+/u);
  const at = m ? m[0].length : 0;
  text = text.slice(0, at) + header + '\n' + text.slice(at);
  console.error(`canon:sign: подпись ДОБАВЛЕНА (author=${provAuthor}) в ${file}`);
}

writeFileSync(abs, text, 'utf8');
