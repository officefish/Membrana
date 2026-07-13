/**
 * Дрейф-секция утреннего ритуала (DA5): read-only сводка последнего
 * MorningDriftDigest (`docs/reports/drift-anchor/DRIFT_<date>.json`, пишет DA3-раннер)
 * для plan:day / standup.
 *
 * Детерминированный рендер, БЕЗ LLM: вердикты уже вынесены чистой computeDrift;
 * reasoning-строки помечаются бейджем «гипотеза» (консилиум nightly-agents-platform).
 * Graceful: нет каталога / нет файлов / битый JSON → null, ритуал не падает.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const DRIFT_REPORTS_REL = 'docs/reports/drift-anchor';

const DRIFT_FILE_RE = /^DRIFT_\d{4}-\d{2}-\d{2}\.json$/;

/** Последний по дате файл дайджеста (сортировка по имени = по дате). null если нет. */
export function findLatestDriftReport(dir) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    return null;
  }
  const dated = files.filter((f) => DRIFT_FILE_RE.test(f)).sort();
  return dated.length > 0 ? join(dir, dated[dated.length - 1]) : null;
}

/** Иконка вердикта — иконка+текст, не только цвет (консилиум, a11y). */
function verdictMark(verdict) {
  return verdict === 'broken' ? '⛔ broken' : verdict === 'drift' ? '⚠️ drift' : '✅ ok';
}

/**
 * Чистый рендер компактной markdown-секции из MorningDriftDigest.
 * Все ok → одна строка сводки; не-ok якоря — списком с baseline→current.
 */
export function renderDriftSection(digest, sourceName) {
  const s = digest?.summary;
  const anchors = Array.isArray(digest?.anchors) ? digest.anchors : [];
  if (!s || typeof s.ok !== 'number') return null;

  const lines = [
    `## 🧭 Дрейф-якоря (read-only, ${sourceName})`,
    '',
    `Сводка: ok ${s.ok} · drift ${s.drift} · broken ${s.broken} — снимок ${digest.generatedAt ?? '?'}.`,
  ];

  const bad = anchors.filter((a) => a.verdict !== 'ok');
  if (bad.length === 0) {
    lines.push('', 'Все якоря в норме. Вердикты вынесены чистой `computeDrift`, не LLM.');
  } else {
    lines.push('');
    for (const a of bad) {
      const hypothesis = a.reasoning ? ` — гипотеза: ${a.reasoning}` : '';
      lines.push(
        `- ${verdictMark(a.verdict)} \`${a.id}\`: baseline=${a.baseline} → current=${a.current} (Δ=${a.delta})${hypothesis}`,
      );
    }
    lines.push(
      '',
      'Вердикты — чистая `computeDrift`; строки «гипотеза» — LLM-аннотация, вердикт не меняет.',
      'broken по поведенческому якорю → проверить `yarn drift:run` и baseline (`docs/anchors/`).',
    );
  }
  return lines.join('\n');
}

/** Секция с диска: последний DRIFT_*.json от корня репо. Graceful → null. */
export function buildDriftSectionFromDisk(rootDir) {
  const latest = findLatestDriftReport(join(rootDir, DRIFT_REPORTS_REL));
  if (!latest) return null;
  try {
    const digest = JSON.parse(readFileSync(latest, 'utf8').replace(/^﻿/, ''));
    return renderDriftSection(digest, basename(latest));
  } catch {
    return null;
  }
}
