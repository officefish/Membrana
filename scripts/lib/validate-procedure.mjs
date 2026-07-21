/**
 * validateProcedure — зуб заселённости контейнера процедуры (Р1, #782).
 *
 * Канон: вердикт `m1-home-r2` заседания procedural-layer (ратифицирован 21.07).
 * Контейнер процедуры `docs/procedures/<id>/` заселён ⟺ все три предиката
 * истинны: `resolvable` ∧ `readmeNonEmpty` ∧ `manifestSchemaOk`.
 * Дополнительный запрет Т12: кода и тестов в контейнере быть не может.
 *
 * Детерминирована, без сети; файловая система — единственный вход.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

/** Расширения, запрещённые в контейнере (Т12: код и тесты живут в scripts/). */
const CODE_EXT_RE = /\.(mjs|cjs|js|ts|tsx|jsx|py|sh|ps1)$/iu;

/**
 * Схема MANIFEST.json (вердикт Р1): пять полей, лишние ключи — дефект
 * (манифест — контракт, а не свалка).
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
  const required = ['id', 'leadPersona', 'kitVersion', 'engines', 'precedents'];
  for (const k of required) if (!keys.includes(k)) problems.push(`нет поля ${k}`);
  for (const k of keys) if (!required.includes(k)) problems.push(`лишнее поле ${k}`);

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

  // resolvable: каждая ссылка engines[]/precedents[] существует от корня репо
  let resolvable = false;
  if (manifest && Array.isArray(manifest.engines) && Array.isArray(manifest.precedents)) {
    const missing = [...manifest.engines, ...manifest.precedents].filter(
      (rel) => typeof rel !== 'string' || !existsSync(join(repoRoot, rel)),
    );
    resolvable = missing.length === 0 && manifest.engines.length > 0;
    for (const rel of missing) problems.push(`ссылка не резолвится: ${rel}`);
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
