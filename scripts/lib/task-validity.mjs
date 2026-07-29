/**
 * validateTask / validateRegistry — контракт валидности карточки реестра (M4B / #1061).
 *
 * Чистые функции: без сети и без fs. Внешние факты — слепок `links`.
 *
 * Канон: docs/seanses/tasks-workshop-m4b-validity-2026-07-23.md · EPIC V5.
 *
 * Граница с `tasks:audit` (без поглощения): audit отвечает «что из active закрыто
 * на самом деле» (соответствие внешнему миру); валидность — «цела ли карточка как
 * запись». audit может использовать предикат; обратное — нет. Поэтому
 * `scripts/lib/tasks-audit.mjs` оставлен как есть (причина: другой вопрос, другой
 * носитель; общая логика не дублируется).
 */

/** @typedef {'blocker' | 'warning' | 'note'} FindingLevel */

/**
 * @typedef {object} ValidityFinding
 * @property {FindingLevel} level
 * @property {string} cardId
 * @property {string} field
 * @property {string} message
 * @property {string} code
 */

/**
 * Слепок внешних фактов для одной карточки.
 * `null` у issue/linear/insight — поля на карточке нет (проверять нечего).
 * `'unknown'` — система недоступна; вердикт по такому полю ≤ warning.
 *
 * @typedef {object} TaskLinksSnapshot
 * @property {'open' | 'closed' | 'missing' | 'unknown' | null} issueState
 * @property {'open' | 'closed' | 'missing' | 'unknown' | null} linearState
 * @property {boolean | 'unknown'} promptExists
 * @property {boolean | 'unknown'} promptIsStub
 * @property {boolean | 'unknown' | null} insightExists
 */

/**
 * @typedef {object} RegistryLinksSnapshot
 * @property {Record<string, TaskLinksSnapshot>} [byCard]
 * @property {boolean | 'unknown'} [readmeMatchesRegistry]
 */

/**
 * @typedef {object} TaskVerdict
 * @property {boolean} ok
 * @property {FindingLevel | null} level
 * @property {ValidityFinding[]} findings
 */

/**
 * @typedef {object} RegistryVerdict
 * @property {boolean} ok
 * @property {FindingLevel | null} level
 * @property {Record<string, TaskVerdict>} byCard
 * @property {ValidityFinding[]} groupFindings
 * @property {ValidityFinding[]} findings
 */

const LEVEL_RANK = { note: 1, warning: 2, blocker: 3 };

