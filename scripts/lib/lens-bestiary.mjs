/**
 * lens-bestiary — линза «антипаттерны» (вердикт lenses-verification-class-container
 * 2026-07-18). Чистое ядро: принимает СОДЕРЖИМОЕ объектов, возвращает finding[].
 * Без fs/сети — обвязка снаружи.
 *
 * Форма класса линз:  lens: (object, ruleset) → finding[]
 *   finding = { locus, defectClass, evidence }
 * Наводимость = каррирование: ruleset несёт defectClass (постоянен), object — домен.
 *
 * ГРУБЫЙ детектор намеренно: даёт КАНДИДАТОВ, человек фильтрует. Ключевое различие
 * (вердикт бестиария): намеренный молчок ДЕКЛАРИРОВАН (комментарий рядом), дефектный —
 * нет. Ловим НЕОБЪЯВЛЕННОЕ.
 *
 * Эхо-камера (B3): переиспользует `dedupeByOrigin` / `originHash` из truth-graph —
 * не второй остров дедупа (урок #538).
 */

import { dedupeByOrigin, originHash } from './truth-graph.mjs';

/** @typedef {{path:string, text:string}} ObjectFile */
/** @typedef {{locus:string, defectClass:string, evidence:string}} Finding */

const lines = (text) => String(text ?? '').split('\n');

/** Есть ли рядом (±2 строки) декларация-объяснение, почему молчок безопасен. */
function isDeclared(ls, i) {
  const around = [ls[i - 2], ls[i - 1], ls[i], ls[i + 1]].filter(Boolean).join(' ');
  return /\/\/|\/\*|\*|#|—|because|потому|намеренно|best-effort|осознанно|не блокирует|by design/iu.test(around);
}

/**
 * МОЛЧУН — проглоченный провал без декларации.
 * @param {ObjectFile} o
 * @returns {Finding[]}
 */
export function detectSilent(o) {
  const out = [];
  const ls = lines(o.text);
  ls.forEach((l, i) => {
    const at = `${o.path}:${i + 1}`;
    if (/\|\|\s*true/.test(l) && !isDeclared(ls, i)) {
      out.push({ locus: at, defectClass: 'silent', evidence: `\`|| true\` без декларации: ${l.trim().slice(0, 70)}` });
    }
    if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(l)) {
      out.push({ locus: at, defectClass: 'silent', evidence: 'пустой catch — ошибка съедена без следа' });
    }
    if (/(\?\?|\|\|)\s*null/.test(l) && /read|fetch|load|parse|existsSync/i.test(l) && !isDeclared(ls, i)) {
      out.push({ locus: at, defectClass: 'silent', evidence: `внешний вход → null без пометки: ${l.trim().slice(0, 70)}` });
    }
  });
  return out;
}

/**
 * ПОЛОВИНА БЕЗ ПРОВОДА — экспорт есть, потребителей ноль.
 * @param {ObjectFile} o
 * @param {{consumersOf: (name:string) => number}} ruleset
 * @returns {Finding[]}
 */
export function detectUnwired(o, ruleset) {
  const out = [];
  const ls = lines(o.text);
  ls.forEach((l, i) => {
    const m = l.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (!m) return;
    const name = m[1];
    if (ruleset.consumersOf(name) === 0) {
      out.push({ locus: `${o.path}:${i + 1}`, defectClass: 'unwired', evidence: `export ${name} — потребителей 0 (провод не кинут)` });
    }
  });
  return out;
}

/**
 * УКРАШЕНИЕ — артефакт пишется, читателей ноль.
 * @param {ObjectFile} o
 * @param {{readersOf: (artifact:string) => number}} ruleset
 * @returns {Finding[]}
 */
