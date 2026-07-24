/**
 * inspectElement — паспорт одной карточки реестра задач (M4A / #1060).
 *
 * Чистая функция: только данные `registry`, без сети и без fs.
 * Живые данные внешних систем — отдельной командой с `--refresh` (не здесь).
 *
 * Канон: docs/seanses/tasks-workshop-m4a-inspect-2026-07-23.md · EPIC V4.
 */

/** @typedef {'active' | 'archived'} TaskStatus */

/**
 * @typedef {object} TaskLike
 * @property {string} id
 * @property {string} [title]
 * @property {TaskStatus} status
 * @property {string | null} [leadPersona]
 * @property {string | null} [parentEpic]
 * @property {string} [createdAt]
 * @property {string | null} [archivedAt]
 * @property {number | null} [githubIssue]
 * @property {string | null} [linearId]
 * @property {string} [promptPath]
 * @property {string | null} [insightId]
 */

/**
 * @typedef {object} CardLink
 * @property {'github' | 'linear' | 'prompt' | 'insight'} type
 * @property {string} urn
 * @property {string} label
 */

/**
 * @typedef {object} CardPassport
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {TaskStatus | string} status
 * @property {string | null} owner
 * @property {string | null} parentEpicId
 * @property {string | null} updatedAt
 * @property {CardLink[]} links
 * @property {boolean} orphaned
 * @property {boolean} inconsistent
 * @property {string[]} markers
 */

/**
 * @typedef {object} CardInspection
 * @property {CardPassport} self
 * @property {CardPassport[]} children
 * @property {Record<string, CardPassport[]>} [grandchildren]
 * @property {number} depth
 * @property {boolean} hasInconsistency
 */

/**
 * Живая карточка для базы рекурсии: только `active`.
 * Архив / иное — в спуск не входят.
 * @param {TaskLike | null | undefined} task
 */
export function isLiveTask(task) {
  return Boolean(task && task.status === 'active');
}

/**
 * @param {{ tasks?: TaskLike[] } | null | undefined} registry
 * @returns {Map<string, TaskLike>}
 */
export function indexTasks(registry) {
  /** @type {Map<string, TaskLike>} */
  const byId = new Map();
  const tasks = Array.isArray(registry?.tasks) ? registry.tasks : [];
  for (const t of tasks) {
    if (t?.id) byId.set(String(t.id), t);
  }
  return byId;
}

/**
 * @param {TaskLike} task
 * @returns {CardLink[]}
 */
export function buildCardLinks(task) {
  /** @type {CardLink[]} */
  const links = [];
  if (task.githubIssue != null && Number.isFinite(Number(task.githubIssue))) {
    const n = Number(task.githubIssue);
    links.push({
      type: 'github',
      urn: `github:issue/${n}`,
      label: task.title?.trim() ? task.title.trim() : `#${n}`,
    });
  }
  if (typeof task.linearId === 'string' && task.linearId.trim()) {
    const id = task.linearId.trim();
    links.push({ type: 'linear', urn: `linear:${id}`, label: id });
  }
  if (typeof task.promptPath === 'string' && task.promptPath.trim()) {
    const p = task.promptPath.trim();
    const base = p.split(/[/\\]/).pop() ?? p;
    links.push({ type: 'prompt', urn: `file:${p}`, label: base });
  }
  if (typeof task.insightId === 'string' && task.insightId.trim()) {
    const id = task.insightId.trim();
    links.push({ type: 'insight', urn: `insight:${id}`, label: id });
  }
  return links;
}

/**
 * @param {TaskLike} task
 * @param {Map<string, TaskLike>} byId
 * @returns {CardPassport}
 */
export function buildPassport(task, byId) {
  const parentRaw = task.parentEpic;
  const parentEpicId =
    parentRaw != null && String(parentRaw).trim() ? String(parentRaw).trim() : null;
  const parent = parentEpicId ? (byId.get(parentEpicId) ?? null) : null;
  const orphaned = Boolean(parentEpicId && !parent);
  const liveChildren = liveChildrenOf(task.id, byId);
  const parentDead = Boolean(parent && !isLiveTask(parent));
  // [INCONSISTENT]: живой ребёнок у мёртвого родителя, либо мёртвый эпик с живыми детьми.
  const inconsistent =
    (isLiveTask(task) && parentDead) || (!isLiveTask(task) && liveChildren.length > 0);

  /** @type {string[]} */
  const markers = [];
  if (orphaned) markers.push('[ORPHANED]');
  if (inconsistent) markers.push('[INCONSISTENT]');

  return {
    id: task.id,
    slug: task.id,
    title: task.title ?? task.id,
    status: task.status,
    owner: task.leadPersona ?? null,
    parentEpicId,
    updatedAt: task.archivedAt ?? task.createdAt ?? null,
    links: buildCardLinks(task),
    orphaned,
    inconsistent,
    markers,
  };
}

/**
 * @param {string} parentId
 * @param {Map<string, TaskLike>} byId
 * @returns {TaskLike[]}
 */
