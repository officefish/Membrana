/**
 * GitHub Issues Audit — shared logic.
 * @see docs/prompts/GITHUB_ISSUES_AUDIT_PROMPT.md
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const REPO = 'officefish/Membrana';

/** @typedef {'important' | 'recommended' | 'not-urgent' | 'optional'} AuditPriority */
/** @typedef {'completed' | 'not planned'} CloseReason */

/**
 * @typedef {object} ClosedManifestItem
 * @property {number} number
 * @property {CloseReason} reason
 * @property {string} persona
 * @property {string} summary
 * @property {string} comment
 * @property {string | null} [registryId]
 */

/**
 * @typedef {object} OpenManifestItem
 * @property {number} number
 * @property {AuditPriority} priority
 * @property {string} persona
 * @property {string} summary
 * @property {string | null} [registryId]
 */

/**
 * @typedef {object} AuditManifest
 * @property {1} version
 * @property {string} auditDate
 * @property {string} [branch]
 * @property {string} [headSha]
 * @property {{ result?: string, exitCode?: number }} [turbo]
 * @property {string} [coordinator]
 * @property {string} [notes]
 * @property {ClosedManifestItem[]} closed
 * @property {OpenManifestItem[]} open
 */

export const PRIORITY_LABELS = {
  important: '🔴 **Важно**',
  recommended: '🟡 **Рекомендовано**',
  'not-urgent': '🟢 **Не срочно**',
  optional: '⚪ **Не обязательно**',
};

export const PRIORITY_ORDER = ['important', 'recommended', 'not-urgent', 'optional'];

/**
 * @param {string} manifestPath
 * @returns {AuditManifest}
 */
export function loadManifest(manifestPath) {
  const abs = resolve(manifestPath);
  if (!existsSync(abs)) {
    throw new Error(`Manifest not found: ${abs}`);
  }
  const data = JSON.parse(readFileSync(abs, 'utf8'));
  if (data.version !== 1) {
    throw new Error(`Unsupported manifest version: ${data.version}`);
  }
  if (!data.auditDate || !Array.isArray(data.closed) || !Array.isArray(data.open)) {
    throw new Error('Invalid manifest: require auditDate, closed[], open[]');
  }
  return data;
}

export function hasGh() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string[]} args
 * @returns {{ ok: boolean, stdout: string, stderr: string }}
 */
export function gh(args) {
  const res = spawnSync('gh', args, { encoding: 'utf8' });
  return {
    ok: res.status === 0,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

/**
 * @param {'open' | 'closed'} state
 * @param {number} limit
 */
export function fetchIssues(state, limit = 100) {
  const { ok, stdout, stderr } = gh([
    'issue',
    'list',
    '--repo',
    REPO,
    '--state',
    state,
    '--limit',
    String(limit),
    '--json',
    'number,title,state,labels,closedAt,url',
  ]);
  if (!ok) {
    throw new Error(`gh issue list failed: ${stderr || stdout}`);
  }
  return /** @type {{ number: number, title: string, state: string, url: string, closedAt?: string }[]} */ (
    JSON.parse(stdout)
  );
}

/**
 * @param {number} number
 */
export function fetchIssueState(number) {
  const { ok, stdout, stderr } = gh([
    'issue',
    'view',
    String(number),
    '--repo',
    REPO,
    '--json',
    'number,title,state,url',
  ]);
  if (!ok) {
    return null;
  }
  return /** @type {{ number: number, title: string, state: string, url: string }} */ (
    JSON.parse(stdout)
  );
}

/**
 * @param {number} number
 * @param {string} body
 * @param {boolean} dryRun
 */
export function commentIssue(number, body, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] comment #${number} (${body.length} chars)`);
    return true;
  }
  const tmpDir = join(process.cwd(), '.tmp-issue-audit');
  mkdirSync(tmpDir, { recursive: true });
  const bodyFile = join(tmpDir, `issue-${number}.md`);
  writeFileSync(bodyFile, body, 'utf8');
  const { ok, stderr } = gh(['issue', 'comment', String(number), '--repo', REPO, '--body-file', bodyFile]);
  if (!ok) {
    console.error(`comment #${number} failed: ${stderr}`);
    return false;
  }
  return true;
}

