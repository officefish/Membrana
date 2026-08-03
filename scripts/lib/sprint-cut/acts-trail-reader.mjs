/**
 * Читатель ЛЕНТЫ АКТОВ ПЛАНА — общий дом для всех потребителей.
 *
 * ПОЧЕМУ ВЫНЕСЕН ИЗ `sprint-cut-check.mjs` (разбор Ожегова 03.08, спринт #1638). Читатель жил
 * внутри CLI, и когда лента понадобилась второму скрипту (`execution-gate` — отзыв протухших
 * следов актом перерезки), связь легла бы скрипт-к-скрипту: скрипты — исполняемые точки входа,
 * не библиотеки, и импорт между ними — «тайное API». Третий потребитель родил бы второго
 * читателя-синонима, которого потом сводить ADR-ом. Дом читателя — рядом с ядром актов
 * (`act-kinds.mjs`), оба скрипта импортируют отсюда, друг о друге не зная.
 *
 * Файла нет → пустая лента (не «не проверяем»): «ленты нет» и «прогона не было» для
 * потребителя одно утверждение.
 *
 * Битая строка — ОШИБКА ВХОДА, а не пропуск. Прежняя версия делала `catch { continue }`,
 * и это ровно тот молчаливый зелёный, который контур обязан закрывать: строка с опечаткой
 * либо с родом вне закрытого списка исчезала бесследно, а `act-kinds` объявляет такой род
 * `E_ACT_KIND_UNKNOWN` — «вердиктов по такой ленте нет вовсе» (найдено ревью PR #1604).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { parseAct } from './act-kinds.mjs';

/** Носитель ленты актов плана: рядом с планом, `trail/<sprintId>.jsonl`. */
export function actsTrailPath(planPath, plan) {
  const id = typeof plan?.sprintId === 'string' && plan.sprintId.trim() ? plan.sprintId : null;
  return id ? resolve(dirname(planPath), 'trail', `${id}.jsonl`) : null;
}

/**
 * Прочитать ленту актов.
 * @returns {{ok: true, acts: object[]} | {ok: false, problems: string[]}}
 */
export function readActsTrail(path, io = { exists: existsSync, read: (p) => readFileSync(p, 'utf8') }) {
  if (!path || !io.exists(path)) return { ok: true, acts: [] };
  const acts = [];
  const problems = [];
  const lines = io.read(path).split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const s = lines[i].trim();
    if (!s || s.startsWith('#')) continue;
    let raw;
    try {
      raw = JSON.parse(s);
    } catch {
      problems.push(`строка ${i + 1}: не разбирается как JSON`);
      continue;
    }
    const parsed = parseAct(raw);
    if (parsed.ok) acts.push(parsed.act);
    else problems.push(`строка ${i + 1}: ${parsed.reason}`);
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, acts };
}
