#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  applyTeamleadReview,
  buildTaskClosureReviewPrompt,
  finalizeReviewManifest,
  loadReviewManifest,
  normalizeGithubCheckRuns,
  prepareReviewManifest,
  reviewStatus,
  saveReviewManifest,
  markReviewArchived,
  writeReviewArtifact,
} from './lib/task-closure-review.mjs';
import { findTask, loadRegistry } from './lib/task-registry.mjs';
import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

/**
 * Каталоги ревью-артефактов, исключаемые из exact-диффа closure-ревью (B3, #539).
 * Протоколы консилиумов, выжимки research, артефакты код-ревью — процесс, не
 * предмет ревью; на эпик-контуре они пробивали лимит 80k и роняли ревью (#543).
 */
export const CLOSURE_DIFF_EXCLUDES = [
  'docs/seanses',
  'docs/tasks/research',
  'docs/discussions',
  'docs/reviews',
];

export function parseTaskClosureReviewCli(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  const command = argv[0] ?? '';
  const out = {
    help: false,
    command,
    id: '',
    ref: 'HEAD',
    base: '',
    pr: null,
    reviewFile: '',
    acceptedBranchOnly: '',
    mergeEvidence: '',
    notes: '',
    checks: [],
    dryRun: false,
  };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') { out.dryRun = true; continue; }
    if (arg === '--check') { out.checks.push(argv[++i] ?? ''); continue; }
    if (arg.startsWith('--check=')) { out.checks.push(arg.slice(8)); continue; }
    for (const key of ['id', 'ref', 'base', 'pr', 'reviewFile', 'acceptedBranchOnly', 'mergeEvidence', 'notes']) {
      const flag = key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
      if (arg === `--${flag}`) { out[key] = argv[++i] ?? ''; break; }
      if (arg.startsWith(`--${flag}=`)) { out[key] = arg.slice(flag.length + 3); break; }
    }
  }
  if (!['prepare', 'run', 'status', 'finalize'].includes(command)) {
    throw new Error('Команда: prepare | run | status | finalize');
  }
  if (!out.id) throw new Error('Укажите --id <task-id>');
  if (out.pr !== null && !/^\d+$/.test(String(out.pr))) throw new Error('--pr должен быть числом');
  out.pr = out.pr === null ? null : Number(out.pr);
  return out;
}

function printHelp() {
  console.log(`Usage:
  yarn task:review:prepare --id <task-id> [--ref HEAD] [--base <ref>] [--pr N] [--dry-run]
  yarn task:review:run --id <task-id> [--check "command"] [--review-file path] [--dry-run]
  yarn task:review:status --id <task-id>
  yarn task:review:finalize --id <task-id> [--accepted-branch-only "reason"] [--dry-run]

prepare требует, чтобы reviewed SHA присутствовал в remote-tracking branch.`);
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')}: ${(result.stderr || '').trim()}`);
  }
  return (result.stdout || '').trim();
}

