/**
 * Резолюция воркспейс-пакетов относительно рабочего дерева — чистый предикат (#1647).
 *
 * ЗАЧЕМ. В параллельном worktree `node_modules` — симлинк на главный чекаут, и пакеты
 * `@membrana/*` резолвятся в ДРУГИЕ деревья на других ветках. Замер 03.08 на
 * `Membrana-tooling`: своих 1, чужих 36 из 37. Следствие: `tsc` межпакетной правки читает
 * чужой `dist` и проверяет её против чужой ветки, оставаясь зелёным; `vitest` при этом честен
 * (алиасы в исходники) — и локальная зелень неотличима от достоверной. Вещдок 02.08: typecheck
 * клиента читал ветку соседней сессии и прошёл; две линии нашли это независимо в один день —
 * свойство устройства, не случай.
 *
 * Прибор НЕ чинит резолюцию (свой `node_modules` — отдельное решение с ценой диска и
 * установки) — он снимает молчание. Тот же ряд, что сторож мёртвых проводов и живые состояния
 * в ревью: сказать вслух то, что до сих пор обнаруживалось постфактум.
 *
 * ЯДРО ПУТЕЙ НЕ ЧИТАЕТ (граница Веснина на разборе нарезки): обход `node_modules` и
 * разыменование симлинков — инъекцией из провода. Иначе вердикт зуба зависел бы от состояния
 * рабочей копии.
 */

/**
 * Исходы замера. Список закрыт тремя: «резолюции нет» — не подвид «всё чужое» и не молчание,
 * а своё слово (правило всех приборов этого контура: отсутствие данных ≠ данные об отсутствии).
 */
export const RESOLUTION_STATES = Object.freeze({
  /** Все пакеты резолвятся внутрь дерева — межпакетный typecheck локально достоверен. */
  OWN: 'own',
  /** Хотя бы один пакет резолвится вне дерева. */
  FOREIGN: 'foreign',
  /** `node_modules` нет либо пакетов в нём нет — резолвить нечего, замер не состоялся. */
  ABSENT: 'absent',
});

/** Сколько чужих имён показывать в сводке. Выбор детерминирован — первые N по алфавиту. */
export const FOREIGN_SAMPLE_LIMIT = 3;

/**
 * Привести путь к сравнимому виду: слэши вперёд, буква диска в нижний регистр.
 *
 * Разбор Дынина 03.08: выбор разделителя «по наличию обратного слэша в root» врал на
 * смешанных стилях (root от Windows-realpath, target от POSIX-утилиты) — пакет уезжал в
 * foreign ложно. Контракт входа (оба пути из одного realpathSync) это почти исключает,
 * но «почти» у прибора правды не бывает: нормализация дешевле веры в контракт.
 */
function normalize(p) {
  const s = String(p ?? '').replaceAll('\\', '/');
  return /^[A-Za-z]:/u.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

/** `target` лежит внутри `root` (или равен ему). Сегментная проверка на нормализованных путях. */
function isInside(target, root) {
  const t = normalize(target);
  const r = normalize(root);
  if (t === r) return true;
  return t.startsWith(r.endsWith('/') ? r : r + '/');
}

/**
 * Классифицировать резолюцию пакетов дерева.
 *
 * @param {string} treeRoot корень рабочего дерева, АБСОЛЮТНЫЙ и нормализованный
 * @param {ReadonlyArray<{name: string, realPath: string|null}>} packages
 *   пакеты воркспейса: имя и РЕАЛЬНЫЙ путь (симлинки разыменованы вызывающим);
 *   `realPath: null` — пакет объявлен, но не разыменовался (битый симлинк)
 * @returns {{state: string, own: number, foreign: number, broken: number,
 *   foreignSample: string[], total: number}}
 */
export function classifyResolution(treeRoot, packages) {
  const list = Array.isArray(packages) ? packages : [];
  if (list.length === 0) {
    return { state: RESOLUTION_STATES.ABSENT, own: 0, foreign: 0, broken: 0, foreignSample: [], total: 0 };
  }

  let own = 0;
  let broken = 0;
  const foreignNames = [];
  for (const p of list) {
    if (typeof p?.realPath !== 'string' || p.realPath === '') {
      broken += 1;
      continue;
    }
    if (isInside(p.realPath, treeRoot)) own += 1;
    else foreignNames.push(String(p?.name ?? '(без имени)'));
  }

  // Порядок образца детерминирован сортировкой: сводка одного и того же дерева не должна
  // меняться от порядка обхода каталога (зуб держит).
  foreignNames.sort();
  return {
    state: foreignNames.length > 0 ? RESOLUTION_STATES.FOREIGN : RESOLUTION_STATES.OWN,
    own,
    foreign: foreignNames.length,
    broken,
    foreignSample: foreignNames.slice(0, FOREIGN_SAMPLE_LIMIT),
    total: list.length,
  };
}

/**
 * Строка сводки для человека. Печатается ВСЕГДА, включая `own`: молчание на «всё своё»
 * неотличимо от «не мерили».
 *
 * СЛОВА СУЖЕНЫ ДО МЕЖПАКЕТНОГО (правка резчика 03.08): широкое «локальный typecheck
 * недостоверен» оболгало бы честные однопакетные прогоны — однопакетная правка проверяется
 * в своём дереве, чужой `dist` читается только через границу пакета.
 */
export function formatResolution(result) {
  const r = result ?? {};
  if (r.state === RESOLUTION_STATES.ABSENT) {
    return '· резолюция пакетов: node_modules нет — замер не состоялся (это не «всё своё»)';
  }
  if (r.state === RESOLUTION_STATES.OWN) {
    return `· резолюция пакетов: все ${r.total} внутрь дерева — межпакетный typecheck локально достоверен`;
  }
  const sample = (r.foreignSample ?? []).join(', ');
  const brokenNote = r.broken > 0 ? ` · битых симлинков ${r.broken}` : '';
  return (
    `⚠ резолюция пакетов: своих ${r.own} · чужих ${r.foreign} из ${r.total}${brokenNote} (${sample}…) — ` +
    'МЕЖПАКЕТНЫЙ typecheck локально недостоверен: tsc читает чужой dist; однопакетный честен; сквозная проверка — CI'
  );
}