/** @param {FindingLevel | null | undefined} a @param {FindingLevel | null | undefined} b */
export function maxLevel(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

/**
 * @param {ValidityFinding[]} findings
 * @returns {{ ok: boolean, level: FindingLevel | null }}
 */
export function summarizeFindings(findings) {
  let level = null;
  for (const f of findings) level = maxLevel(level, f.level);
  return { ok: !findings.some((f) => f.level === 'blocker'), level };
}

/**
 * Пустой слепок: всё unknown / null по полям карточки.
 * @param {object} card
 * @returns {TaskLinksSnapshot}
 */
export function emptyTaskLinks(card) {
  const hasIssue = card?.githubIssue != null && Number(card.githubIssue) > 0;
  const hasLinear = typeof card?.linearId === 'string' && card.linearId.trim();
  const hasInsight = typeof card?.insightId === 'string' && card.insightId.trim();
  return {
    issueState: hasIssue ? 'unknown' : null,
    linearState: hasLinear ? 'unknown' : null,
    promptExists: 'unknown',
    promptIsStub: 'unknown',
    insightExists: hasInsight ? 'unknown' : null,
  };
}

/**
 * @param {Partial<TaskLinksSnapshot> | null | undefined} links
 * @param {object} card
 * @returns {TaskLinksSnapshot}
 */
export function normalizeTaskLinks(links, card) {
  const base = emptyTaskLinks(card);
  if (!links || typeof links !== 'object') return base;
  return {
    issueState: links.issueState !== undefined ? links.issueState : base.issueState,
    linearState: links.linearState !== undefined ? links.linearState : base.linearState,
    promptExists: links.promptExists !== undefined ? links.promptExists : base.promptExists,
    promptIsStub: links.promptIsStub !== undefined ? links.promptIsStub : base.promptIsStub,
    insightExists: links.insightExists !== undefined ? links.insightExists : base.insightExists,
  };
}

/**
 * @param {object} p
 * @param {FindingLevel} p.level
 * @param {string} p.cardId
 * @param {string} p.field
 * @param {string} p.message
 * @param {string} p.code
 * @returns {ValidityFinding}
 */
function finding(p) {
  return {
    level: p.level,
    cardId: p.cardId,
    field: p.field,
    message: p.message,
    code: p.code,
  };
}

/**
 * Легальная утрата промпта (норма B10, долг «битые ссылки на промпты», 29.07).
 *
 * Вещдок: миграция легаси-архива 30.06 (`3b28ca3e`) принесла карточки со ссылками
 * на промпты, которых в репозитории НИКОГДА не было (git log --diff-filter=A пуст),
 * плюс карточки вовсе без промпта — 43 blocker'а копились месяц как «давний долг».
 * Восстанавливать нечего: файлы не удалялись, они не существовали.
 *
 * Правило: АРХИВНАЯ карточка вправе объявить утрату полем
 * `promptLost: {reason, since}` — тогда находка становится warning со следом в
 * истории. Молчаливая пустота по-прежнему blocker; ЖИВАЯ карточка без промпта —
 * blocker при любой причине (работа без задания не легализуется).
 *
 * @param {object} card
 * @returns {boolean}
 */
export function isLegalPromptLoss(card) {
  return (
    card?.status === 'archived' &&
    typeof card?.promptLost?.reason === 'string' &&
    card.promptLost.reason.trim().length > 0 &&
    typeof card?.promptLost?.since === 'string' &&
    card.promptLost.since.trim().length > 0
  );
}

/**
 * validateTask(card, links) — элемент: только одна карточка + её слепок.
 *
 * @param {object} card
 * @param {Partial<TaskLinksSnapshot> | null | undefined} [links]
 * @returns {TaskVerdict}
 */
export function validateTask(card, links) {
  /** @type {ValidityFinding[]} */
  const findings = [];
  const cardId = card?.id != null ? String(card.id) : '(без id)';
  const snap = normalizeTaskLinks(links, card ?? {});

  if (!card || typeof card !== 'object') {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'card',
        message: 'карточка отсутствует или не объект',
        code: 'card.missing',
      }),
    );
    return { ...summarizeFindings(findings), findings };
  }

  if (!card.id || typeof card.id !== 'string' || !card.id.trim()) {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'id',
        message: 'поле id пусто или не строка',
        code: 'field.id.missing',
      }),
    );
  }

  if (!card.title || typeof card.title !== 'string' || !String(card.title).trim()) {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'title',
        message: 'поле title пусто',
        code: 'field.title.missing',
      }),
    );
  }

  if (card.status !== 'active' && card.status !== 'archived') {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'status',
        message: `status «${card.status}» — ожидается active|archived`,
        code: 'field.status.invalid',
      }),
    );
  }

  if (!card.size || !['S', 'M', 'L'].includes(card.size)) {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'size',
        message: `size «${card.size ?? ''}» — ожидается S|M|L`,
        code: 'field.size.invalid',
      }),
    );
  }

  if (!card.promptPath || typeof card.promptPath !== 'string' || !card.promptPath.trim()) {
    // Легальное «нет» (норма B10): архивная карточка легаси-миграции, промпт которой
    // НИКОГДА не лежал в репозитории, объявляет это полем promptLost{reason, since}.
    // Молчаливой пустоты по-прежнему нет: без причины — blocker; у ЖИВОЙ карточки
    // отсутствие промпта остаётся blocker'ом при любой причине (работа без задания).
    if (isLegalPromptLoss(card)) {
      findings.push(
        finding({
          level: 'warning',
          cardId,
          field: 'promptPath',
          message: `промпт не сохранён: ${card.promptLost.reason} (с ${card.promptLost.since})`,
          code: 'link.prompt.legacy-lost',
        }),
      );
    } else {
      findings.push(
        finding({
          level: 'blocker',
          cardId,
          field: 'promptPath',
          message: 'promptPath пуст — у карточки нет адреса промпта',
          code: 'field.promptPath.missing',
        }),
      );
    }
  }

  if (card.status === 'archived' && (card.archivedAt == null || card.archivedAt === '')) {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'archivedAt',
        message: 'status=archived, но archivedAt пуст',
        code: 'field.archivedAt.missing',
      }),
    );
  }

  if (card.status === 'active' && card.archivedAt != null && card.archivedAt !== '') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'archivedAt',
        message: 'status=active, но archivedAt заполнен — статус и даты расходятся',
        code: 'field.archivedAt.inconsistent',
      }),
    );
  }

  // Промпт: отсутствие файла — blocker; unknown — только warning.
  // Исключение — объявленная утрата (promptLost) у АРХИВНОЙ карточки: ссылка
  // сохранена как след истории, но названа мёртвой с причиной и датой.
  const hasPromptPath = typeof card.promptPath === 'string' && card.promptPath.trim().length > 0;
  if (!hasPromptPath) {
    // Пустой путь уже назван выше (field.promptPath.missing / legacy-lost);
    // второй находкой «файл «null» не найден» шуметь незачем — это не адрес.
  } else if (snap.promptExists === false && isLegalPromptLoss(card)) {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'promptPath',
        message: `промпт «${card.promptPath}» не сохранён: ${card.promptLost.reason} (с ${card.promptLost.since})`,
        code: 'link.prompt.legacy-lost',
      }),
    );
  } else if (snap.promptExists === false) {
    findings.push(
      finding({
        level: 'blocker',
        cardId,
        field: 'promptPath',
        message: `промпт «${card.promptPath}» не найден на диске`,
        code: 'link.prompt.missing',
      }),
    );
  } else if (snap.promptExists === 'unknown') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'promptPath',
        message: `существование промпта «${card.promptPath ?? ''}» неизвестно (unknown)`,
        code: 'link.prompt.unknown',
      }),
    );
  }

  if (snap.promptIsStub === true) {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'promptPath',
        message: 'промпт похож на заготовку (stub) — след неполон',
        code: 'link.prompt.stub',
      }),
    );
  } else if (snap.promptIsStub === 'unknown' && snap.promptExists !== false) {
    findings.push(
      finding({
        level: 'note',
        cardId,
        field: 'promptPath',
        message: 'неизвестно, stub ли промпт (unknown)',
        code: 'link.prompt.stub.unknown',
      }),
    );
  }

  // Active без linearId — живой дефект 23.07; работать можно → warning.
  if (card.status === 'active') {
    const hasLinear = typeof card.linearId === 'string' && card.linearId.trim();
    if (!hasLinear) {
      findings.push(
        finding({
          level: 'warning',
          cardId,
          field: 'linearId',
          message: 'active-карточка без linearId — след Linear неполон',
          code: 'field.linearId.missing',
        }),
      );
    }
  }

  if (snap.issueState === 'missing') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'githubIssue',
        message: `githubIssue #${card.githubIssue} не найден / недоступен как запись`,
        code: 'link.issue.missing',
      }),
    );
  } else if (snap.issueState === 'unknown') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'githubIssue',
        message: `состояние githubIssue #${card.githubIssue} неизвестно (unknown)`,
        code: 'link.issue.unknown',
      }),
    );
  }

  if (snap.linearState === 'missing') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'linearId',
        message: `linearId «${card.linearId}» не резолвится`,
        code: 'link.linear.missing',
      }),
    );
  } else if (snap.linearState === 'unknown') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'linearId',
        message: `состояние linearId «${card.linearId}» неизвестно (unknown)`,
        code: 'link.linear.unknown',
      }),
    );
  }

  if (snap.insightExists === false) {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'insightId',
        message: `insight «${card.insightId}» не найден`,
        code: 'link.insight.missing',
      }),
    );
  } else if (snap.insightExists === 'unknown') {
    findings.push(
      finding({
        level: 'warning',
        cardId,
        field: 'insightId',
        message: `существование insight «${card.insightId}» неизвестно (unknown)`,
        code: 'link.insight.unknown',
      }),
    );
  }

  if (
    card.status === 'archived' &&
    card.githubIssue != null &&
    Number(card.githubIssue) > 0 &&
    (card.githubIssueClosedAt == null || card.githubIssueClosedAt === '')
  ) {
    findings.push(
      finding({
        level: 'note',
        cardId,
        field: 'githubIssueClosedAt',
        message: 'архивная карточка с Issue без githubIssueClosedAt — след закрытия неполон',
        code: 'field.githubIssueClosedAt.missing',
      }),
    );
  }

  return { ...summarizeFindings(findings), findings };
}

