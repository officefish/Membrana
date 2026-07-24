/**
 * tooling-atlas — агрегатор контейнера контейнеров (спринт tooling-atlas /
 * atlas-report-plane #1097).
 *
 * Контейнер контейнеров: его элементы — сами дома с мастерскими. Атлас НЕ хранит
 * описаний, а собирает производный индекс из README + workshop.manifest каждого
 * контейнера. Источник истины остаётся в контейнерах; ATLAS.md и mintlify-страница —
 * производные (руками не правятся, дрейф ловит --check).
 *
 * Ссылки и группировка — по `home` (каталог манифеста). `worksOn` — «над чем
 * работает» мастерская, не id строки. Плоскости: report (`docs/audit/*`) /
 * domain / meta.
 *
 * Канон: docs/tooling-atlas/README.md · паттерны GROUP_CONTAINERIZATION + HOME_WORKSHOP.
 * Операции — чтение, идемпотентны.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { listWorkshopManifests, validateWorkshop } from './validate-workshop.mjs';

const MANDATORY = ['audit', 'decompose', 'inspectElement'];

const PLANE_ORDER = { report: 0, domain: 1, meta: 2 };
const PLANE_HEADING = {
  report: 'Плоскость отчётов (`docs/audit`)',
  domain: 'Domain (предметные дома)',
  meta: 'Meta (атлас)',
};

// Markdown-ссылку → её текст: `[текст](rel)` относителен к README-источнику и ломается
// при агрегации в другое место (ATLAS.md / mintlify). Оставляем только текст.
const stripLinks = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1');

/** Выжимка README: H1 + первый непустой не-заголовочный абзац (ссылки → текст). */
function readmeDigest(readmePath) {
  if (!existsSync(readmePath)) return { title: null, summary: null };
  const lines = readFileSync(readmePath, 'utf8').split(/\r?\n/u);
  let title = null;
  let summary = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!title && line.startsWith('# ')) { title = line.slice(2).trim(); continue; }
    // summary — первый прозаический абзац, НЕ завязан на наличие H1.
    if (!summary && line !== '' && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('<!--')) {
      summary = stripLinks(line);
    }
    if (title && summary) break;
  }
  return { title, summary };
}

/** Семья (совместимость `--decompose --by family`) — по `home`. */
function familyOf(home) {
  if (home === 'docs/audit' || home.startsWith('docs/audit/')) return 'audit-family';
  if (home === 'docs/tooling-atlas') return 'meta';
  return 'domain';
}

/** Плоскость индекса: report-plane vs domain vs meta. */
export function planeOf(home) {
  if (home === 'docs/audit' || home.startsWith('docs/audit/')) return 'report';
  if (home === 'docs/tooling-atlas') return 'meta';
  return 'domain';
}

/**
 * @param {unknown} role
 * @returns {'primary'|'derivative'|null}
 */
function normalizeRole(role) {
  if (role === 'primary' || role === 'derivative') return role;
  return null;
}

/**
 * Обнаружить контейнеры: каждый workshop.manifest.json = контейнер.
 * @param {string} repoRoot
 * @returns {{worksOn, home, name, kit, verbs, missingVerbs, title, summary, family, plane, role, valid, warnings, problems}[]}
 */
export function discoverContainers(repoRoot) {
  const out = [];
  for (const manifestPath of listWorkshopManifests(repoRoot)) {
    const dir = dirname(manifestPath);
    let manifest = null;
    try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { manifest = null; }
    const v = validateWorkshop(manifestPath, repoRoot);
    const verbs = manifest?.verbs ?? {};
    const present = MANDATORY.filter((k) => typeof verbs[k] === 'string' && verbs[k].trim() !== '');
    const missingVerbs = MANDATORY.filter((k) => !present.includes(k));
    const home = relative(repoRoot, dir).replace(/\\/gu, '/');
    const worksOn = typeof manifest?.worksOn === 'string' ? manifest.worksOn : home;
    const { title, summary } = readmeDigest(join(dir, 'README.md'));
    out.push({
      worksOn,
      home,
      name: manifest?.name ?? '—',
      kit: manifest?.kit ?? null,
      verbs: present,
      missingVerbs,
      title,
      summary,
      family: familyOf(home),
      plane: planeOf(home),
      role: normalizeRole(manifest?.role),
      valid: v.valid,
      warnings: v.warnings,
      problems: v.problems,
    });
  }
  return out.sort((a, b) => {
    const pa = PLANE_ORDER[a.plane] ?? 9;
    const pb = PLANE_ORDER[b.plane] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.home < b.home ? -1 : a.home > b.home ? 1 : 0;
  });
}

/** audit — здоровье контейнеров и их мастерских. @returns {{healthy, warned, broken, rows}} */
export function auditContainers(repoRoot) {
  const rows = discoverContainers(repoRoot);
  return {
    healthy: rows.filter((r) => r.valid && r.warnings.length === 0).length,
    warned: rows.filter((r) => r.valid && r.warnings.length > 0).length,
    broken: rows.filter((r) => !r.valid).length,
    rows,
  };
}

const DECOMPOSE_BY = {
  family: (c) => c.family,
  plane: (c) => c.plane,
  holder: (c) => c.name,
  kit: (c) => (typeof c.kit === 'string' ? c.kit : 'null'),
};

