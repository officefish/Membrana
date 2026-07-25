/**
 * Mergeability: GraphQL (gh pr view) иногда протухает (#1028).
 * REST `repos/.../pulls/N` — обязательная перепроверка перед STOP на CONFLICTING/DIRTY
 * или при расхождении head sha.
 */

/** @param {{mergeable?: boolean|null, mergeable_state?: string|null, head?: {sha?: string}}} pull */
export function mapRestPullMergeFields(pull) {
  const mergeable =
    pull.mergeable === true ? 'MERGEABLE' : pull.mergeable === false ? 'CONFLICTING' : 'UNKNOWN';
  const stateKey = String(pull.mergeable_state ?? 'unknown').toLowerCase();
  const stateMap = {
    clean: 'CLEAN',
    dirty: 'DIRTY',
    blocked: 'BLOCKED',
    behind: 'BEHIND',
    unstable: 'UNSTABLE',
    draft: 'DRAFT',
    unknown: 'UNKNOWN',
  };
  return {
    mergeable,
    mergeStateStatus: stateMap[stateKey] ?? 'UNKNOWN',
    headRefOid: pull.head?.sha ?? null,
    mergeabilitySource: 'rest',
  };
}

/** @param {{mergeable?: string|null, mergeStateStatus?: string|null}} snap */
export function isMergeBlocked(snap = {}) {
  const mergeable = String(snap.mergeable ?? '').toUpperCase();
  const state = String(snap.mergeStateStatus ?? '').toUpperCase();
  return mergeable === 'CONFLICTING' || state === 'DIRTY';
}

/**
 * @param {{headRefOid?: string|null}} graphqlSnap
 * @param {{headRefOid?: string|null}|null} restSnap
 */
export function needsRestMergeRecheck(graphqlSnap, restSnap) {
  if (!restSnap) return false;
  if (isMergeBlocked(graphqlSnap)) return true;
  const gHead = String(graphqlSnap.headRefOid ?? '').toLowerCase();
  const rHead = String(restSnap.headRefOid ?? '').toLowerCase();
  return Boolean(gHead && rHead && gHead !== rHead);
}

/**
 * @param {Record<string, unknown>} graphqlSnap
 * @param {Record<string, unknown>|null} restSnap
 */
export function reconcileMergeability(graphqlSnap, restSnap) {
  if (!restSnap || !needsRestMergeRecheck(graphqlSnap, restSnap)) {
    return { ...graphqlSnap, mergeabilitySource: graphqlSnap.mergeabilitySource ?? 'graphql' };
  }
  return {
    ...graphqlSnap,
    mergeable: restSnap.mergeable ?? graphqlSnap.mergeable,
    mergeStateStatus: restSnap.mergeStateStatus ?? graphqlSnap.mergeStateStatus,
    headRefOid: restSnap.headRefOid ?? graphqlSnap.headRefOid,
    mergeabilitySource: 'rest-recheck',
    graphqlStale: {
      mergeable: graphqlSnap.mergeable,
      mergeStateStatus: graphqlSnap.mergeStateStatus,
      headRefOid: graphqlSnap.headRefOid,
    },
  };
}

/**
 * @param {typeof import('node:child_process').execFileSync} run
 * @param {string} repoSlug owner/repo
 * @param {number|string} prNumber
 */
export function fetchRestPullMergeFields(run, repoSlug, prNumber) {
  if (!repoSlug || prNumber == null || prNumber === '') return null;
  try {
    const raw = run('gh', ['api', `repos/${repoSlug}/pulls/${prNumber}`], { encoding: 'utf8' });
    return mapRestPullMergeFields(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * @param {typeof import('node:child_process').execFileSync} run
 */
export function resolveRepoSlug(run) {
  try {
    const raw = run('gh', ['repo', 'view', '--json', 'nameWithOwner'], { encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    return parsed.nameWithOwner ?? null;
  } catch {
    return null;
  }
}

/**
 * GraphQL снимок + REST перепроверка при протухании.
 *
 * @param {typeof import('node:child_process').execFileSync} run
 * @param {number|string|null} [prNumber]
 */
export function readMergeabilityWithRestRecheck(run, prNumber = null) {
  const ref = prNumber != null && prNumber !== '' ? String(prNumber) : null;
  const viewArgs = ref
    ? ['pr', 'view', ref, '--json', 'number,mergeable,mergeStateStatus,headRefName,headRefOid']
    : ['pr', 'view', '--json', 'number,mergeable,mergeStateStatus,headRefName,headRefOid'];
  const raw = run('gh', viewArgs, { encoding: 'utf8' });
  const parsed = JSON.parse(raw);
  const graphqlSnap = {
    number: parsed.number ?? null,
    mergeable: parsed.mergeable ?? null,
    mergeStateStatus: parsed.mergeStateStatus ?? null,
    headRefOid: parsed.headRefOid ?? null,
    branch: parsed.headRefName ?? null,
    mergeabilitySource: 'graphql',
  };
  const repoSlug = resolveRepoSlug(run);
  const restSnap = fetchRestPullMergeFields(run, repoSlug, graphqlSnap.number ?? prNumber);
  return reconcileMergeability(graphqlSnap, restSnap);
}