/**
 * Группа: дубликаты id. Не выполнима на одной карточке.
 * @param {object[]} cards
 * @returns {ValidityFinding[]}
 */
export function groupDuplicateIds(cards) {
  /** @type {ValidityFinding[]} */
  const out = [];
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const c of cards ?? []) {
    if (!c?.id) continue;
    counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    if (n > 1) {
      out.push(
        finding({
          level: 'blocker',
          cardId: id,
          field: 'id',
          message: `id «${id}» встречается ${n} раз(а) в реестре`,
          code: 'group.id.duplicate',
        }),
      );
    }
  }
  return out;
}

/**
 * Группа: две+ active на одну иссью.
 * @param {object[]} cards
 * @returns {ValidityFinding[]}
 */
export function groupActiveIssueUmbrella(cards) {
  /** @type {ValidityFinding[]} */
  const out = [];
  /** @type {Map<number, object[]>} */
  const byIssue = new Map();
  for (const c of cards ?? []) {
    if (c?.status !== 'active') continue;
    const n = Number(c.githubIssue);
    if (!(n > 0)) continue;
    if (!byIssue.has(n)) byIssue.set(n, []);
    byIssue.get(n).push(c);
  }
  for (const [n, list] of byIssue) {
    if (list.length < 2) continue;
    for (const c of list) {
      out.push(
        finding({
          level: 'warning',
          cardId: c.id,
          field: 'githubIssue',
          message: `active-карточки делят иссью #${n} (${list.map((x) => x.id).join(', ')})`,
          code: 'group.issue.umbrella',
        }),
      );
    }
  }
  return out;
}

