/**
 * Пол сессии — **проекция**, из которой собирается выдача хука старта (§6 контракта
 * `workshop-wires`, комната M6).
 *
 * ИСТОЧНИК ВЫДАЧИ — ТОЛЬКО ПРОЕКЦИЯ: манифесты ∪ реестр неймспейсов ∪ штампы git. §6
 * запрещает ручную запись в текст выдачи прямым пунктом. Здесь этот запрет держится не
 * дисциплиной, а **конструкцией**: рендер ([`session-floor-render.mjs`](./session-floor-render.mjs))
 * получает на вход только то, что собрано здесь, и других входов у него нет. Захотеть
 * дописать строку руками можно — но некуда.
 *
 * ЧТО В ПОЛ НЕ ВХОДИТ (§6, список закрыт): список бесхозных · знаменатель инварианта ·
 * киты · сброс README целиком · атлас как источник истины. Первые два — предмет прибора
 * мастерской и зуба, и тащить их на старт значит платить полным обходом дерева за каждую
 * сессию; §6 назвал обход знаменателя на старте **дефектом**.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { discoverContainers } from './tooling-atlas.mjs';
import { REGISTRY_STATES, projectNamespaces, readRegistry } from './namespace-registry.mjs';

/**
 * Потолок числа мастерских в полной выдаче (§6). Больше — сжатая форма.
 * Порог по строкам живёт в рендере: здесь считать нечего, строк ещё нет.
 */
export const MANY_WORKSHOPS = 15;

/** Потолок минимального набора вызовов реестра (§6: «не более двенадцати»). */
export const MAX_CALLABLE = 12;

/** Ссылка на документацию — ровно одна (§6). */
export const DOC_LINK = 'docs/tooling-atlas/registry/ATLAS.md';

/** Строка политики порядка обращения. Живёт проекцией, а не рукой (§8 + §6). */
export const POLICY_LINE = 'сначала обзор и глагол мастерской, греп — последний';

/**
 * Входной глагол мастерской: первый непустой из канонической тройки.
 *
 * Пустой — **честный прочерк**, а не выдумка: §6 прямо велит печатать прочерк, если
 * входного глагола нет. Подставить сюда `audit` «по умолчанию» значило бы отправить сессию
 * звать команду, которой у мастерской не существует.
 */
export function entryVerb(verbsDict) {
  if (verbsDict === null || typeof verbsDict !== 'object' || Array.isArray(verbsDict)) return null;
  for (const key of ['audit', 'decompose', 'inspectElement']) {
    const v = verbsDict[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
}

/**
 * Словарь глаголов ИЗ МАНИФЕСТА, а не из справочника.
 *
 * `discoverContainers` отдаёт `verbs` списком **присутствующих ключей** (`['audit',
 * 'decompose']`), а не строками вызова. Поймано живым прогоном 31.07: пол печатал входным
 * глаголом слово `audit` — имя ключа вместо команды, то есть предлагал сессии дверь,
 * которой не существует. Ровно тот дефект, против которого §6 требует «входной глагол или
 * честный прочерк»: выдуманная команда хуже прочерка, потому что по ней пойдут.
 */
function manifestVerbs(repoRoot, home) {
  try {
    const doc = JSON.parse(readFileSync(join(repoRoot, home, 'workshop.manifest.json'), 'utf8'));
    return doc?.verbs ?? null;
  } catch {
    return null;
  }
}

/**
 * Краткое описание мастерской — из манифеста и README, обрезанное до одной строки.
 *
 * Обрезка по длине, а не по первому предложению: точка внутри пути или сокращения рвала бы
 * описание в случайном месте, и выдача выглядела бы битой там, где данные целы.
 */
export function shortDescription(container, limit = 90) {
  const raw = String(container?.summary ?? container?.title ?? '').replace(/\s+/gu, ' ').trim();
  if (raw === '') return null;
  return raw.length <= limit ? raw : `${raw.slice(0, limit - 1)}…`;
}

/**
 * Минимальный набор вызовов, который сессия узнаёт сразу.
 *
 * Берётся из ВХОДНЫХ ГЛАГОЛОВ мастерских, а не из списка скриптов `package.json`: §6 велит
 * дать сессии дверь в каждую мастерскую, а не каталог из 253 команд — ровно та ошибка, из-за
 * которой рукописный снимок инвентаря однажды соврал на 242 позиции.
 *
 * Порядок устойчив (алфавит по дому), обрезка — по потолку §6 с честным остатком.
 */
export function callableSet(workshops, max = MAX_CALLABLE) {
  const calls = workshops.map((w) => w.entryVerb).filter((v) => typeof v === 'string' && v !== '');
  const unique = [...new Set(calls)];
  return { calls: unique.slice(0, max), dropped: Math.max(0, unique.length - max) };
}

/**
 * Собрать проекцию пола.
 *
 * @param {string} repoRoot
 * @param {{stamps?: object|null, secondLevelAt?: string|null, now?: string|null}} [ctx]
 *   `stamps` — готовый блок свежести (его считает `cold-start-stamps.mjs`); проекция его
 *   НЕ пересчитывает и не подменяет: два независимых счёта одной свежести разъедутся.
 */
export function buildFloor(repoRoot, ctx = {}) {
  const containers = discoverContainers(repoRoot);
  const workshops = containers
    .map((c) => ({
      home: c.home,
      name: c.name ?? c.home,
      description: shortDescription(c),
      entryVerb: entryVerb(manifestVerbs(repoRoot, c.home)),
      valid: c.valid !== false,
    }))
    .sort((a, b) => a.home.localeCompare(b.home));

  const registry = readRegistry(repoRoot);
  const namespaces = registry.state === REGISTRY_STATES.OK ? projectNamespaces(registry.namespaces) : [];

  return {
    workshops,
    // Число мастерских отдаётся отдельно от списка: сжатая форма печатает счётчик вместо
    // перечня, и считать его по обрезанному списку значило бы соврать в первой же строке.
    workshopCount: workshops.length,
    compact: workshops.length > MANY_WORKSHOPS,
    callable: callableSet(workshops),
    namespaces,
    registryState: registry.state,
    registryProblems: registry.problems,
    policyLine: POLICY_LINE,
    docLink: DOC_LINK,
    stamps: ctx.stamps ?? null,
    secondLevelAt: ctx.secondLevelAt ?? null,
    now: ctx.now ?? null,
  };
}

/**
 * Дата последнего прогона второго уровня — из артефакта недельной процедуры.
 *
 * Хук второй уровень НЕ запускает (§6): он только читает метку и сигналит, если та старше
 * недели. Запустить тяжёлый инвентарь со старта значило бы платить за него каждой сессией.
 */
export function readSecondLevelStamp(repoRoot, rel = 'docs/procedures/dead-wires/LAST_RUN.json') {
  try {
    const doc = JSON.parse(readFileSync(join(repoRoot, rel), 'utf8'));
    return typeof doc?.at === 'string' ? doc.at : null;
  } catch {
    // Отсутствие метки — не ошибка: процедура могла ни разу не прогоняться. Это состояние
    // «неизвестно», и рендер обязан сказать именно так, а не «просрочен».
    return null;
  }
}
