/**
 * validateProcedure — зуб заселённости контейнера процедуры (Р1, #782).
 *
 * Канон: вердикт `m1-home-r2` заседания procedural-layer (ратифицирован 21.07).
 * Контейнер процедуры `docs/procedures/<id>/` заселён ⟺ все три предиката
 * истинны: `resolvable` ∧ `readmeNonEmpty` ∧ `manifestSchemaOk`.
 * Дополнительный запрет Т12: кода и тестов в контейнере быть не может.
 *
 * Очередь кадров (procedure-frames F1 / #927 + ritual-day-frames):
 * optional-ключи `preflight` | `frames` | `post` — легальные расширения
 * пятиполёвки Р1. Элемент: `{ id, holder, pins? }` (ADR-0015);
 * `id` уникален в пределах процедуры (все три полосы); `holder` ∈ Persona.
 * Резолв segmentHash (P3 сеть) — F2 / auditPins; здесь — структура пина.
 *
 * Ядро настроек (эпик #1220 Ф1, канон docs/procedures/CORE.md):
 * optional-ключи `trigger` | `steps` | `gates`. Отсутствие всех трёх — находка
 * (findings), не отказ valid. Частичное ядро или провал суб-схемы — дефект.
 *
 * Детерминирована, без сети; файловая система — единственный вход.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

/** Расширения, запрещённые в контейнере (Т12: код и тесты живут в scripts/). */
const CODE_EXT_RE = /\.(mjs|cjs|js|ts|tsx|jsx|py|sh|ps1)$/iu;

/** Обязательное ядро MANIFEST (Р1) — неизменно. */
export const MANIFEST_BASE_KEYS = Object.freeze([
  'id',
  'leadPersona',
  'kitVersion',
  'engines',
  'precedents',
]);

/**
 * Единственные разрешённые optional-ключи очереди кадров (F1 + rdf M2).
 * `frames` — автоцепочка; `preflight` — гейт до frames; `post` — ручной хвост.
 */
export const MANIFEST_QUEUE_KEYS = Object.freeze(['preflight', 'frames', 'post']);

/**
 * Ядро настроек процедуры (#1220 Ф1). Все три вместе или ни одного:
 * частичное ядро — дефект; отсутствие — находка (миграция по касанию).
 * Канон: docs/procedures/CORE.md.
 */
export const MANIFEST_CORE_KEYS = Object.freeze(['trigger', 'steps', 'gates']);

/** Пилоты Ф1 — обязаны нести полное валидное ядро. */
export const PROCEDURE_CORE_PILOTS = Object.freeze([
  'ritual-evening',
  'bridge',
  'ritual-dreams',
]);

const TRIGGER_KINDS = Object.freeze(['schedule', 'captain-word', 'procedure-event', 'none']);
const STEPS_KINDS = Object.freeze(['ref', 'inline', 'none']);
const GATES_KINDS = Object.freeze(['inline', 'none']);
const CRITICALITY = Object.freeze(['critical', 'noncritical']);
const GATE_WAITS = Object.freeze(['owner', 'human']);
const STUB_WHY_RE = /^(todo|n\/?a|tbd|none|null|-|—|\.+)$/iu;
const KEBAB_RE = /^[a-z0-9][a-z0-9-]*$/u;

/** Канон персон (m1 + VIRTUAL_TEAM_PROMPT), нижний регистр. */
export const PROCEDURE_PERSONAS = Object.freeze([
  'vesnin',
  'ozhegov',
  'dynin',
  'kuryokhin',
  'rodchenko',
  'angelina',
]);

/** Закрытый словарь якорей пина отрезка (вердикт m2). */
export const PIN_ANCHOR_KINDS = Object.freeze(['heading', 'marker', 'signature']);

const SEGMENT_HASH_RE = /^[0-9a-f]{40}$/iu;

