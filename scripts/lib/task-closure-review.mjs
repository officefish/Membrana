import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { validateTaskId } from './task-registry.mjs';

export const REVIEW_ROOT_REL = 'docs/reviews';
export const REVIEW_STATES = [
  'implementation_ready',
  'published',
  'review_pending',
  'blocked',
  'needs_fix',
  'lgtm',
  'merged',
  'accepted_branch_only',
  'archived',
];

const SHA_RE = /^[0-9a-f]{40}$/;
const T2_PREFIXES = [
  'packages/core/',
  'packages/services/rag/',
  'packages/audio-engine/',
  'packages/services/audio-engine/',
  'packages/device-board/src/runtime/',
  'packages/background-office/src/auth/',
];

export function manifestPath(taskId, cwd = process.cwd()) {
  validateTaskId(taskId);
  return resolve(cwd, REVIEW_ROOT_REL, taskId, 'manifest.json');
}

export function reviewArtifactPath(taskId, sha) {
  validateTaskId(taskId);
  if (!SHA_RE.test(sha)) throw new Error(`Некорректный commit SHA: ${sha}`);
  return `${REVIEW_ROOT_REL}/${taskId}/${sha}-review.md`;
}

export function loadReviewManifest(taskId, cwd = process.cwd()) {
  const path = manifestPath(taskId, cwd);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function saveReviewManifest(manifest, cwd = process.cwd()) {
  validateReviewManifest(manifest);
  const path = manifestPath(manifest.taskId, cwd);
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  renameSync(temp, path);
  return path;
}

export function packageFromPath(file) {
  const parts = file.replaceAll('\\', '/').split('/');
  if (parts[0] === 'apps' && parts[1]) return `apps/${parts[1]}`;
  if (parts[0] !== 'packages' || !parts[1]) return null;
  if (parts[1] === 'services') {
    return parts.length >= 4 && parts[2] ? `packages/services/${parts[2]}` : null;
  }
  return `packages/${parts[1]}`;
}

export function detectReviewTier(files) {
  const normalized = files.map((file) => file.replaceAll('\\', '/'));
  if (normalized.length > 0 && normalized.every((file) => file.startsWith('docs/'))) {
    return 'T0';
  }
  const packages = new Set(normalized.map(packageFromPath).filter(Boolean));
  if (
    packages.size >= 2 ||
    normalized.some((file) => T2_PREFIXES.some((prefix) => file.startsWith(prefix))) ||
    normalized.some((file) => file === 'docs/tasks/registry.json')
  ) {
    return 'T2';
  }
  return 'T1';
}

export function validateReviewManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('Manifest должен быть object');
  validateTaskId(manifest.taskId);
  if (manifest.schemaVersion !== 1) throw new Error('schemaVersion должен быть 1');
  if (!REVIEW_STATES.includes(manifest.state)) throw new Error(`Некорректный state: ${manifest.state}`);
  if (!['T0', 'T1', 'T2'].includes(manifest.tier)) throw new Error(`Некорректный tier: ${manifest.tier}`);
  if (!SHA_RE.test(manifest.currentCommitSha)) throw new Error('currentCommitSha должен быть full SHA');
  if (!['pending', 'LGTM', 'BLOCK'].includes(manifest.verdict)) throw new Error('Некорректный verdict');

  const approvedStates = ['lgtm', 'merged', 'accepted_branch_only', 'archived'];
  if (approvedStates.includes(manifest.state)) {
    if (manifest.verdict !== 'LGTM') throw new Error(`${manifest.state} требует LGTM`);
    if (manifest.reviewedCommitSha !== manifest.currentCommitSha) {
      throw new Error('LGTM устарел: reviewedCommitSha не совпадает с currentCommitSha');
    }
    if (!manifest.reviewArtifact) throw new Error(`${manifest.state} требует reviewArtifact`);
    if (manifest.evidence.hasUnresolvedP0P1) throw new Error(`${manifest.state} запрещён при P0/P1`);
  }
  if (['blocked', 'needs_fix'].includes(manifest.state) && manifest.verdict !== 'BLOCK') {
    throw new Error(`${manifest.state} требует BLOCK`);
  }
  if (manifest.state === 'merged' && manifest.completion?.mode !== 'merged') {
    throw new Error('merged требует completion.mode=merged');
  }
  if (
    manifest.state === 'accepted_branch_only' &&
    manifest.completion?.mode !== 'accepted_branch_only'
  ) {
    throw new Error('accepted_branch_only требует matching completion.mode');
  }
  if (
    ['merged', 'accepted_branch_only', 'archived'].includes(manifest.state) &&
    !(typeof manifest.completion?.evidence === 'string' && manifest.completion.evidence.trim())
  ) {
    throw new Error(`${manifest.state} требует completion evidence`);
  }
  return manifest;
}

