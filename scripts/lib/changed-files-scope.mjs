/**
 * changed-files-scope — ОДИН носитель двух мерок, по которым список изменённых файлов
 * превращается в скоуп работы turbo: что не влияет на код (`.md`/`.mdx`) и что влияет
 * на всё (корневые конфиги).
 *
 * ПОЧЕМУ ВЫНЕСЕНО (блок b2 спринта `vitest-two-tier-gate`). Обе мерки родились приватными
 * внутри `scripts/prepush-typecheck-scope.mjs` — вылечили дефект #1168, где turbo метил
 * пакет affected по ЛЮБОМУ файлу, включая markdown: правка `.md` тянула зависимых, звала
 * `vite` (не поставлен в воркспейсе), давала exit 127 и блокировала push; сессия 24.07
 * форсила `--no-verify`, минуя заодно gitleaks.
 *
 * Мердж-гейт vitest обязан фильтровать ровно так же — иначе он воспроизведёт тот же дефект
 * на своём ярусе. Оставались три пути, и два плохи: импорт lib←скрипт есть «тайное API»
 * (скрипты — исполняемые точки входа, не библиотеки; разбор в шапке
 * `lib/sprint-cut/acts-trail-reader.mjs`), а копия мерки оставляет возможность разъехаться
 * на единицу — ровно то, чего избегает `lib/sprint-cut/cut-plan.mjs`, импортируя порог
 * `OVERSIZED_CHANGED_LINES` вместо своей константы 400.
 *
 * Поэтому носитель здесь, а оба потребителя импортируют. Публичное имя `nonDocsFiles`
 * остаётся реэкспортом из прежнего адреса — старые импорты не переписываются.
 */

/** Расширения, не влияющие ни на типы, ни на поведение пакета. */
export const DOCS_RE = /\.(md|mdx)$/iu;

/**
 * Корневые файлы, реально инвалидирующие ВЕСЬ воркспейс.
 * Ровно turbo `globalDependencies` (turbo.json) + сам граф задач. Корневой `package.json`
 * СЮДА НЕ входит: turbo его глобальной зависимостью не считает, а правка скриптов в нём
 * типы и тесты пакетов не трогает — иначе over-trigger полного билда (vite 127).
 */
export const GLOBAL_CONFIGS = Object.freeze(['tsconfig.base.json', 'turbo.json', '.env']);

/** @param {string[]} files */
export function nonDocsFiles(files) {
  return files.filter((f) => f && !DOCS_RE.test(f));
}

/** Задет ли корневой конфиг, инвалидирующий весь воркспейс. @param {string[]} files */
export function touchesGlobalConfig(files, globalConfigs = GLOBAL_CONFIGS) {
  return files.some((f) => globalConfigs.includes(String(f).split('\\').join('/')));
}
