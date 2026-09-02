/**
 * Имя временного поля ключа.
 *
 * ИЗВЕСТНЫЙ ШОВ: вердикт M2 назвал рабочее имя `trackUrl`, лемма M4 записала
 * `temporaryKey?`. Ни одна комната не назначала имя окончательно; сведение — Interface
 * Consilium (Phase 3). Блок `contract` выбрал имя ДЛЯ СЕБЯ и объявил довод в
 * `docs/cowork-sprint/cowork-library-open-api/team-contract/EXPECTATIONS.md`.
 *
 * Здесь имя живёт ОДНОЙ строкой. Тип, сериализатор, схема OpenAPI и зубы выводятся из неё,
 * поэтому смена имени на интеграции стоит правку этой константы и больше ничего.
 */
export const TEMPORARY_KEY_FIELD = 'temporaryKey';

export type TemporaryKeyField = typeof TEMPORARY_KEY_FIELD;

/**
 * Значение поля — непрозрачная строка (URL, по которому партнёр идёт анонимно).
 * Форма её не разбирает и не переиспользует: чем она выдана и сколько живёт — вопрос
 * соседнего блока (M3).
 */
export type TemporaryKeyValue = string;