export function prepareReviewManifest({
  task,
  currentCommitSha,
  branch,
  baseRef,
  files,
  pullRequest = null,
  githubRemoteState = 'unknown',
  githubUrl = null,
  existing = null,
  now = new Date().toISOString(),
}) {
  if (!task || task.status !== 'active') throw new Error('Closure review требует active task');
  if (!SHA_RE.test(currentCommitSha)) throw new Error('prepare требует full commit SHA');
  const normalizedFiles = [...new Set(files.map((file) => file.replaceAll('\\', '/')))];
  if (normalizedFiles.length === 0) throw new Error('Review scope пуст');
  const packages = [...new Set(normalizedFiles.map(packageFromPath).filter(Boolean))];
  const sameSha = existing?.currentCommitSha === currentCommitSha;
  const sameScope =
    sameSha &&
    existing?.scope?.baseRef === baseRef &&
    JSON.stringify(existing?.scope?.files ?? []) === JSON.stringify(normalizedFiles);
  const keepVerdict = sameScope && existing?.verdict !== undefined;

  const manifest = {
    schemaVersion: 1,
    taskId: task.id,
    state: keepVerdict ? existing.state : 'review_pending',
    tier: detectReviewTier(normalizedFiles),
    reviewMode: detectReviewTier(normalizedFiles) === 'T0' ? 'concise-t0' : 'standard',
    branch,
    currentCommitSha,
    reviewedCommitSha: keepVerdict ? existing.reviewedCommitSha : null,
    verdict: keepVerdict ? existing.verdict : 'pending',
    reviewArtifact: keepVerdict ? existing.reviewArtifact : null,
    github: {
      issue: task.githubIssue ?? null,
      pullRequest,
      remoteState: githubRemoteState,
      url: githubUrl,
    },
    scope: { baseRef, files: normalizedFiles, packages },
    evidence: keepVerdict
      ? existing.evidence
      : { hasUnresolvedP0P1: false, checks: [] },
    reviewersStatus: keepVerdict
      ? existing.reviewersStatus
      : { vesnin: 'pending', ozhegov: 'pending' },
    completion: keepVerdict
      ? existing.completion
      : { mode: 'pending', evidence: null },
    createdAt: existing?.createdAt ?? now,
    updatedAt: sameScope ? existing.updatedAt : now,
  };
  return validateReviewManifest(manifest);
}

export function reviewStatus(manifest, actualCommitSha) {
  validateReviewManifest(manifest);
  const stale = actualCommitSha !== undefined && manifest.currentCommitSha !== actualCommitSha;
  return {
    taskId: manifest.taskId,
    state: stale ? 'implementation_ready' : manifest.state,
    tier: manifest.tier,
    verdict: stale ? 'pending' : manifest.verdict,
    commitSha: manifest.currentCommitSha,
    stale,
    readyForReview: !stale && manifest.state === 'review_pending',
    readyForFinalize: !stale && manifest.state === 'lgtm',
  };
}

export function buildTaskClosureReviewPrompt({
  manifest,
  task,
  taskPrompt,
  regulation,
  teamleadPrompt,
  diff,
}) {
  validateReviewManifest(manifest);
  if (diff.length > 80_000) {
    throw new Error('Exact diff слишком велик для closure review; раздели scope или PR');
  }
  return [
    teamleadPrompt,
    '',
    '---',
    '## Closure regulation',
    regulation,
    '',
    '---',
    '## Task registry entry',
    '```json',
    JSON.stringify(task, null, 2),
    '```',
    '',
    '## Review manifest',
    '```json',
    JSON.stringify(manifest, null, 2),
    '```',
    '',
    '## Task prompt',
    taskPrompt,
    '',
    '## Exact commit diff',
    '```diff',
    diff,
    '```',
    '',
    `Review only task ${manifest.taskId} at commit ${manifest.currentCommitSha}.`,
    `Output contract: строка "Tier:" обязана быть ровно "${manifest.tier}" — tier уже вычислен правилами манифеста (multi-package/T2-префиксы), НЕ пересчитывай его по размеру диффа.`,
  ].join('\n');
}

/**
 * Есть ли блокеры в строке `P0/P1:` (контракт: нумерованный список или «—»).
 *
 * Решает ПЕРВЫЙ токен строки, а не наличие слова «P1» где-то в прозе: ревью
 * «P0/P1: нет (P1 из OP5 закрыт)» — это LGTM, а раньше давало ложный BLOCK и
 * лишний цикл closure (живой случай 2026-07-14, ретро #485 п.4).
 *
 * Fail-closed: всё, что не начинается с явного отрицания, считается блокером —
 * пропустить настоящий P0 в LGTM хуже, чем переспросить формулировку.
 *
 * @param {string} p0p1Line — содержимое строки после «P0/P1:»
 */
