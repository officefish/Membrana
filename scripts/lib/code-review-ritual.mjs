/**
 * Shared code-review ritual: regulation prompt, diff collection, output paths.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { parseRagCliFlags } from './rag-ritual.mjs';

export const REGULATION_PATH = 'docs/prompts/CODE_REVIEW_REGULATION.md';
export const VIRTUAL_TEAM_PATH = 'docs/VIRTUAL_TEAM_PROMPT.md';
export const DAILY_REVIEW_PATH = 'docs/DAILY_CODE_REVIEW.md';
export const MAIN_DAY_ISSUE_PATH = 'docs/MAIN_DAY_ISSUE.md';
export const CURRENT_TASK_PATH = 'docs/CURRENT_TASK.md';

const MAX_DIFF_CHARS = 120_000;
const MAX_CONTEXT_CHARS = 80_000;
const MAX_TASK_DOC_CHARS = 12_000;

export function printCodeReviewHelp() {
  console.log(`Usage: node scripts/code-review.mjs [options] ["focus question"]

Modes (one of):
  (default)     Daily evening review → docs/DAILY_CODE_REVIEW.md
  --pr <N>      Pull request #N diff + metadata
  --branch <B>  git diff origin/main...<B> (default base: origin/main)
  --uncommitted git diff HEAD (staged + unstaged)
  --staged      git diff --cached (только staged — ровно будущий коммит)

Options:
  --full        Extended context-collector (daily mode only)
  --base <ref>  Base ref for --branch (default: origin/main)
  --out <path>  Output markdown (default depends on mode)
  --no-rag      Skip RAG context
  --help, -h    This help

Requires ANTHROPIC_API_KEY in .env for yarn code-review.
Local Ollama: yarn local-code-review (daily only, no --pr yet).`);
}

/**
 * @param {string[]} argv
 */
export function parseCodeReviewCli(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }

  const rag = parseRagCliFlags(argv);
  const full = argv.includes('--full');

  let mode = 'daily';
  let pr = '';
  let branch = '';
  let base = 'origin/main';
  let out = '';

  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') continue;
    if (arg === '--no-rag' || arg === '--rag' || arg === '--full-rag') continue;
    if (arg === '--pr') {
      pr = argv[++i] ?? '';
      mode = 'pr';
      continue;
    }
    if (arg.startsWith('--pr=')) {
      pr = arg.slice('--pr='.length);
      mode = 'pr';
      continue;
    }
    if (arg === '--branch') {
      branch = argv[++i] ?? '';
      mode = 'branch';
      continue;
    }
    if (arg.startsWith('--branch=')) {
      branch = arg.slice('--branch='.length);
      mode = 'branch';
      continue;
    }
    if (arg === '--uncommitted') {
      mode = 'uncommitted';
      continue;
    }
    if (arg === '--staged') {
      mode = 'staged';
      continue;
    }
    if (arg === '--base') {
      base = argv[++i] ?? base;
      continue;
    }
    if (arg.startsWith('--base=')) {
      base = arg.slice('--base='.length);
      continue;
    }
    if (arg === '--out') {
      out = argv[++i] ?? '';
      continue;
    }
    if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
      continue;
    }
    rest.push(arg);
  }

  const focusQuestion = rest.join(' ').trim();

  if (mode === 'pr' && !pr) {
    throw new Error('Укажите номер PR: --pr <N>');
  }
  if (mode === 'branch' && !branch) {
    throw new Error('Укажите ветку: --branch <name>');
  }

  return { help: false, mode, pr, branch, base, out, full, focusQuestion, ...rag };
}

function detectRepoSlug() {
  const res = spawnSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const url = (res.stdout || '').trim();
  let m = url.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!m) m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function runGit(args) {
  const res = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (res.status !== 0) {
    throw new Error(res.stderr?.trim() || res.stdout?.trim() || `git ${args.join(' ')} failed`);
  }
  return (res.stdout || '').trimEnd();
}

function trimText(text, maxChars, label) {
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) + `\n\n[… ${label} обрезан до ${maxChars} символов …]\n`
  );
}

function slugifyBranch(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'branch';
}

/**
 * @param {{ mode: string, pr?: string, branch?: string, base?: string }} opts
 */
export function defaultOutputPath(opts) {
  const cwd = process.cwd();
  if (opts.mode === 'daily') {
    return resolve(cwd, DAILY_REVIEW_PATH);
  }
  if (opts.mode === 'pr') {
    return resolve(cwd, `docs/discussions/pr-${opts.pr}-code-review.md`);
  }
  if (opts.mode === 'branch') {
    return resolve(cwd, `docs/discussions/branch-${slugifyBranch(opts.branch ?? '')}-code-review.md`);
  }
  return resolve(cwd, 'docs/discussions/uncommitted-code-review.md');
}

