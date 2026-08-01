/**
 * Ссылка ствола для диапазона дня — чистый предикат, без ФС, сети и побочных эффектов.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. `scripts/audit-evening.mjs` — скрипт: его тело выполняется на
 * импорте и может позвать `process.exit`. Тест, импортирующий скрипт ради одной функции,
 * запускает вместе с ней весь аудит (и переписывает `docs/DAILY_AUDIT.md`), а при отсутствии
 * ствола просто убивает процесс тестов. Обходить это через `{ skip: !fn }` нельзя — тогда
 * тест молча зеленеет там, где защиты нет вовсе (зверь «Молчаливый зелёный», B6).
 * Найдено ревью PR #1612.
 *
 * ЗАЧЕМ САМА ССЫЛКА. Вещдок 31.07: аудит считал диапазон от `HEAD` — головы ветки, в которой
 * запущен. Все шесть коммитов соседних сессий того дня лежали в стволе и оказались ВНЕ
 * диапазона: день соседей не был увиден вовсе.
 */

/** Ссылка ствола по умолчанию. Переопределяется переменной `AUDIT_TRUNK_REF`. */
export const DEFAULT_TRUNK_REF = 'origin/main';

/** @param {NodeJS.ProcessEnv} [env] */
export function trunkRefFrom(env = {}) {
  const ref = env.AUDIT_TRUNK_REF;
  return typeof ref === 'string' && ref.trim() !== '' ? ref.trim() : DEFAULT_TRUNK_REF;
}

/**
 * Разрешить ссылку ствола в коммит.
 *
 * Отказ — с названной причиной, а не тихий откат к `HEAD`: молчаливый откат вернул бы
 * прежнюю слепоту, и отличить бойкий неполный отчёт было бы нечем.
 *
 * @param {string} ref
 * @param {(ref: string) => string} revParse инъекция: сам модуль git не зовёт
 * @returns {{ok: true, ref: string, sha: string} | {ok: false, ref: string, reason: string}}
 */
export function resolveTrunk(ref, revParse) {
  try {
    const sha = revParse(ref);
    return sha
      ? { ok: true, ref, sha }
      : { ok: false, ref, reason: `ссылка «${ref}» не разрешается в коммит` };
  } catch {
    return { ok: false, ref, reason: `ссылки «${ref}» нет в этом дереве` };
  }
}

/** Текст отказа: он обязан сказать не только «нет», но и что делать. */
export function trunkRefusalMessage(reason) {
  return (
    `audit-evening: ${reason}.\n` +
    '  Диапазон дня считается по стволу, а не по ветке автора: иначе работа соседних\n' +
    '  сессий выпадает из отчёта и день выглядит меньше, чем был (вещдок 31.07).\n' +
    '  Что делать: git fetch origin — либо назвать другую ссылку через AUDIT_TRUNK_REF.'
  );
}
