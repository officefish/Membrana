import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  LIFECYCLE_SCHEMA_VERSION,
  replayInsightLifecycle,
} from './insight-lifecycle.mjs';

export const LIFECYCLE_DIR = 'docs/insights/_lifecycle';

/** Canonical JSON used for persisted files and digest tokens. */
export function canonicalJson(value, pretty = false) {
  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.keys(item).sort().map((key) => [key, normalize(item[key])]),
      );
    }
    return item;
  };
  return JSON.stringify(normalize(value), null, pretty ? 2 : 0);
}

/** @param {string|Buffer} value */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {unknown} value */
export function digestJson(value) {
  return sha256(canonicalJson(value));
}

/** @param {string} repoRoot */
export function lifecyclePaths(repoRoot) {
  const root = resolve(repoRoot);
  const lifecycleDir = join(root, LIFECYCLE_DIR);
  return {
    repoRoot: root,
    lifecycleDir,
    baseContext: join(lifecycleDir, 'base-context.json'),
    eventLog: join(lifecycleDir, 'event-log.jsonl'),
    currentView: join(lifecycleDir, 'views', 'current.json'),
  };
}

/** @param {string} repoRoot */
export function commonGitDir(repoRoot) {
  const raw = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: resolve(repoRoot),
    encoding: 'utf8',
  }).trim();
  return resolve(repoRoot, raw);
}

/** @param {string} repoRoot */
export function sharedLifecyclePaths(repoRoot) {
  const common = commonGitDir(repoRoot);
  const shared = join(common, 'membrana-insight-lifecycle');
  return {
    commonGitDir: common,
    shared,
    lock: join(shared, 'lock.json'),
    journals: join(shared, 'journal'),
    ledger: join(shared, 'idempotency.json'),
  };
}

export function emptyBaseContext() {
  return {
    contextId: 'insight-lifecycle-empty-v1',
    schemaVersion: LIFECYCLE_SCHEMA_VERSION,
    insightRevisions: [],
    mandates: [],
    slices: [],
    representations: [],
    transcriptionRelations: [],
  };
}

/** @param {string} path @param {unknown} fallback */
function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

/** @param {string} repoRoot */
export function loadLifecycleStore(repoRoot) {
  const paths = lifecyclePaths(repoRoot);
  const baseContext = readJson(paths.baseContext, emptyBaseContext());
  const eventLog = existsSync(paths.eventLog)
    ? readFileSync(paths.eventLog, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    : [];
  const projection = existsSync(paths.currentView)
    ? readJson(paths.currentView, null)
    : null;
  return { paths, baseContext, eventLog, projection };
}

/** @param {Record<string,unknown>} baseContext @param {Record<string,unknown>[]} eventLog */
export function rebuildProjection(baseContext, eventLog) {
  const replay = replayInsightLifecycle(baseContext, eventLog);
  if (!replay.ok) {
    const error = new Error(replay.error.message);
    error.code = 'REPLAY_ERROR';
    error.details = replay.error;
    throw error;
  }
  return {
    schemaVersion: LIFECYCLE_SCHEMA_VERSION,
    generation: {
      contextId: baseContext.contextId,
      baseContextDigest: digestJson(baseContext),
      eventLogDigest: digestJson(eventLog),
      tailSeq: eventLog.at(-1)?.seq ?? 0,
    },
    currentAssessments: replay.state.currentAssessments,
    assertionHistory: replay.state.assertions,
    supersedes: replay.state.supersedes,
    reopens: replay.state.reopens,
  };
}

/** @param {string} path @param {string} content */
export function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temp, content, 'utf8');
  renameSync(temp, path);
}

/** @param {string} repoRoot @param {Record<string,unknown>} baseContext @param {Record<string,unknown>[]} eventLog */
export function saveLifecycleStore(repoRoot, baseContext, eventLog) {
  const paths = lifecyclePaths(repoRoot);
  const projection = rebuildProjection(baseContext, eventLog);
  atomicWrite(paths.baseContext, `${canonicalJson(baseContext, true)}\n`);
  atomicWrite(
    paths.eventLog,
    eventLog.map((event) => canonicalJson(event)).join('\n') + (eventLog.length ? '\n' : ''),
  );
  atomicWrite(paths.currentView, `${canonicalJson(projection, true)}\n`);
  return { paths, projection };
}

/** @param {string} path */
export function fileDigest(path) {
  return existsSync(path) ? sha256(readFileSync(path)) : 'ABSENT';
}