export function liveChildrenOf(parentId, byId) {
  const out = [];
  for (const t of byId.values()) {
    if (t.parentEpic === parentId && isLiveTask(t)) out.push(t);
  }
  out.sort((a, b) => String(a.id).localeCompare(String(b.id), 'en'));
  return out;
}

/**
 * Нормализовать depth: только 1 | 2; иначе default 2.
 * @param {unknown} depth
 * @returns {1 | 2}
 */
export function normalizeDepth(depth) {
  if (depth === 1 || depth === '1') return 1;
  if (depth === 2 || depth === '2') return 2;
  if (depth == null || depth === '') return 2;
  throw new Error(`inspectElement: depth должен быть 1 или 2, получено «${depth}»`);
}

/**
 * inspectElement(registry, cardId, { depth }) — без сети.
 *
 * @param {{ version?: number, tasks: TaskLike[] }} registry
 * @param {string} cardId
 * @param {{ depth?: 1 | 2 | string | number }} [options]
 * @returns {CardInspection | null} null — карточки нет в реестре
 */
export function inspectElement(registry, cardId, options = {}) {
  if (!cardId || typeof cardId !== 'string') {
    throw new Error('inspectElement: cardId обязателен');
  }
  const depth = normalizeDepth(options.depth);
  const byId = indexTasks(registry);
  const task = byId.get(cardId) ?? null;
  if (!task) return null;

  const self = buildPassport(task, byId);
  const childTasks = liveChildrenOf(cardId, byId);
  const children = childTasks.map((c) => buildPassport(c, byId));

  /** @type {CardInspection} */
  const result = { self, children, depth, hasInconsistency: false };

  if (depth >= 2) {
    /** @type {Record<string, CardPassport[]>} */
    const grandchildren = {};
    for (const c of childTasks) {
      const grand = liveChildrenOf(c.id, byId).map((g) => buildPassport(g, byId));
      grandchildren[c.id] = grand;
    }
    result.grandchildren = grandchildren;
  }

  result.hasInconsistency = collectInconsistency(result);
  return result;
}

/**
 * Alias из DoD seanse (`inspectCard`).
 * @param {{ version?: number, tasks: TaskLike[] }} registry
 * @param {string} cardId
 * @param {1 | 2 | string | number} [depth]
 */
export function inspectCard(registry, cardId, depth = 2) {
  return inspectElement(registry, cardId, { depth });
}

/**
 * @param {CardInspection} inspection
 */
function collectInconsistency(inspection) {
  const passports = [inspection.self, ...inspection.children];
  if (inspection.grandchildren) {
    for (const list of Object.values(inspection.grandchildren)) passports.push(...list);
  }
  return passports.some((p) => p.orphaned || p.inconsistent);
}

/**
 * Текстовый tree-view для CLI (stdout).
 * @param {CardInspection} inspection
 * @returns {string}
 */
export function formatInspection(inspection) {
  const lines = [];
  lines.push(formatPassportLine(inspection.self, ''));
  lines.push(...formatPassportDetails(inspection.self, '  '));

  for (const child of inspection.children) {
    lines.push(formatPassportLine(child, '  '));
    lines.push(...formatPassportDetails(child, '    '));
    if (inspection.depth >= 2 && inspection.grandchildren?.[child.id]) {
      for (const g of inspection.grandchildren[child.id]) {
        lines.push(formatPassportLine(g, '    '));
        lines.push(...formatPassportDetails(g, '      '));
      }
    }
  }

  if (inspection.children.length === 0) {
    lines.push('  (нет живых дочерних)');
  }

  return lines.join('\n');
}

/**
 * @param {CardPassport} p
 * @param {string} indent
 */
function formatPassportLine(p, indent) {
  const mark = p.markers.length ? `${p.markers.join('')} ` : '';
  const owner = p.owner ? ` · ${p.owner}` : '';
  const parent = p.parentEpicId ? ` · parent=${p.parentEpicId}` : '';
  return `${indent}${mark}${p.id} [${p.status}]${owner}${parent} — ${p.title}`;
}

/**
 * @param {CardPassport} p
 * @param {string} indent
 */
function formatPassportDetails(p, indent) {
  const lines = [];
  if (p.updatedAt) lines.push(`${indent}updatedAt: ${p.updatedAt}`);
  for (const link of p.links) {
    lines.push(`${indent}${link.type}: ${link.urn} (${link.label})`);
  }
  return lines;
}

/**
 * Предупреждения для stderr.
 * @param {CardInspection} inspection
 * @returns {string[]}
 */
export function formatInspectionWarnings(inspection) {
  /** @type {string[]} */
  const warnings = [];
  const note = (p) => {
    if (p.orphaned) {
      warnings.push(
        `⚠ [ORPHANED] ${p.id}: parentEpic «${p.parentEpicId}» не резолвится в реестре`,
      );
    }
    if (p.inconsistent) {
      warnings.push(
        `⚠ [INCONSISTENT] ${p.id}: мёртвый родитель / живые дети (разрыв статуса)`,
      );
    }
  };
  note(inspection.self);
  for (const c of inspection.children) note(c);
  if (inspection.grandchildren) {
    for (const list of Object.values(inspection.grandchildren)) {
      for (const g of list) note(g);
    }
  }
  return warnings;
}