/** decompose — раскладка контейнеров (значения = `home`). @returns {Map<string,string[]>} */
export function decomposeContainers(containers, by) {
  const keyOf = DECOMPOSE_BY[by] ?? DECOMPOSE_BY.family;
  const out = new Map();
  for (const c of containers) {
    const k = keyOf(c) ?? '—';
    out.set(k, [...(out.get(k) ?? []), c.home]);
  }
  return out;
}

/** inspectElement — один контейнер вглубь (по home или worksOn). */
export function inspectContainer(repoRoot, home) {
  const c = discoverContainers(repoRoot).find((x) => x.worksOn === home || x.home === home);
  return c ?? null;
}

const cell = (v) => String(v ?? '—').replace(/[|\r\n]+/gu, ' ').trim();
const verbMark = (c) => MANDATORY.map((k) => (c.verbs.includes(k) ? k : `~~${k}~~`)).join(' · ');
const roleMark = (c) => (c.role == null ? '—' : c.role);

/**
 * Производный индекс ATLAS.md. Стабильный (без волатильных date/sha), поэтому
 * `--render` байт-идемпотентен, а `--check` — плоское сравнение.
 * Ссылки — от `docs/tooling-atlas/registry/` (3 уровня вглубь) → `../../../<home>`.
 * Якорь строки = **home**, не worksOn.
 */
export function renderAtlasRegistry(containers) {
  const planes = decomposeContainers(containers, 'plane');
  const fams = decomposeContainers(containers, 'family');
  const lines = [];
  lines.push('# ATLAS — контейнеры проекта (производный индекс, руками не править)');
  lines.push('');
  lines.push('> Производный · Source: docs/**/workshop.manifest.json + README.md каждого контейнера.');
  lines.push('> Пересобрать: `yarn tooling:atlas --render`. Дрейф ловит `yarn tooling:atlas --check`.');
  lines.push('> Ссылка = `home` каталога. `docs/tasks` (domain) ≠ `docs/audit/tasks` (report, отчёты про задачи).');
  lines.push('');
  lines.push(`Контейнеров: **${containers.length}** · плоскостей: **${planes.size}** · семей: **${fams.size}** · с полным набором из 3 глаголов: **${containers.filter((c) => c.missingVerbs.length === 0).length}**.`);
  lines.push('');

  for (const plane of ['report', 'domain', 'meta']) {
    const rows = containers.filter((c) => c.plane === plane);
    if (rows.length === 0) continue;
    lines.push(`## ${PLANE_HEADING[plane]}`);
    lines.push('');
    lines.push('| Контейнер (`home`) | role | Мастерская (глаголы) | kit | Про что |');
    lines.push('|--------------------|------|----------------------|-----|---------|');
    for (const c of rows) {
      const flag = c.valid ? '' : ' ✗';
      lines.push(`| [${cell(c.home)}](../../../${c.home}/README.md)${flag} | ${roleMark(c)} | ${verbMark(c)} | ${cell(c.kit)} | ${cell(c.summary).slice(0, 90)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// MDX-безопасно: помимо |\r\n нейтрализуем { } < > — иначе README с `{config}`/`<Tag>`
// в тексте ломает mintlify-билд (JSX-инъекция в .mdx).
const mdxSafe = (v) => cell(v).replace(/[{}<>]/gu, (ch) => ({ '{': '｛', '}': '｝', '<': '‹', '>': '›' }[ch]));

/** Витрина mintlify (.mdx). Группировка по plane; заголовок несёт `home`. */
export function renderMintlifyPage(containers) {
  const lines = [];
  lines.push('---');
  lines.push('title: Контейнеры и мастерские');
  lines.push('description: Общая документация по туллингу — все контейнеры проекта и их мастерские (производный индекс).');
  lines.push('---');
  lines.push('');
  lines.push('{/* Производная страница — генерится `yarn tooling:atlas --render`. Руками не править. */}');
  lines.push('');
  lines.push('Каждый контейнер несёт свою группу и мастерскую (три глагола: осмотр · декомпозиция · рассмотрение). Источник истины — `README.md` и `workshop.manifest.json` каждого контейнера. Ссылка/адрес — **`home`**. `docs/tasks` (задания) ≠ `docs/audit/tasks` (отчёты про задачи).');
  lines.push('');

  for (const plane of ['report', 'domain', 'meta']) {
    const rows = containers.filter((c) => c.plane === plane);
    if (rows.length === 0) continue;
    lines.push(`## ${mdxSafe(PLANE_HEADING[plane])}`);
    lines.push('');
    for (const c of rows) {
      lines.push(`### ${mdxSafe(c.name)} (\`${mdxSafe(c.home)}\`)`);
      lines.push('');
      if (c.summary) lines.push(mdxSafe(c.summary));
      lines.push('');
      lines.push(`- **Плоскость:** ${mdxSafe(c.plane)}`);
      lines.push(`- **role:** ${mdxSafe(roleMark(c))}`);
      lines.push(`- **worksOn:** \`${mdxSafe(c.worksOn)}\``);
      lines.push(`- **Глаголы мастерской:** ${MANDATORY.map((k) => (c.verbs.includes(k) ? `\`${k}\`` : `~~${k}~~`)).join(', ')}`);
      lines.push(`- **kit:** \`${mdxSafe(c.kit)}\``);
      lines.push('');
    }
  }
  return lines.join('\n');
}
