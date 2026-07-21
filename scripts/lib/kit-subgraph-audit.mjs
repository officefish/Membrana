/**
 * kit-subgraph-audit — зуб полноты PINNED_SUBGRAPH для слоя kits/ (K2 / #817).
 *
 * Фактический замыкание статических импортов от roots == манифест path→SHA.
 * Расхождение — находка (табличный вывод). Режимы:
 *   - pinned — недостающий узел и уехавший SHA оба блокируют;
 *   - latest — недостающий узел блокирует; sha_drift только предупреждение
 *     (интерактив: дерево может быть новее пина).
 *
 * Канон: kits/MANIFEST.schema.json · PINNED_SUBGRAPH_VERSIONING · pl-r3.
 * Детерминирована; ФС — единственный вход (без сети).
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

/** Тот же паттерн, что layer-direction (статические import/export from). */
const IMPORT_RE = /(?:import\s[^'"]*?|import\s*\(\s*|export\s[^'"]*?\sfrom\s*)['"]([^'"]+)['"]/gu;

/**
 * Git blob SHA-1 рабочего дерева (эквивалент `git hash-object`).
 * @param {Buffer|string} content
 * @returns {string} 40 hex
 */
export function gitBlobSha(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

/**
 * Схема MANIFEST кита (K1): четыре поля, лишние — дефект.
 * @param {unknown} m
 * @param {string} dirName
 * @returns {string[]}
 */
export function kitManifestSchemaProblems(m, dirName) {
  const problems = [];
  if (m === null || typeof m !== 'object' || Array.isArray(m)) {
    return ['MANIFEST.json — не объект'];
  }
  const keys = Object.keys(m);
  const required = ['id', 'leadPersona', 'roots', 'pins'];
  for (const k of required) if (!keys.includes(k)) problems.push(`нет поля ${k}`);
  for (const k of keys) if (!required.includes(k)) problems.push(`лишнее поле ${k}`);

  if (typeof m.id === 'string') {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(m.id)) problems.push('id не kebab-case');
    if (dirName && m.id !== dirName) problems.push(`id «${m.id}» ≠ имени каталога «${dirName}»`);
  } else if (keys.includes('id')) problems.push('id — не строка');

  if (keys.includes('leadPersona') && (typeof m.leadPersona !== 'string' || m.leadPersona.trim() === '')) {
    problems.push('leadPersona — не непустая строка');
  }

  if (keys.includes('roots')) {
    if (!Array.isArray(m.roots) || m.roots.length === 0 || m.roots.some((e) => typeof e !== 'string' || e.trim() === '')) {
      problems.push('roots — не массив непустых строк (≥1)');
    }
  }

  if (keys.includes('pins')) {
    if (m.pins === null || typeof m.pins !== 'object' || Array.isArray(m.pins)) {
      problems.push('pins — не объект');
    } else {
      const entries = Object.entries(m.pins);
      if (entries.length === 0) problems.push('pins пуст');
      for (const [path, sha] of entries) {
        if (typeof path !== 'string' || path.trim() === '') problems.push('pins: пустой ключ');
        if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/u.test(sha)) {
          problems.push(`pins[${path}]: SHA не 40 hex`);
        }
      }
    }
  }

  if (Array.isArray(m.roots) && m.pins && typeof m.pins === 'object' && !Array.isArray(m.pins)) {
    for (const r of m.roots) {
      if (typeof r === 'string' && !(r in m.pins)) {
        problems.push(`root не в pins: ${r}`);
      }
    }
  }

  return problems;
}

/**
 * Замыкание статических относительных/repo-относительных импортов от корней.
 * @param {string} repoRoot
 * @param {string[]} roots пути от корня репо
 * @returns {{ paths: Set<string>, errors: string[] }}
 */
export function collectSubgraph(repoRoot, roots) {
  const paths = new Set();
  const errors = [];
  const queue = [...(roots ?? [])].map((p) => String(p).replace(/\\/gu, '/'));

  while (queue.length > 0) {
    const rel = queue.shift();
    if (paths.has(rel)) continue;
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      errors.push(`узел отсутствует на диске: ${rel}`);
      continue;
    }
    paths.add(rel);
    if (!rel.endsWith('.mjs') && !rel.endsWith('.js') && !rel.endsWith('.cjs')) continue;
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch (e) {
      errors.push(`не читается ${rel}: ${e.message}`);
      continue;
    }
    for (const m of text.matchAll(IMPORT_RE)) {
      const spec = m[1];
      if (!spec.startsWith('.') && !spec.startsWith('scripts/') && !spec.startsWith('docs/') && !spec.startsWith('kits/')) {
        continue;
      }
      const toAbs = spec.startsWith('.') ? join(abs, '..', spec) : join(repoRoot, spec);
      const toRel = relative(repoRoot, toAbs).replace(/\\/gu, '/');
      if (toRel.startsWith('..')) {
        errors.push(`импорт вне репо из ${rel}: ${spec}`);
        continue;
      }
      if (!paths.has(toRel)) queue.push(toRel);
    }
  }

  return { paths, errors };
}

/**
 * @typedef {{ kind: string, path: string, detail: string, blocking: boolean }} KitFinding
 */

/**
 * Аудит одного кита.
 * @param {{ repoRoot: string, kitDir: string, mode?: 'pinned'|'latest' }} opts
 * @returns {{
 *   id: string,
 *   mode: 'pinned'|'latest',
 *   ok: boolean,
 *   findings: KitFinding[],
 *   actual: Record<string, string>,
 *   pinCount: number,
 *   actualCount: number,
 * }}
 */
export function auditKit({ repoRoot, kitDir, mode = 'pinned' }) {
  const dirName = basename(kitDir);
  const findings = /** @type {KitFinding[]} */ ([]);
  const mPath = join(kitDir, 'MANIFEST.json');

  if (!existsSync(mPath)) {
    findings.push({
      kind: 'no_manifest',
      path: relative(repoRoot, mPath).replace(/\\/gu, '/'),
      detail: 'MANIFEST.json отсутствует (BLOCK pl-r3)',
      blocking: true,
    });
    return {
      id: dirName,
      mode,
      ok: false,
      findings,
      actual: {},
      pinCount: 0,
      actualCount: 0,
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(mPath, 'utf8'));
  } catch {
    findings.push({
      kind: 'bad_json',
      path: relative(repoRoot, mPath).replace(/\\/gu, '/'),
      detail: 'битый JSON',
      blocking: true,
    });
    return {
      id: dirName,
      mode,
      ok: false,
      findings,
      actual: {},
      pinCount: 0,
      actualCount: 0,
    };
  }

  for (const p of kitManifestSchemaProblems(manifest, dirName)) {
    findings.push({ kind: 'schema', path: 'MANIFEST.json', detail: p, blocking: true });
  }

  const roots = Array.isArray(manifest.roots) ? manifest.roots : [];
  const pins = manifest.pins && typeof manifest.pins === 'object' && !Array.isArray(manifest.pins)
    ? /** @type {Record<string, string>} */ (manifest.pins)
    : {};

  const { paths: actualPaths, errors } = collectSubgraph(repoRoot, roots);
  for (const e of errors) {
    findings.push({ kind: 'unresolvable', path: '', detail: e, blocking: true });
  }

  /** @type {Record<string, string>} */
  const actual = {};
  for (const rel of [...actualPaths].sort()) {
    try {
      actual[rel] = gitBlobSha(readFileSync(join(repoRoot, rel)));
    } catch (e) {
      findings.push({
        kind: 'unresolvable',
        path: rel,
        detail: `не читается: ${e.message}`,
        blocking: true,
      });
    }
  }

  for (const rel of Object.keys(actual)) {
    if (!(rel in pins)) {
      findings.push({
        kind: 'missing_pin',
        path: rel,
        detail: 'в замыкании roots, нет в pins',
        blocking: true,
      });
    } else if (pins[rel] !== actual[rel]) {
      findings.push({
        kind: 'sha_drift',
        path: rel,
        detail: `пин ${pins[rel].slice(0, 8)}… ≠ факт ${actual[rel].slice(0, 8)}…`,
        blocking: mode === 'pinned',
      });
    }
  }

  for (const rel of Object.keys(pins)) {
    if (!(rel in actual)) {
      findings.push({
        kind: 'orphan_pin',
        path: rel,
        detail: 'в pins, недостижим от roots',
        blocking: true,
      });
    }
  }

  const blocking = findings.filter((f) => f.blocking);
  return {
    id: typeof manifest.id === 'string' ? manifest.id : dirName,
    mode,
    ok: blocking.length === 0,
    findings,
    actual,
    pinCount: Object.keys(pins).length,
    actualCount: Object.keys(actual).length,
  };
}

/**
 * Список каталогов-жильцов kits/<id>/ (есть MANIFEST или README).
 * @param {string} kitsRoot абсолютный путь kits/
 * @returns {string[]} абсолютные пути
 */
export function listKitDirs(kitsRoot) {
  if (!existsSync(kitsRoot)) return [];
  return readdirSync(kitsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(kitsRoot, d.name))
    .filter((dir) => existsSync(join(dir, 'MANIFEST.json')) || existsSync(join(dir, 'README.md')));
}

/**
 * Табличный отчёт (markdown-строки).
 * @param {ReturnType<typeof auditKit>} report
 * @returns {string}
 */
export function formatKitAuditTable(report) {
  const lines = [
    `| kind | path | detail | blocking |`,
    `| --- | --- | --- | --- |`,
  ];
  if (report.findings.length === 0) {
    lines.push(`| — | — | 0 находок | — |`);
  } else {
    for (const f of report.findings) {
      lines.push(
        `| ${f.kind} | ${f.path || '—'} | ${f.detail.replace(/\|/gu, '\\|')} | ${f.blocking ? 'yes' : 'warn'} |`,
      );
    }
  }
  return lines.join('\n');
}
