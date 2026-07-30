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
    const carriers = extractGithubCarriers(work);
    const issues = carriers.filter((c) => c.kind === 'issue').map((c) => c.number);
    const pulls = carriers.filter((c) => c.kind === 'pull').map((c) => c.number);
    const taskIds = [...work.matchAll(/`([a-z0-9][a-z0-9-]*)`/gu)].map((x) => x[1]);
    rows.push({
      n,
      work,
      pain: m[3].trim(),
      size: m[4].trim(),
      dependency: m[5].trim(),
      occupied: m[6].trim(),
      carriers,
      issueNumbers: [...new Set(issues)],
      pullNumbers: [...new Set(pulls)],
      taskIds: [...new Set(taskIds)],
    });
  }
  return rows;
}

function uniqueCarriers(carriers) {
  const seen = new Set();
  return carriers.filter((c) => {
    const key = `${c.kind}:${c.number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractGithubCarriers(markdown) {
  const carriers = [];
  let stripped = String(markdown);
  stripped = stripped.replace(/\[[^\]]*#(\d+)[^\]]*\]\(([^)]*github\.com\/officefish\/Membrana\/(issues|pull)\/(\d+)[^)]*)\)/giu, (_all, _labelNum, _url, kind, urlNum) => {
    carriers.push({ kind: kind === 'pull' ? 'pull' : 'issue', number: Number(urlNum) });
    return '';
  });
  stripped = stripped.replace(/github\.com\/officefish\/Membrana\/(issues|pull)\/(\d+)/giu, (_all, kind, num) => {
    carriers.push({ kind: kind === 'pull' ? 'pull' : 'issue', number: Number(num) });
    return '';
  });
  for (const m of stripped.matchAll(/#(\d+)/gu)) {
    carriers.push({ kind: 'issue', number: Number(m[1]), ambiguous: true });
  }
  return uniqueCarriers(carriers.filter((c) => Number.isInteger(c.number) && c.number > 0));
}

function parseGithubRemote(remote) {
  const m = String(remote).trim().match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/u);
  if (!m) return { owner: 'officefish', repo: 'Membrana' };
  return { owner: m[1], repo: m[2] };
}

export function buildCarrierGraphqlQuery({ owner, repo, numbers }) {
  const fields = numbers
    .map((n) => `i${n}: issueOrPullRequest(number: ${n}) {
      __typename
      ... on Issue { number state stateReason title url }
      ... on PullRequest { number state title url merged }
    }`)
    .join('\n');
  return `query HandoffLivenessCarriers {\n  repository(owner: "${owner}", name: "${repo}") {\n${fields}\n  }\n}`;
}

export function buildIssueGraphqlQuery({ owner, repo, issueNumbers }) {
  return buildCarrierGraphqlQuery({ owner, repo, numbers: issueNumbers });
}

export function fetchCarriersByNumber(repoRoot, numbers) {
  if (numbers.length === 0) return { ok: true, issues: new Map(), error: null };
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const query = buildCarrierGraphqlQuery({
      ...parseGithubRemote(remote),
      numbers: [...new Set(numbers)].sort((a, b) => a - b),
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

export function fetchIssuesByNumber(repoRoot, issueNumbers) {
  return fetchCarriersByNumber(repoRoot, issueNumbers);
}

function carrierKindOf(item) {
  return item?.__typename === 'PullRequest' ? 'pull' : 'issue';
}

function formatCarrier({ kind, number }) {
  return kind === 'pull' ? `PR #${number}` : `#${number}`;
}

function formatCarrierState(number, item) {
  const prefix = item.__typename === 'PullRequest' ? `PR #${number}` : `#${number}`;
  return `${prefix} ${item.state}${item.stateReason ? `/${item.stateReason}` : ''}`;
}

export function evaluateHandoffRows(rows, issueResult) {
  return rows.map((row) => {
    if (!issueResult.ok) {
      return { ...row, liveness: 'unknown', reason: `carrier state unknown: ${issueResult.error}` };
    }
    const carriers = row.carriers ?? row.issueNumbers.map((number) => ({ kind: 'issue', number }));
    if (carriers.length === 0) {
      return {
        ...row,
        liveness: 'unknown',
        reason: row.taskIds.length
          ? `no GitHub Issue/PR carrier for task ${row.taskIds.join(', ')}`
          : 'no GitHub Issue/PR carrier',
      };
    }
    const states = carriers.map((c) => ({ ...c, issue: issueResult.issues.get(c.number) }));
    const missing = states.filter((s) => !s.issue);
    if (missing.length > 0) {
      return { ...row, liveness: 'unknown', reason: `carrier missing from batch query: ${missing.map(formatCarrier).join(', ')}` };
    }
    const mismatched = states.filter((s) => !s.ambiguous && s.kind !== carrierKindOf(s.issue));
    if (mismatched.length > 0) {
      return {
        ...row,
        liveness: 'unknown',
        reason: `carrier kind mismatch: ${mismatched.map((s) => `${formatCarrier(s)} resolved as ${s.issue.__typename}`).join(', ')}`,
      };
    }
    const closed = states.filter((s) => s.issue.state === 'CLOSED' || s.issue.state === 'MERGED');
    if (closed.length > 0) {
      return {
        ...row,
        liveness: 'dead',
        reason: closed.map((s) => formatCarrierState(s.number, s.issue)).join(', '),
      };
    }
    return {
      ...row,
      liveness: 'alive',
      reason: states.map((s) => formatCarrierState(s.number, s.issue)).join(', '),
    };
  });
}

export function renderHandoffLivenessReport({ rows, issueResult, generatedAt }) {
  const lines = [
    `# Handoff liveness`,
    '',
    `Generated: ${generatedAt}`,
    `Source: docs/HANDOFF.md`,
    `Carrier query: ${issueResult.ok ? 'ok (single GraphQL batch)' : `unknown (${issueResult.error})`}`,
    '',
    '| # | liveness | carriers | occupied | evidence |',
    '|---|----------|----------|----------|----------|',
  ];
  for (const row of rows) {
    const carriers = row.carriers?.length
      ? row.carriers.map(formatCarrier).join(', ')
      : row.issueNumbers.length
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
