#!/usr/bin/env node
/**
 * yarn task:start — канон START lifecycle (#722):
 *   GitHub Issue (опционально) → task:register → prompt stub + acceptance.
 *
 * Windows: body Issue только через tempfile + `gh --body-file` (не bash-heredoc).
 * Существующий `yarn task:register` не ломаем — вызываем его как шаг.
 *
 * Usage:
 *   yarn task:start --id <slug> --title "…" --size S|M|L
 *                   [--issue N] [--no-issue] [--body-file path] [--dry-run]
 *                   [--kind …] [--lead …] [--support a,b] [--prompt path]
 *                   [--parent-epic id] [--research] [--labels a,b]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseRegisterArgs } from './task-register.mjs';
import { renderTaskPromptStub } from './lib/task-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ACCEPTANCE_SECTION = `
---

## Acceptance criteria (scaffold)

> Заполнить до кода. Чеклист приёмки = Definition of Done + явные AC Issue.

- [ ] …
- [ ] …
`;

/**
 * @param {string[]} argv
 */
export function parseStartArgs(argv) {
  // Сначала вынуть флаги start: иначе parseRegisterArgs съест соседний аргумент
  // как value у неизвестного `--dry-run` / `--no-issue`.
  const pass = [];
  const out = {
    dryRun: false,
    noIssue: false,
    bodyFile: null,
    labels: ['tooling'],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (a === '--no-issue') {
      out.noIssue = true;
      continue;
    }
    if (a === '--body-file' || a.startsWith('--body-file=')) {
      out.bodyFile = a.includes('=') ? a.split('=')[1] : argv[++i];
      continue;
    }
    if (a === '--labels' || a.startsWith('--labels=')) {
      const val = a.includes('=') ? a.split('=')[1] : argv[++i];
      out.labels = String(val)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    pass.push(a);
  }
  return { ...parseRegisterArgs(pass), ...out };
}

/** Дефолтное тело Issue (Windows-safe через файл). */
export function defaultIssueBody({ id, title, size, promptPath }) {
  return `## Summary

**Размер:** ${size} · **Реестр:** \`${id}\`

${title}

## Acceptance criteria

- [ ] DoD из task-промпта выполнен
- [ ] Карточка в \`docs/tasks/registry.json\` (\`status: active\`)
- [ ] PR с \`Closes #<это-issue>\`

## Links

- Prompt: \`${promptPath || `docs/prompts/${id.replace(/-/g, '_').toUpperCase()}_PROMPT.md`}\`
- Registry: \`docs/tasks/registry.json\`
- Umbrella / parent: —

Started via \`yarn task:start\`.
`;
}

/**
 * Создать Issue через --body-file (не heredoc).
 * @returns {number|null} issue number
 */
export function createIssueWithBodyFile({ title, body, labels = [], dryRun = false, gh = execFileSync }) {
  if (dryRun) {
    return { dryRun: true, title, labels, bodyBytes: Buffer.byteLength(body, 'utf8') };
  }
  const dir = mkdtempSync(join(tmpdir(), 'membrana-task-start-'));
  const bodyFile = join(dir, 'issue-body.md');
  try {
    writeFileSync(bodyFile, body, 'utf8');
    const args = ['issue', 'create', '--title', title, '--body-file', bodyFile];
    for (const l of labels) {
      args.push('--label', l);
    }
    const out = gh('gh', args, { cwd: root, encoding: 'utf8' }).trim();
    const m = out.match(/issues\/(\d+)/) || out.match(/^(\d+)$/);
    if (!m) throw new Error(`gh issue create не вернул номер: ${out}`);
    return { number: Number(m[1]), url: out };
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/** Дописать acceptance-секцию в stub, если её ещё нет. */
export function ensureAcceptanceSection(promptMd) {
  if (/## Acceptance criteria/i.test(promptMd)) return promptMd;
  // Вставить перед «Заметки для человека-постановщика», иначе в конец.
  const marker = '## Заметки для человека-постановщика';
  if (promptMd.includes(marker)) {
    return promptMd.replace(marker, `${ACCEPTANCE_SECTION.trim()}\n\n${marker}`);
  }
  return `${promptMd.trimEnd()}\n${ACCEPTANCE_SECTION}`;
}

function usage() {
  console.error(`Usage: yarn task:start --id <slug> --title "…" --size S|M|L [options]

Options:
  --issue N          уже есть Issue — только registry + stub
  --no-issue         не создавать Issue
  --body-file path   тело Issue из файла (иначе tempfile с дефолтным шаблоном)
  --labels a,b       labels для gh issue create (default: tooling)
  --dry-run          показать план без записи registry / gh
  …плюс флаги task:register: --kind --lead --support --prompt --parent-epic --research`);
}

function main() {
  const cli = parseStartArgs(process.argv.slice(2));
  if (!cli.id || !cli.title || !cli.size || cli.help) {
    usage();
    process.exitCode = 1;
    return;
  }

  const promptPath =
    cli.prompt || cli.promptPath || `docs/prompts/${cli.id.replace(/-/g, '_').toUpperCase()}_PROMPT.md`;

  let issueNum = cli.issue != null ? Number(cli.issue) : null;

  if (!cli.noIssue && issueNum == null) {
    const body = cli.bodyFile
      ? readFileSync(resolve(root, cli.bodyFile), 'utf8')
      : defaultIssueBody({ id: cli.id, title: cli.title, size: cli.size, promptPath });
    if (cli.dryRun) {
      const preview = createIssueWithBodyFile({
        title: cli.title,
        body,
        labels: cli.labels,
        dryRun: true,
      });
      console.log(`[task:start] dry-run: создал бы Issue «${preview.title}» via --body-file`);
      console.log(`[task:start] dry-run: labels=${preview.labels.join(',')}`);
      console.log(`[task:start] dry-run: затем yarn task:register --id ${cli.id} --issue <N> …`);
      process.exitCode = 0;
      return;
    }
    try {
      const created = createIssueWithBodyFile({
        title: cli.title,
        body,
        labels: cli.labels,
        dryRun: false,
      });
      issueNum = created.number;
      console.log(`[task:start] Issue #${issueNum} ${created.url}`);
    } catch (e) {
      console.error(`[task:start] не удалось создать Issue: ${e.message}`);
      process.exitCode = 1;
      return;
    }
  } else if (cli.dryRun) {
    console.log(`[task:start] dry-run: registry+stub для ${cli.id}` + (issueNum ? ` (#${issueNum})` : ' (без issue)'));
    process.exitCode = 0;
    return;
  }

  const regArgs = [
    'scripts/task-register.mjs',
    '--id',
    cli.id,
    '--title',
    cli.title,
    '--size',
    cli.size,
  ];
  if (issueNum != null) regArgs.push('--issue', String(issueNum));
  if (cli.kind) regArgs.push('--kind', cli.kind);
  if (cli.lead) regArgs.push('--lead', cli.lead);
  if (cli.support?.length) regArgs.push('--support', cli.support.join(','));
  if (cli.prompt || cli.promptPath) regArgs.push('--prompt', promptPath);
  if (cli.parentEpic || cli['parent-epic'] || cli.parent) {
    regArgs.push('--parent-epic', cli.parentEpic || cli['parent-epic'] || cli.parent);
  }
  if (cli.research) regArgs.push('--research');
  if (cli.notes) regArgs.push('--notes', cli.notes);

  try {
    execFileSync(process.execPath, regArgs, { cwd: root, stdio: 'inherit' });
  } catch {
    process.exitCode = 1;
    return;
  }

  // Acceptance block в stub (register мог только что создать файл).
  const promptAbs = resolve(root, promptPath);
  if (existsSync(promptAbs)) {
    const before = readFileSync(promptAbs, 'utf8');
    const after = ensureAcceptanceSection(before);
    if (after !== before) {
      writeFileSync(promptAbs, after, 'utf8');
      console.log(`[task:start] acceptance scaffold → ${promptPath}`);
    }
  } else {
    // Крайний случай: register не создал stub — создадим сами.
    try {
      const template = readFileSync(resolve(root, 'docs/prompts/TASK_PROMPT_TEMPLATE.md'), 'utf8');
      mkdirSync(dirname(promptAbs), { recursive: true });
      const stub = ensureAcceptanceSection(
        renderTaskPromptStub(template, {
          id: cli.id,
          title: cli.title,
          size: cli.size,
          githubIssue: issueNum,
        }),
      );
      writeFileSync(promptAbs, stub, 'utf8');
      console.log(`[task:start] prompt stub → ${promptPath}`);
    } catch (e) {
      console.error(`[task:start] stub не создан: ${e.message}`);
    }
  }

  console.log(`[task:start] START готов: ${cli.id}` + (issueNum != null ? ` · #${issueNum}` : ''));
  console.log('Канон START = эта команда (см. membrana-task-lifecycle / TASK_PROMPT_WORKFLOW).');
  process.exitCode = 0;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/task-start.mjs');
if (isMain) main();
