/**
 * Canonical evening ritual outputs that must land on origin/main (ritual-deliver-to-main).
 *
 * Близнец `ritual-morning-artifacts.mjs`. Заведён спринтом `ritual-tails-sprint`, блок
 * `ritual-evening-manifest-and-delivery`, находка Ф2 разбора #1533: у вечера НЕТ кадра
 * доставки, при том что у утра он есть с рабочим движком — и потому вечер структурно
 * заканчивается на ветке. Цена названа фактом: архив дня 29.07 пролежал на локальной ветке
 * соседнего дерева двое суток и доехал до main руками 31.07, после того как ревью нашло его
 * повторно.
 *
 * ПРОЕКЦИЯ, НЕ ДУБЛИРОВАНИЕ (решение архитектора): каждый шаг цепочки объявляет в
 * `produces[]`, что рождает; этот список — проекция тех объявлений на вопрос «что обязано
 * доехать до ствола».
 *
 * СПИСОК СУЖЕН ДО ПРОВЕРЯЕМОГО, и это не произвол. Движок сверяет СОДЕРЖИМОЕ ФАЙЛА
 * (`readDated` → сравнение с origin/main) и требует сегодняшней даты в документе. Значит
 * в список не входят:
 *
 * - `docs/archive/daily-day/<date>/` — КАТАЛОГ. Вместо него взят его же `manifest.json`:
 *   опись снимка дня, файл, датирован. Каталог без описи и не доехал бы осмысленно.
 * - `docs/archive/daily-code-review/` — каталог, имена внутри несут метку времени прогона
 *   (`DAILY_CODE_REVIEW-<ISO>.md`), предсказать имя по дате нельзя. Содержимое при этом
 *   производно от `docs/DAILY_CODE_REVIEW.md`, который в списке есть.
 * - `docs/tasks/truth-registry.json` — не датированный документ: гейт свежести назвал бы
 *   его `stale` в любой день. Остывание графа правды проверяется своим шагом, не доставкой.
 * - `docs/seanses/team-memory-report-<date>.md` — рождается НЕКРИТИЧНЫМ шагом, законно
 *   отсутствует при сбое отчёта. Включить значило бы дать `missing-local` STOP на живом
 *   вечере — ложный красный ценой в остановку ритуала.
 *
 * Исключения названы здесь, а не молчат: «производные снимки отстают молча» — тот самый
 * класс, ради которого этот спринт и начат.
 */

/** @typedef {{ rel: string, label: string, dated: boolean }} EveningDeliverArtifact */

/** @type {EveningDeliverArtifact[]} */
export const EVENING_DELIVER_ARTIFACTS = Object.freeze([
  { rel: 'docs/DAILY_CODE_REVIEW.md', label: 'DAILY_CODE_REVIEW', dated: false },
  { rel: 'docs/archive/daily-day/<date>/manifest.json', label: 'опись снимка дня', dated: true },
  { rel: 'docs/seanses/team-evening-feedback-<date>.md', label: 'протокол командного фидбека', dated: true },
  { rel: 'docs/seanses/workspace-level-<date>.md', label: 'отчёт выравнивания', dated: true },
  { rel: 'docs/memos/<date>.md', label: 'DAY_MEMO', dated: true },
  { rel: 'docs/bridge/<date>/CONSPECTUS.md', label: 'конспект мостика', dated: true },
]);

/**
 * @param {string} date `YYYY-MM-DD`
 * @param {readonly EveningDeliverArtifact[]} [artifacts]
 * @returns {string[]}
 */
export function eveningDeliverPaths(date, artifacts = EVENING_DELIVER_ARTIFACTS) {
  return artifacts.map((a) => (a.dated ? a.rel.replaceAll('<date>', date) : a.rel));
}

/**
 * Разрешает `<date>` в описаниях артефактов — движку нужен список с готовыми путями,
 * но с сохранёнными метками, иначе отчёт печатает путь вместо человеческого имени.
 *
 * @param {string} date `YYYY-MM-DD`
 * @param {readonly EveningDeliverArtifact[]} [artifacts]
 * @returns {{ rel: string, label: string }[]}
 */
export function eveningDeliverArtifacts(date, artifacts = EVENING_DELIVER_ARTIFACTS) {
  return artifacts.map((a) => ({
    rel: a.dated ? a.rel.replaceAll('<date>', date) : a.rel,
    label: a.label,
  }));
}
