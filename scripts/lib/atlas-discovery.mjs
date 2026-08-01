/**
 * Обнаружение домов для атласа — по README и `RootPolicy`, а не по манифесту.
 *
 * Канон: [`CONTRACT.md §3`](../../docs/meeting/workshop-wires/CONTRACT.md), комната M2.
 *
 * ```text
 * D_home(c)      ⇔ ∃ README.md в c  ∧  path(c) ⊨ RootPolicy
 * D_workshop(c)  ⇔ D_home(c) ∧ ∃ workshop.manifest.json
 * ```
 *
 * ЧТО МЕНЯЕТСЯ ПРОТИВ ПРЕЖНЕГО. `discoverContainers` искал дома **по наличию манифеста**, и
 * §3 назвал это нечестным: прежняя шапка `ATLAS.md` объявляла источником обнаружения README,
 * тогда как код смотрел на манифест. Замер 31.07 до правки: прямых `docs/*` с README — 26,
 * в индексе — 13. Тринадцать домов первого уровня не видны, включая `docs/network`, который
 * §3 назвал критерием поимённо.
 *
 * ТРИ ВИДА ЗАПИСИ, НЕ ОДИН. «Контейнер без мастерской» — **законное состояние**, а не дефект:
 * мастерская есть подтип дома, а не обязанность каждого дома. Заводить 33 манифеста «для
 * зелени» §3 запрещает прямым пунктом — поэтому дом без манифеста попадает в индекс как
 * `home`, а не выбрасывается и не помечается сломанным.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT_CONTAINER_ALLOWLIST } from './validate-workshop.mjs';

/** Виды записи индекса. Список ЗАКРЫТ (§3). */
export const RECORD_KINDS = Object.freeze({
  /** Дом с мастерской: README + манифест. */
  WORKSHOP: 'workshop',
  /** Дом без мастерской — законное состояние, третий вид записи. */
  HOME: 'home',
});

/**
 * Каталоги, которые домами не считаются никогда — **вместе с поддеревом**.
 *
 * Список поимённый и короткий: архив и свалка черновиков несут README «для навигации», но
 * группой инструментов не являются. Правило по форме здесь невозможно — `docs/archive`
 * отличается от `docs/audit` не именем, а смыслом, и решает это человек, а не regexp.
 */
export const NOT_HOMES_SUBTREE = Object.freeze(['docs/archive', 'docs/void']);

/**
 * Каталоги, которые не дома **сами по себе**, но их дети — могут быть.
 *
 * `docs/seanses` — плоская свалка протоколов, домом не является; но §3 **поимённо** называет
 * `docs/seanses/night-hunt` де-факто домом, и вырезать его вместе с родителем значило бы
 * нарушить ратифицированный текст ради удобства правила. Тот же случай `docs/discussions`:
 * сам он навал артефактов ревью, дети — нет.
 *
 * Разница между этим списком и {@link NOT_HOMES_SUBTREE} несущая: там режется ветка,
 * здесь — один узел. Схлопнуть их в один список значит потерять дом, названный контрактом.
 */
export const NOT_HOMES_SELF = Object.freeze(['docs/seanses', 'docs/discussions']);

/** Каталоги, в которые обход не заходит. */
const SKIP_DIRS = new Set(['node_modules', 'cache', '.cache', '.git', 'dist', 'coverage']);

/** Путь к сравнимому виду. */
const norm = (p) => p.replaceAll('\\', '/');

/**
 * Проверка `path ⊨ RootPolicy` — двухклассовая политика после поправки 31.07.
 *
 * Первый класс — поддерево `docs/`, но **только первый уровень**: `docs/audit/git` дом,
 * `docs/audit/bestiary/specimens` — нет. Граница по глубине, а не по вкусу: иначе домом
 * становится любой подкаталог с README, а §3 запрещает «любая папка с README».
 *
 * ЧЕСТНЫЙ ПРЕДЕЛ: глубина 2 под `docs/` выбрана по факту живого дерева (`docs/audit/*` —
 * единственная двухуровневая плоскость). Появится третий уровень, который правда дом, —
 * это правка политики отдельным решением, а не тихое ослабление порога.
 */
export function underRootPolicy(rel) {
  const p = norm(rel);
  if (NOT_HOMES_SUBTREE.some((x) => p === x || p.startsWith(`${x}/`))) return false;
  if (NOT_HOMES_SELF.includes(p)) return false;
  const parts = p.split('/');
  if (parts[0] === 'docs') return parts.length === 2 || parts.length === 3;
  return ROOT_CONTAINER_ALLOWLIST.includes(parts[0]) && parts.length === 1;
}

/**
 * Обойти дерево и найти дома.
 *
 * @param {string} repoRoot
 * @returns {{home: string, kind: string, hasManifest: boolean}[]} по алфавиту домов
 */
export function discoverHomes(repoRoot) {
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
      const abs = join(dir, e.name);
      const rel = norm(relative(repoRoot, abs));
      if (existsSync(join(abs, 'README.md')) && underRootPolicy(rel)) {
        const hasManifest = existsSync(join(abs, 'workshop.manifest.json'));
        found.push({ home: rel, kind: hasManifest ? RECORD_KINDS.WORKSHOP : RECORD_KINDS.HOME, hasManifest });
      }
      walk(abs);
    }
  };
  for (const top of ['docs', ...ROOT_CONTAINER_ALLOWLIST]) {
    const p = join(repoRoot, top);
    if (existsSync(p) && statSync(p).isDirectory()) {
      const rel = norm(top);
      if (existsSync(join(p, 'README.md')) && underRootPolicy(rel)) {
        const hasManifest = existsSync(join(p, 'workshop.manifest.json'));
        found.push({ home: rel, kind: hasManifest ? RECORD_KINDS.WORKSHOP : RECORD_KINDS.HOME, hasManifest });
      }
      walk(p);
    }
  }
  // Сортировка обязательна: без неё индекс перетасовывался бы от файловой системы, и дрейф
  // ловил бы перестановку как расхождение.
  return found.sort((a, b) => a.home.localeCompare(b.home));
}

/**
 * Разница «обнаружение ↔ манифесты» — сколько домов индекс терял до поправки.
 *
 * Существует как отдельная функция, чтобы число было предъявляемым, а не пересказом: §3
 * обещал «тридцать три невидимки становятся видны без заведения 33 манифестов», и проверить
 * это обещание можно только счётом.
 */
export function invisibleBefore(homes) {
  return homes.filter((h) => h.kind === RECORD_KINDS.HOME).map((h) => h.home);
}
