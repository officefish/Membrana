/**
 * worktree-demolition — фреймы контролируемого сноса worktree (ADR-0020).
 *
 * Здесь только чистый контракт процедуры: какие кадры обязаны быть у одного
 * сноса и как сравнивать снимки живых деревьев между кадрами. I/O остаётся в
 * scripts/repo-clean.mjs.
 */
import { resolve } from 'node:path';

import { newDeletions } from './junction-safety.mjs';

export const DEMOLITION_FRAMES = Object.freeze([
  {
    id: 'snapshot-live-trees',
    title: 'снимок всех живых деревьев',
  },
  {
    id: 'neutralize-outbound-links',
    title: 'скан и снятие связей наружу',
  },
  {
    id: 'git-worktree-remove',
    title: 'снятие дерева с учёта git',
  },
  {
    id: 'assert-target-absent',
    title: 'проверка, что каталог ушёл',
  },
  {
    id: 'postcheck-live-trees',
    title: 'пост-чек всех живых деревьев',
  },
  {
    id: 'allow-next-tree',
    title: 'разрешение следующего сноса',
  },
]);

const FRAME_BY_ID = new Map(DEMOLITION_FRAMES.map((frame, index) => [frame.id, { ...frame, index }]));

export function normalizeWorktreePath(path) {
  return resolve(String(path)).toLowerCase();
}

export function frameLine(frameId, { index, total, path, detail } = {}) {
  const frame = FRAME_BY_ID.get(frameId);
  if (!frame) throw new Error(`unknown demolition frame: ${frameId}`);
  const ordinal = `${frame.index + 1}/${DEMOLITION_FRAMES.length}`;
  const scope = typeof index === 'number' && typeof total === 'number' ? ` дерево ${index}/${total}` : '';
  const tail = detail ? ` — ${detail}` : '';
  return `  frame ${ordinal}${scope}: ${frame.title}${path ? ` · ${path}` : ''}${tail}`;
}

export function snapshotFindings(snapshot) {
  const findings = [];
  for (const row of snapshot ?? []) {
    if (row.state === 'ok') continue;
    findings.push({
      type: row.state === 'missing' ? 'live-tree-missing' : 'status-error',
      path: row.path,
      message: row.error ?? row.state,
    });
  }
  return findings;
}

export function analyzeLiveTreePostCheck(beforeSnapshot, afterSnapshot) {
  const afterByPath = new Map();
  for (const row of afterSnapshot ?? []) afterByPath.set(normalizeWorktreePath(row.path), row);

  const findings = [...snapshotFindings(afterSnapshot)];
  for (const before of beforeSnapshot ?? []) {
    if (before.state !== 'ok') continue;
    const after = afterByPath.get(normalizeWorktreePath(before.path));
    if (!after) {
      findings.push({
        type: 'live-tree-missing',
        path: before.path,
        message: 'дерево было живым до сноса, но отсутствует в пост-чеке',
      });
      continue;
    }
    if (after.state !== 'ok') continue;
    const lost = newDeletions(before.porcelain, after.porcelain);
    if (lost.length > 0) {
      findings.push({
        type: 'new-deletions',
        path: before.path,
        deletions: lost,
        message: `${lost.length} новых удалений`,
      });
    }
  }
  return findings;
}

export function formatPostCheckFinding(finding) {
  if (finding.type === 'new-deletions') {
    const sample = finding.deletions.slice(0, 3).join(', ');
    const suffix = finding.deletions.length > 3 ? '…' : '';
    return `${finding.path}: ${finding.deletions.length} новых удалений (${sample}${suffix})`;
  }
  return `${finding.path}: ${finding.message}`;
}
