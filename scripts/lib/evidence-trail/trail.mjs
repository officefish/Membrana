/**
 * Лента вещдоков окна — **носитель N3**, единственный из трёх, который владелец разрешил
 * строить (`OWNER_ANSWERS.md` §5).
 *
 * ПОЧЕМУ ИМЕННО ОН. Дом ленты назван вердиктом M4 заседания `sprint-honest-performers`, но
 * носителя в репозитории не существовало: гейт считал ленту своим ВХОДОМ, петля опыта — чужой
 * собственностью, и в итоге её не было ни у кого. Без ленты механизм остаётся диагнозом, а не
 * лечением — дословно оговорка аудитора, оставленная в силе при ратификации вердикта.
 *
 * ПОЧЕМУ ДВА ДРУГИХ НОСИТЕЛЯ НЕ СТРОЯТСЯ. Привязка сегментов ревью к блоку (N1) бессмысленна
 * до первого боевого прогона — привязывать нечего. Журнал остановок ведущей (N2) пуст, пока
 * ведущая ни разу не остановила спринт. Строить носитель под несуществующие данные значило бы
 * изобретать форму под догадку.
 *
 * ФОРМА ВЗЯТА У ПОТРЕБИТЕЛЯ, А НЕ ПРИДУМАНА. `execution-gate` объявил её в своих
 * `EXPECTATIONS.md` односторонне и первым; лента ей подчиняется. Обратный порядок дал бы
 * носителю власть над предикатом, который его читает.
 *
 * Append-only и без часов: `at` ставит автор акта, лента время не сочиняет.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { TRACE_KINDS } from '../execution-trace/trace-kinds.mjs';

/** Дом ленты по умолчанию. Одно окно — один файл: окно и есть единица адресации (M4). */
export const TRAIL_DIR = 'docs/sprint/trail';

export const TRAIL_PROBLEMS = Object.freeze({
  NOT_OBJECT: 'запись не объект',
  FIELD_MISSING: 'обязательное поле отсутствует',
  KIND_UNKNOWN: 'род следа вне закрытого списка',
  BROKEN_LINE: 'строка не разбирается как JSON',
});

const REQUIRED = Object.freeze(['traceId', 'blockId', 'kind', 'subject', 'at', 'ref']);

/**
 * Проверка записи ПЕРЕД записью в ленту. Лента не судит ответственность — это предмет гейта;
 * она судит только собственную форму. Иначе носитель начнёт выносить вердикты, а вердикт из
 * двух ртов — та самая болезнь, против которой разводились ведение и надзор.
 *
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateTrace(rec) {
  if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
    return { ok: false, problems: [TRAIL_PROBLEMS.NOT_OBJECT] };
  }
  const problems = [];
  for (const f of REQUIRED) {
    const v = rec[f];
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (empty) problems.push(`${TRAIL_PROBLEMS.FIELD_MISSING}: ${f}`);
  }
  if (rec.kind !== undefined && !Object.values(TRACE_KINDS).includes(rec.kind)) {
    // Род вне списка — ошибка входа, а не «прочее»: открытый список означал бы, что гейт
    // обходится новым словом. Лента держит ту же закрытость, что и её потребитель.
    problems.push(`${TRAIL_PROBLEMS.KIND_UNKNOWN}: ${String(rec.kind)}`);
  }
  return { ok: problems.length === 0, problems };
}

/** Сериализация одной записи. Порядок ключей стабилен — дифф ленты обязан быть читаемым. */
export function serializeTrace(rec) {
  return JSON.stringify({
    traceId: rec.traceId,
    blockId: rec.blockId,
    kind: rec.kind,
    subject: rec.subject,
    at: rec.at,
    ref: rec.ref,
    ...(rec.relatesToSprint === undefined ? {} : { relatesToSprint: rec.relatesToSprint }),
  });
}

/**
 * Разбор ленты. **Битая строка — находка, а не молчаливый пропуск**, и общее число строк
 * возвращается отдельно: `execution-gate` просил знаменатель «сколько записей отвергнуто»,
 * потому что `corpusSize` считает только валидные, и без общего числа отвергнутые невидимы.
 *
 * @returns {{ traces: object[], problems: {line: number, problems: string[]}[], totalLines: number }}
 */
export function parseTrail(text) {
  const lines = String(text ?? '').split(/\r?\n/u).filter((l) => l.trim() !== '');
  const traces = [];
  const problems = [];
  lines.forEach((line, i) => {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      problems.push({ line: i + 1, problems: [TRAIL_PROBLEMS.BROKEN_LINE] });
      return;
    }
    const v = validateTrace(rec);
    if (v.ok) traces.push(rec);
    else problems.push({ line: i + 1, problems: v.problems });
  });
  return { traces, problems, totalLines: lines.length };
}

/** Путь ленты окна. Окно адресуется своим id — не датой: дата не уникальна. */
export const trailPathFor = (windowId, dir = TRAIL_DIR) => `${dir}/${windowId}.jsonl`;

/**
 * Дописать акт в ленту. **Только append** — переписывание ленты означало бы, что вещдок
 * исполнения можно отредактировать задним числом.
 *
 * @returns {{ appended: boolean, problems: string[] }} отказ назван причиной, не исключением
 */
export function appendTrace(repoRoot, windowId, rec, { dir = TRAIL_DIR } = {}) {
  const v = validateTrace(rec);
  if (!v.ok) return { appended: false, problems: v.problems };
  const path = `${repoRoot}/${trailPathFor(windowId, dir)}`;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${serializeTrace(rec)}\n`, 'utf8');
  return { appended: true, problems: [] };
}

/** Прочитать ленту окна. Файла нет → пустой корпус С ПРИЗНАКОМ, а не молчаливый ноль. */
export function readTrail(repoRoot, windowId, { dir = TRAIL_DIR } = {}) {
  const path = `${repoRoot}/${trailPathFor(windowId, dir)}`;
  if (!existsSync(path)) {
    return { traces: [], problems: [], totalLines: 0, exists: false };
  }
  return { ...parseTrail(readFileSync(path, 'utf8')), exists: true };
}
