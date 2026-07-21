/**
 * branch-grammar — грамматика имени ветки и каскад вывода держателя (Р4, #785).
 *
 * Канон: вердикт `m4-grammar-manual` заседания procedural-layer (ратифицирован
 * 21.07). Словари — в `docs/procedures/layer-rules.json` → `branchGrammar`
 * (одна точка истины, Р5-норма); менять словарь = править файл правил.
 *
 * Все функции чистые и тотальные: любой вход даёт детерминированный ответ,
 * красные исходы несут текст-подсказку (T8 — возврат на доработку, не мёртвый блок).
 */

export const HOLDER_CONFLICT = 'CONFLICT';
export const HOLDER_MISSING = 'MISSING';

/**
 * Разбор имени ветки: `[<персона>/]<kind>/<slug>` + формат-теги.
 *
 * @param {string} name имя ветки
 * @param {{branchGrammar: {kinds: string[], personas: string[]}}} rules
 * @returns {{persona: string|null, kind: string|null, slug: string|null,
 *   tags: string[], problems: string[]}}
 */
export function parseBranchName(name, rules) {
  const g = rules?.branchGrammar ?? { kinds: [], personas: [] };
  const parts = String(name ?? '').split('/');
  const problems = [];
  let persona = null;
  let kind = null;
  let slug = null;

  if (parts.length === 2) {
    [kind, slug] = parts;
  } else if (parts.length === 3) {
    [persona, kind, slug] = parts;
    if (!g.personas.includes(persona)) {
      problems.push(
        `персона-сегмент «${persona}» вне словаря персон (${g.personas.join(', ')}) — MISSING с подсказкой`,
      );
    }
  } else {
    problems.push(`имя «${name}» не разбирается как [персона/]kind/slug (${parts.length} сегмент(а))`);
    return { persona: null, kind: null, slug: null, tags: [], problems };
  }

  if (!g.kinds.includes(kind)) {
    const hint = kind === 'feature' ? ' (дубль убит словарём: используйте feat)' : '';
    problems.push(`kind «${kind}» вне закрытого словаря${hint}`);
  }
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/u.test(slug)) {
    problems.push(`slug «${slug}» не kebab-case`);
  }
  const tags = kind && Object.keys(rules?.branchGrammar?.formatTags ?? {}).includes(kind) ? [kind] : [];
  return { persona, kind, slug, tags, problems };
}

/**
 * Каскад вывода держателя (тотальная функция, вердикт M4).
 * `explicit` — «явное»: слово владельца при шипе, иначе leadPersona карточки
 * реестра при slug = id (внутренний приоритет источников — забота вызывающего).
 *
 * @param {string|null|undefined} explicit
 * @param {string|null|undefined} branchPersona персона-сегмент ветки (валидный)
 * @returns {{holder: string, source: string} |
 *   {holder: 'CONFLICT'|'MISSING', reason: string}}
 */
export function resolveHolder(explicit, branchPersona) {
  const e = explicit?.trim() || null;
  const b = branchPersona?.trim() || null;
  if (e && b) {
    if (e === b) return { holder: e, source: 'слово/карточка + сегмент (согласны)' };
    return {
      holder: HOLDER_CONFLICT,
      reason: `явное «${e}» ≠ сегмент ветки «${b}» — осознанное расхождение разрешает владелец; возврат на доработку (T8)`,
    };
  }
  if (e) return { holder: e, source: 'явное (слово при шипе / leadPersona карточки)' };
  if (b) return { holder: b, source: 'персона-сегмент ветки' };
  return {
    holder: HOLDER_MISSING,
    reason: 'держатель не выводится: нет ни явного слова, ни leadPersona карточки, ни персона-сегмента — назовите держателя; возврат на доработку (T8)',
  };
}

/**
 * Коллизия ref-неймспейса: голая персона-ветка блокирует `persona/...`
 * (живой прецедент 21.07: локальный `ozhegov` не дал создать `ozhegov/feat/...`).
 *
 * Коллизия реальна для ЛЮБОГО первого сегмента (git не различает семантику),
 * но подсказка §7а о судьбе персона-ветки уместна только для персон.
 *
 * @param {string} branchName создаваемое имя с «/»
 * @param {string[]} existingRefs существующие имена веток
 * @param {{branchGrammar?: {personas?: string[]}}} [rules] для персонной подсказки
 * @returns {string[]} проблемы с подсказкой (пусто = коллизии нет)
 */
export function refCollisionProblems(branchName, existingRefs, rules) {
  const first = String(branchName ?? '').split('/')[0];
  if (!first || !branchName.includes('/')) return [];
  if (!(existingRefs ?? []).includes(first)) return [];
  const isPersona = (rules?.branchGrammar?.personas ?? []).includes(first);
  const hint = isPersona
    ? 'используйте форму kind/slug (держатель выведется из карточки/слова) либо решите судьбу голой персона-ветки словом владельца (§7а)'
    : 'переименуйте или удалите голую ветку — неймспейс занят';
  return [`голая ветка «${first}» блокирует неймспейс «${first}/…» на уровне git-ref — ${hint}`];
}

/**
 * Предикат night-заморозки (T7): мердж из-под night-ветки законен только при
 * поднятом флаге «ночь закончилась». Источник флага — забота вызывающего.
 *
 * @param {{kind: string|null, tags: string[]}} parsed из parseBranchName
 * @param {boolean} nightOverFlag
 * @returns {{frozen: boolean, reason: string|null}}
 */
export function nightFreezeVerdict(parsed, nightOverFlag) {
  if (!parsed?.tags?.includes('night')) return { frozen: false, reason: null };
  if (nightOverFlag) return { frozen: false, reason: null };
  return {
    frozen: true,
    reason: 'night-ветка заморожена: ничего в репозиторий до флага «ночь закончилась» (T7)',
  };
}

/**
 * Шапка шип-гейта (вердикт M4: три оси текстом, не цветом).
 * @param {{kind: string|null}} parsed
 * @param {{holder: string, source?: string, reason?: string}} holderVerdict
 * @param {{frozen: boolean, reason: string|null}} freeze
 * @returns {string}
 */
export function renderShipHeader(parsed, holderVerdict, freeze) {
  const holderText =
    holderVerdict.holder === HOLDER_CONFLICT || holderVerdict.holder === HOLDER_MISSING
      ? `✗ ${holderVerdict.holder} — ${holderVerdict.reason}`
      : `✓ ${holderVerdict.holder} (${holderVerdict.source})`;
  return [
    `тип: ${parsed.kind ?? '—'}`,
    `держатель: ${holderText}`,
    `заморозка: ${freeze.frozen ? `✗ ${freeze.reason}` : 'нет'}`,
  ].join('\n');
}