export function detectOrnament(o, ruleset) {
  const out = [];
  const ls = lines(o.text);
  const seen = new Set();
  ls.forEach((l, i) => {
    const m = l.match(/writeFileSync\(\s*[^,]*['"`]([^'"`]*\.(?:md|json))['"`]/) || l.match(/['"`](docs\/[A-Za-z0-9_\-/]+\.(?:md|json))['"`]/);
    if (!m) return;
    const art = m[1];
    if (seen.has(art)) return;
    seen.add(art);
    if (ruleset.readersOf(art) === 0) {
      out.push({ locus: `${o.path}:${i + 1}`, defectClass: 'ornament', evidence: `пишет ${art} — читателей 0 (украшение)` });
    }
  });
  return out;
}

/**
 * ЖАРГОН НАРУЖУ — внутренние имена во внешнем запросе.
 * @param {ObjectFile} o
 * @returns {Finding[]}
 */
export function detectJargonOut(o) {
  const out = [];
  const ls = lines(o.text);
  ls.forEach((l, i) => {
    if (!/perplexity|api\.openai|externalQuery|query|prompt/i.test(l)) return;
    const hit = l.match(/ritual:day|MAIN_DAY_ISSUE|DAILY_STANDUP|\bC[12]\b|\brt-\d\b/);
    if (hit) out.push({ locus: `${o.path}:${i + 1}`, defectClass: 'jargon-out', evidence: `внутреннее имя «${hit[0]}» рядом с внешним запросом` });
  });
  return out;
}

/**
 * ЭХО-КАМЕРА — один origin отражён N раз как будто независимые источники.
 * Грубый сигнал: одинаковый origin-литерал ≥2 раз без вызова dedupeByOrigin /
 * countIndependentSources в том же файле. Дедуп — из truth-graph (не второй остров).
 *
 * @param {ObjectFile} o
 * @returns {Finding[]}
 */
export function detectEchoChamber(o) {
  const out = [];
  const text = String(o.text ?? '');
  // Файл уже схлопывает эхо — не дефект (вызов/импорт, не упоминание в комментарии).
  const usesDedupe =
    /\b(?:dedupeByOrigin|countIndependentSources)\s*\(/.test(text) ||
    /import\s*\{[^}]*\b(?:dedupeByOrigin|countIndependentSources)\b/.test(text);
  if (usesDedupe) return out;

  const ls = lines(text);
  /** @type {{origin:string, line:number}[]} */
  const items = [];
  ls.forEach((l, i) => {
    for (const m of l.matchAll(/origin\s*:\s*['"`]([^'"`]+)['"`]/g)) {
      items.push({ origin: m[1], line: i + 1 });
    }
  });
  if (items.length < 2) return out;

  const deduped = dedupeByOrigin(items);
  for (const d of deduped) {
    if ((d.reflections ?? 1) < 2) continue;
    const hash = d.originHash ?? originHash(d.origin);
    const first = items.find((x) => originHash(x.origin) === hash);
    out.push({
      locus: `${o.path}:${first?.line ?? 1}`,
      defectClass: 'echo',
      evidence: `origin-hash ${hash} ×${d.reflections} без dedupeByOrigin (эхо = n=1, не ${d.reflections})`,
    });
  }
  return out;
}

export const BESTIARY = [
  { defectClass: 'silent', label: 'Молчун', run: detectSilent },
  { defectClass: 'unwired', label: 'Половина без провода', run: detectUnwired },
  { defectClass: 'ornament', label: 'Украшение', run: detectOrnament },
  { defectClass: 'jargon-out', label: 'Жаргон наружу', run: detectJargonOut },
  { defectClass: 'echo', label: 'Эхо-камера', run: detectEchoChamber },
];

/**
 * Навести бестиарий на объекты → матрица покрытия.
 * Три состояния (вердикт): not-run | clean | N-findings. `not-run` НЕ выдаётся за `clean`.
 * @param {ObjectFile[]} objects
 * @param {object} ruleset
 * @returns {{matrix: Record<string, Record<string, string>>, findings: Finding[]}}
 */
export function aimBestiary(objects, ruleset) {
  const matrix = {};
  const findings = [];
  for (const o of objects) {
    matrix[o.path] = {};
    for (const lens of BESTIARY) {
      if (o.text === null || o.text === undefined) { matrix[o.path][lens.defectClass] = 'not-run'; continue; }
      const f = lens.run(o, ruleset);
      findings.push(...f);
      matrix[o.path][lens.defectClass] = f.length === 0 ? 'clean' : String(f.length);
    }
  }
  return { matrix, findings };
}
