/**
 * Реестр неймспейсов — чтение, проверка, проекция.
 *
 * Канон: [`CONTRACT.md §1`](../../docs/meeting/workshop-wires/CONTRACT.md) — реестр
 * `docs/namespaces/REGISTRY.json` есть **единственный источник истины о членстве**; §3 —
 * справочник ему потребитель-агрегатор, а не второй носитель.
 *
 * Форму записи проверяет `belongs.mjs` (`validateNamespace`, `checkRegistry`): предикат и
 * реестр обязаны судить запись ОДНИМ кодом. Вторая проверка рядом с первой — это второй
 * источник истины о валидности, ровно тот дефект, который §1 запрещает про членство.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { checkRegistry } from './belongs.mjs';

/** Схема документа реестра. */
export const REGISTRY_SCHEMA = 'namespace-registry/1';

/** Путь реестра от корня репозитория — единственный носитель, зашит намеренно. */
export const REGISTRY_REL = 'docs/namespaces/REGISTRY.json';

/**
 * Состояния чтения реестра. Список ЗАКРЫТ и различает три вещи, которые тянет схлопнуть
 * в «пусто»: файла нет ≠ файл битый ≠ файл прочитан и записей в нём ноль. Схлопывание
 * превратило бы отсутствие реестра в «всё припарковано» — ложный зелёный по построению.
 */
export const REGISTRY_STATES = Object.freeze({
  OK: 'ok',
  ABSENT: 'absent',
  UNREADABLE: 'unreadable',
  INVALID: 'invalid',
});

/**
 * Прочитать и проверить реестр.
 *
 * @param {string} repoRoot
 * @returns {{state: string, namespaces: object[], problems: string[]}}
 */
export function readRegistry(repoRoot) {
  const path = join(repoRoot, REGISTRY_REL);
  if (!existsSync(path)) {
    return { state: REGISTRY_STATES.ABSENT, namespaces: [], problems: [`реестра нет: ${REGISTRY_REL}`] };
  }
  let doc = null;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return { state: REGISTRY_STATES.UNREADABLE, namespaces: [], problems: [`реестр не разбирается: ${String(e.message ?? e)}`] };
  }
  const problems = [];
  if (doc?.schema !== REGISTRY_SCHEMA) {
    problems.push(`schema=${doc?.schema === undefined ? '(нет)' : String(doc.schema)} — ожидается «${REGISTRY_SCHEMA}»`);
  }
  const namespaces = Array.isArray(doc?.namespaces) ? doc.namespaces : null;
  if (namespaces === null) problems.push('namespaces не массив');
  if (problems.length > 0) return { state: REGISTRY_STATES.INVALID, namespaces: [], problems };

  const checked = checkRegistry(namespaces);
  return checked.ok
    ? { state: REGISTRY_STATES.OK, namespaces, problems: [] }
    : { state: REGISTRY_STATES.INVALID, namespaces: [], problems: checked.problems };
}

/**
 * Проекция реестра для справочника (§3, вход `derive`).
 *
 * Проекция ПРОИЗВОДНА и не несёт ничего сверх записи: справочник не вправе дописать поле,
 * которого в реестре нет. Поэтому здесь перечисление полей, а не расстил объекта — расстил
 * молча протащил бы в атлас любое будущее поле, включая ошибочное.
 *
 * @param {readonly object[]} namespaces
 * @returns {{id:string,title:string,holder:string,membership:{kind:string,value:unknown},containerKind:string}[]}
 */
export function projectNamespaces(namespaces) {
  return [...(namespaces ?? [])]
    .map((rec) => ({
      id: rec.id,
      title: rec.title,
      holder: rec.holder?.persona ?? rec.holder?.ownerRef ?? '',
      membership: { kind: rec.membership?.kind, value: rec.membership?.value },
      containerKind: rec.containerKind ?? 'plain',
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/**
 * Строка отчёта о реестре — для хука старта и прибора.
 *
 * Пустой реестр печатается словами «правил ноль», а НЕ «неймспейсы: —». Разница не
 * стилистическая: §1 объявил сиротство честным исходом, и отчёт обязан отличать «правил нет»
 * от «всё разложено». Формулировка «чисто» на пустом реестре запрещена всем потребителям.
 */
export function renderRegistryLine(result) {
  const { state, namespaces, problems } = result;
  if (state === REGISTRY_STATES.OK) {
    return namespaces.length === 0
      ? 'реестр неймспейсов: прочитан, правил ноль — это НЕ «всё припарковано»'
      : `реестр неймспейсов: правил ${namespaces.length}`;
  }
  return `реестр неймспейсов: ${state} — ${problems.join('; ')}`;
}
