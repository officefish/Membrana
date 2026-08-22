/**
 * Дома крепления — M2_VERDICT (#1961), правка 22.08 (коворк `cowork-server-plugin-pages`, блок A).
 * Длинная форма `<пакет>/<домен>`; устройства отложены до появления Nest-модуля
 * `background-devices` — не «сейчас», не «никогда».
 *
 * ДОБАВЛЕНО `background-cabinet/journal`. Класс 1 по правилу самого пакета: PR при
 * СУЩЕСТВУЮЩЕМ Nest-модуле, и модуль существует — `packages/background-cabinet/src/modules/journal/`
 * несёт контроллер, службу, DTO и свои зубы. Домом его делает реализация `IPluginHost`
 * (это блок C того же коворка); реестр объявляет имя, а не готовность.
 *
 * УДАЛЕНО `background-office/journal` по Т4 шторма 22.08 («призраков не держим»). Имя стояло в
 * словаре с M2, но за ним не было ничего: модуля журнала в офисе нет (18 модулей, journal среди
 * них отсутствует), `IPluginHost` не реализован, ни один манифест на этот дом не ссылается.
 * Единственный «журнал» офисного слоя — `@membrana/journal-report-views`, React-рендеры
 * телеметрии клиента, другой слой целиком.
 *
 * КЛАСС ПРАВКИ ПРИ УДАЛЕНИИ НЕ НАЗНАЧЕН ЗДЕСЬ. Правило пакета описывает ДОБАВЛЕНИЕ дома
 * (класс 1) и о снятии имени молчит. Кто и каким классом снимает имя — предмет владельца
 * словаря (Архитектор, Веснин); вопрос вынесен в `EXPECTATIONS.md` блока A и не решён тихо.
 *
 * Манифест с `mountTarget ∉ HOME_REGISTRY` отвергается валидацией до рантайма — этим занят
 * `isHomeName`.
 */
export const HOME_REGISTRY = {
  'background-cabinet/journal': { package: 'background-cabinet', domain: 'journal' },
  'background-media/collections': { package: 'background-media', domain: 'collections' },
} as const;

export type HomeName = keyof typeof HOME_REGISTRY;

export function isHomeName(value: unknown): value is HomeName {
  return typeof value === 'string' && Object.hasOwn(HOME_REGISTRY, value);
}

/**
 * Дом результатов — M3 (непереигрываемое) с уточнением аудита A3-6: константы лежат В ПАКЕТЕ
 * рядом с `HOME_REGISTRY`, а не внутри него — реестр перечисляет дома КРЕПЛЕНИЯ, а коллекция
 * результатов домом крепления не является.
 *
 * `PLUGIN_RESULTS_DB` остаётся `background-office` и снятием одноимённого ДОМА не затронут:
 * дом крепления и носитель результатов — разные предметы, и совпадение слова `background-office`
 * в двух местах ничего между ними не связывает. Перенос дома результатов — магистраль следующей
 * недели, здесь он не трогается.
 */
export const PLUGIN_RESULTS_DB = 'background-office';
export const PLUGIN_RESULTS_COLLECTION = 'plugin-results';
