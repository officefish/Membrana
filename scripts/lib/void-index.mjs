/**
 * Индекс кладбища для штрафа свежести (`recent_void_penalty`, вердикт M5-GC).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Штраф — контракт ВЫЗОВА: список свежеотвергнутых собирает тот,
 * кто зовёт генератор, а сам генератор про кладбище не знает. Живи чтение внутри
 * `insight-ritual.mjs`, завёлся бы цикл план → void → план, и генератор стал бы зависеть от
 * того, что сам породил. Поэтому индекс читается здесь и подаётся генератору значением.
 *
 * ПОЧЕМУ ДАТА БЕРЁТСЯ ИЗ ЭПИТАФИИ. Эпитафия — барьер №1 и единственный носитель приговора,
 * который едет вместе со следом: она в самом файле, переживает переносы и правки индекса.
 * Дата из имени каталога или из mtime файла была бы догадкой, а штраф по угаданной дате
 * отпускает идею раньше или держит дольше срока — обе ошибки молчаливые.
 *
 * Могила без читаемой даты попадает в индекс БЕЗ неё — и штрафуется БЕССРОЧНО. Это не
 * недосмотр, а fail-closed: приговор состоялся, а срок его истечения неизвестен; отпустить
 * идею «на всякий случай» значило бы вернуть в план то, что отвергли, по незнанию. Держать
 * дольше срока — потеря возможности, вернуть отвергнутое — возврат к беде, из-за которой
 * барьеры и поставлены. Список `undated` называет такие могилы, чтобы вызывающий сказал о
 * них словом и дату дописали, а не чтобы штраф молча ослаб.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { VOID_DIR } from './gc-void.mjs';

/** Файлы кладбища, объясняющие правило, — не могилы. */
const VOID_CANON = Object.freeze(['README.md', 'LIFECYCLE.md']);

/**
 * Вытащить дату приговора из эпитафии.
 * @param {string} body
 * @returns {string|null}
 */
export function rejectedAtOf(body) {
  if (typeof body !== 'string' || !body.startsWith('---\nstatus: rejected')) return null;
  const m = /^rejectedAt:\s*(\d{4}-\d{2}-\d{2})\s*$/mu.exec(body.slice(0, 600));
  return m ? m[1] : null;
}

/**
 * Прочитать индекс кладбища: имя могилы и дата приговора.
 *
 * @param {string} repoRoot
 * @returns {{index: Array<{id: string, rejectedAt: string|null}>, undated: string[]}}
 */
export function readVoidIndex(repoRoot, io = { existsSync, readFileSync, readdirSync, statSync }) {
  const root = join(repoRoot, VOID_DIR);
  if (!io.existsSync(root)) return { index: [], undated: [] };

  const index = [];
  const undated = [];
  let names = [];
  try {
    names = io.readdirSync(root);
  } catch {
    return { index: [], undated: [] };
  }

  for (const name of names) {
    if (VOID_CANON.includes(name)) continue;
    const dir = join(root, name);
    let isDir = false;
    try {
      isDir = io.statSync(dir).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;

    let rejectedAt = null;
    let files = [];
    try {
      files = io.readdirSync(dir).filter((f) => f.endsWith('.md'));
    } catch {
      files = [];
    }
    for (const file of files) {
      try {
        rejectedAt = rejectedAtOf(io.readFileSync(join(dir, file), 'utf8'));
      } catch {
        rejectedAt = null;
      }
      if (rejectedAt) break;
    }
    if (!rejectedAt) undated.push(name);
    index.push({ id: name, rejectedAt });
  }

  return { index: index.sort((a, b) => a.id.localeCompare(b.id)), undated: undated.sort() };
}
