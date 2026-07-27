import { execFileSync } from 'node:child_process';

export function parseTop10Rows(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex((line) => /^##\s+Топ-10 дня/u.test(line));
  if (start < 0) return [];
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/u.test(line)) break;
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/u);
    if (!m) continue;
    const n = Number(m[1]);
    if (!(n >= 1 && n <= 10)) continue;
    const work = m[2].trim();
    const issues = [...work.matchAll(/github\.com\/officefish\/Membrana\/issues\/(\d+)|#(\d+)/gu)]
      .map((x) => Number(x[1] ?? x[2]))
      .filter((x) => x > 0);
    const taskIds = [...work.matchAll(/`([a-z0-9][a-z0-9-]*)`/gu)].map((x) => x[1]);
    rows.push({
      n,
      work,
      pain: m[3].trim(),
      size: m[4].trim(),
      dependency: m[5].trim(),
      occupied: m[6].trim(),
      issueNumbers: [...new Set(issues)],
      taskIds: [...new Set(taskIds)],
    });
  }
  return rows;
}

function parseGithubRemote(remote) {
  const m = String(remote).trim().match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/u);
  if (!m) return { owner: 'officefish', repo: 'Membrana' };
  return { owner: m[1], repo: m[2] };
}

export function buildIssueGraphqlQuery({ owner, repo, issueNumbers }) {
  const fields = issueNumbers
    .map((n) => `i${n}: issue(number: ${n}) { number state stateReason title url }`)
    .join('\n');
  return `query HandoffLivenessIssues {\n  repository(owner: "${owner}", name: "${repo}") {\n${fields}\n  }\n}`;
}

export function fetchIssuesByNumber(repoRoot, issueNumbers) {
  if (issueNumbers.length === 0) return { ok: true, issues: new Map(), error: null };
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const query = buildIssueGraphqlQuery({
      ...parseGithubRemote(remote),
      issueNumbers: [...new Set(issueNumbers)].sort((a, b) => a - b),
    });
    const raw = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const repo = JSON.parse(raw)?.data?.repository ?? {};
    const issues = new Map();
    for (const [alias, issue] of Object.entries(repo)) {
      const n = Number(alias.slice(1));
      if (issue) issues.set(n, issue);
    }
    return { ok: true, issues, error: null };
  } catch (e) {
    const stderr = e && typeof e === 'object' && 'stderr' in e && e.stderr
      ? String(e.stderr)
      : '';
    const first = (stderr || (e instanceof Error ? e.message : String(e))).split(/\r?\n/u).find(Boolean);
    return { ok: false, issues: new Map(), error: first };
  }
}

export function evaluateHandoffRows(rows, issueResult) {
  return rows.map((row) => {
    if (!issueResult.ok) {
      return { ...row, liveness: 'unknown', reason: `issue state unknown: ${issueResult.error}` };
    }
    if (row.issueNumbers.length === 0) {
      return {
        ...row,
        liveness: 'unknown',
        reason: row.taskIds.length
          ? `no GitHub issue carrier for task ${row.taskIds.join(', ')}`
          : 'no GitHub issue carrier',
      };
    }
    const states = row.issueNumbers.map((n) => ({ number: n, issue: issueResult.issues.get(n) }));
    const missing = states.filter((s) => !s.issue);
    if (missing.length > 0) {
      return { ...row, liveness: 'unknown', reason: `issue missing from batch query: #${missing.map((s) => s.number).join(', #')}` };
    }
    const closed = states.filter((s) => s.issue.state === 'CLOSED');
    if (closed.length > 0) {
      return {
        ...row,
        liveness: 'dead',
        reason: closed.map((s) => `#${s.number} CLOSED${s.issue.stateReason ? `/${s.issue.stateReason}` : ''}`).join(', '),
      };
    }
    return {
      ...row,
      liveness: 'alive',
      reason: states.map((s) => `#${s.number} ${s.issue.state}`).join(', '),
    };
  });
}

export function renderHandoffLivenessReport({ rows, issueResult, generatedAt }) {
  const lines = [
    `# Handoff liveness`,
    '',
    `Generated: ${generatedAt}`,
    `Source: docs/HANDOFF.md`,
    `Issue query: ${issueResult.ok ? 'ok (single GraphQL batch)' : `unknown (${issueResult.error})`}`,
    '',
    '| # | liveness | carriers | occupied | evidence |',
    '|---|----------|----------|----------|----------|',
  ];
  for (const row of rows) {
    const carriers = row.issueNumbers.length
      ? row.issueNumbers.map((n) => `#${n}`).join(', ')
      : row.taskIds.map((id) => `\`${id}\``).join(', ') || '—';
    lines.push(
      `| ${row.n} | ${row.liveness} | ${carriers} | ${row.occupied.replace(/\|/gu, '\\|')} | ${row.reason.replace(/\|/gu, '\\|')} |`,
    );
  }
  const dead = rows.filter((r) => r.liveness === 'dead').length;
  const unknown = rows.filter((r) => r.liveness === 'unknown').length;
  lines.push('', `Summary: alive=${rows.length - dead - unknown}, dead=${dead}, unknown=${unknown}.`);
  return `${lines.join('\n')}\n`;
}
