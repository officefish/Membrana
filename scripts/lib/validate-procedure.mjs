/**
 * validateProcedure — зуб заселённости контейнера процедуры (Р1, #782).
 *
 * Канон: вердикт `m1-home-r2` заседания procedural-layer (ратифицирован 21.07).
 * Контейнер процедуры `docs/procedures/<id>/` заселён ⟺ все три предиката
 * истинны: `resolvable` ∧ `readmeNonEmpty` ∧ `manifestSchemaOk`.
 * Дополнительный запрет Т12: кода и тестов в контейнере быть не может.
 *
 * Очередь кадров (procedure-frames F1 / #927 + ritual-day-frames):
 * optional-ключи `preflight` | `frames` | `post` — единственные легальные
 * расширения пятиполёвки Р1. Элемент: `{ id, holder, pins? }` (ADR-0015);
 * `id` уникален в пределах процедуры (все три полосы); `holder` ∈ Persona.
 * Резолв segmentHash (P3 сеть) — F2 / auditPins; здесь — структура пина.
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
 * Схема MANIFEST.json (Р1 + F1): ядро пяти полей; optional очередь
 * `preflight`/`frames`/`post`; любой иной ключ — дефект «свалка».
 *
 * @param {unknown} m распарсенный манифест
 * @param {string} dirName имя каталога контейнера (id обязан совпадать)
 * @returns {string[]} дефекты схемы
 */
export function manifestSchemaProblems(m, dirName) {
  const problems = [];
  if (m === null || typeof m !== 'object' || Array.isArray(m)) {
    return ['MANIFEST.json — не объект'];
  }
  const keys = Object.keys(m);
  const allowed = new Set([...MANIFEST_BASE_KEYS, ...MANIFEST_QUEUE_KEYS]);
  for (const k of MANIFEST_BASE_KEYS) if (!keys.includes(k)) problems.push(`нет поля ${k}`);
  for (const k of keys) if (!allowed.has(k)) problems.push(`лишнее поле ${k}`);

  if (typeof m.id === 'string') {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(m.id)) problems.push('id не kebab-case');
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

  return problems;
}

/**
 * Проверить контейнер процедуры.
 *
 * @param {string} dir абсолютный путь контейнера `docs/procedures/<id>`
 * @param {string} repoRoot корень репозитория (ссылки манифеста резолвятся от него)
 * @returns {{valid: boolean, resolvable: boolean, readmeNonEmpty: boolean,
 *   manifestSchemaOk: boolean, problems: string[]}}
 */
export function validateProcedure(dir, repoRoot) {
  const problems = [];

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
  const manifestPath = join(dir, 'MANIFEST.json');
  if (!existsSync(manifestPath)) {
    problems.push('MANIFEST.json отсутствует');
  } else {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const schemaProblems = manifestSchemaProblems(manifest, basename(dir));
      manifestSchemaOk = schemaProblems.length === 0;
      problems.push(...schemaProblems);
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