/**
 * Группа: parentEpic указывает в никуда / разрыв статуса с родителем.
 * @param {object[]} cards
 * @returns {ValidityFinding[]}
 */
export function groupParentEpicIntegrity(cards) {
  /** @type {ValidityFinding[]} */
  const out = [];
  /** @type {Map<string, object>} */
  const byId = new Map();
  for (const c of cards ?? []) {
    if (c?.id) byId.set(String(c.id), c);
  }
  for (const c of cards ?? []) {
    if (!c?.id) continue;
    const parentRaw = c.parentEpic;
    if (parentRaw == null || !String(parentRaw).trim()) continue;
    const parentId = String(parentRaw).trim();
    const parent = byId.get(parentId) ?? null;
    if (!parent) {
      out.push(
        finding({
          level: 'warning',
          cardId: c.id,
          field: 'parentEpic',
          message: `parentEpic «${parentId}» не резолвится в реестре`,
          code: 'group.parent.orphaned',
        }),
      );
      continue;
    }
    if (c.status === 'active' && parent.status !== 'active') {
      out.push(
        finding({
          level: 'warning',
          cardId: c.id,
          field: 'parentEpic',
          message: `живой ребёнок при не-active родителе «${parentId}» [${parent.status}]`,
          code: 'group.parent.inconsistent',
        }),
      );
    }
  }
  return out;
}

/**
 * Группа: README↔registry (текст README уже в слепке / сравнение снаружи).
 * @param {boolean | 'unknown' | undefined} readmeMatchesRegistry
 * @returns {ValidityFinding[]}
 */
export function groupReadmeDrift(readmeMatchesRegistry) {
  /** @type {ValidityFinding[]} */
  const out = [];
  if (readmeMatchesRegistry === false) {
    out.push(
      finding({
        level: 'warning',
        cardId: '(registry)',
        field: 'readme',
        message: 'docs/tasks/README.md расходится с active-набором registry.json',
        code: 'group.readme.drift',
      }),
    );
  } else if (readmeMatchesRegistry === 'unknown') {
    out.push(
      finding({
        level: 'warning',
        cardId: '(registry)',
        field: 'readme',
        message: 'совпадение README↔registry неизвестно (unknown)',
        code: 'group.readme.unknown',
      }),
    );
  }
  return out;
}