function resolveGithub(pr) {
  if (pr === null) return { remoteState: 'unknown', url: null, mergeEvidence: null };
  const result = spawnSync(
    'gh',
    ['pr', 'view', String(pr), '--json', 'state,url,mergedAt,mergeCommit'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return { remoteState: 'offline', url: null, mergeEvidence: null };
  const data = JSON.parse(result.stdout);
  const remoteState = data.mergedAt ? 'merged' : String(data.state || '').toLowerCase();
  const mergeEvidence = data.mergedAt
    ? `PR #${pr} merged ${data.mergedAt}${data.mergeCommit?.oid ? ` (${data.mergeCommit.oid})` : ''}`
    : null;
  return { remoteState, url: data.url ?? null, mergeEvidence };
}

function resolveRepoSlug() {
  const url = git(['config', '--get', 'remote.origin.url'], { allowFailure: true });
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/u);
  return match ? `${match[1]}/${match[2]}` : null;
}

function resolveGithubChecks(sha) {
  const slug = resolveRepoSlug();
  if (!slug) return [];
  const result = spawnSync(
    'gh',
    ['api', `repos/${slug}/commits/${sha}/check-runs`],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.status !== 0) return [];
  const data = JSON.parse(result.stdout);
  return normalizeGithubCheckRuns(data.check_runs ?? [], sha);
}

function runPrepare(cli) {
  const registry = loadRegistry();
  const task = findTask(registry, cli.id);
  if (!task) throw new Error(`Task не найдена: ${cli.id}`);
  const sha = git(['rev-parse', cli.ref]);
  const branch = git(['branch', '--show-current']) || '(detached)';
  const remoteBranches = git(['branch', '-r', '--contains', sha], { allowFailure: true });
  if (!remoteBranches) throw new Error(`Commit ${sha.slice(0, 12)} ещё не опубликован в remote`);
  const baseRef = cli.base || `${sha}^`;
  const files = git(['diff', '--name-only', `${baseRef}..${sha}`])
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const github = resolveGithub(cli.pr);
  const manifest = prepareReviewManifest({
    task,
    currentCommitSha: sha,
    branch,
    baseRef,
    files,
    pullRequest: cli.pr,
    githubRemoteState: github.remoteState,
    githubUrl: github.url,
    existing: loadReviewManifest(cli.id),
  });
  if (cli.dryRun) {
    console.log(JSON.stringify(manifest, null, 2));
    // Информационные строки — в stdout (см. коммент про NativeCommandError ниже):
    // stderr здесь означал бы «упало», хотя dry-run отработал штатно.
    console.log('dry-run: manifest не записан');
    return;
  }
  const path = saveReviewManifest(manifest);
  console.log(`Closure review prepared: ${path}`);
  console.log(`Task: ${manifest.taskId} · Tier: ${manifest.tier} · SHA: ${sha}`);
}

function runStatus(cli) {
  const manifest = loadReviewManifest(cli.id);
  if (!manifest) throw new Error(`Manifest не найден: ${cli.id}. Запусти prepare.`);
  const actualSha = git(['rev-parse', 'HEAD']);
  console.log(JSON.stringify(reviewStatus(manifest, actualSha), null, 2));
}

function runEvidenceCheck(command, sha) {
  const result = spawnSync(command, { encoding: 'utf8', shell: true, maxBuffer: 10 * 1024 * 1024 });
  return {
    command,
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status,
    commitSha: sha,
    checkedAt: new Date().toISOString(),
    note: result.status === 0 ? '' : (result.stderr || result.stdout || '').trim().slice(0, 1000),
  };
}

async function requestTeamleadReview(prompt) {
  loadDotEnv();
  const key = getAnthropicKey();
  const { ok, status, text } = await anthropicPost('https://api.anthropic.com/v1/messages', {
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    bodyJson: {
      model: defaultModel(),
      max_tokens: 4096,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    },
  });
  if (!ok) {
    printAnthropicHttpError(status, text);
    throw new Error(`Teamlead provider error: HTTP ${status}`);
  }
  const json = JSON.parse(text);
  const answer = (json.content ?? []).filter((item) => item?.type === 'text').map((item) => item.text).join('\n');
  if (!answer) throw new Error('Teamlead provider вернул пустой review');
  return answer;
}

async function runReview(cli) {
  let manifest = loadReviewManifest(cli.id);
  if (!manifest) throw new Error(`Manifest не найден: ${cli.id}. Запусти prepare.`);
  const actualSha = git(['rev-parse', cli.ref]);
  if (actualSha !== manifest.currentCommitSha) {
    throw new Error(`Manifest stale: ${manifest.currentCommitSha.slice(0, 12)} != ${actualSha.slice(0, 12)}`);
  }
  const registry = loadRegistry();
  const task = findTask(registry, cli.id);
  if (!task) throw new Error(`Task не найдена: ${cli.id}`);
  if (!task.promptPath) throw new Error(`Task ${cli.id} не имеет promptPath — closure review невозможен`);
  const taskPrompt = readFileSync(resolve(process.cwd(), task.promptPath), 'utf8');
  const regulation = readFileSync(resolve(process.cwd(), 'docs/prompts/TASK_CLOSURE_REVIEW_REGULATION.md'), 'utf8');
  const teamleadPrompt = readFileSync(resolve(process.cwd(), 'docs/prompts/TASK_CLOSURE_REVIEW_PROMPT.md'), 'utf8');
  // B3 (#539): ревью-артефакты (протоколы консилиумов, выжимки research, артефакты
  // код-ревью) — это ПРОЦЕСС, не предмет closure-ревью. На эпик-контуре
  // (расследование+research+консилиум+код) они раздували exact-дифф за 80k и роняли
  // ревью (rt-8/#543). Исключаем их из диффа — код-предмет ревьюится, протоколы нет.
  const diff = git([
    'diff',
    '--no-ext-diff',
    manifest.scope.baseRef,
    manifest.currentCommitSha,
    '--',
    '.',
    ...CLOSURE_DIFF_EXCLUDES.map((p) => `:(exclude)${p}`),
  ]);
  if (cli.dryRun) {
    const prompt = buildTaskClosureReviewPrompt({ manifest, task, taskPrompt, regulation, teamleadPrompt, diff });
    console.log(`Task: ${manifest.taskId}`);
    console.log(`Commit: ${manifest.currentCommitSha}`);
    console.log(`Tier: ${manifest.tier}`);
    console.log(`Prompt chars: ${prompt.length}`);
    console.log(`Checks: git diff --check${cli.checks.length ? ` + ${cli.checks.join(' + ')}` : ''}`);
    console.log('dry-run: checks/provider/artifacts не запускались');
    return;
  }

  const headSha = git(['rev-parse', 'HEAD']);
  const clean = git(['status', '--porcelain']).length === 0;
  if (cli.checks.length > 0 && (headSha !== manifest.currentCommitSha || !clean)) {
    throw new Error('Local --check требует clean worktree и HEAD === reviewed SHA');
  }
  const commands = ['git diff --check', ...cli.checks];
  if (
    headSha === manifest.currentCommitSha &&
    clean &&
    manifest.scope.files.some((file) => file.startsWith('scripts/')) &&
    !commands.includes('yarn test:scripts')
  ) {
    commands.push('yarn test:scripts');
  }
  const localChecks = commands.map((command) =>
    command === 'git diff --check'
      ? (() => {
          const result = spawnSync('git', ['diff', '--check', manifest.scope.baseRef, manifest.currentCommitSha], { encoding: 'utf8' });
          return {
            command,
            status: result.status === 0 ? 'pass' : 'fail',
            exitCode: result.status,
            commitSha: manifest.currentCommitSha,
            checkedAt: new Date().toISOString(),
            note: result.status === 0 ? '' : (result.stdout || result.stderr || '').trim().slice(0, 1000),
          };
        })()
      : runEvidenceCheck(command, manifest.currentCommitSha),
  );
  const checks = [...localChecks, ...resolveGithubChecks(manifest.currentCommitSha)];
  manifest = { ...manifest, evidence: { ...manifest.evidence, checks } };
  saveReviewManifest(manifest);

  const body = cli.reviewFile
    ? readFileSync(resolve(process.cwd(), cli.reviewFile), 'utf8')
    : await requestTeamleadReview(buildTaskClosureReviewPrompt({ manifest, task, taskPrompt, regulation, teamleadPrompt, diff }));
  const reviewed = applyTeamleadReview(manifest, body);
  writeReviewArtifact(reviewed, body);
  saveReviewManifest(reviewed);
  console.log(body.trim());
  // stdout, а не stderr: под yarn.ps1 PowerShell 5.1 заворачивает ЛЮБОЙ stderr натива
  // в NativeCommandError — успешный LGTM выглядел падением, и путь к артефакту
  // приходилось доставать отдельным task:review:status (ретро #485 п.4).
  console.log(`Review artifact: ${reviewed.reviewArtifact}`);
}

function runFinalize(cli) {
  let manifest = loadReviewManifest(cli.id);
  if (!manifest) throw new Error(`Manifest не найден: ${cli.id}. Запусти prepare.`);
  const actualSha = git(['rev-parse', cli.ref]);
  const registry = loadRegistry();
  const task = findTask(registry, cli.id);
  if (!task) throw new Error(`Task не найдена: ${cli.id}`);

  if (manifest.state === 'archived') {
    if (task.status !== 'archived') throw new Error('Manifest archived, но registry task active');
    console.log(`Already finalized: ${cli.id}`);
    return;
  }
  if (actualSha !== manifest.currentCommitSha) {
    throw new Error('Finalize запрещён: HEAD/ref отличается от reviewed SHA');
  }

  let completed = manifest;
  if (!['merged', 'accepted_branch_only'].includes(manifest.state)) {
    let mode;
    let evidence;
    if (cli.acceptedBranchOnly) {
      mode = 'accepted_branch_only';
      evidence = `Accepted branch-only: ${cli.acceptedBranchOnly}`;
    } else if (cli.mergeEvidence && manifest.github.pullRequest === null) {
      mode = 'merged';
      evidence = cli.mergeEvidence;
    } else if (cli.mergeEvidence) {
      throw new Error('Для manifest с PR merge evidence читается только из GitHub');
    } else {
      const github = resolveGithub(manifest.github.pullRequest);
      if (github.remoteState !== 'merged' || !github.mergeEvidence) {
        throw new Error('Finalize требует merged PR либо explicit --accepted-branch-only');
      }
      mode = 'merged';
      evidence = github.mergeEvidence;
    }
    completed = finalizeReviewManifest(manifest, { actualCommitSha: actualSha, mode, evidence });
  }

  const notes = cli.notes || [
    completed.github.pullRequest ? `PR #${completed.github.pullRequest}` : null,
    `review ${completed.verdict} ${completed.currentCommitSha.slice(0, 12)}`,
    completed.completion.evidence,
  ].filter(Boolean).join('; ');

  if (cli.dryRun) {
    console.log(JSON.stringify({ taskId: cli.id, from: manifest.state, to: 'archived', notes }, null, 2));
    console.log('dry-run: manifest/registry/Issue queue не изменены');
    return;
  }

  saveReviewManifest(completed);
  if (task.status === 'active') {
    const archived = spawnSync(
      process.execPath,
      ['scripts/archive-task.mjs', cli.id, '--notes', notes],
      { encoding: 'utf8' },
    );
    if (archived.status !== 0) {
      throw new Error(`task:archive failed: ${(archived.stderr || archived.stdout || '').trim()}`);
    }
    process.stdout.write(archived.stdout || '');
  } else if (task.status !== 'archived') {
    throw new Error(`Некорректный task status: ${task.status}`);
  }
  manifest = markReviewArchived(completed);
  saveReviewManifest(manifest);
  console.log(`Closure finalized: ${cli.id}`);
  if (task.githubIssue != null) console.log('GitHub Issue поставлен в очередь task:close-github.');
}

async function main() {
  let cli;
  try {
    cli = parseTaskClosureReviewCli(process.argv.slice(2));
    if (cli.help) { printHelp(); return; }
    if (cli.command === 'prepare') runPrepare(cli);
    else if (cli.command === 'run') await runReview(cli);
    else if (cli.command === 'finalize') runFinalize(cli);
    else runStatus(cli);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('task-closure-review.mjs')) await main();