export function hasP0P1Blockers(p0p1Line) {
  const line = String(p0p1Line ?? '').trim();
  if (!line) return false;

  // Тире засчитывается ТОЛЬКО одиноко: «- гонка в сторе» — это markdown-пункт с
  // настоящим блокером, а не отрицание. Иначе гард стал бы fail-open и пропустил
  // бы P0 в LGTM — хуже исходного бага.
  if (/^[—–-]$/u.test(line)) return false;

  // Словесное отрицание может нести пояснение: «нет (P1 из ревью OP5 закрыт)».
  // Без `\b`: в JS он определён по ASCII, после кириллического «нет» границы слова
  // нет вовсе. Лукахед «дальше не буква и не цифра» работает и для «нет», и для «none».
  return !/^(?:none|нет|no|n\/a|н\/д|отсутствуют|не выявлено|не найдено)(?![\p{L}\p{N}])/iu.test(line);
}

export function parseTeamleadReview(body, expectedTaskId, expectedCommitSha, expectedTier) {
  const tier = body.match(/^Tier:\s*(T0|T1|T2)\s*$/mu)?.[1];
  const task = body.match(/^Task:\s*(\S+)\s*$/mu)?.[1];
  const commit = body.match(/^Commit:\s*([0-9a-f]{40})\s*$/mu)?.[1];
  const verdict = body.match(/^Verdict:\s*(LGTM|BLOCK)\s*$/mu)?.[1];
  const readiness = body.match(/^Closure readiness:\s*(ready|waiting_merge|needs_fix)\s*$/mu)?.[1];
  const p0p1 = body.match(/^P0\/P1:\s*(.+)\s*$/mu)?.[1]?.trim();
  if (!tier || !task || !commit || !verdict || !readiness || !p0p1) {
    throw new Error('Review не соответствует output contract');
  }
  if (task !== expectedTaskId) throw new Error(`Review task mismatch: ${task}`);
  if (commit !== expectedCommitSha) throw new Error(`Review SHA mismatch: ${commit}`);
  if (expectedTier && tier !== expectedTier) throw new Error(`Review tier mismatch: ${tier}`);
  const hasBlockers = hasP0P1Blockers(p0p1);
  if (verdict === 'LGTM' && hasBlockers) throw new Error('LGTM несовместим с P0/P1');
  if (verdict === 'BLOCK' && !hasBlockers) throw new Error('BLOCK требует описанный P0/P1');
  if (verdict === 'LGTM' && readiness === 'needs_fix') {
    throw new Error('LGTM несовместим с needs_fix');
  }
  if (verdict === 'BLOCK' && readiness !== 'needs_fix') {
    throw new Error('BLOCK требует Closure readiness: needs_fix');
  }
  return { tier, task, commit, verdict, readiness, p0p1 };
}

/**
 * Почему evidence недостаточно — текстом, а не булевым «нет».
 *
 * Отказ назывался «недостаточно evidence для tier» и указывал на tier, хотя
 * причина обычно в конкретном упавшем чеке: 15.07 LGTM отклонён из-за
 * `git diff --check` (хвостовые пробелы в выжимке Perplexity), и корень пришлось
 * искать в manifest.json глазами — модель ревью при этом дала LGTM (#515,
 * трение A). Причина коду известна в момент отказа: печатаем её, а не прячем.
 *
 * @returns {string} причина; пустая строка — evidence достаточно
 */
export function explainReviewEvidenceGap(manifest) {
  const current = manifest.evidence.checks.filter(
    (check) => check.commitSha === manifest.currentCommitSha,
  );
  const sha = manifest.currentCommitSha.slice(0, 12);
  const broken = current.filter((check) => check.status === 'fail' || check.status === 'stale');
  if (broken.length > 0) {
    const list = broken.map((check) => `${check.command} — ${check.status}`).join('; ');
    return `чеки не прошли на ${sha}: ${list}`;
  }
  const passed = current.filter((check) => check.status === 'pass');
  const need = manifest.tier === 'T0' ? 1 : 2;
  if (passed.length < need) {
    return `для ${manifest.tier} нужно ≥${need} пройденных чеков на ${sha}, есть ${passed.length}`;
  }
  if (manifest.tier !== 'T0' && !passed.some((check) => check.command !== 'git diff --check')) {
    return `для ${manifest.tier} одного \`git diff --check\` мало — нужен содержательный чек (тесты/линт/сборка)`;
  }
  return '';
}

export function hasSufficientReviewEvidence(manifest) {
  return explainReviewEvidenceGap(manifest) === '';
}

const NON_BLOCKING_CONCLUSIONS = new Set(['skipped', 'neutral', 'cancelled']);