/**
 * Нормализовать элемент кадра: скаляр `pin` → `pins: [pin]` (ADR-0015 transitional).
 * @param {Record<string, unknown>} frame
 * @returns {{frame: Record<string, unknown>, warning: string|null}}
 */
export function normalizeFramePins(frame) {
  if (frame === null || typeof frame !== 'object' || Array.isArray(frame)) {
    return { frame, warning: null };
  }
  const hasPins = Object.prototype.hasOwnProperty.call(frame, 'pins');
  const hasPin = Object.prototype.hasOwnProperty.call(frame, 'pin');
  if (hasPins && hasPin) {
    return { frame, warning: 'кадр: одновременно pin и pins — оставьте pins[]' };
  }
  if (hasPin && !hasPins) {
    const { pin, ...rest } = frame;
    return { frame: { ...rest, pins: [pin] }, warning: null };
  }
  return { frame, warning: null };
}

/**
 * Структурные дефекты одного Pin (P3 без резолва содержимого — F2).
 * @param {unknown} pin
 * @param {string} label префикс сообщения
 * @returns {string[]}
 */
export function pinStructureProblems(pin, label) {
  const problems = [];
  if (pin === null || typeof pin !== 'object' || Array.isArray(pin)) {
    // transitional: голый SHA как opaque-ref (m1) — принимаем, резолв = F2
    if (typeof pin === 'string' && SEGMENT_HASH_RE.test(pin)) return problems;
    problems.push(`${label}: пин — не объект {path, anchor, segmentHash}`);
    return problems;
  }
  if (typeof pin.path !== 'string' || pin.path.trim() === '') {
    problems.push(`${label}: path — не непустая строка`);
  }
  const anchor = pin.anchor;
  if (anchor === null || typeof anchor !== 'object' || Array.isArray(anchor)) {
    problems.push(`${label}: anchor — не объект {kind, ref}`);
  } else {
    if (!PIN_ANCHOR_KINDS.includes(anchor.kind)) {
      problems.push(`${label}: anchor.kind ∉ {heading, marker, signature}`);
    }
    if (typeof anchor.ref !== 'string' || anchor.ref.trim() === '') {
      problems.push(`${label}: anchor.ref — не непустая строка`);
    }
  }
  if (typeof pin.segmentHash !== 'string' || !SEGMENT_HASH_RE.test(pin.segmentHash)) {
    problems.push(`${label}: segmentHash — не git-blob SHA-1 (40 hex)`);
  }
  return problems;
}

/**
 * P2 + структурный P3 для полосы очереди (`preflight` | `frames` | `post`).
 * `id` кадра — идентификатор **внутри процедуры** (не procedure.id), уникален
 * среди всех полос (передайте alreadySeen между вызовами).
 *
 * @param {unknown} lane
 * @param {string} laneName
 * @param {Set<string>} alreadySeen ids из других полос
 * @returns {string[]}
 */
export function frameLaneProblems(lane, laneName, alreadySeen = new Set()) {
  const problems = [];
  if (lane === undefined) return problems;
  if (!Array.isArray(lane)) {
    problems.push(`${laneName} — не массив`);
    return problems;
  }
  for (let i = 0; i < lane.length; i += 1) {
    const raw = lane[i];
    const prefix = `${laneName}[${i}]`;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      problems.push(`${prefix}: не объект кадра`);
      continue;
    }
    const { frame, warning } = normalizeFramePins(/** @type {Record<string, unknown>} */ (raw));
    if (warning) problems.push(`${prefix}: ${warning}`);

    if (typeof frame.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/u.test(frame.id)) {
      problems.push(`${prefix}: id — не kebab-case строка`);
    } else if (alreadySeen.has(frame.id)) {
      problems.push(`${prefix}: дубль id «${frame.id}» в очереди процедуры`);
    } else {
      alreadySeen.add(frame.id);
    }

    if (typeof frame.holder !== 'string' || !PROCEDURE_PERSONAS.includes(frame.holder)) {
      problems.push(
        `${prefix}: holder ∉ Persona (${PROCEDURE_PERSONAS.join('/')})`,
      );
    }

    if (Object.prototype.hasOwnProperty.call(frame, 'pins')) {
      if (!Array.isArray(frame.pins)) {
        problems.push(`${prefix}: pins — не массив`);
      } else if (frame.pins.length === 0) {
        problems.push(`${prefix}: pins пуст — опустите ключ (ADR-0015)`);
      } else {
        frame.pins.forEach((p, j) => {
          problems.push(...pinStructureProblems(p, `${prefix}.pins[${j}]`));
        });
      }
    }
  }
  return problems;
}