/**
 * @param {number} number
 * @param {CloseReason} reason
 * @param {boolean} dryRun
 */
export function closeIssue(number, reason, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] close #${number} (${reason})`);
    return true;
  }
  const { ok, stderr } = gh([
    'issue',
    'close',
    String(number),
    '--repo',
    REPO,
    '--reason',
    reason,
  ]);
  if (!ok) {
    console.error(`close #${number} failed: ${stderr}`);
    return false;
  }
  return true;
}

/**
 * @param {AuditManifest} manifest
 * @param {boolean} apply
 * @param {boolean} dryRun
 */
export function applyClosures(manifest, apply, dryRun) {
  if (!apply) return { commented: 0, closed: 0, skipped: 0, errors: 0 };

  let commented = 0;
  let closed = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of manifest.closed) {
    const live = fetchIssueState(item.number);
    if (!live) {
      console.warn(`#${item.number}: not found on GitHub`);
      errors += 1;
      continue;
    }
    if (live.state === 'CLOSED') {
      console.log(`#${item.number}: already closed — skip`);
      skipped += 1;
      continue;
    }
    console.log(`#${item.number}: ${item.summary}`);
    if (!commentIssue(item.number, item.comment, dryRun)) {
      errors += 1;
      continue;
    }
    commented += 1;
    if (!closeIssue(item.number, item.reason, dryRun)) {
      errors += 1;
      continue;
    }
    closed += 1;
  }

  return { commented, closed, skipped, errors };
}

/**
 * @param {AuditManifest} manifest
 * @param {{ number: number, title: string, url: string }[]} ghOpen
 */
export function validateManifestCoverage(manifest, ghOpen) {
  const manifestOpenNums = new Set(manifest.open.map((o) => o.number));
  const manifestClosedNums = new Set(manifest.closed.map((c) => c.number));
  const ghNums = ghOpen.map((i) => i.number);

  /** @type {number[]} */
  const missing = [];
  for (const n of ghNums) {
    if (!manifestOpenNums.has(n) && !manifestClosedNums.has(n)) {
      missing.push(n);
    }
  }

  /** @type {number[]} */
  const staleOpen = [];
  for (const item of manifest.open) {
    const live = ghOpen.find((i) => i.number === item.number);
    if (!live) staleOpen.push(item.number);
  }

  return { missing, staleOpen };
}

/**
 * @param {AuditManifest} manifest
 * @param {{ number: number, title: string, url: string }[]} ghOpen
 * @param {{ missing: number[], staleOpen: number[] }} validation
 */
