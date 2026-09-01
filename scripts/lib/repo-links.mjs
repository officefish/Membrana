/**
 * Адрес репозитория в порождённых текстах — один источник вместо сочинения (#2249).
 *
 * ЗАЧЕМ. Документ дня пишет языковая модель, и генератор `_main-day-issue.mjs` НЕ СООБЩАЕТ
 * ей адрес репозитория вовсе — ни в промпте, ни постобработкой. Значит любая ссылка на
 * задачу берётся моделью из собственной памяти, и 01.09 она выдала `membrana-io/membrana`,
 * которого не существует. Настоящий адрес объявлен константой `REPO` в
 * `scripts/lib/github-issues-audit.mjs`, но её никто не спрашивал.
 *
 * ЦЕНА НЕ В ДОКУМЕНТЕ. Ссылки уезжают в ласточку партнёрам, и партнёр утыкается в пустоту:
 * ошибка выходит наружу, к людям, которые проверить её не могут.
 *
 * ЧЕМ ЛЕЧИТСЯ. Тем же способом, что и остальное на этой неделе: **один источник вместо двух
 * объявлений**. Адрес не сочиняется, а берётся из константы; всё, что модель написала мимо
 * неё, переписывается на неё и НАЗЫВАЕТСЯ числом — молчаливой подмены быть не должно.
 *
 * ГРАНИЦА. Здесь только текст: ни сети, ни файлов. Проверять существование задачи — работа
 * `live-links`, и она другая: та спрашивает GitHub, эта чинит адрес.
 */

/** Ссылки на задачи/PR нашего репозитория: владелец и имя — что угодно, путь наш. */
const ISSUE_LINK = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/(issues|pull)\/(\d+)/gu;

/**
 * Переписать адреса задач на канонический репозиторий.
 *
 * Переписываем ТОЛЬКО ссылки вида `/issues/N` и `/pull/N`: номер задачи наш, а владелец с
 * именем — то, что модель дописала по памяти. Прочие ссылки на github (чужие проекты,
 * документация, гисты) не трогаем: там чужой адрес законен, и «починить» его значило бы
 * сломать верную ссылку.
 *
 * @param {string} text
 * @param {string} repo канонический `owner/name`
 * @returns {{ text: string, rewritten: Array<{from: string, to: string, number: string}> }}
 */
export function normalizeRepoLinks(text, repo) {
  const src = String(text ?? '');
  const canonical = String(repo ?? '').trim();
  if (!canonical.includes('/')) {
    throw new Error(`normalizeRepoLinks: адрес репозитория должен быть «owner/name», получено «${repo}»`);
  }
  const rewritten = [];
  const out = src.replace(ISSUE_LINK, (full, owner, name, kind, number) => {
    const seen = `${owner}/${name}`;
    if (seen === canonical) return full;
    const fixed = `https://github.com/${canonical}/${kind}/${number}`;
    rewritten.push({ from: seen, to: canonical, number });
    return fixed;
  });
  return { text: out, rewritten };
}

/**
 * Человеческая строка о подмене — для лога прогона, а не для тишины.
 * @param {Array<{from: string, number: string}>} rewritten
 * @param {string} repo
 * @returns {string|null}
 */
export function rewrittenLinksNote(rewritten, repo) {
  if (!rewritten || rewritten.length === 0) return null;
  const byOwner = new Map();
  for (const r of rewritten) byOwner.set(r.from, (byOwner.get(r.from) ?? 0) + 1);
  const parts = [...byOwner.entries()].map(([from, n]) => `${from} → ${repo} (${n})`);
  return `  ⚠ адрес репозитория в ссылках исправлен по константе: ${parts.join(', ')} — модель писала его по памяти`;
}