/**
 * Причина легального «нет» / whyNoncritical: непустая и не шаблон-заглушка.
 * @param {unknown} why
 * @returns {boolean}
 */
export function isHonestWhy(why) {
  if (typeof why !== 'string') return false;
  const t = why.trim();
  return t.length > 0 && !STUB_WHY_RE.test(t);
}

/**
 * Суб-схема одного шага ядра (inline item или элемент ref.steps).
 * @param {unknown} step
 * @param {string} label
 * @param {Set<string>} seenIds
 * @returns {string[]}
 */
export function coreStepProblems(step, label, seenIds = new Set()) {
  const problems = [];
  if (step === null || typeof step !== 'object' || Array.isArray(step)) {
    return [`${label}: не объект шага`];
  }
  const s = /** @type {Record<string, unknown>} */ (step);
  if (typeof s.id !== 'string' || !KEBAB_RE.test(s.id)) {
    problems.push(`${label}: id — не kebab-case строка`);
  } else if (seenIds.has(s.id)) {
    problems.push(`${label}: дубль id «${s.id}» в steps`);
  } else {
    seenIds.add(s.id);
  }
  if (!CRITICALITY.includes(/** @type {string} */ (s.criticality))) {
    problems.push(`${label}: criticality ∉ {critical, noncritical}`);
  } else if (s.criticality === 'noncritical') {
    if (!isHonestWhy(s.whyNoncritical)) {
      problems.push(`${label}: noncritical без честного whyNoncritical`);
    }
  } else if (Object.prototype.hasOwnProperty.call(s, 'whyNoncritical')) {
    problems.push(`${label}: whyNoncritical запрещён при critical`);
  }
  return problems;
}

/**
 * Суб-схема одного гейта.
 * @param {unknown} gate
 * @param {string} label
 * @param {Set<string>} seenIds
 * @returns {string[]}
 */
export function coreGateProblems(gate, label, seenIds = new Set()) {
  const problems = [];
  if (gate === null || typeof gate !== 'object' || Array.isArray(gate)) {
    return [`${label}: не объект гейта`];
  }
  const g = /** @type {Record<string, unknown>} */ (gate);
  if (typeof g.id !== 'string' || !KEBAB_RE.test(g.id)) {
    problems.push(`${label}: id — не kebab-case строка`);
  } else if (seenIds.has(g.id)) {
    problems.push(`${label}: дубль id «${g.id}» в gates`);
  } else {
    seenIds.add(g.id);
  }
  if (!GATE_WAITS.includes(/** @type {string} */ (g.waitsFor))) {
    problems.push(`${label}: waitsFor ∉ {owner, human}`);
  }
  if (typeof g.resume !== 'string' || g.resume.trim() === '') {
    problems.push(`${label}: resume — не непустая строка`);
  }
  if (Object.prototype.hasOwnProperty.call(g, 'note') && typeof g.note !== 'string') {
    problems.push(`${label}: note — не строка`);
  }
  return problems;
}

/**
 * Суб-схема trigger / steps / gates (при полном ядре).
 * @param {Record<string, unknown>} m
 * @param {string} [repoRoot] для резолва steps.ref
 * @returns {string[]}
 */