export function normalizeGithubCheckRuns(checkRuns, commitSha) {
  return checkRuns.map((check) => ({
    command: `github-check:${check.name}`,
    status:
      check.status !== 'completed'
        ? 'skipped'
        : check.conclusion === 'success'
          ? 'pass'
          : NON_BLOCKING_CONCLUSIONS.has(check.conclusion)
            ? 'skipped'
            : 'fail',
    exitCode: null,
    commitSha,
    checkedAt: check.completed_at ?? check.started_at ?? new Date(0).toISOString(),
    note: [check.conclusion, check.html_url].filter(Boolean).join(' · '),
  }));
}

export function applyTeamleadReview(manifest, body, now = new Date().toISOString()) {
  validateReviewManifest(manifest);
  if (!['review_pending', 'blocked', 'needs_fix'].includes(manifest.state)) {
    throw new Error(`Review нельзя применить из state ${manifest.state}`);
  }
  const parsed = parseTeamleadReview(
    body,
    manifest.taskId,
    manifest.currentCommitSha,
    manifest.tier,
  );
  if (parsed.verdict === 'LGTM') {
    const gap = explainReviewEvidenceGap(manifest);
    // Ревью дало LGTM — значит отказ здесь про evidence, а не про код. Называем
    // конкретный чек: иначе следующая сессия идёт читать manifest.json руками.
    if (gap) throw new Error(`LGTM отклонён: недостаточно evidence — ${gap}`);
  }
  const artifact = reviewArtifactPath(manifest.taskId, manifest.currentCommitSha);
  const approved = parsed.verdict === 'LGTM';

  // Адаптер (е) cowork-execution-registry (INTERFACE_CONTRACT §1.1/§6):
  // приёмка = событие «персона приняла выход» — канон `{acceptedBy, headRev}`
  // пишется в артефакт закрытия при LGTM; история приёмок append-only
  // (`acceptanceHistory`) — по ней escalationRate/reworkRate наблюдают
  // переприсвоение. Пишет closure lifecycle, не блоки.
  const acceptance = approved
    ? { acceptedBy: 'vesnin', headRev: manifest.currentCommitSha }
    : (manifest.acceptance ?? null);
  const priorHistory = Array.isArray(manifest.acceptanceHistory) ? manifest.acceptanceHistory : [];
  const acceptanceHistory =
    approved &&
    !priorHistory.some(
      (h) => h.acceptedBy === acceptance.acceptedBy && h.headRev === acceptance.headRev,
    )
      ? [...priorHistory, acceptance]
      : priorHistory;

  return validateReviewManifest({
    ...manifest,
    state: approved ? 'lgtm' : 'blocked',
    verdict: parsed.verdict,
    reviewedCommitSha: manifest.currentCommitSha,
    reviewArtifact: artifact,
    acceptance,
    acceptanceHistory,
    evidence: { ...manifest.evidence, hasUnresolvedP0P1: !approved },
    reviewersStatus: { ...manifest.reviewersStatus, vesnin: approved ? 'approved' : 'blocked' },
    updatedAt: now,
  });
}

export function writeReviewArtifact(manifest, body, cwd = process.cwd()) {
  if (!manifest.reviewArtifact) throw new Error('Manifest не содержит reviewArtifact');
  const path = resolve(cwd, manifest.reviewArtifact);
  mkdirSync(dirname(path), { recursive: true });
  const content = `${body.trim()}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, 'utf8') !== content) {
      throw new Error(`Immutable review artifact уже существует: ${manifest.reviewArtifact}`);
    }
    return path;
  }
  writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  return path;
}

export function finalizeReviewManifest(
  manifest,
  { actualCommitSha, mode, evidence, now = new Date().toISOString() },
) {
  validateReviewManifest(manifest);
  if (manifest.state === 'archived') return manifest;
  if (manifest.state !== 'lgtm') throw new Error(`Finalize требует state lgtm, получен ${manifest.state}`);
  if (actualCommitSha !== manifest.currentCommitSha) {
    throw new Error('Finalize запрещён: current SHA отличается от reviewed SHA');
  }
  if (!['merged', 'accepted_branch_only'].includes(mode)) {
    throw new Error('Finalize mode: merged | accepted_branch_only');
  }
  if (typeof evidence !== 'string' || evidence.trim().length === 0) {
    throw new Error('Finalize требует completion evidence');
  }
  return validateReviewManifest({
    ...manifest,
    state: mode,
    completion: { mode, evidence: evidence.trim() },
    updatedAt: now,
  });
}

export function markReviewArchived(manifest, now = new Date().toISOString()) {
  validateReviewManifest(manifest);
  if (manifest.state === 'archived') return manifest;
  if (!['merged', 'accepted_branch_only'].includes(manifest.state)) {
    throw new Error(`Archive marker требует completed state, получен ${manifest.state}`);
  }
  return validateReviewManifest({ ...manifest, state: 'archived', updatedAt: now });
}