/**
 * @param {{ mode: string, pr?: string, branch?: string, base?: string }} opts
 */
export function collectReviewContext(opts) {
  if (opts.mode === 'daily') {
    return { kind: 'daily', text: '' };
  }

  if (opts.mode === 'uncommitted') {
    const diff = runGit(['diff', 'HEAD']);
    const stat = runGit(['diff', '--stat', 'HEAD']);
    const lines = estimateChangedLines(stat);
    const taskBlock = appendTaskContext('uncommitted');
    return {
      kind: 'uncommitted',
      text: trimText(
        `${taskBlock}## PR size hint\n\n~${lines} changed lines (target ≤400)\n\n## git diff --stat HEAD\n\n${stat}\n\n## git diff HEAD\n\n${diff || '(нет изменений)'}`,
        MAX_DIFF_CHARS,
        'diff',
      ),
    };
  }

  if (opts.mode === 'staged') {
    // Только staged (git diff --cached) — ревью ровно того, что пойдёт в коммит;
    // без шума незакоммиченных daily-доков (NB3 tooling-retro).
    const diff = runGit(['diff', '--cached']);
    const stat = runGit(['diff', '--cached', '--stat']);
    const lines = estimateChangedLines(stat);
    const taskBlock = appendTaskContext('staged');
    return {
      kind: 'staged',
      text: trimText(
        `${taskBlock}## PR size hint (staged only)\n\n~${lines} changed lines (target ≤400)\n\n## git diff --cached --stat\n\n${stat}\n\n## git diff --cached\n\n${diff || '(нет staged-изменений — git add сначала)'}`,
        MAX_DIFF_CHARS,
        'diff',
      ),
    };
  }

  if (opts.mode === 'branch') {
    const base = opts.base ?? 'origin/main';
    const branch = opts.branch ?? '';
    const range = `${base}...${branch}`;
    const diff = runGit(['diff', range]);
    const stat = runGit(['diff', '--stat', range]);
    const log = runGit(['log', '--oneline', '-15', range]);
    const lines = estimateChangedLines(stat);
    const taskBlock = appendTaskContext('branch');
    return {
      kind: 'branch',
      text: trimText(
        `${taskBlock}## Branch review\n\n- Branch: \`${branch}\`\n- Range: \`${range}\`\n- Changed lines: ~${lines} (target ≤400)\n\n## Commits\n\n${log}\n\n## diff --stat\n\n${stat}\n\n## diff\n\n${diff || '(нет изменений)'}`,
        MAX_DIFF_CHARS,
        'diff',
      ),
    };
  }

  const slug = detectRepoSlug();
  if (!slug) {
    throw new Error('Не удалось определить GitHub slug репозитория.');
  }
  const prNum = String(opts.pr);
  const viewRes = spawnSync(
    'gh',
    ['pr', 'view', prNum, '--repo', slug, '--json', 'number,title,body,state,baseRefName,headRefName,files,commits'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  if (viewRes.status !== 0) {
    throw new Error(viewRes.stderr?.trim() || `gh pr view ${prNum} failed`);
  }
  const meta = JSON.parse(viewRes.stdout);
  const diffRes = spawnSync('gh', ['pr', 'diff', prNum, '--repo', slug], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const diff = diffRes.status === 0 ? diffRes.stdout : `(gh pr diff failed: ${diffRes.stderr})`;
  const diffStatRes = spawnSync('gh', ['pr', 'diff', prNum, '--repo', slug, '--stat'], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const diffStat = diffStatRes.status === 0 ? diffStatRes.stdout : '';
  const lines = estimateChangedLines(diffStat);
  const taskBlock = appendTaskContext('pr');
  const files =
    Array.isArray(meta.files) && meta.files.length
      ? meta.files.map((f) => `- ${f.path} (+${f.additions}/-${f.deletions})`).join('\n')
      : '(files list unavailable)';

  return {
    kind: 'pr',
    text: trimText(
      `${taskBlock}## PR #${meta.number}: ${meta.title}\n\n- State: ${meta.state}\n- Base: \`${meta.baseRefName}\` ← Head: \`${meta.headRefName}\`\n- Changed lines: ~${lines} (target ≤400)\n\n## Body\n\n${meta.body || '(empty)'}\n\n## Files\n\n${files}\n\n## Diff stat\n\n${diffStat || '(n/a)'}\n\n## Diff\n\n${diff}`,
      MAX_DIFF_CHARS,
      'PR diff',
    ),
  };
}

/**
 * @param {{ mode: string, focusQuestion?: string, regulation: string, virtualTeam: string, contextBlock: string, ragBlock?: string }} p
 */
export function buildCodeReviewUserMessage(p) {
  const modeLabels = {
    daily: 'ежедневное вечернее ревью (сводка дня)',
    pr: 'ревью pull request перед merge / LGTM',
    branch: 'ревью ветки перед PR',
    uncommitted: 'ревью незакоммиченных изменений',
  };
  const modeLabel = modeLabels[p.mode] ?? p.mode;

  const assignmentByMode = {
    daily:
      'Проведи вечернее daily code review (регламент v0.2). Используй сокращённый формат (Teamlead + Структурщик), если затронут один пакет; иначе — все пять ролей. Укажи Tier и конкретные yarn-команды на утро.',
    pr: 'Проведи PR code review перед merge. Укажи Tier, PR size OK/oversized, вердикт LGTM или BLOCK в [Teamlead] и в строке Вердикт. Сверь с MAIN_DAY_ISSUE и acceptance criteria.',
    branch:
      'Проведи review ветки перед PR. Укажи Tier, PR size, вердикт LGTM или BLOCK.',
    uncommitted:
      'Проведи review незакоммиченных изменений. Укажи Tier; рекомендации до commit.',
  };

  const assignment = p.focusQuestion
    ? p.focusQuestion
    : assignmentByMode[p.mode] ?? `Проведи code review (${modeLabel}). Соблюдай регламент v0.2.`;

  return (
    '## Регламент code review\n\n' +
    p.regulation +
    '\n\n---\n\n## Промпт виртуальной команды\n\n' +
    p.virtualTeam +
    '\n\n---\n\n' +
    (p.ragBlock ? `## RAG context\n\n${p.ragBlock}\n\n---\n\n` : '') +
    '## Контекст для анализа\n\n' +
    trimText(p.contextBlock, MAX_CONTEXT_CHARS, 'контекст') +
    '\n\n---\n\n## Задание\n\n' +
    assignment
  );
}

/**
 * @param {{ path: string, body: string, meta: { mode: string, full?: boolean, pr?: string } }} opts
 */
export function writeReviewMarkdown(opts) {
  const stamp = new Date().toISOString();
  const flags = [
    opts.meta.mode,
    opts.meta.full ? 'full' : null,
    opts.meta.pr ? `pr-${opts.meta.pr}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const header = `<!-- Сгенерировано: ${stamp} (yarn code-review${flags ? `; ${flags}` : ''}) -->\n\n`;
  mkdirSync(dirname(opts.path), { recursive: true });
  writeFileSync(opts.path, header + opts.body, 'utf8');
}

export function readRequiredFile(relPath) {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) {
    throw new Error(`Файл не найден: ${relPath}`);
  }
  return readFileSync(abs, 'utf8');
}

/**
 * @param {string} relPath
 * @param {number} [maxChars]
 */
export function readOptionalFile(relPath, maxChars = MAX_TASK_DOC_CHARS) {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) {
    return '';
  }
  let text = readFileSync(abs, 'utf8');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… обрезано до ${maxChars} символов …]\n`;
  }
  return text;
}

/**
 * @param {string} diffStatText
 */
export function estimateChangedLines(diffStatText) {
  if (!diffStatText?.trim()) return 0;
  const line = diffStatText.trim().split(/\r?\n/).pop() ?? '';
  const m = line.match(/(\d+)\s+files?\s+changed(?:,\s*(\d+)\s+insertions?\(\+\))?(?:,\s*(\d+)\s+deletions?\(-\))?/);
  if (!m) return 0;
  const ins = Number(m[2] ?? 0);
  const del = Number(m[3] ?? 0);
  return ins + del;
}

/**
 * @param {'pr' | 'branch' | 'uncommitted'} kind
 */
export function appendTaskContext(kind) {
  const main = readOptionalFile(MAIN_DAY_ISSUE_PATH);
  const buffer = readOptionalFile(CURRENT_TASK_PATH);
  if (!main && !buffer) return '';
  const parts = [`## Task context (${kind})`];
  if (main) parts.push(`### MAIN_DAY_ISSUE.md\n\n${main}`);
  if (buffer) parts.push(`### CURRENT_TASK.md\n\n${buffer}`);
  return parts.join('\n\n') + '\n\n';
}