export function coreFieldsProblems(m, repoRoot) {
  const problems = [];

  // trigger
  const trigger = m.trigger;
  if (trigger === null || typeof trigger !== 'object' || Array.isArray(trigger)) {
    problems.push('trigger — не объект');
  } else {
    const t = /** @type {Record<string, unknown>} */ (trigger);
    if (!TRIGGER_KINDS.includes(/** @type {string} */ (t.kind))) {
      problems.push('trigger.kind ∉ {schedule, captain-word, procedure-event, none}');
    } else if (t.kind === 'none') {
      if (!isHonestWhy(t.why)) problems.push('trigger.none: нет честного why');
    } else if (t.kind === 'schedule') {
      if (typeof t.cron !== 'string' || t.cron.trim() === '') {
        problems.push('trigger.schedule: cron — не непустая строка');
      }
      if (Object.prototype.hasOwnProperty.call(t, 'timezone') && typeof t.timezone !== 'string') {
        problems.push('trigger.schedule: timezone — не строка');
      }
    } else if (t.kind === 'captain-word') {
      if (Object.prototype.hasOwnProperty.call(t, 'command') &&
          (typeof t.command !== 'string' || t.command.trim() === '')) {
        problems.push('trigger.captain-word: command — не непустая строка');
      }
    } else if (t.kind === 'procedure-event') {
      if (typeof t.procedureId !== 'string' || !KEBAB_RE.test(t.procedureId)) {
        problems.push('trigger.procedure-event: procedureId — не kebab-case');
      }
      if (typeof t.event !== 'string' || t.event.trim() === '') {
        problems.push('trigger.procedure-event: event — не непустая строка');
      }
    }
  }

  // steps
  const steps = m.steps;
  if (steps === null || typeof steps !== 'object' || Array.isArray(steps)) {
    problems.push('steps — не объект');
  } else {
    const s = /** @type {Record<string, unknown>} */ (steps);
    if (!STEPS_KINDS.includes(/** @type {string} */ (s.kind))) {
      problems.push('steps.kind ∉ {ref, inline, none}');
    } else if (s.kind === 'none') {
      if (!isHonestWhy(s.why)) problems.push('steps.none: нет честного why');
    } else if (s.kind === 'inline') {
      if (!Array.isArray(s.items) || s.items.length === 0) {
        problems.push('steps.inline: items — непустой массив');
      } else {
        const seen = new Set();
        s.items.forEach((item, i) => {
          problems.push(...coreStepProblems(item, `steps.items[${i}]`, seen));
        });
      }
    } else if (s.kind === 'ref') {
      if (typeof s.path !== 'string' || s.path.trim() === '') {
        problems.push('steps.ref: path — не непустая строка');
      } else if (repoRoot) {
        const abs = join(repoRoot, s.path.replace(/\\/gu, '/'));
        if (!existsSync(abs)) {
          problems.push(`steps.ref: путь не резолвится: ${s.path}`);
        } else {
          try {
            const doc = JSON.parse(readFileSync(abs, 'utf8'));
            if (!doc || typeof doc !== 'object' || !Array.isArray(doc.steps)) {
              problems.push(`steps.ref: в ${s.path} нет массива steps`);
            } else if (doc.steps.length === 0) {
              problems.push(`steps.ref: ${s.path} — steps пуст`);
            } else {
              const seen = new Set();
              doc.steps.forEach((item, i) => {
                problems.push(...coreStepProblems(item, `steps.ref[${i}]`, seen));
              });
            }
          } catch {
            problems.push(`steps.ref: ${s.path} — битый JSON`);
          }
        }
      }
    }
  }

  // gates
  const gates = m.gates;
  if (gates === null || typeof gates !== 'object' || Array.isArray(gates)) {
    problems.push('gates — не объект');
  } else {
    const g = /** @type {Record<string, unknown>} */ (gates);
    if (!GATES_KINDS.includes(/** @type {string} */ (g.kind))) {
      problems.push('gates.kind ∉ {inline, none}');
    } else if (g.kind === 'none') {
      if (!isHonestWhy(g.why)) problems.push('gates.none: нет честного why');
    } else if (g.kind === 'inline') {
      if (!Array.isArray(g.items) || g.items.length === 0) {
        problems.push('gates.inline: items — непустой массив');
      } else {
        const seen = new Set();
        g.items.forEach((item, i) => {
          problems.push(...coreGateProblems(item, `gates.items[${i}]`, seen));
        });
      }
    }
  }

  return problems;
}