/**
 * Извлечь id active-таблицы README (между «## Активные задачи» и следующим ##).
 * Чистая функция над текстом — для слепка и тестов.
 *
 * @param {string} readmeText
 * @returns {string[] | null} null — секция не найдена
 */
export function extractActiveIdsFromReadme(readmeText) {
  if (typeof readmeText !== 'string' || !readmeText) return null;
  const start = readmeText.search(/^## Активные задачи\s*$/m);
  if (start < 0) return null;
  const rest = readmeText.slice(start);
  // Ищем следующий ## после текущей строки: slice(1) пропускает первый '#',
  // чтобы ^## не сматчил заголовок самой секции; +1 возвращает срез к началу rest.
  const endMatch = rest.slice(1).search(/^## /m);
  const section = endMatch >= 0 ? rest.slice(0, endMatch + 1) : rest;
  /** @type {string[]} */
  const ids = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

/**
 * Сравнить active-набор реестра с id из README.
 * @param {object[]} cards
 * @param {string} readmeText
 * @returns {boolean | 'unknown'}
 */
export function computeReadmeMatchesRegistry(cards, readmeText) {
  const fromReadme = extractActiveIdsFromReadme(readmeText);
  if (fromReadme == null) return 'unknown';
  const active = (cards ?? [])
    .filter((c) => c?.status === 'active' && c?.id)
    .map((c) => String(c.id))
    .sort();
  const readmeSorted = [...fromReadme].sort();
  if (active.length !== readmeSorted.length) return false;
  for (let i = 0; i < active.length; i++) {
    if (active[i] !== readmeSorted[i]) return false;
  }
  return true;
}

/**
 * Имена групповых проверок — для теста-инварианта «не выполнимы на одной карточке».
 */
export const GROUP_CHECK_NAMES = [
  'groupDuplicateIds',
  'groupActiveIssueUmbrella',
  'groupParentEpicIntegrity',
  'groupReadmeDrift',
];

/**
 * validateRegistry(cards, links) — группа + per-card.
 *
 * @param {object[]} cards
 * @param {RegistryLinksSnapshot | Record<string, TaskLinksSnapshot> | null | undefined} [links]
 * @returns {RegistryVerdict}
 */
export function validateRegistry(cards, links) {
  const list = Array.isArray(cards) ? cards : [];
  /** @type {RegistryLinksSnapshot} */
  let snap;
  if (links && typeof links === 'object' && ('byCard' in links || 'readmeMatchesRegistry' in links)) {
    snap = /** @type {RegistryLinksSnapshot} */ (links);
  } else if (links && typeof links === 'object') {
    snap = { byCard: /** @type {Record<string, TaskLinksSnapshot>} */ (links) };
  } else {
    snap = { byCard: {} };
  }

  /** @type {Record<string, TaskVerdict>} */
  const byCard = {};
  /** @type {ValidityFinding[]} */
  const allCardFindings = [];

  for (const card of list) {
    if (!card?.id) continue;
    const cardLinks = snap.byCard?.[card.id];
    const verdict = validateTask(card, cardLinks);
    byCard[card.id] = verdict;
    allCardFindings.push(...verdict.findings);
  }

  const groupFindings = [
    ...groupDuplicateIds(list),
    ...groupActiveIssueUmbrella(list),
    ...groupParentEpicIntegrity(list),
    ...groupReadmeDrift(snap.readmeMatchesRegistry),
  ];

  const findings = [...allCardFindings, ...groupFindings];
  return {
    ...summarizeFindings(findings),
    byCard,
    groupFindings,
    findings,
  };
}

/**
 * Текстовый отчёт для CLI.
 * @param {TaskVerdict | RegistryVerdict} verdict
 * @param {{ title?: string }} [opts]
 */
export function formatValidityReport(verdict, opts = {}) {
  const lines = [];
  const title = opts.title ?? 'task:validate';
  const level = verdict.level ?? 'ok';
  lines.push(`${title} — ok=${verdict.ok} level=${level}`);
  const findings = 'findings' in verdict ? verdict.findings : [];
  if (findings.length === 0) {
    lines.push('(находок нет)');
    return lines.join('\n');
  }
  for (const f of findings) {
    lines.push(`[${f.level}] ${f.cardId}.${f.field}: ${f.message} (${f.code})`);
  }
  return lines.join('\n');
}
