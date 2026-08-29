/**
 * ritual-artifacts — автозабор артефактов ритуала (помеха №1 счётчика чистых
 * прогонов, топ-10 28.07): вчера leveling вставал на незакоммиченных артефактах
 * вечера (unnamed-trash) — 1 stop + ручное вмешательство.
 *
 * Закон: забираем ТОЛЬКО известное — белый список выводится из produces[]
 * манифеста цепочки (пути repo-относительные; плейсхолдеры <date>/<дата> —
 * даты забора) плюс датированные протоколы docs/seanses. Никогда git add -A:
 * чужие файлы остаются лежать (они находка leveling, не наша добыча).
 *
 * ЩЕЛЬ 29.08, из-за которой ведущая третье утро разгребала хвост руками, — три
 * отдельные причины, и лечить их надо порознь:
 *
 *   1. ПУТЬ ОБЪЯВЛЕН, НО ОТБРОШЕН. Отбор «оставить только docs/» выбрасывал
 *      `scripts/registry/SCRIPTS_LIST.md` — он объявлен в produces вечера, но живёт не в
 *      docs/. Механизм был, и он смотрел не туда. Теперь путь отличается от фразы по
 *      признаку пути, а не по префиксу каталога.
 *   2. ХВОСТ ВЧЕРАШНИЙ, А ОКНО СЕГОДНЯШНЕЕ. Часть продуктов вечера пишется ПОСЛЕ забора
 *      (память персон и оп-логи едут на ласточке, а та ждёт слова владельца), и утром они
 *      уже вчерашние. Забор строил белый список на одну дату и своего же хвоста не узнавал.
 *      Теперь дат может быть несколько — вызывающий передаёт окно.
 *   3. ПУТЬ НЕ ОБЪЯВЛЕН ВОВСЕ — лечится в манифесте, не здесь.
 *
 * Чистые функции — ФС/git в CLI (scripts/ritual-artifacts-commit.mjs).
 */

/** Даты как массив: вызывающий может передать одну строку или окно. */
function asDates(date) {
  return (Array.isArray(date) ? date : [date]).map(String).filter(Boolean);
}

/**
 * Путь ли это, а не человеческая фраза из колонки produces.
 *
 * В produces соседствуют пути и описания («отчёт в stdout», «rag index», «коммит
 * артефактов ритуала (git)»), а иногда путь и пояснение в одной строке через тире:
 * `docs/tasks/morning-gates-state.json — swallow.claimsProbe`. Поэтому судим ПЕРВУЮ
 * лексему: если в ней есть разделитель каталогов — это путь.
 */
export function pathFromProduces(entry) {
  const head = String(entry ?? '').trim().split(/\s+/u)[0] ?? '';
  return head.includes('/') ? head : null;
}

/** Пути-продукты из манифеста цепочки → префиксы белого списка. */
export function whitelistFromManifest(manifest, date) {
  const dates = asDates(date);
  const out = new Set();
  for (const step of manifest?.steps ?? []) {
    for (const p of step.produces ?? []) {
      const raw = pathFromProduces(p);
      if (!raw) continue;
      for (const d of dates) {
        let s = raw.replaceAll('<date>', d).replaceAll('<дата>', d);
        // Плейсхолдер не про дату (`docs/void/<id>/`) подставить нечем: берём префикс до
        // него, иначе в списке осталась бы буквальная строка «<id>», не совпадающая ни с чем.
        const brace = s.indexOf('<');
        if (brace > -1) s = s.slice(0, brace).replace(/\/[^/]*$/u, '');
        s = s.replace(/\/$/u, '');
        if (s) out.add(s);
      }
    }
  }
  return [...out];
}

/**
 * Разбор git status --porcelain: что забираем (белый список ∪ датированные
 * протоколы seanses), что честно оставляем чужим.
 * @param {string} porcelain @param {string[]} whitelist @param {string|string[]} date
 * @returns {{take: string[], leave: string[]}}
 */
export function classifyStatus(porcelain, whitelist, date) {
  const dates = asDates(date);
  const take = [];
  const leave = [];
  for (const line of String(porcelain ?? '').split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const path = line.slice(3).trim().replace(/^"|"$/gu, '');
    const inWhitelist = whitelist.some((w) => path === w || path.startsWith(`${w}/`));
    const dated = (prefix) => path.startsWith(prefix) && dates.some((d) => path.includes(d));
    if (inWhitelist || dated('docs/seanses/') || dated('docs/bridge/')) take.push(path);
    else leave.push(path);
  }
  return { take, leave };
}

/**
 * Окно дат для забора: сегодня и, если просят, вчера.
 *
 * Хвост вечера утром уже вчерашний — но окно шире суток не берём: чем оно шире, тем ближе
 * забор к `git add -A`, от которого он и заведён. Два дня — ровно стык вечера и утра.
 */
export function sweepDates(today, { includeYesterday = false } = {}) {
  const dates = [String(today)];
  if (includeYesterday) {
    const d = new Date(`${today}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() - 1);
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}
