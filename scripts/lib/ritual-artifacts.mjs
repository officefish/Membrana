/**
 * ritual-artifacts — автозабор артефактов ритуала (помеха №1 счётчика чистых
 * прогонов, топ-10 28.07): вчера leveling вставал на незакоммиченных артефактах
 * вечера (unnamed-trash) — 1 stop + ручное вмешательство.
 *
 * Закон: забираем ТОЛЬКО известное — белый список выводится из produces[]
 * манифеста цепочки (пути repo-относительные; плейсхолдеры <date>/<дата> —
 * сегодняшняя дата) плюс датированные протоколы docs/seanses. Никогда git add -A:
 * чужие файлы остаются лежать (они находка leveling, не наша добыча).
 *
 * Чистые функции — ФС/git в CLI (scripts/ritual-artifacts-commit.mjs).
 */

/** Пути-продукты из манифеста цепочки → префиксы белого списка. */
export function whitelistFromManifest(manifest, date) {
  const out = new Set();
  for (const step of manifest?.steps ?? []) {
    for (const p of step.produces ?? []) {
      const s = String(p).replaceAll('<date>', date).replaceAll('<дата>', date);
      if (!s.startsWith('docs/')) continue; // «отчёт в stdout», «rag index» — не файлы
      out.add(s.replace(/\/$/u, ''));
    }
  }
  return [...out];
}

/**
 * Разбор git status --porcelain: что забираем (белый список ∪ датированные
 * протоколы seanses), что честно оставляем чужим.
 * @param {string} porcelain @param {string[]} whitelist @param {string} date
 * @returns {{take: string[], leave: string[]}}
 */
export function classifyStatus(porcelain, whitelist, date) {
  const take = [];
  const leave = [];
  for (const line of String(porcelain ?? '').split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const path = line.slice(3).trim().replace(/^"|"$/gu, '');
    const inWhitelist = whitelist.some((w) => path === w || path.startsWith(`${w}/`));
    const datedSeans = path.startsWith('docs/seanses/') && path.includes(date);
    const datedBridge = path.startsWith('docs/bridge/') && path.includes(date);
    if (inWhitelist || datedSeans || datedBridge) take.push(path);
    else leave.push(path);
  }
  return { take, leave };
}
