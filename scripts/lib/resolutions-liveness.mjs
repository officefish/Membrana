/**
 * Живость ключей `resolutions` (#1493 Ф2).
 *
 * `resolutions` действуют по ЗАПРОШЕННОМУ дескриптору, а не по разрешённой версии.
 * Запись `postcss@npm:8.5.14` бесполезна, если `tailwindcss` просит `^8.4.47` — она
 * молча ничего не покрывает и выглядит как «патч поставлен».
 *
 * Цена незнания (30.07, разбор корзины #1422): три полных цикла `install` + `deps:watch`,
 * дважды диагноз звучал как «патча нет», хотя патч был. На третьем заходе ключи вычистили
 * «как мёртвые» и снесли два ЖИВЫХ — точные пины `js-yaml@npm:5.2.1` и `postcss@npm:8.5.14`
 * оказались настоящими запросами. Отличить живой ключ от мёртвого на глаз нельзя.
 *
 * Модуль чистый: ни ФС, ни сети — разбор готовых строк.
 */

/** Исходы проверки ключа. Перечень закрытый. */
export const KEY_STATES = ['действует', 'мёртвый', 'не встал'];

/**
 * Дескрипторы, которые кто-то в дереве действительно запрашивает.
 *
 * В `yarn.lock` запрос виден двумя способами: заголовком записи (`"pkg@npm:^1.2.3":`,
 * возможно несколько через запятую) и строкой зависимости (`  pkg: "npm:^1.2.3"`).
 * Второй важен не меньше: именно так просят транзитивные носители.
 *
 * @param {string} lockText
 * @returns {Set<string>}
 */
export function requestedDescriptors(lockText) {
  const out = new Set();
  const text = String(lockText ?? '');
  // Заголовки записей: "a@npm:^1, b@npm:2":
  for (const m of text.matchAll(/^"?([^"\n]+)"?:\s*$/gmu)) {
    for (const part of m[1].split(',')) {
      const d = part.trim().replace(/^"|"$/gu, '');
      if (d.includes('@npm:') || d.includes('@workspace:') || d.includes('@patch:')) out.add(d);
    }
  }
  // Строки зависимостей: `  pkg: "npm:^1.2.3"`
  for (const m of text.matchAll(/^\s{4}("?[@\w./-]+"?):\s*"([^"]+)"\s*$/gmu)) {
    const name = m[1].replace(/^"|"$/gu, '');
    out.add(`${name}@${m[2]}`);
  }
  return out;
}

/** Версии, реально стоящие в дереве для данного имени пакета. */
export function resolvedVersions(lockText, pkgName) {
  const out = new Set();
  const esc = String(pkgName).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const re = new RegExp(`^\\s{2}resolution: "${esc}@npm:([^"]+)"`, 'gmu');
  for (const m of String(lockText ?? '').matchAll(re)) out.add(m[1]);
  return out;
}

/** Имя пакета из ключа resolutions: `js-yaml@npm:5.2.1` → `js-yaml`; `lodash` → `lodash`. */
export function packageOfKey(key) {
  const k = String(key);
  const at = k.lastIndexOf('@');
  if (at <= 0) return k;
  return k.slice(0, at).includes('@npm:') || /@(npm|patch|workspace):/u.test(k) ? k.split(/@(?:npm|patch|workspace):/u)[0] : k;
}

/**
 * @param {Record<string,string>} resolutions
 * @param {string} lockText
 * @returns {{key: string, target: string, pkg: string, state: string, reason: string}[]}
 */
export function checkResolutions(resolutions, lockText) {
  const requested = requestedDescriptors(lockText);
  const rows = [];
  for (const [key, target] of Object.entries(resolutions ?? {})) {
    const pkg = packageOfKey(key);
    // Ключ без `@…:` — общий по имени пакета (`"express": "4.21.2"`): он покрывает всё,
    // что просят про этот пакет, и мёртвым быть не может, пока пакет в дереве.
    const isBare = !/@(?:npm|patch|workspace):/u.test(key);
    const versions = resolvedVersions(lockText, pkg);

    if (isBare) {
      rows.push(
        versions.size === 0
          ? { key, target, pkg, state: 'мёртвый', reason: 'пакета нет в дереве' }
          : versions.has(target)
            ? { key, target, pkg, state: 'действует', reason: `в дереве ${[...versions].join(', ')}` }
            : { key, target, pkg, state: 'не встал', reason: `цель ${target}, в дереве ${[...versions].join(', ')}` },
      );
      continue;
    }

    if (!requested.has(key)) {
      rows.push({
        key,
        target,
        pkg,
        state: 'мёртвый',
        reason: 'такого дескриптора никто не просит — покрытия не даёт',
      });
      continue;
    }
    rows.push(
      versions.has(target)
        ? { key, target, pkg, state: 'действует', reason: `цель ${target} стоит в дереве` }
        : { key, target, pkg, state: 'не встал', reason: `цель ${target}, в дереве ${[...versions].join(', ') || '—'}` },
    );
  }
  return rows;
}

export function summarize(rows) {
  const dead = rows.filter((r) => r.state === 'мёртвый');
  const stuck = rows.filter((r) => r.state === 'не встал');
  return {
    total: rows.length,
    dead,
    stuck,
    state: dead.length || stuck.length ? 'находки' : 'чисто',
    advice:
      dead.length || stuck.length
        ? 'мёртвый ключ убрать или переписать на настоящий дескриптор; «не встал» — проверить, не перекрыт ли другим ключом'
        : 'все ключи resolutions работают',
  };
}
