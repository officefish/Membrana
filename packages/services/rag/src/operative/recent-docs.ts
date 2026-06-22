import { execFile } from 'node:child_process';
import { access, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { glob } from 'glob';

import {
  classifyOperativePath,
  isOperativeCandidatePath,
  isOperativeP1Path,
  isWithinOperativeWindow,
  normalizeRepoPath,
  operativeP1GlobPatterns,
  operativeStaticPaths,
  parseDateFromArchivePath,
  type OperativePriority,
} from './path-filters.js';

const execFileAsync = promisify(execFile);

export interface DocRef {
  relativePath: string;
  absolutePath: string;
  mtimeMs: number;
  priority: OperativePriority;
  modifiedAt: Date;
}

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function buildDocRef(
  repoRoot: string,
  relativePath: string,
  priority: OperativePriority,
  modifiedAt: Date,
): Promise<DocRef | null> {
  const normalized = normalizeRepoPath(relativePath);
  const absolutePath = resolve(repoRoot, normalized);
  if (!(await fileExists(absolutePath))) {
    return null;
  }
  const fileStat = await stat(absolutePath);
  if (!fileStat.isFile()) {
    return null;
  }
  return {
    relativePath: normalized,
    absolutePath,
    mtimeMs: fileStat.mtimeMs,
    priority,
    modifiedAt,
  };
}

async function gitChangedPaths(repoRoot: string, days: number): Promise<Map<string, Date>> {
  const result = new Map<string, Date>();
  try {
    const { stdout } = await execFileAsync(
      'git',
      [
        'log',
        `--since=${days} days ago`,
        '--pretty=format:%cI',
        '--name-only',
        '--',
        'docs/',
        '*.md',
        'AGENTS.md',
        '.cursorrules',
      ],
      { cwd: repoRoot, maxBuffer: 16 * 1024 * 1024 },
    );

    let currentDate: Date | null = null;
    for (const rawLine of stdout.split('\n')) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      if (line.includes('T') && line.endsWith('Z')) {
        const parsed = new Date(line);
        if (!Number.isNaN(parsed.getTime())) {
          currentDate = parsed;
        }
        continue;
      }
      const normalized = normalizeRepoPath(line);
      if (!isOperativeCandidatePath(normalized)) {
        continue;
      }
      if (!result.has(normalized)) {
        result.set(normalized, currentDate ?? new Date());
      }
    }
  } catch {
    // Not a git repo or git unavailable — mtime fallback only.
  }
  return result;
}

function pickHigherPriority(
  current: OperativePriority | undefined,
  next: OperativePriority,
): OperativePriority {
  const order: OperativePriority[] = ['P3', 'P2', 'P1', 'P0'];
  if (!current) {
    return next;
  }
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function resolveModifiedAt(
  relativePath: string,
  mtimeMs: number,
  gitDate: Date | undefined,
  now: Date,
): Date {
  if (gitDate) {
    return gitDate;
  }
  const archiveDate = parseDateFromArchivePath(relativePath);
  if (archiveDate) {
    return archiveDate;
  }
  return new Date(mtimeMs || now.getTime());
}

function includeP1Doc(relativePath: string, days: number, mtimeMs: number, now: Date): boolean {
  const archiveDate = parseDateFromArchivePath(relativePath);
  if (archiveDate) {
    return isWithinOperativeWindow(archiveDate, days, now);
  }
  return isWithinOperativeWindow(new Date(mtimeMs), days, now);
}

/**
 * Collect operative document refs for the last `days` (git recency + path tiers).
 */
export async function getRecentDocs(repoRoot: string, days: number): Promise<DocRef[]> {
  const root = resolve(repoRoot);
  const now = new Date();
  const gitDates = await gitChangedPaths(root, days);
  const byPath = new Map<string, { priority: OperativePriority; modifiedAt: Date }>();

  for (const relativePath of operativeStaticPaths()) {
    const priority = classifyOperativePath(relativePath);
    if (!priority) {
      continue;
    }
    const absolutePath = resolve(root, relativePath);
    if (!(await fileExists(absolutePath))) {
      continue;
    }
    const fileStat = await stat(absolutePath);
    const modifiedAt = resolveModifiedAt(
      relativePath,
      fileStat.mtimeMs,
      gitDates.get(relativePath),
      now,
    );
    byPath.set(relativePath, { priority, modifiedAt });
  }

  for (const pattern of operativeP1GlobPatterns()) {
    const matches = await glob(pattern, {
      cwd: root,
      nodir: true,
      posix: true,
    });
    for (const match of matches) {
      const relativePath = normalizeRepoPath(match);
      const absolutePath = resolve(root, relativePath);
      const fileStat = await stat(absolutePath);
      if (!includeP1Doc(relativePath, days, fileStat.mtimeMs, now)) {
        continue;
      }
      const modifiedAt = resolveModifiedAt(
        relativePath,
        fileStat.mtimeMs,
        gitDates.get(relativePath),
        now,
      );
      const existing = byPath.get(relativePath);
      byPath.set(relativePath, {
        priority: pickHigherPriority(existing?.priority, 'P1'),
        modifiedAt: existing?.modifiedAt ?? modifiedAt,
      });
    }
  }

  for (const [relativePath, gitDate] of gitDates) {
    const priority = classifyOperativePath(relativePath);
    if (!priority) {
      continue;
    }
    if (isOperativeP1Path(relativePath)) {
      continue;
    }
    const existing = byPath.get(relativePath);
    byPath.set(relativePath, {
      priority: pickHigherPriority(existing?.priority, priority),
      modifiedAt: existing?.modifiedAt ?? gitDate,
    });
  }

  const refs: DocRef[] = [];
  for (const [relativePath, meta] of byPath) {
    if (meta.priority === 'P3' && !isWithinOperativeWindow(meta.modifiedAt, days, now)) {
      continue;
    }
    const ref = await buildDocRef(root, relativePath, meta.priority, meta.modifiedAt);
    if (ref) {
      refs.push(ref);
    }
  }

  return refs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}
