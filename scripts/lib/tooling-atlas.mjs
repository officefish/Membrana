/**
 * tooling-atlas — агрегатор контейнера контейнеров (спринт tooling-atlas).
 *
 * Контейнер контейнеров: его элементы — сами дома с мастерскими. Атлас НЕ хранит
 * описаний, а собирает производный индекс из README + workshop.manifest каждого
 * контейнера. Источник истины остаётся в контейнерах; ATLAS.md и mintlify-страница —
 * производные (руками не правятся, дрейф ловит --check).
 *
 * Канон: docs/tooling-atlas/README.md · паттерны GROUP_CONTAINERIZATION + HOME_WORKSHOP.
 * Операции — чтение, идемпотентны.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { listWorkshopManifests, validateWorkshop } from './validate-workshop.mjs';

const MANDATORY = ['audit', 'decompose', 'inspectElement'];

/** Выжимка README: H1 + первый непустой не-заголовочный абзац. */
function readmeDigest(readmePath) {
  if (!existsSync(readmePath)) return { title: null, summary: null };
  const lines = readFileSync(readmePath, 'utf8').split(/\r?\n/u);
  let title = null;
  let summary = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!title && line.startsWith('# ')) { title = line.slice(2).trim(); continue; }
    if (title && !summary && line !== '' && !line.startsWith('#') && !line.startsWith('>')) {
      summary = line;
      break;
    }
  }
  return { title, summary };
}

/** Семья контейнера по пути дома. */
function familyOf(worksOn) {
  if (worksOn.startsWith('docs/audit/')) return 'audit-family';
  if (worksOn === 'docs/tooling-atlas') return 'meta';
  return 'domain';
}

/**
 * Обнаружить контейнеры: каждый workshop.manifest.json = контейнер.
 * @param {string} repoRoot
 * @returns {{worksOn, home, name, kit, verbs, missingVerbs, title, summary, family, valid, warnings, problems}[]}
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
    const worksOn = typeof manifest?.worksOn === 'string' ? manifest.worksOn : relative(repoRoot, dir).replace(/\\/gu, '/');
    const { title, summary } = readmeDigest(join(dir, 'README.md'));
    out.push({
      worksOn,
      home: relative(repoRoot, dir).replace(/\\/gu, '/'),
      name: manifest?.name ?? '—',
      kit: manifest?.kit ?? null,
      verbs: present,
      missingVerbs,
      title,
      summary,
      family: familyOf(worksOn),
      valid: v.valid,
      warnings: v.warnings,
      problems: v.problems,
    });
  }
  return out.sort((a, b) => (a.worksOn < b.worksOn ? -1 : a.worksOn > b.worksOn ? 1 : 0));
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
  holder: (c) => c.name,
  kit: (c) => (typeof c.kit === 'string' ? c.kit : 'null'),
};

/** decompose — раскладка контейнеров. @returns {Map<string,string[]>} */
export function decomposeContainers(containers, by) {
  const keyOf = DECOMPOSE_BY[by] ?? DECOMPOSE_BY.family;
  const out = new Map();
  for (const c of containers) {
    const k = keyOf(c) ?? '—';
    out.set(k, [...(out.get(k) ?? []), c.worksOn]);
  }
  return out;
}

/** inspectElement — один контейнер вглубь. */
export function inspectContainer(repoRoot, home) {
  const c = discoverContainers(repoRoot).find((x) => x.worksOn === home || x.home === home);
  return c ?? null;
}

const cell = (v) => String(v ?? '—').replace(/[|\r\n]+/gu, ' ').trim();
const verbMark = (c) => MANDATORY.map((k) => (c.verbs.includes(k) ? k : `~~${k}~~`)).join(' · ');

/** Производный индекс ATLAS.md (дата/sha приходят извне — ядро чистое). */
export function renderAtlasRegistry(containers, { date, sha } = {}) {
  const fams = decomposeContainers(containers, 'family');
  const lines = [];
  lines.push('# ATLAS — контейнеры проекта (производный индекс, руками не править)');
  lines.push('');
  lines.push(`> Meta · Date: ${date ?? '—'} · SHA: ${sha ?? '—'} · Source: docs/**/workshop.manifest.json + README.md`);
  lines.push('> Пересобрать: `yarn tooling:atlas --render`. Источник истины — README + манифест каждого контейнера.');
  lines.push('');
  lines.push(`Контейнеров: **${containers.length}** · семей: **${fams.size}** · с полным набором из 3 глаголов: **${containers.filter((c) => c.missingVerbs.length === 0).length}**.`);
  lines.push('');
  lines.push('| Контейнер | Семья | Мастерская (глаголы) | kit | Про что |');
  lines.push('|-----------|-------|----------------------|-----|---------|');
  for (const c of containers) {
    const flag = c.valid ? '' : ' ✗';
    lines.push(`| [${cell(c.worksOn)}](../../${c.home}/README.md)${flag} | ${cell(c.family)} | ${verbMark(c)} | ${cell(c.kit)} | ${cell(c.summary).slice(0, 90)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Витрина mintlify (.mdx). */
export function renderMintlifyPage(containers) {
  const lines = [];
  lines.push('---');
  lines.push('title: Контейнеры и мастерские');
  lines.push('description: Общая документация по туллингу — все контейнеры проекта и их мастерские (производный индекс).');
  lines.push('---');
  lines.push('');
  lines.push('{/* Производная страница — генерится `yarn tooling:atlas --render`. Руками не править. */}');
  lines.push('');
  lines.push('Каждый контейнер несёт свою группу и мастерскую (три глагола: осмотр · декомпозиция · рассмотрение). Источник истины — `README.md` и `workshop.manifest.json` каждого контейнера.');
  lines.push('');
  for (const c of containers) {
    lines.push(`## ${cell(c.name)} (\`${cell(c.worksOn)}\`)`);
    lines.push('');
    if (c.summary) lines.push(cell(c.summary));
    lines.push('');
    lines.push(`- **Семья:** ${cell(c.family)}`);
    lines.push(`- **Глаголы мастерской:** ${MANDATORY.map((k) => (c.verbs.includes(k) ? `\`${k}\`` : `~~${k}~~`)).join(', ')}`);
    lines.push(`- **kit:** \`${cell(c.kit)}\``);
    lines.push('');
  }
  return lines.join('\n');
}