/**
 * Наличие ядра: none | partial | full.
 * @param {Record<string, unknown>} m
 * @returns {'none'|'partial'|'full'}
 */
export function corePresence(m) {
  const present = MANIFEST_CORE_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(m, k));
  if (present.length === 0) return 'none';
  if (present.length === MANIFEST_CORE_KEYS.length) return 'full';
  return 'partial';
}

/**
 * Схема MANIFEST.json (Р1 + очередь кадров + ядро #1220):
 * пять обязательных; optional очередь и ядро; иной ключ — «свалка».
 *
 * @param {unknown} m распарсенный манифест
 * @param {string} dirName имя каталога контейнера (id обязан совпадать)
 * @param {string} [repoRoot] для резолва steps.ref
 * @returns {string[]} дефекты схемы
 */
export function manifestSchemaProblems(m, dirName, repoRoot) {
  const problems = [];
  if (m === null || typeof m !== 'object' || Array.isArray(m)) {
    return ['MANIFEST.json — не объект'];
  }
  const keys = Object.keys(m);
  const allowed = new Set([
    ...MANIFEST_BASE_KEYS,
    ...MANIFEST_QUEUE_KEYS,
    ...MANIFEST_CORE_KEYS,
  ]);
  for (const k of MANIFEST_BASE_KEYS) if (!keys.includes(k)) problems.push(`нет поля ${k}`);
  for (const k of keys) if (!allowed.has(k)) problems.push(`лишнее поле ${k}`);

  if (typeof m.id === 'string') {
    if (!KEBAB_RE.test(m.id)) problems.push('id не kebab-case');
    if (dirName && m.id !== dirName) problems.push(`id «${m.id}» ≠ имени каталога «${dirName}»`);
  } else if (keys.includes('id')) problems.push('id — не строка');

  if (keys.includes('leadPersona') && (typeof m.leadPersona !== 'string' || m.leadPersona.trim() === '')) {
    problems.push('leadPersona — не непустая строка');
  }
  if (keys.includes('kitVersion') && m.kitVersion !== null && typeof m.kitVersion !== 'string') {
    problems.push('kitVersion — не строка и не null');
  }
  for (const field of ['engines', 'precedents']) {
    if (!keys.includes(field)) continue;
    if (!Array.isArray(m[field]) || m[field].some((e) => typeof e !== 'string' || e.trim() === '')) {
      problems.push(`${field} — не массив непустых строк`);
    }
  }
  if (Array.isArray(m.engines) && m.engines.length === 0) {
    problems.push('engines пуст — процедура без движков не заселена');
  }

  // P2/P3 структуры очереди (отсутствие полосы = вакуумная истина)
  const seenIds = new Set();
  for (const lane of MANIFEST_QUEUE_KEYS) {
    if (keys.includes(lane)) {
      problems.push(...frameLaneProblems(m[lane], lane, seenIds));
    }
  }

  // Ядро #1220: partial → дефект; full → суб-схема; none → не здесь (findings)
  const presence = corePresence(/** @type {Record<string, unknown>} */ (m));
  if (presence === 'partial') {
    const missing = MANIFEST_CORE_KEYS.filter((k) => !keys.includes(k));
    problems.push(`ядро частичное — нет: ${missing.join(', ')} (все три или ни одного)`);
  } else if (presence === 'full') {
    problems.push(...coreFieldsProblems(/** @type {Record<string, unknown>} */ (m), repoRoot));
  }

  return problems;
}