export function renderAuditReport(manifest, ghOpen, validation) {
  const lines = [];
  const date = manifest.auditDate;
  const ghByNum = Object.fromEntries(ghOpen.map((i) => [i.number, i]));

  lines.push(`# GitHub Issues Audit — ${date}`);
  lines.push('');
  lines.push(`> Процесс: [\`GITHUB_ISSUES_AUDIT_PROMPT.md\`](../prompts/GITHUB_ISSUES_AUDIT_PROMPT.md)  `);
  lines.push(
    `> Manifest: [\`github-issues-audit-${date}.json\`](../issues/manifests/github-issues-audit-${date}.json)  `,
  );
  lines.push(`> Координатор: **${manifest.coordinator ?? 'Vesnin'}**  `);
  if (manifest.branch) {
    lines.push(
      `> Ветка: \`${manifest.branch}\`${manifest.headSha ? ` @ \`${manifest.headSha.slice(0, 7)}\`` : ''}  `,
    );
  }
  if (manifest.turbo?.result) {
    lines.push(`> Turbo: **${manifest.turbo.result}** (exit ${manifest.turbo.exitCode ?? '?'})  `);
  }
  if (manifest.notes) {
    lines.push(`> ${manifest.notes}  `);
  }
  lines.push('');

  lines.push('## Сводка');
  lines.push('');
  lines.push(`| Метрика | Значение |`);
  lines.push(`|---------|----------|`);
  lines.push(`| Закрыто в этом аудите | **${manifest.closed.length}** |`);
  lines.push(`| Открытых (ранжировано) | **${manifest.open.length}** |`);
  lines.push(`| Open на GitHub (fetch) | **${ghOpen.length}** |`);
  if (validation.missing.length) {
    lines.push(`| ⚠️ Не в manifest | ${validation.missing.map((n) => `#${n}`).join(', ')} |`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 1. Закрытые issues');
  lines.push('');
  lines.push('| # | Persona | Reason | Кратко | Registry |');
  lines.push('|---|---------|--------|--------|----------|');

  const closedSorted = [...manifest.closed].sort((a, b) => a.number - b.number);
  for (const item of closedSorted) {
    const reg = item.registryId ? `\`${item.registryId}\`` : '—';
    lines.push(
      `| [#${item.number}](https://github.com/${REPO}/issues/${item.number}) | ${item.persona} | \`${item.reason}\` | ${item.summary} | ${reg} |`,
    );
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. Открытые issues — рейтинг');
  lines.push('');

  for (const priority of PRIORITY_ORDER) {
    const bucket = manifest.open.filter((o) => o.priority === priority);
    if (!bucket.length) continue;
    lines.push(`### ${PRIORITY_LABELS[priority]}`);
    lines.push('');
    lines.push('| # | Title | Persona | Кратко | Registry |');
    lines.push('|---|-------|---------|--------|----------|');
    for (const item of bucket.sort((a, b) => a.number - b.number)) {
      const gh = ghByNum[item.number];
      const title = gh?.title ?? '(title from manifest)';
      const reg = item.registryId ? `\`${item.registryId}\`` : '—';
      lines.push(
        `| [#${item.number}](https://github.com/${REPO}/issues/${item.number}) | ${title.replace(/\|/g, '\\|')} | ${item.persona} | ${item.summary} | ${reg} |`,
      );
    }
    lines.push('');
  }

  if (validation.missing.length || validation.staleOpen.length) {
    lines.push('---');
    lines.push('');
    lines.push('## 3. Расхождения manifest ↔ GitHub');
    lines.push('');
    if (validation.missing.length) {
      lines.push(
        `- **Open на GitHub, нет в manifest:** ${validation.missing.map((n) => `#${n}`).join(', ')}`,
      );
    }
    if (validation.staleOpen.length) {
      lines.push(
        `- **В manifest.open, но не open на GitHub:** ${validation.staleOpen.map((n) => `#${n}`).join(', ')}`,
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Follow-up');
  lines.push('');
  const registryFollowUps = manifest.closed.filter((c) => c.registryId);
  if (registryFollowUps.length) {
    lines.push('Закрытые issues с active registry (нужен `yarn task:archive`):');
    for (const c of registryFollowUps) {
      lines.push(`- \`${c.registryId}\` (Issue #${c.number})`);
    }
  } else {
    lines.push('- —');
  }
  lines.push('');
  lines.push(`*Сгенерировано: \`yarn issues:audit\` · ${new Date().toISOString().slice(0, 10)}*`);

  return lines.join('\n');
}

/**
 * @param {AuditManifest} manifest
 * @param {string} reportPath
 * @param {boolean} dryRun
 */
export function writeReport(manifest, reportPath, dryRun) {
  let ghOpen = [];
  if (hasGh()) {
    try {
      ghOpen = fetchIssues('open', 100);
    } catch (err) {
      console.warn(`GitHub fetch skipped: ${err.message}`);
    }
  }
  const validation = validateManifestCoverage(manifest, ghOpen);
  const markdown = renderAuditReport(manifest, ghOpen, validation);
  const abs = resolve(reportPath);
  if (dryRun) {
    console.log(`[dry-run] report → ${abs} (${markdown.length} chars)`);
    return abs;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, markdown, 'utf8');
  console.log(`Report: ${abs}`);
  return abs;
}