/**
 * Проверить контейнер процедуры.
 *
 * @param {string} dir абсолютный путь контейнера `docs/procedures/<id>`
 * @param {string} repoRoot корень репозитория (ссылки манифеста резолвятся от него)
 * @returns {{valid: boolean, resolvable: boolean, readmeNonEmpty: boolean,
 *   manifestSchemaOk: boolean, problems: string[], findings: string[],
 *   core: 'none'|'partial'|'full'|null}}
 */
export function validateProcedure(dir, repoRoot) {
  const problems = [];
  const findings = [];

  // readmeNonEmpty
  let readmeNonEmpty = false;
  const readmePath = join(dir, 'README.md');
  if (existsSync(readmePath)) {
    readmeNonEmpty = readFileSync(readmePath, 'utf8').trim().length > 0;
  }
  if (!readmeNonEmpty) problems.push('README.md отсутствует или пуст');

  // manifestSchemaOk
  let manifestSchemaOk = false;
  let manifest = null;
  /** @type {'none'|'partial'|'full'|null} */
  let core = null;
  const manifestPath = join(dir, 'MANIFEST.json');
  if (!existsSync(manifestPath)) {
    problems.push('MANIFEST.json отсутствует');
  } else {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const schemaProblems = manifestSchemaProblems(manifest, basename(dir), repoRoot);
      manifestSchemaOk = schemaProblems.length === 0;
      problems.push(...schemaProblems);
      if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) {
        core = corePresence(/** @type {Record<string, unknown>} */ (manifest));
        if (core === 'none') {
          findings.push('нет ядра настроек (trigger/steps/gates) — см. docs/procedures/CORE.md');
        }
      }
    } catch {
      problems.push('MANIFEST.json — битый JSON');
    }
  }

  // resolvable: engines[]/precedents[] + (если задан) kitVersion → дом кита
  let resolvable = false;
  if (manifest && Array.isArray(manifest.engines) && Array.isArray(manifest.precedents)) {
    const missing = [...manifest.engines, ...manifest.precedents].filter(
      (rel) => typeof rel !== 'string' || !existsSync(join(repoRoot, rel)),
    );
    resolvable = missing.length === 0 && manifest.engines.length > 0;
    for (const rel of missing) problems.push(`ссылка не резолвится: ${rel}`);

    // K4: kitVersion — путь к дому кита (kits/<id>) с MANIFEST.json; null допустим
    if (typeof manifest.kitVersion === 'string' && manifest.kitVersion.trim() !== '') {
      const kitRel = manifest.kitVersion.replace(/\\/gu, '/').replace(/\/+$/u, '');
      const kitAbs = join(repoRoot, kitRel);
      const kitManifest = join(kitAbs, 'MANIFEST.json');
      if (!existsSync(kitAbs) || !existsSync(kitManifest)) {
        problems.push(`kitVersion не резолвится как кит: ${manifest.kitVersion}`);
        resolvable = false;
      }
    }
  } else {
    problems.push('resolvable непроверяем: engines/precedents не массивы');
  }

  // Т12: код и тесты в контейнере запрещены
  try {
    const codeFiles = readdirSync(dir, { recursive: true })
      .map(String)
      .filter((f) => CODE_EXT_RE.test(f));
    for (const f of codeFiles) problems.push(`код в контейнере запрещён (Т12): ${f}`);
    if (codeFiles.length > 0) manifestSchemaOk = false;
  } catch {
    problems.push('контейнер нечитаем');
  }

  return {
    valid: resolvable && readmeNonEmpty && manifestSchemaOk,
    resolvable,
    readmeNonEmpty,
    manifestSchemaOk,
    problems,
    findings,
    core,
  };
}

/**
 * Все контейнеры под docs/procedures/ (кроме README корня).
 * @param {string} repoRoot
 * @returns {string[]} абсолютные пути контейнеров
 */
export function listProcedureDirs(repoRoot) {
  const root = join(repoRoot, 'docs', 'procedures');
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(root, e.name));
}
